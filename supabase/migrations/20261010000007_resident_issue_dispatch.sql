ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.grievances ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.grievances ADD CONSTRAINT grievance_coordinates CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));
CREATE OR REPLACE VIEW public.public_grievances AS
SELECT id, reference_id, project_id, category, 'Community report'::text AS title,
  'Details shared with civic officers'::text AS description,
  NULL::text AS road_name, NULL::text AS locality, NULL::text AS ward,
  status, NULL::text AS officer_response, upvotes, created_at, updated_at,
  latitude, longitude FROM public.grievances;

CREATE OR REPLACE FUNCTION public.auditor_assign_contractor(p_project_id text, p_contractor_id uuid, p_grievance_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE project public.projects; issue public.grievances;
BEGIN
  SELECT * INTO project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF NOT public.has_project_assignment(p_project_id, 'auditor') THEN RAISE EXCEPTION 'Only an assigned auditor can dispatch this project'; END IF;
  IF project.status IN ('completed', 'cancelled', 'pending_audit') OR project.publication_status = 'archived' THEN RAISE EXCEPTION 'Project is closed or awaiting review'; END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_contractor_id AND role = 'contractor' AND department_id = project.department_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a contractor in the project department'; END IF;
  IF p_grievance_id IS NOT NULL THEN
    SELECT * INTO issue FROM public.grievances WHERE id = p_grievance_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Issue not found'; END IF;
    IF issue.project_id IS NOT NULL AND issue.project_id <> p_project_id THEN RAISE EXCEPTION 'Issue already belongs to another project'; END IF;
    IF issue.status = 'resolved' THEN RAISE EXCEPTION 'Issue is already resolved'; END IF;
    UPDATE public.grievances SET project_id = p_project_id, status = CASE WHEN status = 'submitted' THEN 'acknowledged' ELSE status END, updated_at = now() WHERE id = p_grievance_id;
  END IF;
  INSERT INTO public.project_assignments(project_id,user_id,assignment_role) VALUES(p_project_id,p_contractor_id,'contractor') ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.auditor_assign_contractor(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auditor_assign_contractor(text,uuid,text) TO authenticated;
CREATE FUNCTION public.can_read_issue_evidence(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.grievances g WHERE g.evidence_url = p_path AND public.has_project_assignment(g.project_id));
$$;
REVOKE ALL ON FUNCTION public.can_read_issue_evidence(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_issue_evidence(text) TO authenticated;
CREATE POLICY "Assigned staff read issue evidence" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence-photos' AND public.can_read_issue_evidence(name));
