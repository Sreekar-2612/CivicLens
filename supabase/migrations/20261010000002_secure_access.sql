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
SELECT id, reference_id, project_id, category, title, description, road_name,
       locality, ward, status, officer_response, upvotes, created_at, updated_at
FROM public.grievances;
GRANT SELECT ON public.public_grievances TO anon, authenticated;

DROP POLICY IF EXISTS "Public read audit_logs" ON public.audit_logs;
REVOKE SELECT ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_admin());

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
VALUES ('evidence', 'evidence', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
CREATE POLICY "Authenticated upload own evidence" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner or staff read evidence" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidence' AND ((storage.foldername(name))[1] = auth.uid()::text
  OR public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'department_officer')));
