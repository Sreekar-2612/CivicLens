-- Repair deployed admin RPCs without rewriting previously applied migrations.
CREATE OR REPLACE FUNCTION public.admin_get_user_roster()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;
  SELECT json_agg(account) INTO result FROM (
    SELECT p.id, p.display_name, p.role, p.department_id, p.created_at, p.updated_at, u.email,
      COALESCE((SELECT json_agg(json_build_object(
        'project_id', a.project_id, 'assignment_role', a.assignment_role,
        'project_title', pr.title, 'road', pr.road_name, 'status', pr.status,
        'progress_percent', pr.progress_percent))
        FROM public.project_assignments a JOIN public.projects pr ON pr.id = a.project_id
        WHERE a.user_id = p.id), '[]'::json) AS assignments,
      (SELECT count(*) FROM public.task_submissions s WHERE s.submitted_by = p.id) AS submission_count,
      (SELECT count(*) FROM public.task_reviews r WHERE r.reviewed_by = p.id) AS review_count
    FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY CASE p.role WHEN 'admin' THEN 1 WHEN 'department_officer' THEN 2
      WHEN 'auditor' THEN 3 WHEN 'contractor' THEN 4 ELSE 5 END, p.created_at DESC
  ) account;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_assignment(
  p_target_user_id uuid, p_new_role text, p_new_department_id text DEFAULT NULL,
  p_project_ids text[] DEFAULT ARRAY[]::text[]
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE assigned_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;
  IF p_new_role = 'officer' THEN p_new_role := 'department_officer'; END IF;
  IF p_new_role IS NULL OR p_new_role NOT IN ('resident', 'department_officer', 'contractor', 'auditor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;
  IF p_new_role IN ('department_officer', 'contractor', 'auditor') AND p_new_department_id IS NULL THEN
    RAISE EXCEPTION 'A department is required for this role';
  END IF;
  IF p_new_role IN ('resident', 'admin') THEN p_new_department_id := NULL; END IF;
  IF p_new_department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.departments WHERE id = p_new_department_id
  ) THEN RAISE EXCEPTION 'Department not found'; END IF;
  p_project_ids := COALESCE(p_project_ids, ARRAY[]::text[]);
  IF p_new_role NOT IN ('contractor', 'auditor') AND cardinality(p_project_ids) > 0 THEN
    RAISE EXCEPTION 'Only contractors and auditors can receive project assignments';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_project_ids) requested(id)
    WHERE NOT EXISTS (SELECT 1 FROM public.projects p
      WHERE p.id = requested.id AND p.department_id = p_new_department_id)) THEN
    RAISE EXCEPTION 'Every assigned project must exist in the selected department';
  END IF;
  -- Serialize assignment changes for this account; all writes are one transaction.
  PERFORM 1 FROM public.profiles WHERE id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target user profile not found'; END IF;
  UPDATE public.profiles SET role = p_new_role, department_id = p_new_department_id,
    updated_at = now() WHERE id = p_target_user_id;
  DELETE FROM public.project_assignments WHERE user_id = p_target_user_id;
  INSERT INTO public.project_assignments (project_id, user_id, assignment_role)
    SELECT DISTINCT id, p_target_user_id, p_new_role FROM unnest(p_project_ids) requested(id);
  GET DIAGNOSTICS assigned_count = ROW_COUNT;
  RETURN json_build_object('success', true, 'user_id', p_target_user_id, 'role', p_new_role,
    'department_id', p_new_department_id, 'assigned_projects_count', assigned_count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_roster() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_roster() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_update_user_assignment(uuid, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_assignment(uuid, text, text, text[]) TO authenticated;
