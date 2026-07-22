-- Bennie Studio manual Supabase catch-up migration
-- Date: 2026-06-23
--
-- Purpose:
-- - Adds missing business subscription/trial/domain/dashboard columns used by the app.
-- - Rebuilds fragile business status constraints so existing rows do not block updates.
-- - Adds optional core preview/button/lead columns used by the revenue path.
-- - Adds optional affiliate program fields and safe default platform tiers.
-- - Enables optional realtime tables only when those tables exist.
--
-- How to use:
-- 1. Open Supabase SQL Editor.
-- 2. Paste this full file.
-- 3. Run it once.
-- 4. Refresh the app and retry the previous action.
--
-- This file is intentionally idempotent and safe to rerun.

BEGIN;

-- ============================================================
-- 1. Businesses: subscription, trial, domain, visibility fields
-- ============================================================

ALTER TABLE IF EXISTS public.businesses
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS platform_type text DEFAULT 'waas',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS ai_credits integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ai_credits_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS marketing_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_plan text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dashboard_visible_features jsonb,
  ADD COLUMN IF NOT EXISTS dashboard_hidden_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dashboard_admin_only_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dashboard_visibility_profile text NOT NULL DEFAULT 'simple_website_client',
  ADD COLUMN IF NOT EXISTS dashboard_visibility_notes text,
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_status text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_domain_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_domain_error text,
  ADD COLUMN IF NOT EXISTS ssl_status text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS ssl_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS domain_dns_records jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.businesses
SET
  status = lower(trim(status))
WHERE status IS NOT NULL;

UPDATE public.businesses
SET
  subscription_status = lower(trim(subscription_status))
WHERE subscription_status IS NOT NULL;

UPDATE public.businesses
SET
  marketing_status = lower(trim(marketing_status))
WHERE marketing_status IS NOT NULL;

UPDATE public.businesses
SET
  status = CASE
    WHEN status IN ('active', 'inactive', 'suspended', 'trial', 'trialing', 'unpaid', 'cancelled', 'canceled', 'terminated', 'pending') THEN status
    WHEN status IS NULL OR status = '' THEN 'active'
    ELSE 'active'
  END,
  subscription_status = CASE
    WHEN subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'cancelled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused') THEN subscription_status
    WHEN status IN ('trial', 'trialing') THEN 'trialing'
    WHEN status = 'active' THEN 'active'
    WHEN status IN ('unpaid', 'suspended') THEN 'past_due'
    WHEN status IN ('cancelled', 'canceled', 'inactive', 'terminated') THEN 'canceled'
    ELSE 'trialing'
  END,
  marketing_status = CASE
    WHEN marketing_status IN ('none', 'trialing', 'active', 'expired', 'canceled', 'cancelled', 'past_due', 'suspended') THEN marketing_status
    WHEN marketing_status IS NULL OR marketing_status = '' THEN 'none'
    ELSE 'none'
  END,
  platform_type = COALESCE(NULLIF(platform_type, ''), 'waas'),
  marketing_plan = COALESCE(NULLIF(marketing_plan, ''), 'none'),
  dashboard_hidden_features = COALESCE(dashboard_hidden_features, '[]'::jsonb),
  dashboard_admin_only_features = COALESCE(dashboard_admin_only_features, '[]'::jsonb),
  dashboard_visibility_profile = COALESCE(NULLIF(dashboard_visibility_profile, ''), 'simple_website_client'),
  custom_domain_status = COALESCE(NULLIF(custom_domain_status, ''), 'not_connected'),
  ssl_status = COALESCE(NULLIF(ssl_status, ''), 'not_connected'),
  domain_dns_records = COALESCE(domain_dns_records, '[]'::jsonb);

UPDATE public.businesses
SET trial_ends_at = now() + interval '14 days'
WHERE subscription_status = 'trialing'
  AND trial_ends_at IS NULL;

ALTER TABLE IF EXISTS public.businesses
  DROP CONSTRAINT IF EXISTS businesses_status_check;

ALTER TABLE IF EXISTS public.businesses
  ADD CONSTRAINT businesses_status_check
  CHECK (status IN (
    'active',
    'inactive',
    'suspended',
    'trial',
    'trialing',
    'unpaid',
    'cancelled',
    'canceled',
    'terminated',
    'pending'
  ));

ALTER TABLE IF EXISTS public.businesses
  DROP CONSTRAINT IF EXISTS businesses_subscription_status_check;

ALTER TABLE IF EXISTS public.businesses
  ADD CONSTRAINT businesses_subscription_status_check
  CHECK (subscription_status IN (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'cancelled',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  ));

ALTER TABLE IF EXISTS public.businesses
  DROP CONSTRAINT IF EXISTS businesses_marketing_status_check;

ALTER TABLE IF EXISTS public.businesses
  ADD CONSTRAINT businesses_marketing_status_check
  CHECK (marketing_status IN (
    'none',
    'trialing',
    'active',
    'expired',
    'canceled',
    'cancelled',
    'past_due',
    'suspended'
  ));

ALTER TABLE IF EXISTS public.businesses
  DROP CONSTRAINT IF EXISTS businesses_custom_domain_status_check;

ALTER TABLE IF EXISTS public.businesses
  ADD CONSTRAINT businesses_custom_domain_status_check
  CHECK (custom_domain_status IN (
    'not_connected',
    'dns_pending',
    'dns_detected',
    'ssl_pending',
    'connected',
    'error'
  ));

ALTER TABLE IF EXISTS public.businesses
  DROP CONSTRAINT IF EXISTS businesses_ssl_status_check;

ALTER TABLE IF EXISTS public.businesses
  ADD CONSTRAINT businesses_ssl_status_check
  CHECK (ssl_status IN (
    'not_connected',
    'pending',
    'issued',
    'error'
  ));

CREATE INDEX IF NOT EXISTS idx_businesses_subscription_status
  ON public.businesses (subscription_status);

CREATE INDEX IF NOT EXISTS idx_businesses_trial_ends_at
  ON public.businesses (trial_ends_at);

CREATE INDEX IF NOT EXISTS idx_businesses_stripe_customer_id
  ON public.businesses (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_custom_domain_lookup
  ON public.businesses ((lower(custom_domain)))
  WHERE custom_domain IS NOT NULL;

-- ============================================================
-- 2. Websites/leads: preview, button health, lead attribution
-- ============================================================

ALTER TABLE IF EXISTS public.websites
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS generation_error text,
  ADD COLUMN IF NOT EXISTS preview_status text DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS button_health jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_report jsonb DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS website_id uuid,
  ADD COLUMN IF NOT EXISTS source_page text,
  ADD COLUMN IF NOT EXISTS form_name text,
  ADD COLUMN IF NOT EXISTS raw_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS form_version text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'leads'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'websites'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_website_id_fkey'
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_website_id_fkey
      FOREIGN KEY (website_id)
      REFERENCES public.websites(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.website_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  technical_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_websites_business_preview_status
  ON public.websites (business_id, preview_status);

CREATE INDEX IF NOT EXISTS idx_leads_website_id
  ON public.leads (website_id);

CREATE INDEX IF NOT EXISTS idx_website_error_logs_business
  ON public.website_error_logs (business_id, created_at DESC);

-- ============================================================
-- 3. Affiliate program: platform affiliate tier support
-- ============================================================

ALTER TABLE IF EXISTS public.affiliate_programs
  ADD COLUMN IF NOT EXISTS is_platform_program boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS fixed_commission_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_duration_months integer;

ALTER TABLE IF EXISTS public.affiliate_programs
  ALTER COLUMN business_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.affiliate_programs
  DROP CONSTRAINT IF EXISTS affiliate_programs_commission_type_check;

ALTER TABLE IF EXISTS public.affiliate_programs
  ADD CONSTRAINT affiliate_programs_commission_type_check
  CHECK (commission_type IN ('percentage', 'fixed'));

ALTER TABLE IF EXISTS public.commission_tiers
  ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS fixed_commission_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_referral_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_sales_volume numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_duration_months integer,
  ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;

ALTER TABLE IF EXISTS public.commission_tiers
  DROP CONSTRAINT IF EXISTS commission_tiers_commission_type_check;

ALTER TABLE IF EXISTS public.commission_tiers
  ADD CONSTRAINT commission_tiers_commission_type_check
  CHECK (commission_type IN ('percentage', 'fixed'));

ALTER TABLE IF EXISTS public.affiliates
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS application_notes text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

ALTER TABLE IF EXISTS public.affiliates
  DROP CONSTRAINT IF EXISTS affiliates_status_check;

ALTER TABLE IF EXISTS public.affiliates
  ADD CONSTRAINT affiliates_status_check
  CHECK (status IN ('pending', 'active', 'approved', 'rejected', 'suspended'));

ALTER TABLE IF EXISTS public.affiliate_referrals
  ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'signup',
  ADD COLUMN IF NOT EXISTS plan_slug text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS commission_status text DEFAULT 'pending';

ALTER TABLE IF EXISTS public.affiliate_referrals
  DROP CONSTRAINT IF EXISTS affiliate_referrals_commission_status_check;

ALTER TABLE IF EXISTS public.affiliate_referrals
  ADD CONSTRAINT affiliate_referrals_commission_status_check
  CHECK (commission_status IN ('pending', 'approved', 'paid', 'void'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'affiliate_programs'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_programs_one_platform
      ON public.affiliate_programs (is_platform_program)
      WHERE is_platform_program = true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'affiliates'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliates_platform_uid
      ON public.affiliates (uid)
      WHERE business_id IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'affiliate_referrals'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_event_type
      ON public.affiliate_referrals (affiliate_id, event_type, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_visitor
      ON public.affiliate_referrals (affiliate_id, visitor_id)
      WHERE visitor_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'affiliate_programs'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.affiliate_programs
    WHERE is_platform_program = true
  ) THEN
    INSERT INTO public.affiliate_programs (
      is_enabled,
      is_platform_program,
      base_commission_rate,
      payout_minimum,
      cookie_duration_days,
      commission_type,
      terms_and_conditions
    )
    VALUES (
      true,
      true,
      0.10,
      50,
      30,
      'percentage',
      'Affiliates promote Bennie Studio managed website subscription plans. Commission is counted only for valid referred customers who become paying customers.'
    );
  END IF;
END $$;

DO $$
DECLARE
  platform_program_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'affiliate_programs'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'commission_tiers'
  ) THEN
    SELECT id
    INTO platform_program_id
    FROM public.affiliate_programs
    WHERE is_platform_program = true
    LIMIT 1;

    IF platform_program_id IS NOT NULL THEN
      INSERT INTO public.commission_tiers (
        program_id,
        name,
        commission_rate,
        requirement_type,
        requirement_value,
        commission_type,
        minimum_referral_count,
        minimum_sales_volume,
        is_recurring,
        commission_duration_months,
        is_custom
      )
      VALUES
        (platform_program_id, 'Starter Affiliate', 0.10, 'referral_count', 0, 'percentage', 0, 0, false, NULL, false),
        (platform_program_id, 'Growth Affiliate', 0.15, 'referral_count', 5, 'percentage', 5, 0, false, NULL, false),
        (platform_program_id, 'Partner Affiliate', 0.20, 'referral_count', 20, 'percentage', 20, 0, false, NULL, false),
        (platform_program_id, 'Strategic Partner', 0.00, 'referral_count', 999999, 'percentage', 999999, 0, false, NULL, true)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 4. Optional realtime support. Ignore duplicate publication rows.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
