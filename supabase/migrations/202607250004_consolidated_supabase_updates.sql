-- Consolidated Supabase updates for Bennie Tay Studio.
-- This file combines the previously loose/root SQL and recent roadmap SQL updates.
-- Sections are preserved in their original chronological order.
-- The statements are intentionally additive/idempotent where the source SQL allowed it.


-- ============================================================================
-- Source: supabase/migrations/202605020001_ai_credit_schema.sql
-- ============================================================================


-- 1. Create plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    monthly_credit_limit INTEGER NOT NULL,
    daily_request_limit INTEGER NOT NULL,
    project_limit INTEGER NOT NULL,
    chatgpt_enabled BOOLEAN DEFAULT false,
    monthly_chatgpt_action_limit INTEGER DEFAULT 0,
    price_usd DECIMAL(10, 2) NOT NULL,
    stripe_price_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create ai_credit_balances table
CREATE TABLE IF NOT EXISTS ai_credit_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_credit_limit INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    credits_remaining INTEGER DEFAULT 0,
    reset_date TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + interval '1 month'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create ai_feature_costs table
CREATE TABLE IF NOT EXISTS ai_feature_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT UNIQUE NOT NULL,
    feature_name TEXT NOT NULL,
    credit_cost INTEGER DEFAULT 0,
    default_provider TEXT DEFAULT 'google',
    default_model TEXT DEFAULT 'gemini-1.5-flash',
    minimum_plan TEXT DEFAULT 'starter',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create ai_generation_logs table (Replacing/Extending ai_usage_logs)
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_id UUID, -- Business ID
    feature_key TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    prompt_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost_usd DECIMAL(10, 6),
    credits_charged INTEGER,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create ai_daily_usage table
CREATE TABLE IF NOT EXISTS ai_daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    chatgpt_action_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, usage_date)
);

-- 7. Create ai_model_routes table
CREATE TABLE IF NOT EXISTS ai_model_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL,
    plan_slug TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    max_output_tokens INTEGER DEFAULT 4096,
    temperature DECIMAL(3, 2) DEFAULT 0.2,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feature_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public read plans" ON plans;
CREATE POLICY "Public read plans" ON plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
CREATE POLICY "Users can view own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own credits" ON ai_credit_balances;
CREATE POLICY "Users can view own credits" ON ai_credit_balances FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read feature costs" ON ai_feature_costs;
CREATE POLICY "Public read feature costs" ON ai_feature_costs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own logs" ON ai_generation_logs;
CREATE POLICY "Users can view own logs" ON ai_generation_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own daily usage" ON ai_daily_usage;
CREATE POLICY "Users can view own daily usage" ON ai_daily_usage FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read model routes" ON ai_model_routes;
CREATE POLICY "Public read model routes" ON ai_model_routes FOR SELECT USING (true);

-- Admin policies
DROP POLICY IF EXISTS "Admins can manage plans" ON plans;
CREATE POLICY "Admins can manage plans" ON plans FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
-- ... similar for others ...

-- Seed Plans
INSERT INTO plans (name, slug, monthly_credit_limit, daily_request_limit, project_limit, chatgpt_enabled, monthly_chatgpt_action_limit, price_usd, stripe_price_id)
VALUES 
('Starter', 'starter', 300, 20, 1, false, 0, 47.00, 'price_starter_id'),
('Growth', 'growth', 1000, 50, 3, true, 20, 79.00, 'price_growth_id'),
('Pro', 'pro', 3000, 150, 10, true, 100, 319.00, 'price_premium_id'),
('Agency', 'agency', 10000, 500, 50, true, 500, 999.00, 'price_agency_id')
ON CONFLICT (slug) DO NOTHING;

-- Seed Feature Costs (Optimized for new scale)
INSERT INTO ai_feature_costs (feature_key, feature_name, credit_cost, default_provider, default_model, minimum_plan)
VALUES 
('seo_meta', 'SEO title + meta', 1, 'google', 'gemini-1.5-pro', 'starter'),
('faq_section', 'FAQ section', 2, 'google', 'gemini-1.5-flash', 'starter'),
('rewrite_section', 'Rewrite section', 2, 'google', 'gemini-1.5-flash', 'starter'),
('about_section', 'About section', 2, 'google', 'gemini-1.5-flash', 'starter'),
('service_section', 'Service section', 3, 'google', 'gemini-1.5-flash', 'starter'),
('blog_outline', 'Blog outline', 3, 'google', 'gemini-1.5-flash', 'starter'),
('homepage_draft', 'Homepage draft', 5, 'google', 'gemini-1.5-flash', 'starter'),
('landing_page_draft', 'Full landing page draft', 8, 'google', 'gemini-1.5-flash', 'starter'),
('website_draft', 'Full website draft', 10, 'google', 'gemini-1.5-flash', 'starter'),
('premium_rewrite', 'Premium rewrite', 15, 'google', 'gemini-1.5-pro', 'growth'),
('agency_landing_page', 'Agency-grade landing page', 25, 'google', 'gemini-1.5-pro', 'pro'),
('conversion_audit', 'Conversion audit', 20, 'google', 'gemini-1.5-pro', 'pro'),
('sales_funnel_copy', 'Sales funnel copy', 30, 'google', 'gemini-1.5-pro', 'pro'),
('high_ticket_landing_page', 'High-ticket landing page', 40, 'google', 'gemini-1.5-pro', 'pro')
ON CONFLICT (feature_key) DO UPDATE SET 
  default_provider = EXCLUDED.default_provider,
  default_model = EXCLUDED.default_model;

-- New Credit Management Function (Updated with Trial Initialization)
CREATE OR REPLACE FUNCTION validate_and_deduct_credits(
    p_user_id UUID, 
    p_feature_key TEXT,
    p_is_chatgpt BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_plan_slug TEXT;
    v_credits_remaining INTEGER;
    v_daily_requests INTEGER;
    v_daily_limit INTEGER;
    v_chatgpt_actions INTEGER;
    v_chatgpt_limit INTEGER;
    v_credit_cost INTEGER;
    v_chatgpt_enabled BOOLEAN;
    v_existing_balance_id UUID;
BEGIN
    -- 1. Ensure Credit Balance exists (Trial Initialization: 200 credits)
    SELECT id, credits_remaining INTO v_existing_balance_id, v_credits_remaining 
    FROM ai_credit_balances WHERE user_id = p_user_id;

    IF v_existing_balance_id IS NULL THEN
        INSERT INTO ai_credit_balances (user_id, monthly_credit_limit, credits_remaining, credits_used)
        VALUES (p_user_id, 200, 200, 0)
        RETURNING id, credits_remaining INTO v_existing_balance_id, v_credits_remaining;
    END IF;

    -- 2. Get Plan and Limits
    SELECT 
        p.slug, p.daily_request_limit, p.chatgpt_enabled, p.monthly_chatgpt_action_limit
    INTO 
        v_plan_slug, v_daily_limit, v_chatgpt_enabled, v_chatgpt_limit
    FROM user_subscriptions us
    JOIN plans p ON us.plan_id = p.id
    WHERE us.user_id = p_user_id AND us.status = 'active'
    LIMIT 1;

    -- Default to starter limits if no active subscription
    IF v_plan_slug IS NULL THEN
        SELECT slug, daily_request_limit, chatgpt_enabled, monthly_chatgpt_action_limit
        INTO v_plan_slug, v_daily_limit, v_chatgpt_enabled, v_chatgpt_limit
        FROM plans WHERE slug = 'starter';
    END IF;

    -- 3. Get Feature Cost
    SELECT credit_cost INTO v_credit_cost FROM ai_feature_costs WHERE feature_key = p_feature_key;
    IF v_credit_cost IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Feature not found');
    END IF;

    -- 4. Check Credits
    IF v_credits_remaining < v_credit_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS');
    END IF;

    -- 5. Check Daily Limit
    SELECT request_count INTO v_daily_requests FROM ai_daily_usage WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
    IF v_daily_requests >= COALESCE(v_daily_limit, 20) THEN
        RETURN jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_EXCEEDED');
    END IF;

    -- 6. Check ChatGPT Access
    IF p_is_chatgpt AND NOT COALESCE(v_chatgpt_enabled, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'CHATGPT_NOT_ALLOWED');
    END IF;

    -- 7. Perform Deduction
    UPDATE ai_credit_balances 
    SET credits_remaining = credits_remaining - v_credit_cost,
        credits_used = credits_used + v_credit_cost,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    -- 8. Update Daily Usage
    INSERT INTO ai_daily_usage (user_id, usage_date, request_count, credits_used, chatgpt_action_count)
    VALUES (p_user_id, CURRENT_DATE, 1, v_credit_cost, CASE WHEN p_is_chatgpt THEN 1 ELSE 0 END)
    ON CONFLICT (user_id, usage_date) 
    DO UPDATE SET 
        request_count = ai_daily_usage.request_count + 1,
        credits_used = ai_daily_usage.credits_used + v_credit_cost,
        chatgpt_action_count = ai_daily_usage.chatgpt_action_count + (CASE WHEN p_is_chatgpt THEN 1 ELSE 0 END);

    RETURN jsonb_build_object('success', true, 'credits_charged', v_credit_cost, 'credits_remaining', v_credits_remaining - v_credit_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ============================================================================
-- Source: supabase/migrations/202605020002_waas_business_model.sql
-- ============================================================================


-- Migration for BennieTay OS Business Model Change
-- 1. Create Custom Website Applications table (Phase 1)
CREATE TABLE IF NOT EXISTS custom_website_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL, -- Business, Growth, Authority
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected', 'completed')),
  requirements JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for custom_website_applications
ALTER TABLE custom_website_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own applications" ON custom_website_applications;
CREATE POLICY "Users can manage their own applications" ON custom_website_applications
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Super Admins can manage all applications" ON custom_website_applications;
CREATE POLICY "Super Admins can manage all applications" ON custom_website_applications
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- 2. Update Plans in Database
-- First, clear old ones if they exist (or update them)
-- We'll just update by slug
INSERT INTO plans (name, slug, monthly_credit_limit, daily_request_limit, project_limit, chatgpt_enabled, monthly_chatgpt_action_limit, price_usd, stripe_price_id)
VALUES 
('Starter', 'starter', 100, 20, 1, false, 0, 49.00, 'price_starter_id'),
('Business', 'business', 500, 50, 5, true, 20, 99.00, 'price_growth_id'),
('Growth', 'growth', 2000, 150, 20, true, 100, 199.00, 'price_premium_id')
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  monthly_credit_limit = EXCLUDED.monthly_credit_limit,
  daily_request_limit = EXCLUDED.daily_request_limit,
  project_limit = EXCLUDED.project_limit,
  price_usd = EXCLUDED.price_usd;

-- 3. Update Businesses Plan Constraint
-- Note: In Supabase/PostgreSQL, you can't easily change a check constraint without dropping it.
-- We'll try to drop and recreate it if we have permission, but usually businesses.plan 
-- uses these slugs. The schema showed: CHECK (plan IN ('starter', 'growth', 'premium'))
-- Our new slugs are 'starter', 'business', 'growth'.
-- So 'premium' should be mapped to 'growth', and 'growth' to 'business'.

-- For now, let's keep the old slugs in the DB if they are wired deep, 
-- but update the UI Names. Wait, the user said "Business" and "Growth".

-- Let's update the constraint to include 'business' and potentially 'authority' (for services)
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_plan_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_plan_check CHECK (plan IN ('starter', 'business', 'growth', 'premium', 'authority'));

-- Update existing businesses to new slugs if applicable
UPDATE businesses SET plan = 'business' WHERE plan = 'growth';
UPDATE businesses SET plan = 'growth' WHERE plan = 'premium';

-- 4. Projects table for Delivery Engine (Phase 2 readiness)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'waas' CHECK (type IN ('waas', 'custom')),
  package_name TEXT, 
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'discovery', 'design', 'development', 'qc', 'client_review', 'launch_prep', 'live')),
  delivery_checklist JSONB DEFAULT '[]',
  admin_notes TEXT,
  target_launch_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can manage all projects" ON projects;
CREATE POLICY "Super Admins can manage all projects" ON projects
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Business admins can view their projects" ON projects;
CREATE POLICY "Business admins can view their projects" ON projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'super_admin' OR (business_id = projects.business_id AND role = 'business_admin'))));



-- ============================================================================
-- Source: supabase/migrations/202605020003_fix_business_plan_constraint.sql
-- ============================================================================

-- Fix for businesses_plan_check constraint violation
-- This migration ensures the database allows the new plan names: starter, business, growth

ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_plan_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_plan_check CHECK (plan IN ('starter', 'business', 'growth', 'premium', 'authority', 'pro', 'elite'));

-- Mapping existing plans to new ones if necessary
-- Note: Run these only if you want to migrate existing data
-- UPDATE businesses SET plan = 'business' WHERE plan = 'pro';
-- UPDATE businesses SET plan = 'growth' WHERE plan = 'premium';



-- ============================================================================
-- Source: supabase/migrations/202605020004_malaysia_geo_pricing_seed.sql
-- ============================================================================

-- Malaysia Geo-Pricing Migration
INSERT INTO geo_pricing (country_code, country_name, discount_percentage, is_enabled)
VALUES ('MY', 'Malaysia', 40, true)
ON CONFLICT (country_code) DO UPDATE SET
  discount_percentage = EXCLUDED.discount_percentage,
  is_enabled = EXCLUDED.is_enabled;



-- ============================================================================
-- Source: supabase/migrations/202606230001_manual_catchup_consolidated.sql
-- ============================================================================

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



-- ============================================================================
-- Source: supabase/migrations/202607150001_modernize_settings_policy.sql
-- ============================================================================

-- Modernize settings RLS policy to avoid auth.role() and use an explicit role target.
-- Supabase now recommends policy TO clauses instead of auth.role() checks.

DROP POLICY IF EXISTS "Authenticated read shared settings" ON public.settings;

CREATE POLICY "Authenticated read shared settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (
    id LIKE 'landing_page%' OR
    id LIKE 'business_policies_%' OR
    id = 'plans' OR
    id = 'marketing_hub_config' OR
    id = 'platform_public' OR
    id = 'archetype_config'
  );



-- ============================================================================
-- Source: supabase/migrations/202607160001_lead_generation_automation_engine.sql
-- ============================================================================

-- Lead generation automation engine.
-- Additive migration for CRM scoring, follow-up activity, review campaigns, and monthly reports.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS automation_score integer,
  ADD COLUMN IF NOT EXISTS automation_temperature text,
  ADD COLUMN IF NOT EXISTS automation_next_action text,
  ADD COLUMN IF NOT EXISTS last_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_automation_temperature_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_automation_temperature_check
  CHECK (automation_temperature IS NULL OR automation_temperature IN ('Cold', 'Warm', 'Hot'));

CREATE TABLE IF NOT EXISTS public.lead_follow_up_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  event_type text NOT NULL DEFAULT 'manual_follow_up',
  script text,
  status text NOT NULL DEFAULT 'queued',
  scheduled_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_follow_up_events
  DROP CONSTRAINT IF EXISTS lead_follow_up_events_channel_check;

ALTER TABLE public.lead_follow_up_events
  ADD CONSTRAINT lead_follow_up_events_channel_check
  CHECK (channel IN ('whatsapp', 'email', 'phone', 'sms', 'manual'));

ALTER TABLE public.lead_follow_up_events
  DROP CONSTRAINT IF EXISTS lead_follow_up_events_status_check;

ALTER TABLE public.lead_follow_up_events
  ADD CONSTRAINT lead_follow_up_events_status_check
  CHECK (status IN ('queued', 'sent', 'completed', 'skipped', 'failed'));

CREATE TABLE IF NOT EXISTS public.review_request_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  google_review_url text,
  message_template text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  target_segment text NOT NULL DEFAULT 'completed_customers',
  sent_count integer NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_request_campaigns
  DROP CONSTRAINT IF EXISTS review_request_campaigns_status_check;

ALTER TABLE public.review_request_campaigns
  ADD CONSTRAINT review_request_campaigns_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'completed'));

CREATE TABLE IF NOT EXISTS public.monthly_growth_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  report_month text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  lead_count integer NOT NULL DEFAULT 0,
  hot_lead_count integer NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  local_seo_page_count integer NOT NULL DEFAULT 0,
  summary text,
  recommendations text[] NOT NULL DEFAULT '{}',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (business_id, report_month)
);

ALTER TABLE public.monthly_growth_reports
  DROP CONSTRAINT IF EXISTS monthly_growth_reports_status_check;

ALTER TABLE public.monthly_growth_reports
  ADD CONSTRAINT monthly_growth_reports_status_check
  CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_leads_business_automation
  ON public.leads(business_id, automation_temperature, next_follow_up_at);

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_business_lead
  ON public.lead_follow_up_events(business_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_scheduled
  ON public.lead_follow_up_events(scheduled_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_review_request_campaigns_business
  ON public.review_request_campaigns(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_business_month
  ON public.monthly_growth_reports(business_id, report_month DESC);

ALTER TABLE public.lead_follow_up_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_request_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_growth_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business users manage own lead follow up events" ON public.lead_follow_up_events;
CREATE POLICY "Business users manage own lead follow up events" ON public.lead_follow_up_events
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Business users manage own review request campaigns" ON public.review_request_campaigns;
CREATE POLICY "Business users manage own review request campaigns" ON public.review_request_campaigns
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Business users manage own monthly growth reports" ON public.monthly_growth_reports;
CREATE POLICY "Business users manage own monthly growth reports" ON public.monthly_growth_reports
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_follow_up_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_request_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_growth_reports TO authenticated;

DROP TRIGGER IF EXISTS update_lead_follow_up_events_updated_at ON public.lead_follow_up_events;
CREATE TRIGGER update_lead_follow_up_events_updated_at
  BEFORE UPDATE ON public.lead_follow_up_events
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_request_campaigns_updated_at ON public.review_request_campaigns;
CREATE TRIGGER update_review_request_campaigns_updated_at
  BEFORE UPDATE ON public.review_request_campaigns
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_growth_reports_updated_at ON public.monthly_growth_reports;
CREATE TRIGGER update_monthly_growth_reports_updated_at
  BEFORE UPDATE ON public.monthly_growth_reports
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607160002_automation_foreign_key_indexes.sql
-- ============================================================================

-- Cover foreign keys introduced by the lead generation automation engine.

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_lead_id
  ON public.lead_follow_up_events(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_profile_id
  ON public.lead_follow_up_events(profile_id)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_request_campaigns_profile_id
  ON public.review_request_campaigns(profile_id)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_website_id
  ON public.monthly_growth_reports(website_id)
  WHERE website_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_profile_id
  ON public.monthly_growth_reports(profile_id)
  WHERE profile_id IS NOT NULL;



-- ============================================================================
-- Source: supabase/migrations/202607220001_public_claims_wordpress_flow.sql
-- ============================================================================

-- Public claims cleanup support: approved testimonials and WordPress quotation pipeline.

CREATE TABLE IF NOT EXISTS public.customer_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  company text,
  testimonial text NOT NULL,
  customer_image_url text,
  result_summary text,
  evidence_reference text,
  consent_status text NOT NULL DEFAULT 'pending',
  publish_status text NOT NULL DEFAULT 'draft',
  date_approved date,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_testimonials_consent_check
    CHECK (consent_status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  CONSTRAINT customer_testimonials_publish_check
    CHECK (publish_status IN ('draft', 'published', 'archived')),
  CONSTRAINT customer_testimonials_public_requires_approval
    CHECK (publish_status <> 'published' OR (consent_status = 'approved' AND date_approved IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.wordpress_project_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  existing_website text,
  business_type text NOT NULL,
  required_pages text NOT NULL,
  required_functionality text NOT NULL,
  page_count text,
  ecommerce_requirement boolean NOT NULL DEFAULT false,
  booking_requirement boolean NOT NULL DEFAULT false,
  membership_requirement boolean NOT NULL DEFAULT false,
  multilingual_requirement boolean NOT NULL DEFAULT false,
  integrations text,
  content_readiness text,
  preferred_launch_date text,
  indicative_budget text NOT NULL,
  additional_details text,
  package_name text,
  pipeline_status text NOT NULL DEFAULT 'new_enquiry',
  source_page text,
  estimated_quote_range jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  quoted_amount numeric(12,2),
  deposit_amount numeric(12,2),
  final_payment_amount numeric(12,2),
  quotation_reference text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  lost_reason text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wordpress_project_leads_status_check
    CHECK (pipeline_status IN (
      'new_enquiry',
      'qualified',
      'consultation_scheduled',
      'preparing_quotation',
      'quotation_sent',
      'awaiting_decision',
      'accepted',
      'deposit_paid',
      'onboarding',
      'design',
      'development',
      'customer_review',
      'final_revisions',
      'final_payment',
      'launched',
      'maintenance',
      'lost'
    ))
);

ALTER TABLE public.customer_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordpress_project_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_customer_testimonials_public
  ON public.customer_testimonials (publish_status, consent_status, date_approved DESC)
  WHERE publish_status = 'published' AND consent_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_customer_testimonials_business_status
  ON public.customer_testimonials (business_id, publish_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wordpress_project_leads_status
  ON public.wordpress_project_leads (pipeline_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wordpress_project_leads_assigned
  ON public.wordpress_project_leads (assigned_to, pipeline_status, updated_at DESC)
  WHERE assigned_to IS NOT NULL;

DROP POLICY IF EXISTS "Public can view approved testimonials" ON public.customer_testimonials;
CREATE POLICY "Public can view approved testimonials"
  ON public.customer_testimonials FOR SELECT TO anon, authenticated
  USING (publish_status = 'published' AND consent_status = 'approved' AND date_approved IS NOT NULL);

DROP POLICY IF EXISTS "Platform operators manage testimonials" ON public.customer_testimonials;
CREATE POLICY "Platform operators manage testimonials"
  ON public.customer_testimonials FOR ALL TO authenticated
  USING (public.has_platform_permission('approvals') OR public.has_platform_permission('delivery'))
  WITH CHECK (public.has_platform_permission('approvals') OR public.has_platform_permission('delivery'));

DROP POLICY IF EXISTS "Customers view their own testimonial records" ON public.customer_testimonials;
CREATE POLICY "Customers view their own testimonial records"
  ON public.customer_testimonials FOR SELECT TO authenticated
  USING (
    business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.business_id = customer_testimonials.business_id
    )
  );

DROP POLICY IF EXISTS "Anyone can submit WordPress project leads" ON public.wordpress_project_leads;
CREATE POLICY "Anyone can submit WordPress project leads"
  ON public.wordpress_project_leads FOR INSERT TO anon, authenticated
  WITH CHECK (pipeline_status = 'new_enquiry');

DROP POLICY IF EXISTS "Platform operators manage WordPress project leads" ON public.wordpress_project_leads;
CREATE POLICY "Platform operators manage WordPress project leads"
  ON public.wordpress_project_leads FOR ALL TO authenticated
  USING (public.has_platform_permission('sales') OR public.has_platform_permission('delivery'))
  WITH CHECK (public.has_platform_permission('sales') OR public.has_platform_permission('delivery'));

DROP TRIGGER IF EXISTS update_customer_testimonials_updated_at ON public.customer_testimonials;
CREATE TRIGGER update_customer_testimonials_updated_at
  BEFORE UPDATE ON public.customer_testimonials
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wordpress_project_leads_updated_at ON public.wordpress_project_leads;
CREATE TRIGGER update_wordpress_project_leads_updated_at
  BEFORE UPDATE ON public.wordpress_project_leads
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

GRANT SELECT ON public.customer_testimonials TO anon, authenticated;
GRANT INSERT ON public.wordpress_project_leads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_testimonials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wordpress_project_leads TO authenticated;



-- ============================================================================
-- Source: supabase/migrations/202607220002_domain_update_ops_hardening.sql
-- ============================================================================

-- Domain publishing rules, update-request reliability, and important action audit logs.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS custom_domain_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain_permission_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_grace_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_businesses_custom_domain_active_lookup
  ON public.businesses ((lower(custom_domain)), status, subscription_status, custom_domain_status, ssl_status)
  WHERE custom_domain IS NOT NULL AND custom_domain_suspended = false;

CREATE INDEX IF NOT EXISTS idx_websites_business_published
  ON public.websites (business_id, updated_at DESC)
  WHERE status = 'published';

ALTER TABLE public.monthly_update_requests
  ADD COLUMN IF NOT EXISTS client_request_id text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_response text,
  ADD COLUMN IF NOT EXISTS completion_details text,
  ADD COLUMN IF NOT EXISTS declined_reason text,
  ADD COLUMN IF NOT EXISTS support_notified_at timestamptz;

UPDATE public.monthly_update_requests
SET status = CASE
  WHEN status = 'new' THEN 'submitted'
  WHEN status = 'changes_requested' THEN 'waiting_for_customer'
  ELSE status
END
WHERE status IN ('new', 'changes_requested');

ALTER TABLE public.monthly_update_requests
  DROP CONSTRAINT IF EXISTS monthly_update_requests_status_check;

ALTER TABLE public.monthly_update_requests
  ADD CONSTRAINT monthly_update_requests_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'acknowledged',
    'in_progress',
    'waiting_for_customer',
    'completed',
    'declined',
    'cancelled'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_update_requests_client_request
  ON public.monthly_update_requests (business_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_update_requests_business_period_status
  ON public.monthly_update_requests (business_id, allowance_period, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_update_requests_assigned_status
  ON public.monthly_update_requests (assigned_to, status, updated_at DESC)
  WHERE assigned_to IS NOT NULL;

CREATE OR REPLACE FUNCTION public.audit_important_business_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    action := 'plan.changed';
  ELSIF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    IF NEW.subscription_status = 'active' THEN
      action := 'subscription.activated';
    ELSIF NEW.subscription_status IN ('canceled', 'cancelled', 'inactive') THEN
      action := 'subscription.cancelled';
    ELSE
      action := 'subscription.status_changed';
    END IF;
  ELSIF NEW.custom_domain IS DISTINCT FROM OLD.custom_domain THEN
    action := 'domain.changed';
  ELSIF NEW.stripe_secret_key IS DISTINCT FROM OLD.stripe_secret_key
    OR NEW.stripe_webhook_secret IS DISTINCT FROM OLD.stripe_webhook_secret THEN
    action := 'secret.changed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_action_audit_logs (action_type, target_type, target_id, target_label, metadata)
  VALUES (
    action,
    'business',
    NEW.id::text,
    NEW.name,
    jsonb_build_object(
      'oldPlan', OLD.plan,
      'newPlan', NEW.plan,
      'oldSubscriptionStatus', OLD.subscription_status,
      'newSubscriptionStatus', NEW.subscription_status,
      'oldDomain', OLD.custom_domain,
      'newDomain', NEW.custom_domain
    )
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_important_business_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_business_changes() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_important_website_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action text;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' THEN
    action := 'website.published';
  ELSIF OLD.status = 'published' AND NEW.status <> 'published' THEN
    action := 'website.unpublished';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_action_audit_logs (action_type, target_type, target_id, target_label, metadata)
  VALUES (
    action,
    'website',
    NEW.id::text,
    COALESCE(NEW.slug, NEW.id::text),
    jsonb_build_object('businessId', NEW.business_id, 'oldStatus', OLD.status, 'newStatus', NEW.status)
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_important_website_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_website_changes() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_important_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.admin_action_audit_logs (action_type, target_type, target_id, target_label, metadata)
    VALUES (
      'user.role_changed',
      'profile',
      NEW.id::text,
      NEW.email,
      jsonb_build_object('oldRole', OLD.role, 'newRole', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_important_profile_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_profile_changes() FROM anon, authenticated;

DROP TRIGGER IF EXISTS audit_important_business_changes_trigger ON public.businesses;
CREATE TRIGGER audit_important_business_changes_trigger
  AFTER UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.audit_important_business_changes();

DROP TRIGGER IF EXISTS audit_important_website_changes_trigger ON public.websites;
CREATE TRIGGER audit_important_website_changes_trigger
  AFTER UPDATE ON public.websites
  FOR EACH ROW EXECUTE FUNCTION public.audit_important_website_changes();

DROP TRIGGER IF EXISTS audit_important_profile_changes_trigger ON public.profiles;
CREATE TRIGGER audit_important_profile_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_important_profile_changes();

NOTIFY pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607220003_harden_audit_trigger_function_privileges.sql
-- ============================================================================

-- Prevent trigger-only audit functions from being callable through RPC.

REVOKE ALL ON FUNCTION public.audit_important_business_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_business_changes() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.audit_important_website_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_website_changes() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.audit_important_profile_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_profile_changes() FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607220004_posts_public_blog_columns.sql
-- ============================================================================

-- Public blog route support.
-- Adds the columns used by BlogCMS, LandingPage, and PublicBlogPostPage.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS image_url text;

UPDATE public.posts
SET slug = lower(
  regexp_replace(
    regexp_replace(coalesce(nullif(trim(title), ''), id::text), '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  )
) || '-' || left(id::text, 8)
WHERE slug IS NULL OR trim(slug) = '';

CREATE INDEX IF NOT EXISTS idx_posts_slug_lookup
  ON public.posts (slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_platform_slug_unique
  ON public.posts (slug)
  WHERE is_platform_post = true AND slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_platform_slug_published
  ON public.posts (is_platform_post, status, slug)
  WHERE is_platform_post = true AND status = 'published' AND slug IS NOT NULL;

NOTIFY pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607220005_public_plan_offerings.sql
-- ============================================================================

-- Let the public sales page read active plan offerings from the same plans table
-- edited in Super Admin > Billing Plans.

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read plans" ON public.plans;
DROP POLICY IF EXISTS "Public can view active plans" ON public.plans;
CREATE POLICY "Public can view active plans"
  ON public.plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

GRANT SELECT ON public.plans TO anon, authenticated;

NOTIFY pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607220006_restrict_public_plan_offerings.sql
-- ============================================================================

-- Remove legacy broad public plans policy now that the sales page only needs
-- active plan offerings.

DROP POLICY IF EXISTS "Public read plans" ON public.plans;

NOTIFY pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607220007_plan_sort_order_and_sales_features.sql
-- ============================================================================

-- Make Super Admin plan order and public included lists authoritative
-- for the sales pricing page.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS sort_order integer;

UPDATE public.plans
SET sort_order = CASE slug
  WHEN 'starter' THEN 0
  WHEN 'business' THEN 1
  WHEN 'growth' THEN 2
  ELSE COALESCE(sort_order, 99)
END
WHERE sort_order IS NULL OR slug IN ('starter', 'business', 'growth');

UPDATE public.plans
SET features = CASE slug
  WHEN 'starter' THEN '[
    "1-page lead website",
    "Clear offer sections",
    "Contact form",
    "WhatsApp CTA"
  ]'::jsonb
  WHEN 'business' THEN '[
    "Home, Services, Contact",
    "Review-powered trust",
    "WhatsApp/quote flow",
    "3 monthly managed updates"
  ]'::jsonb
  WHEN 'growth' THEN '[
    "Up to 10 pages",
    "Campaign landing pages",
    "Local service-area pages",
    "Monthly website improvement support"
  ]'::jsonb
  ELSE features
END
WHERE slug IN ('starter', 'business', 'growth')
  AND (features IS NULL OR features = '[]'::jsonb);

CREATE INDEX IF NOT EXISTS idx_plans_public_sort
  ON public.plans (is_active, sort_order, price_usd);

NOTIFY pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607250001_async_job_queue.sql
-- ============================================================================

-- Async background job queue for long-running WaaS work.
-- Workers must use the Supabase service role key; public clients read job state
-- through authenticated API routes instead of direct table access.

create table if not exists public.async_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority integer not null default 100,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  last_error text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists async_jobs_idempotency_key_idx
  on public.async_jobs (idempotency_key)
  where idempotency_key is not null;

create index if not exists async_jobs_dequeue_idx
  on public.async_jobs (status, run_after, priority, created_at);

create index if not exists async_jobs_business_idx
  on public.async_jobs (business_id);

create index if not exists async_jobs_user_idx
  on public.async_jobs (user_id);

create index if not exists async_jobs_type_status_idx
  on public.async_jobs (job_type, status);

alter table public.async_jobs enable row level security;

revoke all on table public.async_jobs from anon, authenticated;
grant select, insert, update, delete on table public.async_jobs to service_role;

drop policy if exists "Service role manages async jobs" on public.async_jobs;
create policy "Service role manages async jobs"
on public.async_jobs
for all
to service_role
using (true)
with check (true);

create or replace function public.touch_async_jobs_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_async_jobs_updated_at on public.async_jobs;
create trigger trg_touch_async_jobs_updated_at
before update on public.async_jobs
for each row
execute function public.touch_async_jobs_updated_at();

notify pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607250002_billing_dunning_ai_caps.sql
-- ============================================================================

-- Harden billing dunning support and AI credit enforcement.

alter table public.businesses
  add column if not exists subscription_grace_until timestamptz;

create index if not exists idx_businesses_subscription_grace_until
  on public.businesses (subscription_status, subscription_grace_until);

create or replace function public.validate_and_deduct_credits(
    p_user_id uuid,
    p_feature_key text,
    p_is_chatgpt boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_plan_slug text;
    v_daily_limit integer;
    v_chatgpt_enabled boolean;
    v_chatgpt_limit integer;
    v_credit_cost integer;
    v_balance_id uuid;
    v_monthly_limit integer;
    v_credits_remaining integer;
    v_reset_date timestamptz;
    v_daily_requests integer := 0;
    v_chatgpt_actions integer := 0;
begin
    select
      p.slug,
      p.daily_request_limit,
      p.chatgpt_enabled,
      p.monthly_chatgpt_action_limit
    into
      v_plan_slug,
      v_daily_limit,
      v_chatgpt_enabled,
      v_chatgpt_limit
    from user_subscriptions us
    join plans p on us.plan_id = p.id
    where us.user_id = p_user_id
      and us.status in ('active', 'trialing')
      and (us.current_period_end is null or us.current_period_end >= now())
    order by us.current_period_end desc nulls last
    limit 1;

    if v_plan_slug is null then
      select slug, daily_request_limit, chatgpt_enabled, monthly_chatgpt_action_limit
      into v_plan_slug, v_daily_limit, v_chatgpt_enabled, v_chatgpt_limit
      from plans
      where slug = 'starter'
      limit 1;
    end if;

    select credit_cost
    into v_credit_cost
    from ai_feature_costs
    where feature_key = p_feature_key
      and is_active = true;

    if v_credit_cost is null then
      return jsonb_build_object('success', false, 'error', 'FEATURE_NOT_FOUND');
    end if;

    select id, monthly_credit_limit, credits_remaining, reset_date
    into v_balance_id, v_monthly_limit, v_credits_remaining, v_reset_date
    from ai_credit_balances
    where user_id = p_user_id
    for update;

    if v_balance_id is null then
      insert into ai_credit_balances (user_id, monthly_credit_limit, credits_remaining, credits_used, reset_date)
      values (p_user_id, 200, 200, 0, now() + interval '1 month')
      returning id, monthly_credit_limit, credits_remaining, reset_date
      into v_balance_id, v_monthly_limit, v_credits_remaining, v_reset_date;
    elsif v_reset_date is not null and v_reset_date <= now() then
      update ai_credit_balances
      set credits_remaining = monthly_credit_limit,
          credits_used = 0,
          reset_date = now() + interval '1 month',
          updated_at = now()
      where id = v_balance_id
      returning monthly_credit_limit, credits_remaining, reset_date
      into v_monthly_limit, v_credits_remaining, v_reset_date;
    end if;

    if v_credits_remaining < v_credit_cost then
      return jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS');
    end if;

    select coalesce(request_count, 0), coalesce(chatgpt_action_count, 0)
    into v_daily_requests, v_chatgpt_actions
    from ai_daily_usage
    where user_id = p_user_id
      and usage_date = current_date;

    if coalesce(v_daily_requests, 0) >= coalesce(v_daily_limit, 20) then
      return jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_EXCEEDED');
    end if;

    if p_is_chatgpt and not coalesce(v_chatgpt_enabled, false) then
      return jsonb_build_object('success', false, 'error', 'CHATGPT_NOT_ALLOWED');
    end if;

    if p_is_chatgpt and coalesce(v_chatgpt_actions, 0) >= coalesce(v_chatgpt_limit, 0) then
      return jsonb_build_object('success', false, 'error', 'CHATGPT_DAILY_LIMIT_EXCEEDED');
    end if;

    update ai_credit_balances
    set credits_remaining = credits_remaining - v_credit_cost,
        credits_used = credits_used + v_credit_cost,
        updated_at = now()
    where id = v_balance_id;

    insert into ai_daily_usage (user_id, usage_date, request_count, credits_used, chatgpt_action_count)
    values (p_user_id, current_date, 1, v_credit_cost, case when p_is_chatgpt then 1 else 0 end)
    on conflict (user_id, usage_date)
    do update set
      request_count = ai_daily_usage.request_count + 1,
      credits_used = ai_daily_usage.credits_used + v_credit_cost,
      chatgpt_action_count = ai_daily_usage.chatgpt_action_count + case when p_is_chatgpt then 1 else 0 end;

    return jsonb_build_object(
      'success', true,
      'credits_charged', v_credit_cost,
      'credits_remaining', v_credits_remaining - v_credit_cost
    );
end;
$$;

notify pgrst, 'reload schema';



-- ============================================================================
-- Source: supabase/migrations/202607250003_data_api_rls_hardening.sql
-- ============================================================================

-- Tighten Data API exposure for legacy public tables that had RLS enabled
-- but no explicit policies in the current migration chain.

alter table if exists public.ai_usage_logs enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.website_error_logs enable row level security;

revoke all on table public.ai_usage_logs from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.website_error_logs from anon, authenticated;

drop policy if exists "Business users view own AI usage logs" on public.ai_usage_logs;
drop policy if exists "Super admins view all AI usage logs" on public.ai_usage_logs;

create policy "Business users view own AI usage logs"
on public.ai_usage_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.business_id = ai_usage_logs.business_id
  )
);

create policy "Super admins view all AI usage logs"
on public.ai_usage_logs
for select
to authenticated
using (public.is_super_admin());

grant select on table public.ai_usage_logs to authenticated;

drop policy if exists "Public can view active products on published websites" on public.products;
drop policy if exists "Business users manage own products" on public.products;
drop policy if exists "Super admins manage all products" on public.products;

create policy "Public can view active products on published websites"
on public.products
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.businesses b
    where b.id = products.business_id
      and coalesce(b.status, 'active') = 'active'
  )
  and exists (
    select 1
    from public.websites w
    where w.business_id = products.business_id
      and w.status = 'published'
  )
);

create policy "Business users manage own products"
on public.products
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.business_id = products.business_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.business_id = products.business_id
  )
);

create policy "Super admins manage all products"
on public.products
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

drop policy if exists "Business users insert own website error logs" on public.website_error_logs;
drop policy if exists "Business users view own website error logs" on public.website_error_logs;
drop policy if exists "Super admins manage all website error logs" on public.website_error_logs;

create policy "Business users insert own website error logs"
on public.website_error_logs
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.business_id = website_error_logs.business_id
  )
);

create policy "Business users view own website error logs"
on public.website_error_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.business_id = website_error_logs.business_id
  )
);

create policy "Super admins manage all website error logs"
on public.website_error_logs
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

grant select, insert, update, delete on table public.website_error_logs to authenticated;

-- Remove broad anonymous privileges left by older Supabase defaults/manual SQL.
-- RLS still protects rows, but the Data API should expose only intentional
-- public read and public submission surfaces.
do $$
declare
  obj record;
  public_read_objects text[] := array[
    'affiliate_programs',
    'affiliates',
    'ai_feature_costs',
    'ai_model_routes',
    'appointment_settings',
    'customer_testimonials',
    'geo_pricing',
    'industry_items',
    'plans',
    'posts',
    'products',
    'public_businesses',
    'section_templates',
    'template_taxonomy_options',
    'templates',
    'webinars',
    'websites'
  ];
  public_insert_objects text[] := array[
    'appointments',
    'app_error_logs',
    'industry_item_enquiries',
    'leads',
    'orders',
    'page_views',
    'reviews',
    'wordpress_project_leads'
  ];
  object_name text;
begin
  for obj in
    select c.oid::regclass as object_ref
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm')
  loop
    execute format('revoke all on %s from anon', obj.object_ref);
  end loop;

  foreach object_name in array public_read_objects loop
    if to_regclass('public.' || object_name) is not null then
      execute format('grant select on table public.%I to anon', object_name);
    end if;
  end loop;

  foreach object_name in array public_insert_objects loop
    if to_regclass('public.' || object_name) is not null then
      execute format('grant insert on table public.%I to anon', object_name);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.public_businesses') is not null then
    revoke all on table public.public_businesses from anon, authenticated;
    grant select on table public.public_businesses to anon, authenticated;
  end if;

  if to_regclass('public.revenue_by_business') is not null then
    revoke all on table public.revenue_by_business from anon, authenticated;
  end if;
end $$;

