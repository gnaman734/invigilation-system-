-- Enable RLS on all application tables
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- Ensure instructor approval columns exist (idempotent)
ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.instructors
DROP CONSTRAINT IF EXISTS instructors_status_check;

ALTER TABLE public.instructors
ADD CONSTRAINT instructors_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.instructors
ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

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
DROP POLICY IF EXISTS admin_all_rooms ON public.rooms;
DROP POLICY IF EXISTS admin_all_duties ON public.duties;
DROP POLICY IF EXISTS admin_all_analytics_cache ON public.analytics_cache;

DROP POLICY IF EXISTS instructor_select_own_duties ON public.duties;
DROP POLICY IF EXISTS instructor_update_own_duties ON public.duties;
DROP POLICY IF EXISTS instructor_select_own_instructor_profile ON public.instructors;
DROP POLICY IF EXISTS instructor_create_pending_profile ON public.instructors;

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

CREATE POLICY admin_all_rooms
ON public.rooms
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
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor'
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
