-- Detect project scheduling conflicts and deliver durable in-app officer alerts.
ALTER TABLE public.clashes ADD COLUMN IF NOT EXISTS detection_key text;
ALTER TABLE public.clashes ADD COLUMN IF NOT EXISTS score integer CHECK (score BETWEEN 0 AND 100);
ALTER TABLE public.clashes ADD COLUMN IF NOT EXISTS reasons jsonb;
ALTER TABLE public.clashes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS clashes_detection_key_uidx ON public.clashes(detection_key);

CREATE OR REPLACE FUNCTION public.refresh_project_clashes(target_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.projects%ROWTYPE;
  b public.projects%ROWTYPE;
  same_road boolean;
  nearby boolean;
  overlap_dates boolean;
  recent_resurfacing boolean;
  interfering boolean;
  clash_score integer;
  clash_reasons jsonb;
  pair_key text;
  active_keys text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO a FROM public.projects WHERE id = target_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF a.status <> 'cancelled' AND a.publication_status = 'published' THEN
    FOR b IN SELECT * FROM public.projects
      WHERE id <> a.id AND department_id <> a.department_id
        AND status <> 'cancelled' AND publication_status = 'published'
    LOOP
      same_road := regexp_replace(lower(a.road_name), '[^a-z0-9]', '', 'g') <> ''
        AND regexp_replace(lower(a.road_name), '[^a-z0-9]', '', 'g') =
            regexp_replace(lower(b.road_name), '[^a-z0-9]', '', 'g');
      nearby := sqrt(
        power((a.latitude - b.latitude) * 111320, 2) +
        power((a.longitude - b.longitude) * 111320 *
          cos(radians((a.latitude + b.latitude) / 2)), 2)
      ) <= 200;
      IF NOT same_road AND NOT nearby THEN CONTINUE; END IF;

      overlap_dates := a.status <> 'completed' AND b.status <> 'completed'
        AND a.start_date <= coalesce(b.revised_end_date, b.original_end_date)
        AND b.start_date <= coalesce(a.revised_end_date, a.original_end_date);
      recent_resurfacing := (
        a.status = 'completed' AND a.category IN ('road_resurfacing', 'road_construction')
        AND a.actual_end_date IS NOT NULL
        AND b.category IN ('water_pipeline', 'drainage', 'electricity', 'telecom', 'gas_pipeline')
        AND b.start_date BETWEEN a.actual_end_date AND a.actual_end_date + 365
      ) OR (
        b.status = 'completed' AND b.category IN ('road_resurfacing', 'road_construction')
        AND b.actual_end_date IS NOT NULL
        AND a.category IN ('water_pipeline', 'drainage', 'electricity', 'telecom', 'gas_pipeline')
        AND a.start_date BETWEEN b.actual_end_date AND b.actual_end_date + 365
      );
      IF NOT overlap_dates AND NOT recent_resurfacing THEN CONTINUE; END IF;

      interfering := a.category <> b.category
        AND a.category IN ('road_construction', 'road_resurfacing', 'water_pipeline',
          'drainage', 'electricity', 'telecom', 'gas_pipeline')
        AND b.category IN ('road_construction', 'road_resurfacing', 'water_pipeline',
          'drainage', 'electricity', 'telecom', 'gas_pipeline');
      clash_score := least(100, CASE WHEN same_road THEN 35 ELSE 20 END
        + CASE WHEN overlap_dates THEN 30 ELSE 0 END
        + CASE WHEN interfering THEN 25 ELSE 0 END
        + CASE WHEN recent_resurfacing THEN 45 ELSE 0 END);
      IF clash_score < 60 THEN CONTINUE; END IF;

      clash_reasons := jsonb_build_array(
        jsonb_build_object('type', CASE WHEN same_road THEN 'same_road' ELSE 'nearby_location' END,
          'description', CASE WHEN same_road THEN 'Both projects are recorded on the same road'
            ELSE 'Project points are within 200 metres' END,
          'score', CASE WHEN same_road THEN 35 ELSE 20 END)
      );
      IF overlap_dates THEN clash_reasons := clash_reasons || jsonb_build_array(
        jsonb_build_object('type', 'overlapping_dates', 'description', 'Scheduled work dates overlap', 'score', 30)); END IF;
      IF interfering THEN clash_reasons := clash_reasons || jsonb_build_array(
        jsonb_build_object('type', 'interfering_categories',
          'description', 'Different excavation work is scheduled on the corridor', 'score', 25)); END IF;
      IF recent_resurfacing THEN clash_reasons := clash_reasons || jsonb_build_array(
        jsonb_build_object('type', 'recent_excavation',
          'description', 'Utility work starts within 365 days of recorded resurfacing', 'score', 45)); END IF;

      pair_key := least(a.id, b.id) || ':' || greatest(a.id, b.id);
      IF EXISTS (
        SELECT 1 FROM public.clashes existing
        WHERE existing.detection_key IS NULL
          AND ((existing.project_a_id = a.id AND existing.project_b_id = b.id)
            OR (existing.project_a_id = b.id AND existing.project_b_id = a.id))
      ) THEN CONTINUE; END IF;
      active_keys := array_append(active_keys, pair_key);
      INSERT INTO public.clashes (
        detection_key, title, road_name, project_a_id, project_b_id,
        department_a_id, department_b_id, conflict_type, severity, score, reasons
      ) VALUES (
        pair_key, 'Possible coordination clash on ' || a.road_name, a.road_name,
        least(a.id, b.id), greatest(a.id, b.id),
        CASE WHEN a.id < b.id THEN a.department_id ELSE b.department_id END,
        CASE WHEN a.id < b.id THEN b.department_id ELSE a.department_id END,
        CASE WHEN recent_resurfacing THEN 'trenching_sequence' ELSE 'overlapping_dates' END,
        CASE WHEN clash_score >= 90 THEN 'critical' WHEN clash_score >= 70 THEN 'high' ELSE 'medium' END,
        clash_score, clash_reasons
      ) ON CONFLICT (detection_key) DO UPDATE SET
        title = excluded.title, road_name = excluded.road_name,
        department_a_id = excluded.department_a_id, department_b_id = excluded.department_b_id,
        conflict_type = excluded.conflict_type, severity = excluded.severity,
        score = excluded.score, reasons = excluded.reasons, updated_at = now();
    END LOOP;
  END IF;

  DELETE FROM public.clashes WHERE detection_key IS NOT NULL
    AND status = 'pending_review'
    AND (project_a_id = target_id OR project_b_id = target_id)
    AND NOT (detection_key = ANY(active_keys));
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_clashes_after_project_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_project_clashes(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_refresh_project_clashes ON public.projects;
CREATE TRIGGER trg_refresh_project_clashes
AFTER INSERT OR UPDATE OF road_name, latitude, longitude, department_id, category,
  status, publication_status, start_date, original_end_date, revised_end_date, actual_end_date
ON public.projects FOR EACH ROW EXECUTE FUNCTION public.refresh_clashes_after_project_change();
REVOKE ALL ON FUNCTION public.refresh_project_clashes(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_clashes_after_project_change() FROM PUBLIC, anon, authenticated;

-- An inbox row is created by database triggers, so a successful write always creates its alert.
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('clash', 'grievance')),
  entity_id text NOT NULL,
  recipient_department_id text REFERENCES public.departments(id) ON DELETE CASCADE,
  recipient_role text CHECK (recipient_role = 'admin'),
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_recipient CHECK (
    (recipient_department_id IS NOT NULL AND recipient_role IS NULL) OR
    (recipient_department_id IS NULL AND recipient_role = 'admin')
  )
);
CREATE INDEX IF NOT EXISTS notifications_department_time_idx
  ON public.notifications(recipient_department_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE (read_at) ON public.notifications TO authenticated;
CREATE POLICY "Staff read assigned notifications" ON public.notifications FOR SELECT TO authenticated
USING (public.is_admin() OR public.is_department_officer(recipient_department_id));
CREATE POLICY "Staff mark assigned notifications read" ON public.notifications FOR UPDATE TO authenticated
USING (public.is_admin() OR public.is_department_officer(recipient_department_id))
WITH CHECK (public.is_admin() OR public.is_department_officer(recipient_department_id));

CREATE OR REPLACE FUNCTION public.notify_clash()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE should_send boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    should_send := true;
  ELSE
    should_send := OLD.status IS DISTINCT FROM NEW.status
      OR OLD.severity IS DISTINCT FROM NEW.severity;
  END IF;
  IF should_send AND NEW.status = 'pending_review' AND NEW.severity IN ('high', 'critical') THEN
    INSERT INTO public.notifications (delivery_key, kind, entity_id, recipient_department_id, title, body)
    SELECT 'clash:' || NEW.id || ':' || dept, 'clash', NEW.id, dept,
      'Coordination alert: ' || NEW.road_name,
      'Two work orders need schedule review. Open the coordination page for details.'
    FROM (SELECT DISTINCT unnest(ARRAY[NEW.department_a_id, NEW.department_b_id]) AS dept) recipients
    WHERE dept IS NOT NULL
    ON CONFLICT (delivery_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_clash ON public.clashes;
CREATE TRIGGER trg_notify_clash AFTER INSERT OR UPDATE OF severity, status ON public.clashes
FOR EACH ROW EXECUTE FUNCTION public.notify_clash();

CREATE OR REPLACE FUNCTION public.notify_grievance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_department text;
BEGIN
  SELECT department_id INTO target_department FROM public.projects WHERE id = NEW.project_id;
  INSERT INTO public.notifications (
    delivery_key, kind, entity_id, recipient_department_id, recipient_role, title, body
  ) VALUES (
    'grievance:' || NEW.id, 'grievance', NEW.id, target_department,
    CASE WHEN target_department IS NULL THEN 'admin' ELSE NULL END,
    'New grievance ' || NEW.reference_id,
    'A resident report needs review. Open the grievance inbox for details.'
  ) ON CONFLICT (delivery_key) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_grievance ON public.grievances;
CREATE TRIGGER trg_notify_grievance AFTER INSERT ON public.grievances
FOR EACH ROW EXECUTE FUNCTION public.notify_grievance();
REVOKE ALL ON FUNCTION public.notify_clash() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_grievance() FROM PUBLIC, anon, authenticated;

-- Populate alerts for existing published work orders and open cases.
DO $$ DECLARE project_record record; BEGIN
  FOR project_record IN SELECT id FROM public.projects LOOP
    PERFORM public.refresh_project_clashes(project_record.id);
  END LOOP;
END $$;
INSERT INTO public.notifications (delivery_key, kind, entity_id, recipient_department_id, title, body)
SELECT 'clash:' || c.id || ':' || dept, 'clash', c.id, dept,
  'Coordination alert: ' || c.road_name,
  'Two work orders need schedule review. Open the coordination page for details.'
FROM public.clashes c
CROSS JOIN LATERAL (SELECT DISTINCT unnest(ARRAY[c.department_a_id, c.department_b_id]) AS dept) recipients
WHERE c.status = 'pending_review' AND c.severity IN ('high', 'critical') AND dept IS NOT NULL
ON CONFLICT (delivery_key) DO NOTHING;
INSERT INTO public.notifications (delivery_key, kind, entity_id, recipient_department_id, recipient_role, title, body)
SELECT 'grievance:' || g.id, 'grievance', g.id, p.department_id,
  CASE WHEN p.department_id IS NULL THEN 'admin' ELSE NULL END,
  'New grievance ' || g.reference_id,
  'A resident report needs review. Open the grievance inbox for details.'
FROM public.grievances g LEFT JOIN public.projects p ON p.id = g.project_id
WHERE g.status IN ('submitted', 'acknowledged', 'in_review', 'escalated')
ON CONFLICT (delivery_key) DO NOTHING;
