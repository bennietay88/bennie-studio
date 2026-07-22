
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
