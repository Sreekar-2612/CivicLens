-- Close direct Data API paths that bypass edge authorization.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
CREATE OR REPLACE FUNCTION public.is_department_officer(target_department text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'department_officer' AND department_id = target_department);
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_department_officer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_department_officer(text) TO authenticated;

DROP POLICY IF EXISTS "Users read own profile or admin all" ON public.profiles;
CREATE POLICY "Read own profile or admin" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
-- Profile role and department are assigned only by trusted backend administrators.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.create_resident_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'Resident'), 'resident')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_civic ON auth.users;
CREATE TRIGGER on_auth_user_created_civic AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_resident_profile();
INSERT INTO public.profiles (id, display_name, role)
SELECT u.id, COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(u.email, ''), '@', 1), 'Resident'), 'resident'
FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);
DROP POLICY IF EXISTS "Admin manage departments" ON public.departments;
CREATE POLICY "Admin manage departments" ON public.departments FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authorized roles insert updates" ON public.project_updates;
CREATE POLICY "Department staff insert updates" ON public.project_updates FOR INSERT TO authenticated
WITH CHECK (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.projects pr WHERE pr.id = project_id
  AND public.is_department_officer(pr.department_id)
));

ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.grievances DROP CONSTRAINT IF EXISTS grievances_category_check;
ALTER TABLE public.grievances DROP CONSTRAINT IF EXISTS grievances_status_check;
UPDATE public.grievances SET category = CASE category
  WHEN 'delay' THEN 'stalled_work'
  WHEN 'safety' THEN 'safety_hazard'
  WHEN 'quality' THEN 'quality_concern'
  WHEN 'traffic' THEN 'traffic_disruption'
  WHEN 'noise' THEN 'noise_complaint'
  WHEN 'unauthorized_digging' THEN 'road_damage'
  ELSE category END;
UPDATE public.grievances SET status = CASE status
  WHEN 'investigating' THEN 'in_review'
  WHEN 'rejected' THEN 'dismissed'
  ELSE status END;
ALTER TABLE public.grievances ADD CONSTRAINT grievances_category_check CHECK (category IN (
  'stalled_work', 'safety_hazard', 'noise_complaint', 'road_damage',
  'water_disruption', 'traffic_disruption', 'quality_concern', 'environmental', 'other'));
ALTER TABLE public.grievances ADD CONSTRAINT grievances_status_check CHECK (status IN (
  'submitted', 'acknowledged', 'in_review', 'escalated', 'resolved', 'dismissed'));
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK (status IN (
  'planned', 'in_progress', 'delayed', 'pending_audit', 'completed', 'cancelled'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS latest_delay_reason text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.log_deadline_revision_audit()
RETURNS trigger AS $$
BEGIN
  IF OLD.revised_end_date IS DISTINCT FROM NEW.revised_end_date AND NEW.revised_end_date IS NOT NULL THEN
    INSERT INTO public.project_updates (
      project_id, update_type, progress_percent, status, notes,
      delay_reason_description, previous_end_date, revised_end_date,
      created_by, created_by_name
    ) VALUES (
      NEW.id, 'deadline_revision', NEW.progress_percent, NEW.status,
      COALESCE(NULLIF(NEW.latest_delay_reason, ''), 'Deadline adjusted to ' || NEW.revised_end_date::text),
      NEW.latest_delay_reason, COALESCE(OLD.revised_end_date, OLD.original_end_date),
      NEW.revised_end_date, COALESCE(NEW.last_updated_by, auth.uid()),
      COALESCE((SELECT display_name FROM public.profiles WHERE id = COALESCE(NEW.last_updated_by, auth.uid())), 'Authorized Officer')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION public.log_project_progress_audit()
RETURNS trigger AS $$
BEGIN
  IF OLD.progress_percent IS DISTINCT FROM NEW.progress_percent
     OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.project_updates (
      project_id, update_type, progress_percent, status, notes,
      created_by, created_by_name
    ) VALUES (
      NEW.id,
      CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change' ELSE 'progress' END,
      NEW.progress_percent, NEW.status,
      CASE WHEN OLD.status IS DISTINCT FROM NEW.status
        THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
        ELSE 'Progress changed from ' || OLD.progress_percent || '% to ' || NEW.progress_percent || '%' END,
      COALESCE(NEW.last_updated_by, auth.uid()),
      COALESCE((SELECT display_name FROM public.profiles WHERE id = COALESCE(NEW.last_updated_by, auth.uid())), 'Authorized Officer')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_log_project_progress ON public.projects;
CREATE TRIGGER trg_log_project_progress AFTER UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_project_progress_audit();
ALTER TABLE public.project_updates DROP CONSTRAINT IF EXISTS project_updates_status_check;
ALTER TABLE public.project_updates ADD CONSTRAINT project_updates_status_check CHECK (status IS NULL OR status IN (
  'planned', 'in_progress', 'delayed', 'pending_audit', 'completed', 'cancelled'));
ALTER TABLE public.clashes DROP CONSTRAINT IF EXISTS clashes_status_check;
UPDATE public.clashes SET status = CASE status
  WHEN 'ignored' THEN 'dismissed'
  WHEN 'escalated' THEN 'pending_review'
  ELSE status END;
ALTER TABLE public.clashes ADD CONSTRAINT clashes_status_check CHECK (status IN (
  'pending_review', 'joint_scheduling', 'intentional_overlap', 'dismissed', 'resolved'));
DROP POLICY IF EXISTS "Public read grievances" ON public.grievances;
DROP POLICY IF EXISTS "Public insert grievances" ON public.grievances;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.grievances FROM anon, authenticated;
GRANT SELECT ON public.grievances TO authenticated;
CREATE POLICY "Owner and department staff read grievances" ON public.grievances FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_admin() OR EXISTS (
  SELECT 1 FROM public.projects pr WHERE pr.id = project_id
  AND public.is_department_officer(pr.department_id)
));

-- View owner deliberately bypasses RLS; only these columns are publicly exposed.
CREATE OR REPLACE VIEW public.public_grievances AS
SELECT id, reference_id, project_id, category, 'Community report'::text AS title,
       'Details shared with civic officers'::text AS description,
       NULL::text AS road_name, NULL::text AS locality, NULL::text AS ward,
       status, NULL::text AS officer_response, upvotes, created_at, updated_at
FROM public.grievances;
GRANT SELECT ON public.public_grievances TO anon, authenticated;

DROP POLICY IF EXISTS "Public read audit_logs" ON public.audit_logs;
REVOKE SELECT ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_admin());
DROP POLICY IF EXISTS "Public read contractors" ON public.contractors;
DROP POLICY IF EXISTS "Public read evaluations" ON public.contractor_evaluations;
REVOKE SELECT ON public.contractors FROM anon, authenticated;
REVOKE SELECT ON public.contractor_evaluations FROM anon, authenticated;

-- Coordination decisions cannot be edited through a direct client request.
REVOKE INSERT, UPDATE, DELETE ON public.clashes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.projects FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.project_updates FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_date date NOT NULL,
  completed_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.milestones(project_id, sort_order);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published milestones" ON public.milestones FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.publication_status = 'published'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence-photos', 'evidence-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
CREATE POLICY "Authenticated upload own evidence" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidence-photos' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Owner or staff read evidence" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence-photos' AND ((storage.foldername(name))[2] = auth.uid()::text
  OR public.is_admin() OR EXISTS (
    SELECT 1 FROM public.grievances g JOIN public.projects pr ON pr.id = g.project_id
    WHERE g.evidence_url = name AND public.is_department_officer(pr.department_id)
  ) OR EXISTS (
    SELECT 1 FROM public.project_updates u JOIN public.projects pr ON pr.id = u.project_id
    WHERE u.evidence_path = name AND public.is_department_officer(pr.department_id)
  )));
