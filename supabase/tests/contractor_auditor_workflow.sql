-- Run after migrations in an isolated Supabase database as postgres. Never uses live data.
BEGIN;
DO $$
DECLARE
  contractor uuid := gen_random_uuid(); auditor uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  dept text := 'test-workflow-' || substr(gen_random_uuid()::text, 1, 8);
  project text := 'test-project-' || substr(gen_random_uuid()::text, 1, 8);
  submission public.task_submissions; review public.task_reviews; evidence text;
BEGIN
  INSERT INTO public.departments(id,name,short_name) VALUES (dept,'Workflow test','WT');
  INSERT INTO auth.users(id,email) VALUES (contractor,contractor::text || '@example.test'),
    (auditor,auditor::text || '@example.test'), (outsider,outsider::text || '@example.test');
  UPDATE public.profiles SET role = 'contractor', department_id = dept WHERE id = contractor;
  UPDATE public.profiles SET role = 'auditor', department_id = dept WHERE id = auditor;
  INSERT INTO public.projects(id,title,purpose,department_id,contractor_name,category,road_name,locality,
    latitude,longitude,start_date,original_end_date,publication_status)
  VALUES (project,'Workflow test','Regression test',dept,'Test company','other',project,'Test',0,0,'2026-01-01','2026-12-31','draft');
  INSERT INTO public.project_assignments(project_id,user_id,assignment_role)
  VALUES (project,contractor,'contractor'), (project,auditor,'auditor');
  BEGIN
    INSERT INTO public.project_assignments(project_id,user_id,assignment_role) VALUES (project,outsider,'contractor');
    RAISE EXCEPTION 'TEST FAILED: unverified assignment accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST FAILED:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_task(outsider,project,'Test','Test',10,'progress',NULL);
    RAISE EXCEPTION 'TEST FAILED: outsider submitted work';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST FAILED:%' THEN RAISE; END IF;
  END;
  submission := public.submit_task(contractor,project,'Milestone','Evidence of progress',30,'milestone',NULL);
  BEGIN
    PERFORM public.review_task(contractor,submission.id,'approved','');
    RAISE EXCEPTION 'TEST FAILED: self approval accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST FAILED:%' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.task_submissions SET description = 'Edited history' WHERE id = submission.id;
    RAISE EXCEPTION 'TEST FAILED: evidence history edited';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST FAILED:%' THEN RAISE; END IF;
  END;
  review := public.review_task(auditor,submission.id,'approved','Verified');
  IF (SELECT progress_percent FROM public.projects WHERE id = project) <> 30 THEN
    RAISE EXCEPTION 'TEST FAILED: approved progress not applied';
  END IF;
  BEGIN
    PERFORM public.review_task(auditor,submission.id,'approved','');
    RAISE EXCEPTION 'TEST FAILED: duplicate review accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST FAILED:%' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.projects SET status = 'completed', progress_percent = 100 WHERE id = project;
    RAISE EXCEPTION 'TEST FAILED: completion bypass accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST FAILED:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.submit_task(contractor,project,'Complete','Complete',100,'completion',NULL);
    RAISE EXCEPTION 'TEST FAILED: completion without evidence accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  evidence := 'projects/' || contractor || '/' || gen_random_uuid() || '.jpg';
  INSERT INTO storage.objects(bucket_id,name) VALUES ('evidence-photos',evidence);
  submission := public.submit_task(contractor,project,'Complete','Completion evidence',100,'completion',evidence);
  IF (SELECT status FROM public.projects WHERE id = project) <> 'pending_audit' THEN
    RAISE EXCEPTION 'TEST FAILED: completion did not await audit';
  END IF;
  BEGIN
    PERFORM public.submit_task(contractor,project,'Complete again','Duplicate',100,'completion',evidence);
    RAISE EXCEPTION 'TEST FAILED: duplicate pending completion accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST FAILED:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.review_task(auditor,submission.id,'changes_requested','');
    RAISE EXCEPTION 'TEST FAILED: correction without reason accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  PERFORM public.review_task(auditor,submission.id,'changes_requested','Repair surface');
  IF (SELECT status FROM public.projects WHERE id = project) <> 'in_progress' THEN
    RAISE EXCEPTION 'TEST FAILED: requested corrections did not reopen work';
  END IF;
  submission := public.submit_task(contractor,project,'Repaired','Resubmitted evidence',100,'completion',evidence);
  UPDATE public.profiles SET role = 'resident' WHERE id = auditor;
  BEGIN
    PERFORM public.review_task(auditor,submission.id,'approved','');
    RAISE EXCEPTION 'TEST FAILED: revoked auditor retained authority';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST FAILED:%' THEN RAISE; END IF;
  END;
  UPDATE public.profiles SET role = 'auditor' WHERE id = auditor;
  PERFORM public.review_task(auditor,submission.id,'approved','All work verified');
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = project AND status = 'completed'
    AND progress_percent = 100 AND actual_end_date IS NOT NULL) THEN
    RAISE EXCEPTION 'TEST FAILED: approved completion not applied';
  END IF;
  IF has_function_privilege('authenticated','public.submit_task(uuid,text,text,text,integer,text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.review_task(uuid,uuid,text,text)','EXECUTE')
    OR has_table_privilege('authenticated','public.task_submissions','INSERT')
    OR has_table_privilege('authenticated','public.project_assignments','INSERT')
    OR has_table_privilege('authenticated','public.profiles','UPDATE') THEN
    RAISE EXCEPTION 'TEST FAILED: client can forge role, assignment or workflow actor';
  END IF;
  PERFORM set_config('test.workflow_project',project,true);
  PERFORM set_config('test.workflow_contractor',contractor::text,true);
  PERFORM set_config('test.workflow_auditor',auditor::text,true);
  PERFORM set_config('test.workflow_outsider',outsider::text,true);
  RAISE NOTICE 'Workflow authorization and atomic review tests passed';
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.workflow_outsider'),true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.task_submissions WHERE project_id = current_setting('test.workflow_project'))
    OR EXISTS (SELECT 1 FROM public.projects WHERE id = current_setting('test.workflow_project')) THEN
    RAISE EXCEPTION 'TEST FAILED: outsider read private work or draft project';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.workflow_auditor'),true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.task_submissions WHERE project_id = current_setting('test.workflow_project')) <> 3
    OR NOT EXISTS (SELECT 1 FROM public.projects WHERE id = current_setting('test.workflow_project')) THEN
    RAISE EXCEPTION 'TEST FAILED: assigned auditor cannot read private work';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
