-- Makes the Client Handover queue operable by trusted internal platform staff.
-- Apply manually in the Supabase SQL Editor after 202607110001.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.is_platform_operator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'platform_staff')
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_operator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_operator() TO authenticated;

CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'Profile Initialized',
  progress integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'In Progress',
  notes text,
  velocity_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_sessions
  ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'Profile Initialized',
  ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'In Progress',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS velocity_metrics jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_business_id
  ON public.onboarding_sessions (business_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status
  ON public.onboarding_sessions (status);

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform operators can view onboarding sessions"
  ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Platform operators can create onboarding sessions"
  ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Platform operators can update onboarding sessions"
  ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Platform operators can delete onboarding sessions"
  ON public.onboarding_sessions;

CREATE POLICY "Platform operators can view onboarding sessions"
  ON public.onboarding_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_platform_operator());

CREATE POLICY "Platform operators can create onboarding sessions"
  ON public.onboarding_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_operator());

CREATE POLICY "Platform operators can update onboarding sessions"
  ON public.onboarding_sessions
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

CREATE POLICY "Platform operators can delete onboarding sessions"
  ON public.onboarding_sessions
  FOR DELETE
  TO authenticated
  USING (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform operators can view handover businesses"
  ON public.businesses;

CREATE POLICY "Platform operators can view handover businesses"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (public.is_platform_operator());

-- Limit delivery staff to changing only the platform field through this RPC.
CREATE OR REPLACE FUNCTION public.set_handover_platform_type(
  p_business_id uuid,
  p_platform_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_platform_type NOT IN ('waas', 'wordpress') THEN
    RAISE EXCEPTION 'Invalid platform type';
  END IF;

  UPDATE public.businesses
  SET platform_type = p_platform_type
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_handover_platform_type(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_handover_platform_type(uuid, text) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_sessions TO authenticated;
GRANT SELECT ON public.businesses TO authenticated;

NOTIFY pgrst, 'reload schema';
