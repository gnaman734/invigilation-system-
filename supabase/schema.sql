-- Enable extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  department text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_duties int DEFAULT 0,
  late_arrivals int DEFAULT 0,
  on_time_arrivals int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  exam_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text NOT NULL,
  building text,
  capacity int
);

CREATE TABLE IF NOT EXISTS public.duties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  instructor_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL,
  reporting_time time NOT NULL,
  arrival_time time,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'on-time', 'late')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid UNIQUE REFERENCES public.instructors(id) ON DELETE CASCADE,
  total_duties int DEFAULT 0,
  late_count int DEFAULT 0,
  on_time_count int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

DROP VIEW IF EXISTS public.duties_detailed;
CREATE VIEW public.duties_detailed AS
SELECT
  d.id AS duty_id,
  d.exam_id,
  e.subject,
  e.exam_date,
  e.start_time,
  e.end_time,
  d.room_id,
  r.room_number,
  r.building,
  r.capacity,
  d.instructor_id,
  i.name AS instructor_name,
  i.email AS instructor_email,
  i.department,
  d.reporting_time,
  d.arrival_time,
  d.status,
  d.created_at
FROM public.duties d
LEFT JOIN public.exams e ON e.id = d.exam_id
LEFT JOIN public.rooms r ON r.id = d.room_id
LEFT JOIN public.instructors i ON i.id = d.instructor_id;

DROP VIEW IF EXISTS public.instructor_stats;
CREATE VIEW public.instructor_stats AS
SELECT
  i.id AS instructor_id,
  i.name,
  i.email,
  i.department,
  COUNT(d.id)::int AS total_duties,
  COUNT(*) FILTER (WHERE d.status = 'late')::int AS late_arrivals,
  COUNT(*) FILTER (WHERE d.status = 'on-time')::int AS on_time_arrivals,
  CASE
    WHEN COUNT(d.id) = 0 THEN 0
    ELSE ROUND((COUNT(*) FILTER (WHERE d.status = 'on-time')::numeric / COUNT(d.id)::numeric) * 100, 2)
  END AS punctuality_percentage
FROM public.instructors i
LEFT JOIN public.duties d ON d.instructor_id = i.id
GROUP BY i.id, i.name, i.email, i.department;

DROP VIEW IF EXISTS public.pending_requests;
CREATE VIEW public.pending_requests AS
SELECT
  i.id,
  i.name,
  COALESCE(au.email, i.email) AS email,
  i.department,
  i.created_at,
  i.auth_id
FROM public.instructors i
LEFT JOIN auth.users au ON au.id = i.auth_id
WHERE i.status = 'pending'
ORDER BY i.created_at ASC;

CREATE OR REPLACE FUNCTION public.recalculate_analytics_cache(p_instructor_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_instructor_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.analytics_cache (
    id,
    instructor_id,
    total_duties,
    late_count,
    on_time_count,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    p_instructor_id,
    COUNT(d.id)::int,
    COUNT(*) FILTER (WHERE d.status = 'late')::int,
    COUNT(*) FILTER (WHERE d.status = 'on-time')::int,
    now()
  FROM public.duties d
  WHERE d.instructor_id = p_instructor_id
  ON CONFLICT (instructor_id)
  DO UPDATE SET
    total_duties = EXCLUDED.total_duties,
    late_count = EXCLUDED.late_count,
    on_time_count = EXCLUDED.on_time_count,
    updated_at = now();

  UPDATE public.instructors i
  SET
    total_duties = ac.total_duties,
    late_arrivals = ac.late_count,
    on_time_arrivals = ac.on_time_count
  FROM public.analytics_cache ac
  WHERE i.id = p_instructor_id
    AND ac.instructor_id = p_instructor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_analytics_cache()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_analytics_cache(NEW.instructor_id);

  IF TG_OP = 'UPDATE' AND OLD.instructor_id IS DISTINCT FROM NEW.instructor_id THEN
    PERFORM public.recalculate_analytics_cache(OLD.instructor_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_analytics_cache ON public.duties;
CREATE TRIGGER update_analytics_cache
AFTER INSERT OR UPDATE ON public.duties
FOR EACH ROW
EXECUTE FUNCTION public.update_analytics_cache();
