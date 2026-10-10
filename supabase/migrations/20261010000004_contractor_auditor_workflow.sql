-- Verified roles are assigned in the trusted Supabase Dashboard, never by clients.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('resident', 'department_officer', 'contractor', 'auditor', 'admin'));

CREATE TABLE public.contractor_members (
  contractor_id text NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (contractor_id, user_id)
);
CREATE TABLE public.project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_role text NOT NULL CHECK (assignment_role IN ('contractor', 'auditor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, assignment_role)
);
CREATE INDEX project_assignments_user_idx ON public.project_assignments(user_id, project_id);
CREATE TABLE public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 10000),
  progress_percent integer NOT NULL CHECK (progress_percent BETWEEN 0 AND 100),
  submission_type text NOT NULL CHECK (submission_type IN ('progress', 'milestone', 'completion')),
  evidence_path text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'changes_requested')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (submission_type <> 'completion' OR (progress_percent = 100 AND evidence_path IS NOT NULL))
);
CREATE INDEX task_submissions_project_idx ON public.task_submissions(project_id, created_at DESC);
CREATE UNIQUE INDEX one_pending_completion_per_project ON public.task_submissions(project_id)
  WHERE submission_type = 'completion' AND status = 'submitted';
CREATE TABLE public.task_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE REFERENCES public.task_submissions(id) ON DELETE RESTRICT,
  reviewed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
  comments text NOT NULL DEFAULT '' CHECK (length(comments) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decision <> 'changes_requested' OR length(btrim(comments)) > 0)
);

CREATE FUNCTION public.protect_task_history()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'task_reviews' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Submission and review history cannot be edited or deleted';
  END IF;
  IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
    OR OLD.status <> 'submitted' OR NEW.status NOT IN ('approved', 'changes_requested')
    OR NOT EXISTS (SELECT 1 FROM public.task_reviews r WHERE r.submission_id = OLD.id AND r.decision = NEW.status) THEN
    RAISE EXCEPTION 'Submissions are immutable; only a recorded review may change their status';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_task_submission_history BEFORE UPDATE OR DELETE ON public.task_submissions
FOR EACH ROW EXECUTE FUNCTION public.protect_task_history();
CREATE TRIGGER protect_task_review_history BEFORE UPDATE OR DELETE ON public.task_reviews
FOR EACH ROW EXECUTE FUNCTION public.protect_task_history();

CREATE FUNCTION public.validate_project_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles u JOIN public.projects p ON p.id = NEW.project_id
    WHERE u.id = NEW.user_id AND u.role = NEW.assignment_role AND u.department_id = p.department_id) THEN
    RAISE EXCEPTION 'Assignment requires a matching verified role and project department';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_project_assignment BEFORE INSERT OR UPDATE ON public.project_assignments
FOR EACH ROW EXECUTE FUNCTION public.validate_project_assignment();

-- Security definer avoids recursive RLS between projects and their assignments.
-- Recheck current role/department so revocation takes effect immediately.
CREATE FUNCTION public.has_project_assignment(target_project text, target_role text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_assignments a
    JOIN public.profiles u ON u.id = a.user_id
    JOIN public.projects p ON p.id = a.project_id
    WHERE a.project_id = target_project AND a.user_id = auth.uid()
      AND u.role = a.assignment_role AND u.department_id = p.department_id
      AND (target_role IS NULL OR a.assignment_role = target_role));
$$;
REVOKE ALL ON FUNCTION public.has_project_assignment(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_project_assignment(text,text) TO authenticated;
ALTER TABLE public.contractor_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contractor_members, public.project_assignments, public.task_submissions, public.task_reviews FROM anon, authenticated;
GRANT SELECT ON public.contractor_members, public.project_assignments, public.task_submissions, public.task_reviews TO authenticated;
GRANT ALL ON public.contractor_members, public.project_assignments, public.task_submissions, public.task_reviews TO service_role;
CREATE POLICY "Read own company membership" ON public.contractor_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Read own project assignments" ON public.project_assignments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Assigned staff read internal projects" ON public.projects FOR SELECT TO authenticated
USING (public.has_project_assignment(id));
CREATE POLICY "Assigned staff read submissions" ON public.task_submissions FOR SELECT TO authenticated
USING (public.is_admin() OR public.has_project_assignment(project_id, 'auditor')
  OR (submitted_by = auth.uid() AND public.has_project_assignment(project_id, 'contractor')));
CREATE POLICY "Assigned staff read reviews" ON public.task_reviews FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.task_submissions s WHERE s.id = submission_id));
CREATE POLICY "Assigned staff read project history" ON public.project_updates FOR SELECT TO authenticated
USING (public.has_project_assignment(project_id));
CREATE POLICY "Assigned staff read milestones" ON public.milestones FOR SELECT TO authenticated
USING (public.has_project_assignment(project_id));
CREATE POLICY "Assigned auditor read submitted evidence" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence-photos' AND EXISTS (SELECT 1 FROM public.task_submissions s
  WHERE s.evidence_path = name AND public.has_project_assignment(s.project_id, 'auditor')));

-- New completed projects and direct completed transitions must have an approved completion.
-- Existing completed rows remain editable without manufacturing historical approvals.
CREATE FUNCTION public.require_completion_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    IF NOT EXISTS (SELECT 1 FROM public.task_submissions s JOIN public.task_reviews r ON r.submission_id = s.id
      WHERE s.project_id = NEW.id AND s.submission_type = 'completion' AND s.status = 'approved' AND r.decision = 'approved') THEN
      RAISE EXCEPTION 'Completion requires approval of contractor evidence by an assigned auditor';
    END IF;
    IF NEW.progress_percent <> 100 THEN RAISE EXCEPTION 'Completed projects require 100 percent progress'; END IF;
  END IF;
  -- Keep a submitted completion awaiting audit until a reviewer resolves it.
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending_audit' AND NEW.status <> 'pending_audit'
    AND EXISTS (SELECT 1 FROM public.task_submissions s WHERE s.project_id = NEW.id
      AND s.submission_type = 'completion' AND s.status = 'submitted') THEN
    RAISE EXCEPTION 'A submitted completion must be reviewed before changing project status';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER require_completion_approval BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.require_completion_approval();

CREATE FUNCTION public.submit_task(p_actor uuid, p_project_id text, p_title text, p_description text,
  p_progress_percent integer, p_submission_type text, p_evidence_path text DEFAULT NULL)
RETURNS public.task_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE project public.projects; result public.task_submissions;
BEGIN
  SELECT * INTO project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles u JOIN public.project_assignments a ON a.user_id = u.id
    WHERE u.id = p_actor AND u.role = 'contractor' AND u.department_id = project.department_id
      AND a.project_id = p_project_id AND a.assignment_role = 'contractor') THEN
    RAISE EXCEPTION 'Only an assigned contractor can submit work';
  END IF;
  IF project.status IN ('completed', 'cancelled', 'pending_audit') OR project.publication_status = 'archived' THEN
    RAISE EXCEPTION 'Project is closed or awaiting completion review';
  END IF;
  IF p_evidence_path IS NOT NULL AND (split_part(p_evidence_path, '/', 1) <> 'projects'
      OR split_part(p_evidence_path, '/', 2) <> p_actor::text
      OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'evidence-photos' AND name = p_evidence_path)) THEN
    RAISE EXCEPTION 'Evidence must be an uploaded image belonging to the contractor';
  END IF;
  INSERT INTO public.task_submissions (project_id, submitted_by, title, description, progress_percent, submission_type, evidence_path)
    VALUES (p_project_id, p_actor, btrim(p_title), btrim(p_description), p_progress_percent, p_submission_type, p_evidence_path)
    RETURNING * INTO result;
  IF p_submission_type = 'completion' THEN
    UPDATE public.projects SET status = 'pending_audit', last_updated_by = p_actor WHERE id = p_project_id;
  END IF;
  RETURN result;
END;
$$;

CREATE FUNCTION public.review_task(p_actor uuid, p_submission_id uuid, p_decision text, p_comments text DEFAULT '')
RETURNS public.task_reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE submission public.task_submissions; project public.projects; result public.task_reviews; project_key text;
BEGIN
  SELECT project_id INTO project_key FROM public.task_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  -- All workflow mutations lock the project first, avoiding review/submit deadlocks.
  SELECT * INTO project FROM public.projects WHERE id = project_key FOR UPDATE;
  SELECT * INTO submission FROM public.task_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.profiles u JOIN public.project_assignments a ON a.user_id = u.id
    WHERE u.id = p_actor AND u.role = 'auditor' AND u.department_id = project.department_id
      AND a.project_id = project.id AND a.assignment_role = 'auditor') OR p_actor = submission.submitted_by THEN
    RAISE EXCEPTION 'Only an independent assigned auditor can review work';
  END IF;
  IF submission.status <> 'submitted' THEN RAISE EXCEPTION 'Submission has already been reviewed'; END IF;
  IF project.status IN ('completed', 'cancelled') OR project.publication_status = 'archived' THEN
    RAISE EXCEPTION 'Project is closed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles u JOIN public.project_assignments a ON a.user_id = u.id
    WHERE u.id = submission.submitted_by AND u.role = 'contractor' AND u.department_id = project.department_id
      AND a.project_id = project.id AND a.assignment_role = 'contractor') THEN
    RAISE EXCEPTION 'Submitting contractor no longer has project access';
  END IF;
  INSERT INTO public.task_reviews (submission_id, reviewed_by, decision, comments)
    VALUES (submission.id, p_actor, p_decision, btrim(COALESCE(p_comments, ''))) RETURNING * INTO result;
  UPDATE public.task_submissions SET status = p_decision WHERE id = submission.id;
  IF submission.submission_type = 'completion' THEN
    UPDATE public.projects SET status = CASE WHEN p_decision = 'approved' THEN 'completed' ELSE 'in_progress' END,
      progress_percent = CASE WHEN p_decision = 'approved' THEN 100 ELSE progress_percent END,
      actual_end_date = CASE WHEN p_decision = 'approved' THEN CURRENT_DATE ELSE actual_end_date END,
      last_updated_by = p_actor WHERE id = project.id;
  ELSIF p_decision = 'approved' THEN
    UPDATE public.projects SET progress_percent = greatest(progress_percent, submission.progress_percent),
      status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END,
      last_updated_by = p_actor WHERE id = project.id;
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_task(uuid,text,text,text,integer,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_task(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_task(uuid,text,text,text,integer,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_task(uuid,uuid,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.validate_project_assignment(), public.require_completion_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_task_history() FROM PUBLIC, anon, authenticated;
