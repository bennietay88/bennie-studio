-- Fix businesses.marketing_status defaults and legacy values so new onboarding
-- inserts cannot violate businesses_marketing_status_check.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS marketing_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS marketing_plan text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS marketing_trial_ends_at timestamptz;

UPDATE public.businesses
SET marketing_status = CASE
  WHEN marketing_status IN ('none', 'trialing', 'active', 'expired', 'canceled') THEN marketing_status
  WHEN marketing_status IN ('cancelled', 'canceled') THEN 'canceled'
  WHEN marketing_status IN ('trial', 'extend_trial') THEN 'trialing'
  WHEN marketing_status IN ('inactive', 'unpaid', 'past_due', 'suspended') THEN 'expired'
  WHEN marketing_status IS NULL OR marketing_status = '' THEN 'none'
  ELSE 'none'
END
WHERE marketing_status IS NULL
   OR marketing_status = ''
   OR marketing_status NOT IN ('none', 'trialing', 'active', 'expired', 'canceled');

ALTER TABLE public.businesses
  ALTER COLUMN marketing_status SET DEFAULT 'none';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_marketing_status_check'
      AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses
      DROP CONSTRAINT businesses_marketing_status_check;
  END IF;

  ALTER TABLE public.businesses
    ADD CONSTRAINT businesses_marketing_status_check
    CHECK (marketing_status IN ('none', 'trialing', 'active', 'expired', 'canceled'));
END $$;

