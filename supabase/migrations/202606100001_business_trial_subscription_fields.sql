-- Adds the business subscription/trial fields expected by onboarding,
-- billing, protected routes, and superadmin trial extension controls.
-- Safe to run multiple times.

ALTER TABLE public.businesses
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
  ADD COLUMN IF NOT EXISTS dashboard_visibility_notes text;

UPDATE public.businesses
SET platform_type = 'waas'
WHERE platform_type IS NULL OR platform_type = '';

UPDATE public.businesses
SET dashboard_hidden_features = '[]'::jsonb
WHERE dashboard_hidden_features IS NULL;

UPDATE public.businesses
SET dashboard_admin_only_features = '[]'::jsonb
WHERE dashboard_admin_only_features IS NULL;

UPDATE public.businesses
SET dashboard_visibility_profile = 'simple_website_client'
WHERE dashboard_visibility_profile IS NULL OR dashboard_visibility_profile = '';

UPDATE public.businesses
SET status = CASE
  WHEN status IN ('active', 'inactive', 'suspended') THEN status
  WHEN status IN ('trial', 'extend_trial', 'trialing') THEN 'active'
  WHEN status IN ('unpaid', 'past_due') THEN 'suspended'
  WHEN status IN ('cancelled', 'canceled') THEN 'inactive'
  WHEN status IS NULL OR status = '' THEN 'active'
  ELSE 'active'
END
WHERE status IS NULL
   OR status = ''
   OR status NOT IN ('active', 'inactive', 'suspended');

UPDATE public.businesses
SET subscription_status = CASE
  WHEN subscription_status IN ('trialing', 'active', 'past_due', 'canceled') THEN subscription_status
  WHEN subscription_status IN ('cancelled', 'inactive') THEN 'canceled'
  WHEN subscription_status IN ('unpaid', 'suspended') THEN 'past_due'
  WHEN status = 'active' THEN 'active'
  WHEN status = 'suspended' THEN 'past_due'
  ELSE 'trialing'
END
WHERE subscription_status IS NULL
   OR subscription_status NOT IN ('trialing', 'active', 'past_due', 'canceled');

UPDATE public.businesses
SET marketing_status = CASE
  WHEN marketing_status IN ('none', 'trialing', 'active', 'expired', 'canceled') THEN marketing_status
  WHEN marketing_status IN ('cancelled', 'inactive') THEN 'canceled'
  WHEN marketing_status IN ('unpaid', 'past_due', 'suspended') THEN 'expired'
  WHEN marketing_status IS NULL OR marketing_status = '' THEN 'none'
  ELSE 'none'
END
WHERE marketing_status IS NULL
   OR marketing_status = ''
   OR marketing_status NOT IN ('none', 'trialing', 'active', 'expired', 'canceled');

UPDATE public.businesses
SET marketing_plan = 'none'
WHERE marketing_plan IS NULL OR marketing_plan = '';

UPDATE public.businesses
SET subscription_status = CASE
  WHEN subscription_status IN ('trialing', 'active', 'past_due', 'canceled') THEN subscription_status
  WHEN status = 'active' THEN 'active'
  WHEN status = 'suspended' THEN 'past_due'
  ELSE 'trialing'
END
WHERE subscription_status IS NULL;

UPDATE public.businesses
SET trial_ends_at = now() + interval '14 days'
WHERE subscription_status = 'trialing'
  AND trial_ends_at IS NULL;

DO $$
BEGIN
  ALTER TABLE public.businesses
    DROP CONSTRAINT IF EXISTS businesses_status_check;

  ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_status_check
    CHECK (status IN ('active', 'inactive', 'suspended'));

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_subscription_status_check'
      AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_subscription_status_check
      CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_marketing_status_check'
      AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_marketing_status_check
      CHECK (marketing_status IN ('none', 'trialing', 'active', 'expired', 'canceled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_subscription_status
  ON public.businesses (subscription_status);

CREATE INDEX IF NOT EXISTS idx_businesses_trial_ends_at
  ON public.businesses (trial_ends_at);

CREATE INDEX IF NOT EXISTS idx_businesses_stripe_customer_id
  ON public.businesses (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
