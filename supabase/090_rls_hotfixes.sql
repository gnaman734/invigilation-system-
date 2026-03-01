-- =========================================================
-- HOTFIX BUNDLE: RLS role claims + instructor duty ownership
-- Use on existing environments when any of these happen:
--   1) Role checks fail because JWT uses different metadata keys.
--   2) Instructor gets 403 while updating own duty/arrival.
-- Safe to re-run.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- A) Role claim compatibility helpers
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    coalesce(
      auth.jwt() -> 'user_metadata' ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'user_role',
      ''
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_role() = 'instructor';
$$;

-- Rebuild role-based policies
DROP POLICY IF EXISTS admin_all_instructors ON public.instructors;
DROP POLICY IF EXISTS admin_all_exams ON public.exams;
DROP POLICY IF EXISTS admin_all_floors ON public.floors;
DROP POLICY IF EXISTS admin_all_rooms ON public.rooms;
DROP POLICY IF EXISTS admin_all_exam_rooms ON public.exam_rooms;
DROP POLICY IF EXISTS admin_all_exam_room_instructors ON public.exam_room_instructors;
DROP POLICY IF EXISTS admin_all_duties ON public.duties;
DROP POLICY IF EXISTS admin_all_analytics_cache ON public.analytics_cache;

DROP POLICY IF EXISTS instructor_read_floors ON public.floors;
DROP POLICY IF EXISTS instructor_read_exam_rooms ON public.exam_rooms;

CREATE POLICY admin_all_instructors
ON public.instructors
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY admin_all_exams
ON public.exams
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY admin_all_floors
ON public.floors
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY admin_all_rooms
ON public.rooms
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY admin_all_exam_rooms
ON public.exam_rooms
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY admin_all_exam_room_instructors
ON public.exam_room_instructors
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY admin_all_duties
ON public.duties
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY admin_all_analytics_cache
ON public.analytics_cache
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY instructor_read_floors
ON public.floors
FOR SELECT
TO authenticated
USING (public.is_instructor());

CREATE POLICY instructor_read_exam_rooms
ON public.exam_rooms
FOR SELECT
TO authenticated
USING (public.is_instructor());

-- ---------------------------------------------------------
-- B) Instructor identity normalization + duty ownership fixes
-- ---------------------------------------------------------
UPDATE public.instructors i
SET email = lower(trim(i.email))
WHERE i.email IS NOT NULL
  AND i.email <> lower(trim(i.email));

UPDATE public.instructors i
SET auth_id = au.id
FROM auth.users au
WHERE i.auth_id IS NULL
  AND lower(trim(coalesce(i.email, ''))) = lower(trim(coalesce(au.email, '')));

CREATE OR REPLACE FUNCTION public.current_instructor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id
  FROM public.instructors i
  WHERE (
    i.auth_id = auth.uid()
    OR lower(trim(coalesce(i.email, ''))) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  )
    AND coalesce(i.status, 'approved') <> 'rejected'
  ORDER BY CASE WHEN i.auth_id = auth.uid() THEN 0 ELSE 1 END, i.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_instructor_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.jwt_instructor_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN coalesce(auth.jwt() -> 'user_metadata' ->> 'instructor_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (auth.jwt() -> 'user_metadata' ->> 'instructor_id')::uuid
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.jwt_instructor_id() TO authenticated;

DROP POLICY IF EXISTS instructor_select_own_duties ON public.duties;
DROP POLICY IF EXISTS instructor_update_own_duties ON public.duties;

CREATE POLICY instructor_select_own_duties
ON public.duties
FOR SELECT
TO authenticated
USING (
  duties.instructor_id = coalesce(public.jwt_instructor_id(), public.current_instructor_id())
);

CREATE POLICY instructor_update_own_duties
ON public.duties
FOR UPDATE
TO authenticated
USING (
  duties.instructor_id = coalesce(public.jwt_instructor_id(), public.current_instructor_id())
)
WITH CHECK (
  duties.instructor_id = coalesce(public.jwt_instructor_id(), public.current_instructor_id())
);

GRANT SELECT, UPDATE ON TABLE public.duties TO authenticated;

COMMIT;
