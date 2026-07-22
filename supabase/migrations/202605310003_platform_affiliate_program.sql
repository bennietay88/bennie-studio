-- Platform affiliate program for promoting Bennie Studio managed website plans.
-- This keeps legacy customer/business affiliate data compatible while adding a
-- global program, configurable tiers, approval workflow, and referral audit trail.

ALTER TABLE affiliate_programs
  ADD COLUMN IF NOT EXISTS is_platform_program BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS fixed_commission_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_duration_months INTEGER,
  ALTER COLUMN business_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_programs_commission_type_check'
  ) THEN
    ALTER TABLE affiliate_programs
      ADD CONSTRAINT affiliate_programs_commission_type_check
      CHECK (commission_type IN ('percentage', 'fixed'));
  END IF;
END $$;

ALTER TABLE commission_tiers
  ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS fixed_commission_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_referral_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_sales_volume DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commission_duration_months INTEGER,
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commission_tiers_commission_type_check'
  ) THEN
    ALTER TABLE commission_tiers
      ADD CONSTRAINT commission_tiers_commission_type_check
      CHECK (commission_type IN ('percentage', 'fixed'));
  END IF;
END $$;

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS payout_method TEXT,
  ADD COLUMN IF NOT EXISTS application_notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliates_status_check'
  ) THEN
    ALTER TABLE affiliates DROP CONSTRAINT affiliates_status_check;
  END IF;
  ALTER TABLE affiliates
    ADD CONSTRAINT affiliates_status_check
    CHECK (status IN ('pending', 'active', 'approved', 'rejected', 'suspended'));
END $$;

ALTER TABLE affiliate_referrals
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'signup',
  ADD COLUMN IF NOT EXISTS plan_slug TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS visitor_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_referrals_commission_status_check'
  ) THEN
    ALTER TABLE affiliate_referrals
      ADD CONSTRAINT affiliate_referrals_commission_status_check
      CHECK (commission_status IN ('pending', 'approved', 'paid', 'void'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_programs_one_platform
  ON affiliate_programs (is_platform_program)
  WHERE is_platform_program = TRUE;

CREATE INDEX IF NOT EXISTS idx_affiliates_platform_uid
  ON affiliates (uid)
  WHERE business_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_event_type
  ON affiliate_referrals (affiliate_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_visitor
  ON affiliate_referrals (affiliate_id, visitor_id)
  WHERE visitor_id IS NOT NULL;

INSERT INTO affiliate_programs (
  is_enabled,
  is_platform_program,
  base_commission_rate,
  payout_minimum,
  cookie_duration_days,
  commission_type,
  terms_and_conditions
)
SELECT
  TRUE,
  TRUE,
  0.10,
  50,
  30,
  'percentage',
  'Affiliates promote Bennie Studio managed website subscription plans. Commission is counted only for valid referred customers who become paying customers.'
WHERE NOT EXISTS (
  SELECT 1 FROM affiliate_programs WHERE is_platform_program = TRUE
);

WITH platform_program AS (
  SELECT id FROM affiliate_programs WHERE is_platform_program = TRUE LIMIT 1
)
INSERT INTO commission_tiers (
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
SELECT id, 'Starter Affiliate', 0.10::DECIMAL(5,2), 'referral_count', 0::DECIMAL(10,2), 'percentage', 0::INTEGER, 0::DECIMAL(10,2), FALSE, NULL::INTEGER, FALSE
FROM platform_program
WHERE NOT EXISTS (
  SELECT 1 FROM commission_tiers WHERE program_id = (SELECT id FROM platform_program) AND name = 'Starter Affiliate'
)
UNION ALL
SELECT id, 'Growth Affiliate', 0.15::DECIMAL(5,2), 'referral_count', 5::DECIMAL(10,2), 'percentage', 5::INTEGER, 0::DECIMAL(10,2), FALSE, NULL::INTEGER, FALSE
FROM platform_program
WHERE NOT EXISTS (
  SELECT 1 FROM commission_tiers WHERE program_id = (SELECT id FROM platform_program) AND name = 'Growth Affiliate'
)
UNION ALL
SELECT id, 'Partner Affiliate', 0.20::DECIMAL(5,2), 'referral_count', 20::DECIMAL(10,2), 'percentage', 20::INTEGER, 0::DECIMAL(10,2), FALSE, NULL::INTEGER, FALSE
FROM platform_program
WHERE NOT EXISTS (
  SELECT 1 FROM commission_tiers WHERE program_id = (SELECT id FROM platform_program) AND name = 'Partner Affiliate'
)
UNION ALL
SELECT id, 'Strategic Partner', 0.00::DECIMAL(5,2), 'referral_count', 999999::DECIMAL(10,2), 'percentage', 999999::INTEGER, 0::DECIMAL(10,2), FALSE, NULL::INTEGER, TRUE
FROM platform_program
WHERE NOT EXISTS (
  SELECT 1 FROM commission_tiers WHERE program_id = (SELECT id FROM platform_program) AND name = 'Strategic Partner'
);

DROP POLICY IF EXISTS "Super admins can manage affiliate programs" ON affiliate_programs;
DROP POLICY IF EXISTS "Super admins can manage commission tiers" ON commission_tiers;
DROP POLICY IF EXISTS "Super admins can manage affiliates" ON affiliates;
DROP POLICY IF EXISTS "Super admins can manage affiliate referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Super admins can manage affiliate payouts" ON affiliate_payouts;
DROP POLICY IF EXISTS "Users can apply to platform affiliate program" ON affiliates;

CREATE POLICY "Super admins can manage affiliate programs"
  ON affiliate_programs FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage commission tiers"
  ON commission_tiers FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage affiliates"
  ON affiliates FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage affiliate referrals"
  ON affiliate_referrals FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can manage affiliate payouts"
  ON affiliate_payouts FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Users can apply to platform affiliate program"
  ON affiliates FOR INSERT
  WITH CHECK (auth.uid() = uid AND business_id IS NULL);

NOTIFY pgrst, 'reload schema';
