-- ============================================================
-- QuickSort — Admin Supervision & Role Assignment Functions
-- ============================================================

-- 1. Promote primary administrator email to admin role
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('sreekartirumala0706@gmail.com')
);

-- 2. Auto-admin trigger for primary administrative emails on future registrations
CREATE OR REPLACE FUNCTION public.auto_assign_admin_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IN ('sreekartirumala0706@gmail.com') THEN
    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_admin ON auth.users;
CREATE TRIGGER trg_auto_admin
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_admin_on_signup();

-- 3. Stored Procedure: admin_get_user_roster
-- Returns complete list of users, profiles, roles, departments, and assigned project IDs
CREATE OR REPLACE FUNCTION public.admin_get_user_roster()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  SELECT json_agg(u_row) INTO result
  FROM (
    SELECT 
      p.id,
      p.display_name,
      p.role,
      p.department_id,
      p.created_at,
      p.updated_at,
      u.email,
      COALESCE(
        (SELECT json_agg(json_build_object(
           'project_id', pa.project_id,
           'assignment_role', pa.assignment_role,
           'project_title', pr.title,
           'road', pr.road,
           'status', pr.status,
           'progress_percent', pr.progress_percent
         ))
         FROM public.project_assignments pa
         JOIN public.projects pr ON pr.id = pa.project_id
         WHERE pa.user_id = p.id),
        '[]'::json
      ) AS assignments,
      COALESCE(
        (SELECT count(*) FROM public.task_submissions ts WHERE ts.submitted_by = p.id),
        0
      ) AS submission_count,
      COALESCE(
        (SELECT count(*) FROM public.task_reviews tr WHERE tr.reviewed_by = p.id),
        0
      ) AS review_count
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY 
      CASE p.role 
        WHEN 'admin' THEN 1 
        WHEN 'officer' THEN 2 
        WHEN 'auditor' THEN 3 
        WHEN 'contractor' THEN 4 
        ELSE 5 
      END,
      p.created_at DESC
  ) u_row;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 4. Stored Procedure: admin_update_user_assignment
-- Atomically updates a user's role, department, and project assignments
CREATE OR REPLACE FUNCTION public.admin_update_user_assignment(
  p_target_user_id uuid,
  p_new_role text,
  p_new_department_id text DEFAULT NULL,
  p_project_ids text[] DEFAULT ARRAY[]::text[]
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proj_id text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  IF p_new_role NOT IN ('resident', 'department_officer', 'officer', 'contractor', 'auditor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role specified: %', p_new_role;
  END IF;

  -- Normalize role name
  IF p_new_role = 'officer' THEN
    p_new_role := 'department_officer';
  END IF;

  -- 1. Update the profile
  UPDATE public.profiles
  SET 
    role = p_new_role,
    department_id = p_new_department_id,
    updated_at = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user profile not found for id: %', p_target_user_id;
  END IF;

  -- 2. Clear old project assignments for this user
  DELETE FROM public.project_assignments
  WHERE user_id = p_target_user_id;

  -- 3. If role is contractor or auditor, insert new assignments
  IF p_new_role IN ('contractor', 'auditor') AND p_project_ids IS NOT NULL THEN
    FOREACH v_proj_id IN ARRAY p_project_ids
    LOOP
      IF EXISTS (SELECT 1 FROM public.projects WHERE id = v_proj_id) THEN
        INSERT INTO public.project_assignments (project_id, user_id, assignment_role)
        VALUES (v_proj_id, p_target_user_id, p_new_role)
        ON CONFLICT (project_id, user_id, assignment_role) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'role', p_new_role,
    'department_id', p_new_department_id,
    'assigned_projects_count', COALESCE(array_length(p_project_ids, 1), 0)
  );
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.admin_get_user_roster() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_roster() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_user_assignment(uuid, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_assignment(uuid, text, text, text[]) TO authenticated;
