-- =========================================================
-- TASK 3: Instructor request workflows (structured version)
-- Purpose:
--   - Duty change requests (swap)
--   - Duty issue reports
-- Safe to re-run (idempotent)
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.duty_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_id uuid REFERENCES public.duties(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES public.instructors(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'swap' CHECK (request_type IN ('swap')),
  reason text,
  preferred_duty_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.duty_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_id uuid REFERENCES public.duties(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES public.instructors(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('room_issue', 'timing_issue', 'attendance_issue', 'other')),
  message text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- 2) Helpful indexes
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_duty_change_requests_instructor_id
  ON public.duty_change_requests(instructor_id);

CREATE INDEX IF NOT EXISTS idx_duty_change_requests_status
  ON public.duty_change_requests(status);

CREATE INDEX IF NOT EXISTS idx_duty_issue_reports_instructor_id
  ON public.duty_issue_reports(instructor_id);

CREATE INDEX IF NOT EXISTS idx_duty_issue_reports_status
  ON public.duty_issue_reports(status);

-- ---------------------------------------------------------
-- 3) updated_at trigger utility
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_duty_change_requests_set_updated_at ON public.duty_change_requests;
CREATE TRIGGER trg_duty_change_requests_set_updated_at
BEFORE UPDATE ON public.duty_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_duty_issue_reports_set_updated_at ON public.duty_issue_reports;
CREATE TRIGGER trg_duty_issue_reports_set_updated_at
BEFORE UPDATE ON public.duty_issue_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ---------------------------------------------------------
-- 4) Security helper
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_approved_instructor_owner(target_instructor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.instructors i
    WHERE i.id = target_instructor_id
      AND i.auth_id = auth.uid()
      AND i.status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_approved_instructor_owner(uuid) TO authenticated;

-- ---------------------------------------------------------
-- 5) RLS enable + policy reset
-- ---------------------------------------------------------
ALTER TABLE public.duty_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_issue_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_duty_change_requests ON public.duty_change_requests;
DROP POLICY IF EXISTS admin_all_duty_issue_reports ON public.duty_issue_reports;

DROP POLICY IF EXISTS instructor_select_own_duty_change_requests ON public.duty_change_requests;
DROP POLICY IF EXISTS instructor_insert_own_duty_change_requests ON public.duty_change_requests;
DROP POLICY IF EXISTS instructor_update_own_duty_change_requests ON public.duty_change_requests;
DROP POLICY IF EXISTS instructor_delete_own_duty_change_requests ON public.duty_change_requests;

DROP POLICY IF EXISTS instructor_select_own_duty_issue_reports ON public.duty_issue_reports;
DROP POLICY IF EXISTS instructor_insert_own_duty_issue_reports ON public.duty_issue_reports;
DROP POLICY IF EXISTS instructor_update_own_duty_issue_reports ON public.duty_issue_reports;
DROP POLICY IF EXISTS instructor_delete_own_duty_issue_reports ON public.duty_issue_reports;

-- ---------------------------------------------------------
-- 6) Admin policies (full access)
-- ---------------------------------------------------------
CREATE POLICY admin_all_duty_change_requests
ON public.duty_change_requests
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY admin_all_duty_issue_reports
ON public.duty_issue_reports
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------
-- 7) Instructor policies (own records only)
-- ---------------------------------------------------------
CREATE POLICY instructor_select_own_duty_change_requests
ON public.duty_change_requests
FOR SELECT
TO authenticated
USING (public.is_approved_instructor_owner(instructor_id));

CREATE POLICY instructor_insert_own_duty_change_requests
ON public.duty_change_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_approved_instructor_owner(instructor_id));

CREATE POLICY instructor_update_own_duty_change_requests
ON public.duty_change_requests
FOR UPDATE
TO authenticated
USING (public.is_approved_instructor_owner(instructor_id))
WITH CHECK (public.is_approved_instructor_owner(instructor_id));

CREATE POLICY instructor_delete_own_duty_change_requests
ON public.duty_change_requests
FOR DELETE
TO authenticated
USING (public.is_approved_instructor_owner(instructor_id));

CREATE POLICY instructor_select_own_duty_issue_reports
ON public.duty_issue_reports
FOR SELECT
TO authenticated
USING (public.is_approved_instructor_owner(instructor_id));

CREATE POLICY instructor_insert_own_duty_issue_reports
ON public.duty_issue_reports
FOR INSERT
TO authenticated
WITH CHECK (public.is_approved_instructor_owner(instructor_id));

CREATE POLICY instructor_update_own_duty_issue_reports
ON public.duty_issue_reports
FOR UPDATE
TO authenticated
USING (public.is_approved_instructor_owner(instructor_id))
WITH CHECK (public.is_approved_instructor_owner(instructor_id));

CREATE POLICY instructor_delete_own_duty_issue_reports
ON public.duty_issue_reports
FOR DELETE
TO authenticated
USING (public.is_approved_instructor_owner(instructor_id));

-- ---------------------------------------------------------
-- 8) Grants
-- ---------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.duty_change_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.duty_issue_reports TO authenticated;

COMMIT;
