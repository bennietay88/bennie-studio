-- Internal staff role and sales prospecting workspace.
-- Apply manually in Supabase SQL Editor before using the Prospecting module.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.platform_schema_versions (
  version text PRIMARY KEY,
  description text,
  applied_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  industry text,
  location text,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  social_url text,
  source text NOT NULL DEFAULT 'manual',
  website_status text NOT NULL DEFAULT 'unknown',
  opportunity_level text NOT NULL DEFAULT 'medium',
  outreach_status text NOT NULL DEFAULT 'not_started',
  status text NOT NULL DEFAULT 'new',
  audit_score integer,
  last_audit_at timestamptz,
  next_follow_up_at timestamptz,
  preview_url text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  notes text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospects_website_status_check
    CHECK (website_status IN ('unknown', 'no_website', 'weak', 'average', 'strong')),
  CONSTRAINT prospects_opportunity_level_check
    CHECK (opportunity_level IN ('low', 'medium', 'high')),
  CONSTRAINT prospects_outreach_status_check
    CHECK (outreach_status IN ('not_started', 'queued', 'contacted', 'replied', 'call_booked', 'won', 'lost')),
  CONSTRAINT prospects_status_check
    CHECK (status IN ('new', 'qualified', 'appointment_booked', 'converted', 'lost'))
);

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS contact_whatsapp text,
  ADD COLUMN IF NOT EXISTS social_url text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.prospects
SET
  website_status = CASE lower(coalesce(website_status, 'unknown'))
    WHEN 'pending' THEN 'unknown'
    WHEN 'weak' THEN 'weak'
    WHEN 'average' THEN 'average'
    WHEN 'strong' THEN 'strong'
    WHEN 'no website' THEN 'no_website'
    WHEN 'no_website' THEN 'no_website'
    ELSE 'unknown'
  END,
  opportunity_level = CASE lower(coalesce(opportunity_level, 'medium'))
    WHEN 'high' THEN 'high'
    WHEN 'low' THEN 'low'
    ELSE 'medium'
  END,
  outreach_status = CASE lower(coalesce(outreach_status, 'not_started'))
    WHEN 'pending' THEN 'not_started'
    WHEN 'not started' THEN 'not_started'
    WHEN 'not_started' THEN 'not_started'
    WHEN 'queued' THEN 'queued'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'replied' THEN 'replied'
    WHEN 'call booked' THEN 'call_booked'
    WHEN 'call_booked' THEN 'call_booked'
    WHEN 'won' THEN 'won'
    WHEN 'lost' THEN 'lost'
    ELSE 'not_started'
  END,
  status = CASE lower(coalesce(status, 'new'))
    WHEN 'qualified' THEN 'qualified'
    WHEN 'appointment_booked' THEN 'appointment_booked'
    WHEN 'appointment booked' THEN 'appointment_booked'
    WHEN 'converted' THEN 'converted'
    WHEN 'lost' THEN 'lost'
    ELSE 'new'
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prospects_website_status_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_website_status_check
      CHECK (website_status IN ('unknown', 'no_website', 'weak', 'average', 'strong'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prospects_opportunity_level_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_opportunity_level_check
      CHECK (opportunity_level IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prospects_outreach_status_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_outreach_status_check
      CHECK (outreach_status IN ('not_started', 'queued', 'contacted', 'replied', 'call_booked', 'won', 'lost'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prospects_status_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_status_check
      CHECK (status IN ('new', 'qualified', 'appointment_booked', 'converted', 'lost'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prospects_created_at
  ON public.prospects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prospects_outreach_status
  ON public.prospects (outreach_status, next_follow_up_at);

CREATE INDEX IF NOT EXISTS idx_prospects_opportunity
  ON public.prospects (opportunity_level, website_status);

CREATE TABLE IF NOT EXISTS public.audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  score integer,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_reports
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_audit_reports_prospect
  ON public.audit_reports (prospect_id, created_at DESC);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform operators can read prospects" ON public.prospects;
CREATE POLICY "Platform operators can read prospects"
  ON public.prospects
  FOR SELECT
  USING (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform operators can create prospects" ON public.prospects;
CREATE POLICY "Platform operators can create prospects"
  ON public.prospects
  FOR INSERT
  WITH CHECK (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform operators can update prospects" ON public.prospects;
CREATE POLICY "Platform operators can update prospects"
  ON public.prospects
  FOR UPDATE
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform operators can delete prospects" ON public.prospects;
CREATE POLICY "Platform operators can delete prospects"
  ON public.prospects
  FOR DELETE
  USING (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform operators can read audit reports" ON public.audit_reports;
CREATE POLICY "Platform operators can read audit reports"
  ON public.audit_reports
  FOR SELECT
  USING (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform operators can create audit reports" ON public.audit_reports;
CREATE POLICY "Platform operators can create audit reports"
  ON public.audit_reports
  FOR INSERT
  WITH CHECK (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform operators can update audit reports" ON public.audit_reports;
CREATE POLICY "Platform operators can update audit reports"
  ON public.audit_reports
  FOR UPDATE
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.audit_reports TO authenticated;

INSERT INTO public.platform_schema_versions (version, description)
VALUES (
  '202607110001_platform_staff_prospecting',
  'Adds platform_staff role support and internal sales prospecting tables.'
)
ON CONFLICT (version) DO UPDATE
SET
  description = EXCLUDED.description,
  applied_at = now();

NOTIFY pgrst, 'reload schema';
