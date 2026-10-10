-- Run after all migrations in an isolated database. The transaction rolls back test records.
BEGIN;
DO $$
DECLARE
  suffix text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  dept_a text;
  dept_b text;
  project_a text;
  project_b text;
  pair_key text;
  found_count integer;
BEGIN
  dept_a := 'test-roads-' || suffix;
  dept_b := 'test-water-' || suffix;
  project_a := 'test-road-' || suffix;
  project_b := 'test-pipe-' || suffix;
  pair_key := least(project_a, project_b) || ':' || greatest(project_a, project_b);

  INSERT INTO public.departments (id, name, short_name)
  VALUES (dept_a, 'Test Roads', 'TR'), (dept_b, 'Test Water', 'TW');
  INSERT INTO public.projects (
    id, title, purpose, department_id, contractor_name, category,
    road_name, locality, ward, latitude, longitude, budget, status,
    publication_status, start_date, original_end_date, progress_percent, confidence_indicator
  ) VALUES (
    project_a, 'Test resurfacing', 'Migration smoke test', dept_a, 'Test contractor',
    'road_resurfacing', 'Migration Test Road', 'Test locality', 'Ward 1',
    18.5204, 73.8567, 100, 'planned', 'published',
    '2026-01-01', '2026-02-01', 0, 'on_track'
  ), (
    project_b, 'Test utility trench', 'Migration smoke test', dept_b, 'Test contractor',
    'water_pipeline', 'Migration Test Road', 'Test locality', 'Ward 1',
    18.5205, 73.8567, 100, 'planned', 'published',
    '2026-01-15', '2026-03-01', 0, 'on_track'
  );

  SELECT count(*) INTO found_count FROM public.clashes
  WHERE detection_key = pair_key AND score = 90 AND severity = 'critical';
  IF found_count <> 1 THEN RAISE EXCEPTION 'Expected one scored clash, found %', found_count; END IF;

  SELECT count(*) INTO found_count FROM public.notifications
  WHERE kind = 'clash' AND entity_id = (SELECT id FROM public.clashes WHERE detection_key = pair_key);
  IF found_count <> 2 THEN RAISE EXCEPTION 'Expected two department notifications, found %', found_count; END IF;

  UPDATE public.projects SET status = 'cancelled' WHERE id = project_b;
  SELECT count(*) INTO found_count FROM public.clashes WHERE detection_key = pair_key;
  IF found_count <> 0 THEN RAISE EXCEPTION 'Expected unreviewed clash to clear after cancellation'; END IF;

  RAISE NOTICE 'Clash detection and notification smoke test passed';
END;
$$;
ROLLBACK;
