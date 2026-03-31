-- Enable RLS on all application tables
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_number int NOT NULL,
  floor_label text NOT NULL,
  building text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
  max_instructors int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, room_id)
);

CREATE TABLE IF NOT EXISTS public.exam_room_instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_room_id uuid REFERENCES public.exam_rooms(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES public.instructors(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_room_id, instructor_id)
);

ALTER TABLE IF EXISTS public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_room_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- Ensure instructor approval columns exist (idempotent)
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.instructors
DROP CONSTRAINT IF EXISTS instructors_status_check;

ALTER TABLE public.instructors
ADD CONSTRAINT instructors_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.exams
ADD COLUMN IF NOT EXISTS shift_label text,
ADD COLUMN IF NOT EXISTS shift_start time,
ADD COLUMN IF NOT EXISTS shift_end time,
ADD COLUMN IF NOT EXISTS day_of_week text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS total_students int,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'upcoming';

ALTER TABLE public.exams
DROP CONSTRAINT IF EXISTS exams_status_check;

ALTER TABLE public.exams
ADD CONSTRAINT exams_status_check CHECK (status IN ('upcoming', 'ongoing', 'completed'));

ALTER TABLE IF EXISTS public.rooms
ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES public.floors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE IF EXISTS public.exam_rooms
ADD COLUMN IF NOT EXISTS max_instructors int DEFAULT 1;

ALTER TABLE IF EXISTS public.instructors
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE IF EXISTS public.rooms
ALTER COLUMN capacity SET DEFAULT 30;

UPDATE public.rooms
SET capacity = 30
WHERE capacity IS NULL;

ALTER TABLE IF EXISTS public.duties
ADD COLUMN IF NOT EXISTS exam_room_instructor_id uuid REFERENCES public.exam_room_instructors(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.duties
DROP CONSTRAINT IF EXISTS duties_status_check;

ALTER TABLE IF EXISTS public.duties
ADD CONSTRAINT duties_status_check CHECK (status IN ('pending', 'on-time', 'late', 'cancelled'));

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

-- Clean up existing policies (idempotent)
DROP POLICY IF EXISTS admin_all_instructors ON public.instructors;
DROP POLICY IF EXISTS admin_all_exams ON public.exams;
DROP POLICY IF EXISTS admin_all_floors ON public.floors;
DROP POLICY IF EXISTS admin_all_rooms ON public.rooms;
DROP POLICY IF EXISTS admin_all_exam_rooms ON public.exam_rooms;
DROP POLICY IF EXISTS admin_all_exam_room_instructors ON public.exam_room_instructors;
DROP POLICY IF EXISTS admin_all_duties ON public.duties;
DROP POLICY IF EXISTS admin_all_analytics_cache ON public.analytics_cache;

DROP POLICY IF EXISTS instructor_select_own_duties ON public.duties;
DROP POLICY IF EXISTS instructor_update_own_duties ON public.duties;
DROP POLICY IF EXISTS instructor_select_own_instructor_profile ON public.instructors;
DROP POLICY IF EXISTS instructor_create_pending_profile ON public.instructors;
DROP POLICY IF EXISTS instructor_read_floors ON public.floors;
DROP POLICY IF EXISTS instructor_read_exam_rooms ON public.exam_rooms;

-- Admin policies: full access to every table
CREATE POLICY admin_all_instructors
ON public.instructors
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY admin_all_exams
ON public.exams
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY admin_all_floors
ON public.floors
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY admin_all_rooms
ON public.rooms
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY admin_all_exam_rooms
ON public.exam_rooms
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY admin_all_exam_room_instructors
ON public.exam_room_instructors
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY admin_all_duties
ON public.duties
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY admin_all_analytics_cache
ON public.analytics_cache
FOR ALL
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Explicit privileges for authenticated users (RLS still enforces row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.floors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exam_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exam_room_instructors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.duties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instructors TO authenticated;

-- Instructors can read their own profile record
CREATE POLICY instructor_select_own_instructor_profile
ON public.instructors
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

CREATE POLICY instructor_create_pending_profile
ON public.instructors
FOR INSERT
TO authenticated
WITH CHECK (
  auth_id = auth.uid()
  AND status = 'pending'
);

-- Instructor policies: restricted to their own duties
CREATE POLICY instructor_select_own_duties
ON public.duties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.instructors i
    WHERE i.id = duties.instructor_id
      AND i.auth_id = auth.uid()
      AND i.status = 'approved'
  )
);

CREATE POLICY instructor_update_own_duties
ON public.duties
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.instructors i
    WHERE i.id = duties.instructor_id
      AND i.auth_id = auth.uid()
      AND i.status = 'approved'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.instructors i
    WHERE i.id = duties.instructor_id
      AND i.auth_id = auth.uid()
      AND i.status = 'approved'
  )
);

CREATE POLICY instructor_read_floors
ON public.floors
FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY instructor_read_exam_rooms
ON public.exam_rooms
FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

-- Enable Realtime publication for required tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'duties'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.duties';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'analytics_cache'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_cache';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'instructors'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.instructors';
  END IF;
END
$$;

-- Admin helpers for review actions on auth users
CREATE OR REPLACE FUNCTION public.admin_update_auth_user_metadata(target_auth_id uuid, metadata_patch jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admin can update auth metadata';
  END IF;

  UPDATE auth.users
  SET
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || COALESCE(metadata_patch, '{}'::jsonb),
    updated_at = now()
  WHERE id = target_auth_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_auth_user_metadata(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_auth_user_metadata(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_auth_user(target_auth_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admin can delete auth users';
  END IF;

  DELETE FROM auth.users
  WHERE id = target_auth_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_auth_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_auth_user(uuid) TO authenticated;

GRANT SELECT ON TABLE public.pending_requests TO authenticated;

-- Auto-create pending instructor profile from auth signup metadata
CREATE OR REPLACE FUNCTION public.sync_instructor_profile_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  meta_role text;
  meta_name text;
  meta_department text;
BEGIN
  meta_role := LOWER(COALESCE(NEW.raw_user_meta_data ->> 'role', NEW.raw_app_meta_data ->> 'role', ''));

  IF meta_role <> 'instructor' THEN
    RETURN NEW;
  END IF;

  meta_name := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'name', ''), SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), 'Instructor');
  meta_department := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'department', ''), 'Other');

  INSERT INTO public.instructors (name, email, department, status, auth_id)
  VALUES (meta_name, NEW.email, meta_department, 'pending', NEW.id)
  ON CONFLICT (email)
  DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    auth_id = EXCLUDED.auth_id,
    status = CASE
      WHEN public.instructors.status = 'approved' THEN public.instructors.status
      ELSE 'pending'
    END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_instructor_profile_on_signup ON auth.users;
CREATE TRIGGER sync_instructor_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_instructor_profile_from_auth_user();

-- Development helper: auto-confirm email on signup
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  NEW.confirmed_at = COALESCE(NEW.confirmed_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_confirm_user_on_signup ON auth.users;
CREATE TRIGGER auto_confirm_user_on_signup
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_new_users();
