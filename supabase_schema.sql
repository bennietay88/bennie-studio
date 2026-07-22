-- Supabase Schema for Bennie Tay Studio

-- 1. Users/Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'client' CHECK (role IN ('super_admin', 'business_admin', 'client', 'affiliate', 'staff')),
  business_id UUID,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE,
  platform_type TEXT DEFAULT 'waas',
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'trial', 'unpaid', 'cancelled')),
  industry TEXT,
  business_nature TEXT,
  location TEXT,
  subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_secret_key TEXT,
  stripe_publishable_key TEXT,
  stripe_webhook_secret TEXT,
  stripe_connected_account_id TEXT,
  subscription_status TEXT,
  trial_ends_at TIMESTAMPTZ,
  early_subscription_date TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  ai_credits INTEGER DEFAULT 10,
  ai_credits_used INTEGER DEFAULT 0,
  onboarding_steps JSONB DEFAULT '{
    "step1": {"completed": false, "label": "Complete Business Profile"},
    "step2": {"completed": false, "label": "Choose Website Template"},
    "step3": {"completed": false, "label": "Generate Website Copy"},
    "step4": {"completed": false, "label": "Activate Lead Capture"},
    "step5": {"completed": false, "label": "Connect Appointment Booking"},
    "step6": {"completed": false, "label": "Review SEO Content"},
    "step7": {"completed": false, "label": "Publish Website"}
  }',
  referred_by_affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  marketing_plan TEXT DEFAULT 'none' CHECK (marketing_plan IN ('none', 'active')),
  marketing_trial_ends_at TIMESTAMPTZ,
  marketing_status TEXT DEFAULT 'inactive' CHECK (marketing_status IN ('active', 'trialing', 'inactive')),
  ga_measurement_id TEXT,
  meta_pixel_id TEXT,
  tracking_scripts_header TEXT,
  tracking_scripts_footer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist for existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS marketing_plan TEXT DEFAULT 'none';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS marketing_trial_ends_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS marketing_status TEXT DEFAULT 'inactive';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ga_measurement_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tracking_scripts_header TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tracking_scripts_footer TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS platform_type TEXT DEFAULT 'waas';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS chatbot_welcome_message TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS chatbot_model TEXT DEFAULT 'gemini-1.5-flash';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 10;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_model_config JSONB DEFAULT '{
  "synthesis": "gemini-1.5-flash",
  "seo": "gemini-1.5-flash",
  "chatbot": "gemini-1.5-flash",
  "blog": "gemini-1.5-flash",
  "marketing": "gemini-1.5-flash"
}';

-- 14. AI Usage Logs table for scaling and auditing
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  use_case TEXT NOT NULL,
  model_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  estimated_cost FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance at scale
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_business_id ON ai_usage_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);

-- AI Usage tracking function optimized for scaling
CREATE OR REPLACE FUNCTION increment_ai_usage(biz_id UUID, amount INTEGER, use_case_name TEXT DEFAULT 'synthesis', model_name TEXT DEFAULT 'unknown')
RETURNS VOID AS $$
DECLARE
  v_cost FLOAT;
BEGIN
  v_cost := amount * 0.002; -- Basic cost estimation

  UPDATE businesses 
  SET ai_credits_used = ai_credits_used + amount 
  WHERE id = biz_id;
  
  -- Log individual usage for auditing and trends (better for scale than single row contention)
  INSERT INTO ai_usage_logs (business_id, use_case, model_id, amount, estimated_cost)
  VALUES (biz_id, use_case_name, model_name, amount, v_cost);

  -- Log metrics (we keep this for quick aggregate view, but logs allow historical analysis)
  INSERT INTO settings (id, content, updated_at)
  VALUES ('ai_metrics', 
    jsonb_build_object(
      'totalGenerations', amount,
      'estimatedCost', v_cost
    ),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    content = jsonb_build_object(
      'totalGenerations', COALESCE((settings.content->>'totalGenerations')::int, 0) + amount,
      'estimatedCost', COALESCE((settings.content->>'estimatedCost')::float, 0.0) + v_cost
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Websites table
CREATE TABLE IF NOT EXISTS websites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses ON DELETE CASCADE,
  theme JSONB NOT NULL,
  pages JSONB NOT NULL,
  seo JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  visitor_id TEXT,
  source TEXT,
  score INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Won', 'Lost')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Lead Remarks table
CREATE TABLE IF NOT EXISTS lead_remarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  remark TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for lead_remarks
ALTER TABLE lead_remarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business admins can manage lead remarks" ON lead_remarks;
CREATE POLICY "Business admins can manage lead remarks" ON lead_remarks
  USING (EXISTS (
    SELECT 1 FROM leads l
    JOIN businesses b ON l.business_id = b.id
    WHERE l.id = lead_remarks.lead_id AND (is_business_admin(b.id) OR is_super_admin())
  ));

-- 6. Blog Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.1 Appointment Settings table
CREATE TABLE IF NOT EXISTS appointment_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  working_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
    "tuesday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
    "wednesday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
    "thursday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
    "friday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
    "saturday": {"enabled": false, "slots": []},
    "sunday": {"enabled": false, "slots": []}
  }',
  buffer_time INTEGER DEFAULT 15,
  slot_duration INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT NOT NULL,
  config JSONB,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Settings table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY, -- e.g., 'landing_page', 'plans'
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default archetype config if not exists
INSERT INTO settings (id, content)
VALUES ('archetype_config', '{
  "enabledStyles": ["modern", "neumorphic", "glassmorphic", "brutalist", "editorial", "action", "immersive", "authority", "corporate"],
  "enabledThemes": ["Authority Master", "Lead Multiplier", "Visual Narrative", "Minimalist Clean", "Corporate Pro", "Midnight Glass", "Scandinavian"]
}')
ON CONFLICT (id) DO NOTHING;

-- 9. Support Tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Support Messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('lead', 'appointment', 'payout', 'system', 'billing')),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses ON DELETE CASCADE,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('published', 'pending', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  stock TEXT DEFAULT 'Unlimited',
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Orders table (Product Sales)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses ON DELETE CASCADE,
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'paid')),
  stripe_session_id TEXT,
  items JSONB NOT NULL, -- [{ productId, name, quantity, price }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Revenue Analytics Helper
CREATE OR REPLACE VIEW revenue_by_business AS
SELECT 
  business_id,
  SUM(total_amount) as total_revenue,
  COUNT(id) as order_count,
  DATE_TRUNC('month', created_at) as month
FROM orders
WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
GROUP BY business_id, month;

-- 17. Traffic Analytics table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL, -- Client-side generated unique ID
  session_id TEXT NOT NULL, -- Current session identifier
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for high-performance aggregations
CREATE INDEX IF NOT EXISTS idx_page_views_business_id ON page_views(business_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON page_views(visitor_id);

-- RLS Policies for page_views
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert page views" ON page_views;
DROP POLICY IF EXISTS "Business admins can view own analytics" ON page_views;
DROP POLICY IF EXISTS "Super Admins can view all analytics" ON page_views;

CREATE POLICY "Public can insert page views" ON page_views FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Business admins can view own analytics" ON page_views FOR SELECT USING (is_business_admin(business_id));
CREATE POLICY "Super Admins can view all analytics" ON page_views FOR SELECT USING (is_super_admin());

-- 18. Analytics Helper Function for Super Admin
CREATE OR REPLACE FUNCTION get_platform_traffic_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_views BIGINT,
  unique_visitors BIGINT,
  avg_views_per_visitor NUMERIC,
  page_path TEXT,
  view_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT visitor_id) as uniques
    FROM page_views
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
  ),
  top_pages AS (
    SELECT 
      pv.page_path,
      COUNT(*) as cnt
    FROM page_views pv
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY pv.page_path
    ORDER BY cnt DESC
    LIMIT 10
  )
  SELECT 
    ds.total,
    ds.uniques,
    (ds.total::NUMERIC / NULLIF(ds.uniques, 0))::NUMERIC(10,2),
    tp.page_path,
    tp.cnt
  FROM daily_stats ds, top_pages tp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Prospects table (Super Admin Customer Acquisition)
CREATE TABLE IF NOT EXISTS prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_status TEXT DEFAULT 'unknown',
  audit_score INTEGER,
  last_audit_at TIMESTAMPTZ,
  outreach_status TEXT DEFAULT 'pending' CHECK (outreach_status IN ('pending', 'contacted', 'scheduled', 'proposal_sent', 'closed', 'rejected')),
  opportunity_level TEXT DEFAULT 'medium' CHECK (opportunity_level IN ('low', 'medium', 'high')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for prospects
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can manage all prospects" ON prospects;
CREATE POLICY "Super Admins can manage all prospects" ON prospects FOR ALL USING (is_super_admin());

-- 21. Audit Reports table
CREATE TABLE IF NOT EXISTS audit_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can manage all audit reports" ON audit_reports;
CREATE POLICY "Super Admins can manage all audit reports" ON audit_reports FOR ALL USING (is_super_admin());

-- 21b. App Error Logs table
CREATE TABLE IF NOT EXISTS app_error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'error' CHECK (level IN ('error', 'warn', 'info')),
  route TEXT,
  source TEXT,
  message TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can view app errors" ON app_error_logs;
DROP POLICY IF EXISTS "Users can insert own app errors" ON app_error_logs;
CREATE POLICY "Super Admins can view app errors" ON app_error_logs FOR SELECT USING (is_super_admin());
CREATE POLICY "Users can insert own app errors" ON app_error_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 22. Webinars table
CREATE TABLE IF NOT EXISTS webinars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  next_occurrence TEXT,
  attendees_count INTEGER DEFAULT 0,
  replay_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Live', 'Draft', 'Completed', 'Archived')),
  thumbnail_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can manage all webinars" ON webinars;
DROP POLICY IF EXISTS "Public can view active webinars" ON webinars;
CREATE POLICY "Super Admins can manage all webinars" ON webinars FOR ALL USING (is_super_admin());
CREATE POLICY "Public can view active webinars" ON webinars FOR SELECT USING (status != 'Draft');

-- 23. Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT,
  description TEXT,
  status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Sending', 'Completed', 'Paused')),
  progress INTEGER DEFAULT 0,
  total_recipients INTEGER DEFAULT 0,
  open_rate FLOAT,
  click_rate FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can manage all campaigns" ON campaigns;
CREATE POLICY "Super Admins can manage all campaigns" ON campaigns FOR ALL USING (is_super_admin());

-- 24. Proposals and Deals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount DECIMAL(12,2),
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Declined', 'Paid')),
  valid_until DATE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can manage all proposals" ON proposals;
DROP POLICY IF EXISTS "Business admins can view their proposals" ON proposals;
CREATE POLICY "Super Admins can manage all proposals" ON proposals FOR ALL USING (is_super_admin());
CREATE POLICY "Business admins can view their proposals" ON proposals FOR SELECT USING (is_business_admin(business_id));

-- 25. Onboarding Sessions table
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  current_step TEXT,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Active', 'Delayed', 'Completed')),
  notes TEXT,
  velocity_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can manage all onboarding sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Business admins can view their onboarding" ON onboarding_sessions;
CREATE POLICY "Super Admins can manage all onboarding sessions" ON onboarding_sessions FOR ALL USING (is_super_admin());
CREATE POLICY "Business admins can view their onboarding" ON onboarding_sessions FOR SELECT USING (is_business_admin(business_id));

-- 19. Daily Traffic Trend Function
CREATE OR REPLACE FUNCTION get_daily_traffic_trend(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date TEXT,
  views BIGINT,
  uniques BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, 'YYYY-MM-DD') as day,
    COUNT(*) as daily_views,
    COUNT(DISTINCT visitor_id) as daily_uniques
  FROM page_views
  WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY day
  ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. Migration helper (Run these if you have an existing database)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'business_admin', 'client', 'affiliate'));

-- Helper function to check if user is super admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user's business_id safely
CREATE OR REPLACE FUNCTION get_auth_business_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT business_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is business admin
CREATE OR REPLACE FUNCTION is_business_admin(target_business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  caller_role TEXT;
  caller_biz_id UUID;
BEGIN
  SELECT role, business_id INTO caller_role, caller_biz_id
  FROM profiles WHERE id = auth.uid();
  
  IF caller_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  RETURN caller_biz_id = target_business_id AND caller_role IN ('business_admin', 'staff');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper for business_id_matches to avoid recursion
CREATE OR REPLACE FUNCTION business_id_matches(target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT business_id FROM profiles WHERE id = auth.uid()) = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Business members can view each other" ON profiles;
DROP POLICY IF EXISTS "Business admins can update business profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can delete all profiles" ON profiles;

DROP POLICY IF EXISTS "Owners can view own business" ON businesses;
DROP POLICY IF EXISTS "Business members can view own business" ON businesses;
DROP POLICY IF EXISTS "Owners can insert business" ON businesses;
DROP POLICY IF EXISTS "Owners can update own business" ON businesses;
DROP POLICY IF EXISTS "Business admins can update own business" ON businesses;
DROP POLICY IF EXISTS "Owners can delete own business" ON businesses;
DROP POLICY IF EXISTS "Super Admins can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Super Admins can manage all businesses" ON businesses;
DROP POLICY IF EXISTS "Public can view basic business info" ON businesses;

DROP POLICY IF EXISTS "Business members can view own websites" ON websites;
DROP POLICY IF EXISTS "Business admins can insert websites" ON websites;
DROP POLICY IF EXISTS "Business admins can update own websites" ON websites;
DROP POLICY IF EXISTS "Business admins can delete own websites" ON websites;
DROP POLICY IF EXISTS "Business admins can manage websites" ON websites;
DROP POLICY IF EXISTS "Super Admins can manage all websites" ON websites;
DROP POLICY IF EXISTS "Public can view published websites" ON websites;

DROP POLICY IF EXISTS "Business members can view own leads" ON leads;
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
DROP POLICY IF EXISTS "Business members can update own leads" ON leads;
DROP POLICY IF EXISTS "Business members can delete own leads" ON leads;
DROP POLICY IF EXISTS "Business members can manage own leads" ON leads;
DROP POLICY IF EXISTS "Super Admins can manage all leads" ON leads;

DROP POLICY IF EXISTS "Public can view published posts" ON posts;
DROP POLICY IF EXISTS "Business members can view all posts" ON posts;
DROP POLICY IF EXISTS "Business admins can insert posts" ON posts;
DROP POLICY IF EXISTS "Business admins can update own posts" ON posts;
DROP POLICY IF EXISTS "Business admins can delete own posts" ON posts;
DROP POLICY IF EXISTS "Super Admins can manage all posts" ON posts;
DROP POLICY IF EXISTS "Business admins can manage posts" ON posts;

DROP POLICY IF EXISTS "Business members can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Public can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Business members can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Business members can delete own appointments" ON appointments;
DROP POLICY IF EXISTS "Super Admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Business members can manage own appointments" ON appointments;

DROP POLICY IF EXISTS "Public read settings" ON settings;
DROP POLICY IF EXISTS "Authenticated read shared settings" ON settings;
DROP POLICY IF EXISTS "Super Admin write settings" ON settings;

DROP POLICY IF EXISTS "Users can manage own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Super Admins can manage all tickets" ON support_tickets;

DROP POLICY IF EXISTS "Users can manage messages for own tickets" ON support_messages;
DROP POLICY IF EXISTS "Super Admins can manage all messages" ON support_messages;

DROP POLICY IF EXISTS "Public can view templates" ON templates;
DROP POLICY IF EXISTS "Super Admins can manage templates" ON templates;

DROP POLICY IF EXISTS "Public can view geo pricing" ON geo_pricing;
DROP POLICY IF EXISTS "Admins can manage geo pricing" ON geo_pricing;

DROP POLICY IF EXISTS "Public can view active programs" ON affiliate_programs;
DROP POLICY IF EXISTS "Business admins can manage own program" ON affiliate_programs;
DROP POLICY IF EXISTS "Affiliates can view their business program" ON affiliate_programs;

DROP POLICY IF EXISTS "Affiliates can view their earnings" ON affiliates;
DROP POLICY IF EXISTS "Public can check referral code" ON affiliates;
DROP POLICY IF EXISTS "Business admins can manage business affiliates" ON affiliates;

DROP POLICY IF EXISTS "Affiliates can view their referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Business admins can manage referrals" ON affiliate_referrals;

DROP POLICY IF EXISTS "Affiliates can view their payouts" ON affiliate_payouts;
DROP POLICY IF EXISTS "Affiliates can insert payout requests" ON affiliate_payouts;
DROP POLICY IF EXISTS "Business admins can manage payouts" ON affiliate_payouts;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Super Admins can manage all notifications" ON notifications;

DROP POLICY IF EXISTS "Public can view published reviews" ON reviews;
DROP POLICY IF EXISTS "Business members can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Public can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Business admins can manage reviews" ON reviews;
DROP POLICY IF EXISTS "Super Admins can manage all reviews" ON reviews;

DROP POLICY IF EXISTS "Business members can view own products" ON products;
DROP POLICY IF EXISTS "Public can view active products" ON products;
DROP POLICY IF EXISTS "Business admins can manage products" ON products;
DROP POLICY IF EXISTS "Super Admins can manage all products" ON products;

-- Profiles: Users can read/write their own profile, Business members can see each other.
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Business members can view each other" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Business admins can update business profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can delete all profiles" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Business members can view each other" ON profiles FOR SELECT USING (is_business_admin(business_id));
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Business admins can update business profiles" ON profiles FOR UPDATE 
USING (is_business_admin(business_id))
WITH CHECK (
  is_business_admin(business_id) AND 
  (role != 'super_admin' OR is_super_admin())
);
CREATE POLICY "Super Admins can view all profiles" ON profiles FOR SELECT USING (is_super_admin());
CREATE POLICY "Super Admins can update all profiles" ON profiles FOR UPDATE USING (is_super_admin());
CREATE POLICY "Super Admins can delete all profiles" ON profiles FOR DELETE USING (is_super_admin());

DROP POLICY IF EXISTS "Anyone can create an order" ON orders;
DROP POLICY IF EXISTS "Business members can view own orders" ON orders;
DROP POLICY IF EXISTS "Super Admins can manage all orders" ON orders;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can create an order" ON orders;
CREATE POLICY "Anyone can create an order" ON orders FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Business members can view own orders" ON orders;
CREATE POLICY "Business members can view own orders" ON orders FOR SELECT USING (is_business_admin(business_id));

DROP POLICY IF EXISTS "Super Admins can manage all orders" ON orders;
CREATE POLICY "Super Admins can manage all orders" ON orders FOR ALL USING (is_super_admin());

-- Businesses: Members can view, Admins can update.
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members can view own business" ON businesses;
CREATE POLICY "Business members can view own business" ON businesses FOR SELECT USING (
  auth.uid() = owner_id OR business_id_matches(id)
);

DROP POLICY IF EXISTS "Public can view basic business info" ON businesses;
-- Public can only see basic business info if they have a published website
DROP VIEW IF EXISTS public_businesses;
CREATE VIEW public_businesses AS
SELECT
  id,
  name,
  platform_type,
  plan,
  status,
  industry,
  business_nature,
  location,
  subdomain,
  custom_domain,
  business_type,
  ga_measurement_id,
  meta_pixel_id,
  chatbot_enabled,
  chatbot_welcome_message,
  chatbot_model,
  created_at
FROM businesses
WHERE EXISTS (
  SELECT 1 FROM websites
  WHERE websites.business_id = businesses.id
    AND websites.status = 'published'
);
GRANT SELECT ON public_businesses TO anon, authenticated;

-- AI Credit Management
CREATE OR REPLACE FUNCTION deduct_ai_credits(p_business_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE businesses
  SET 
    ai_credits = ai_credits - p_amount,
    ai_credits_used = ai_credits_used + p_amount
  WHERE id = p_business_id AND ai_credits >= p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION sum_unpaid_earnings()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (SELECT COALESCE(SUM(unpaid_earnings), 0) FROM affiliates);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reward_affiliate(aff_id UUID, amount DECIMAL, sale_val DECIMAL)
RETURNS VOID AS $$
BEGIN
  -- 1. Update Affiliate Balance
  UPDATE affiliates SET 
    total_earnings = total_earnings + amount,
    unpaid_earnings = unpaid_earnings + amount,
    total_referrals = total_referrals + 1
  WHERE id = aff_id;

  -- 2. Log Referral
  INSERT INTO affiliate_referrals (affiliate_id, status, commission_amount, sale_amount)
  VALUES (aff_id, 'converted', amount, sale_val);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION process_payout(p_payout_id UUID)
RETURNS VOID AS $$
DECLARE
  v_affiliate_id UUID;
  v_amount DECIMAL;
BEGIN
  -- 1. Get payout info
  SELECT affiliate_id, amount INTO v_affiliate_id, v_amount
  FROM affiliate_payouts
  WHERE id = p_payout_id AND status = 'pending';

  IF v_affiliate_id IS NOT NULL THEN
    -- 2. Update payout status
    UPDATE affiliate_payouts SET 
      status = 'processed',
      processed_at = NOW()
    WHERE id = p_payout_id;

    -- 3. Deduct from affiliate unpaid earnings
    UPDATE affiliates SET 
      unpaid_earnings = unpaid_earnings - v_amount
    WHERE id = v_affiliate_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Geo-Pricing Table
CREATE TABLE IF NOT EXISTS geo_pricing (
  country_code TEXT PRIMARY KEY, -- ISO 2-letter country code (e.g., 'IN', 'PH', 'BR')
  country_name TEXT,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 90),
  stripe_coupon_id TEXT, -- Optional: Real Stripe Coupon ID for this country
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE geo_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view geo pricing" ON geo_pricing;
CREATE POLICY "Public can view geo pricing" ON geo_pricing FOR SELECT USING (is_enabled = TRUE);
DROP POLICY IF EXISTS "Admins can manage geo pricing" ON geo_pricing;
CREATE POLICY "Admins can manage geo pricing" ON geo_pricing FOR ALL USING (is_super_admin());

-- Seed Geo Pricing
INSERT INTO geo_pricing (country_code, country_name, discount_percentage)
VALUES 
  ('IN', 'India', 40),
  ('BR', 'Brazil', 30),
  ('PH', 'Philippines', 35),
  ('ID', 'Indonesia', 35),
  ('EG', 'Egypt', 45),
  ('PK', 'Pakistan', 50),
  ('NG', 'Nigeria', 40),
  ('US', 'United States', 0),
  ('GB', 'United Kingdom', 0),
  ('CA', 'Canada', 0),
  ('AU', 'Australia', 0),
  ('SG', 'Singapore', 0)
ON CONFLICT (country_code) DO NOTHING;

DROP POLICY IF EXISTS "Owners can insert business" ON businesses;
DROP POLICY IF EXISTS "Business admins can update own business" ON businesses;
DROP POLICY IF EXISTS "Owners can delete own business" ON businesses;
DROP POLICY IF EXISTS "Super Admins can view all businesses" ON businesses;
DROP POLICY IF EXISTS "Super Admins can manage all businesses" ON businesses;
DROP POLICY IF EXISTS "Business members can view own business" ON businesses;
DROP POLICY IF EXISTS "Public can view basic business info" ON businesses;

CREATE POLICY "Business members can view own business" ON businesses FOR SELECT USING (
  auth.uid() = owner_id OR business_id_matches(id)
);
CREATE POLICY "Owners can insert business" ON businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Business admins can update own business" ON businesses FOR UPDATE USING (
  auth.uid() = owner_id OR is_business_admin(id)
);
CREATE POLICY "Owners can delete own business" ON businesses FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Super Admins can view all businesses" ON businesses FOR SELECT USING (is_super_admin());
CREATE POLICY "Super Admins can manage all businesses" ON businesses FOR ALL USING (is_super_admin());

-- Websites: Business members can view, Admins can manage, Public can view published.
DROP POLICY IF EXISTS "Public can view published websites" ON websites;
DROP POLICY IF EXISTS "Business members can view own websites" ON websites;
DROP POLICY IF EXISTS "Business admins can manage websites" ON websites;
DROP POLICY IF EXISTS "Super Admins can manage all websites" ON websites;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published websites" ON websites FOR SELECT USING (status = 'published');
CREATE POLICY "Business members can view own websites" ON websites FOR SELECT USING (
  is_business_admin(business_id)
);
CREATE POLICY "Business admins can manage websites" ON websites FOR ALL USING (
  is_business_admin(business_id)
);
CREATE POLICY "Super Admins can manage all websites" ON websites FOR ALL USING (is_super_admin());

-- Leads: Business members can view/manage, Public can insert.
DROP POLICY IF EXISTS "Business members can view own leads" ON leads;
DROP POLICY IF EXISTS "Public can insert leads" ON leads;
DROP POLICY IF EXISTS "Business members can manage own leads" ON leads;
DROP POLICY IF EXISTS "Super Admins can manage all leads" ON leads;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business members can view own leads" ON leads FOR SELECT USING (
  is_business_admin(business_id)
);
CREATE POLICY "Public can insert leads" ON leads FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Business members can manage own leads" ON leads FOR ALL USING (
  is_business_admin(business_id)
);
CREATE POLICY "Super Admins can manage all leads" ON leads FOR ALL USING (is_super_admin());

-- Posts: Public can view published, Business members can view all, Admins can manage.
DROP POLICY IF EXISTS "Public can view published posts" ON posts;
DROP POLICY IF EXISTS "Business members can view all posts" ON posts;
DROP POLICY IF EXISTS "Business admins can manage posts" ON posts;
DROP POLICY IF EXISTS "Super Admins can manage all posts" ON posts;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published posts" ON posts FOR SELECT USING (status = 'published');
CREATE POLICY "Business members can view all posts" ON posts FOR SELECT USING (
  is_business_admin(business_id)
);
CREATE POLICY "Business admins can manage posts" ON posts FOR ALL USING (
  is_business_admin(business_id)
);
CREATE POLICY "Super Admins can manage all posts" ON posts FOR ALL USING (is_super_admin());

-- Appointments: Business members can view/manage, Public can insert.
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business members can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Public can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Business members can manage own appointments" ON appointments;
DROP POLICY IF EXISTS "Super Admins can manage all appointments" ON appointments;

CREATE POLICY "Business members can view own appointments" ON appointments FOR SELECT USING (
  is_business_admin(business_id)
);
CREATE POLICY "Public can insert appointments" ON appointments FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Business members can manage own appointments" ON appointments FOR ALL USING (
  is_business_admin(business_id)
);
CREATE POLICY "Super Admins can manage all appointments" ON appointments FOR ALL USING (is_super_admin());

-- Appointment Settings Policies
ALTER TABLE appointment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business members can view own business appointment settings" ON appointment_settings;
CREATE POLICY "Business members can view own business appointment settings" ON appointment_settings 
  FOR SELECT USING (is_business_admin(business_id));
DROP POLICY IF EXISTS "Business admins can manage own appointment settings" ON appointment_settings;
CREATE POLICY "Business admins can manage own appointment settings" ON appointment_settings 
  FOR ALL USING (is_business_admin(business_id));
DROP POLICY IF EXISTS "Public can view appointment settings for booking" ON appointment_settings;
CREATE POLICY "Public can view appointment settings for booking" ON appointment_settings 
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Super Admins can manage all appointment settings" ON appointment_settings;
CREATE POLICY "Super Admins can manage all appointment settings" ON appointment_settings 
  FOR ALL USING (is_super_admin());

-- Settings: Public read for specific non-sensitive IDs, Super Admin write.
DROP POLICY IF EXISTS "Authenticated read shared settings" ON settings;
DROP POLICY IF EXISTS "Super Admin write settings" ON settings;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read shared settings" ON settings
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
CREATE POLICY "Super Admin write settings" ON settings FOR ALL USING (is_super_admin());

-- Support Tickets: Users can manage own, Super Admins can manage all.
DROP POLICY IF EXISTS "Users can manage own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Super Admins can manage all tickets" ON support_tickets;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tickets" ON support_tickets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super Admins can manage all tickets" ON support_tickets FOR ALL USING (is_super_admin());

-- Support Messages: Users can manage messages for their own tickets, Super Admins can manage all.
DROP POLICY IF EXISTS "Users can manage messages for own tickets" ON support_messages;
DROP POLICY IF EXISTS "Super Admins can manage all messages" ON support_messages;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage messages for own tickets" ON support_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM support_tickets WHERE id = support_messages.ticket_id AND user_id = auth.uid())
);
CREATE POLICY "Super Admins can manage all messages" ON support_messages FOR ALL USING (is_super_admin());

-- Templates: Public read, Super Admin manage.
DROP POLICY IF EXISTS "Public can view templates" ON templates;
DROP POLICY IF EXISTS "Super Admins can manage templates" ON templates;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view templates" ON templates FOR SELECT USING (TRUE);
CREATE POLICY "Super Admins can manage templates" ON templates FOR ALL USING (is_super_admin());

-- Functions and Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_websites_updated_at ON websites;
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Affiliate Tables
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  base_commission_rate DECIMAL(5,2) DEFAULT 0.1,
  payout_minimum DECIMAL(10,2) DEFAULT 50.0,
  cookie_duration_days INTEGER DEFAULT 30,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES affiliate_programs ON DELETE CASCADE,
  name TEXT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  requirement_type TEXT CHECK (requirement_type IN ('total_sales', 'referral_count', 'revenue_generated')),
  requirement_value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid UUID REFERENCES auth.users ON DELETE CASCADE,
  business_id UUID REFERENCES businesses ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  total_earnings DECIMAL(10,2) DEFAULT 0.0,
  unpaid_earnings DECIMAL(10,2) DEFAULT 0.0,
  total_referrals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(uid, business_id)
);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates ON DELETE CASCADE,
  lead_id UUID REFERENCES leads ON DELETE SET NULL,
  referred_user_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'cancelled')),
  commission_amount DECIMAL(10,2) DEFAULT 0.0,
  sale_amount DECIMAL(10,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  payment_method TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active programs" ON affiliate_programs;
DROP POLICY IF EXISTS "Business admins can manage own program" ON affiliate_programs;
DROP POLICY IF EXISTS "Affiliates can view their business program" ON affiliate_programs;

DROP POLICY IF EXISTS "Affiliates can view their earnings" ON affiliates;
DROP POLICY IF EXISTS "Public can check referral code" ON affiliates;
DROP POLICY IF EXISTS "Business admins can manage business affiliates" ON affiliates;

DROP POLICY IF EXISTS "Affiliates can view their referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Business admins can manage referrals" ON affiliate_referrals;

DROP POLICY IF EXISTS "Affiliates can view their payouts" ON affiliate_payouts;
DROP POLICY IF EXISTS "Affiliates can insert payout requests" ON affiliate_payouts;
DROP POLICY IF EXISTS "Business admins can manage payouts" ON affiliate_payouts;

CREATE POLICY "Public can view active programs" ON affiliate_programs FOR SELECT USING (is_enabled = TRUE);
CREATE POLICY "Business admins can manage own program" ON affiliate_programs FOR ALL USING (is_business_admin(business_id));
CREATE POLICY "Affiliates can view their business program" ON affiliate_programs FOR SELECT USING (
  EXISTS (SELECT 1 FROM affiliates WHERE uid = auth.uid() AND business_id = affiliate_programs.business_id)
);

CREATE POLICY "Affiliates can view their earnings" ON affiliates FOR SELECT USING (uid = auth.uid());
CREATE POLICY "Public can check referral code" ON affiliates FOR SELECT USING (status = 'active');
CREATE POLICY "Business admins can manage business affiliates" ON affiliates FOR ALL USING (is_business_admin(business_id));

CREATE POLICY "Affiliates can view their referrals" ON affiliate_referrals FOR SELECT USING (
  EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_referrals.affiliate_id AND uid = auth.uid())
);
CREATE POLICY "Business admins can manage referrals" ON affiliate_referrals FOR ALL USING (
  EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_referrals.affiliate_id AND is_business_admin(business_id))
);

-- Payouts Policies
CREATE POLICY "Affiliates can view their payouts" ON affiliate_payouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_payouts.affiliate_id AND uid = auth.uid())
);
CREATE POLICY "Affiliates can insert payout requests" ON affiliate_payouts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_payouts.affiliate_id AND uid = auth.uid())
);
CREATE POLICY "Business admins can manage payouts" ON affiliate_payouts FOR ALL USING (
  EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_payouts.affiliate_id AND is_business_admin(business_id))
);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Super Admins can manage all notifications" ON notifications;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
  auth.uid() = user_id OR is_business_admin(business_id)
);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (
  auth.uid() = user_id OR is_business_admin(business_id)
);
CREATE POLICY "Super Admins can manage all notifications" ON notifications FOR ALL USING (is_super_admin());

-- 21. Performance Indexes for Scaling (1,000+ Customers)
-- Scoped by business_id for multi-tenant isolation performance
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_websites_business_id ON websites(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_posts_business_id ON posts(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_business_id ON affiliates(business_id);

-- Date based indexes for charts/dashboards per business
CREATE INDEX IF NOT EXISTS idx_orders_business_created ON orders(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_business_created ON leads(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON appointments(business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- End of schema
-- Lead Generation Automation Engine
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS automation_score INTEGER,
  ADD COLUMN IF NOT EXISTS automation_temperature TEXT,
  ADD COLUMN IF NOT EXISTS automation_next_action TEXT,
  ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS lead_follow_up_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'phone', 'sms', 'manual')),
  event_type TEXT NOT NULL DEFAULT 'manual_follow_up',
  script TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'completed', 'skipped', 'failed')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_request_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  google_review_url TEXT,
  message_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  target_segment TEXT NOT NULL DEFAULT 'completed_customers',
  sent_count INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_growth_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  lead_count INTEGER NOT NULL DEFAULT 0,
  hot_lead_count INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  local_seo_page_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE (business_id, report_month)
);

CREATE INDEX IF NOT EXISTS idx_leads_business_automation ON leads(business_id, automation_temperature, next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_business_lead ON lead_follow_up_events(business_id, lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_scheduled ON lead_follow_up_events(scheduled_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_review_request_campaigns_business ON review_request_campaigns(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_business_month ON monthly_growth_reports(business_id, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_lead_id ON lead_follow_up_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_profile_id ON lead_follow_up_events(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_review_request_campaigns_profile_id ON review_request_campaigns(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_website_id ON monthly_growth_reports(website_id) WHERE website_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_profile_id ON monthly_growth_reports(profile_id) WHERE profile_id IS NOT NULL;

ALTER TABLE lead_follow_up_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_request_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_growth_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business users manage own lead follow up events" ON lead_follow_up_events;
CREATE POLICY "Business users manage own lead follow up events" ON lead_follow_up_events FOR ALL TO authenticated USING (
  is_super_admin() OR business_id IN (SELECT business_id FROM profiles WHERE id = (SELECT auth.uid()))
) WITH CHECK (
  is_super_admin() OR business_id IN (SELECT business_id FROM profiles WHERE id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Business users manage own review request campaigns" ON review_request_campaigns;
CREATE POLICY "Business users manage own review request campaigns" ON review_request_campaigns FOR ALL TO authenticated USING (
  is_super_admin() OR business_id IN (SELECT business_id FROM profiles WHERE id = (SELECT auth.uid()))
) WITH CHECK (
  is_super_admin() OR business_id IN (SELECT business_id FROM profiles WHERE id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Business users manage own monthly growth reports" ON monthly_growth_reports;
CREATE POLICY "Business users manage own monthly growth reports" ON monthly_growth_reports FOR ALL TO authenticated USING (
  is_super_admin() OR business_id IN (SELECT business_id FROM profiles WHERE id = (SELECT auth.uid()))
) WITH CHECK (
  is_super_admin() OR business_id IN (SELECT business_id FROM profiles WHERE id = (SELECT auth.uid()))
);

DROP TRIGGER IF EXISTS update_lead_follow_up_events_updated_at ON lead_follow_up_events;
CREATE TRIGGER update_lead_follow_up_events_updated_at BEFORE UPDATE ON lead_follow_up_events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_request_campaigns_updated_at ON review_request_campaigns;
CREATE TRIGGER update_review_request_campaigns_updated_at BEFORE UPDATE ON review_request_campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_growth_reports_updated_at ON monthly_growth_reports;
CREATE TRIGGER update_monthly_growth_reports_updated_at BEFORE UPDATE ON monthly_growth_reports FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM businesses WHERE id = NEW.business_id;
  
  INSERT INTO notifications (user_id, business_id, title, message, type, metadata)
  VALUES (
    v_owner_id, 
    NEW.business_id, 
    'New Lead Received', 
    'You have a new lead: ' || NEW.name || ' (' || NEW.email || ')',
    'lead',
    jsonb_build_object('lead_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_lead ON leads;
CREATE TRIGGER trigger_notify_new_lead
AFTER INSERT ON leads
FOR EACH ROW EXECUTE PROCEDURE notify_new_lead();

CREATE OR REPLACE FUNCTION notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM businesses WHERE id = NEW.business_id;
  
  INSERT INTO notifications (user_id, business_id, title, message, type, metadata)
  VALUES (
    v_owner_id, 
    NEW.business_id, 
    'New Appointment Booked', 
    'A new appointment has been booked by ' || NEW.customer_name || ' for ' || NEW.date || ' at ' || NEW.time,
    'appointment',
    jsonb_build_object('appointment_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_appointment ON appointments;
CREATE TRIGGER trigger_notify_new_appointment
AFTER INSERT ON appointments
FOR EACH ROW EXECUTE PROCEDURE notify_new_appointment();

CREATE OR REPLACE FUNCTION notify_new_payout_request()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_business_id UUID;
BEGIN
  SELECT business_id INTO v_business_id FROM affiliates WHERE id = NEW.affiliate_id;
  SELECT owner_id INTO v_owner_id FROM businesses WHERE id = v_business_id;
  
  INSERT INTO notifications (user_id, business_id, title, message, type, metadata)
  VALUES (
    v_owner_id, 
    v_business_id, 
    'New Payout Request', 
    'An affiliate has requested a payout of $' || NEW.amount,
    'payout',
    jsonb_build_object('payout_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_payout_request ON affiliate_payouts;
CREATE TRIGGER trigger_notify_new_payout_request
AFTER INSERT ON affiliate_payouts
FOR EACH ROW EXECUTE PROCEDURE notify_new_payout_request();

-- 40. API Keys for external integrations (REDUNDANT - See wordpress_integrations)

-- 41. WordPress Integrations
CREATE TABLE IF NOT EXISTS wordpress_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_preview TEXT NOT NULL,
  status TEXT DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'connected', 'error', 'disabled')),
  last_connected_at TIMESTAMPTZ,
  last_lead_received_at TIMESTAMPTZ,
  last_event_received_at TIMESTAMPTZ,
  last_page_pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, site_url)
);

-- RLS for WordPress Integrations
ALTER TABLE wordpress_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own business WordPress integrations" ON wordpress_integrations;
CREATE POLICY "Users can manage own business WordPress integrations" ON wordpress_integrations
  FOR ALL USING (is_business_admin(business_id));

-- Update Leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES wordpress_integrations(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_platform TEXT DEFAULT 'wordpress';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_page TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS form_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_fields JSONB;

-- 42. Tracking Events
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES wordpress_integrations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  source_platform TEXT DEFAULT 'wordpress',
  source_page TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Tracking Events
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own business tracking events" ON tracking_events;
CREATE POLICY "Users can view own business tracking events" ON tracking_events
  FOR SELECT USING (is_business_admin(business_id));

-- 42b. External API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business admins can view own api keys" ON api_keys;
DROP POLICY IF EXISTS "Business admins can manage own api keys" ON api_keys;
CREATE POLICY "Business admins can view own api keys" ON api_keys
  FOR SELECT USING (is_business_admin(business_id) OR is_super_admin());
CREATE POLICY "Business admins can manage own api keys" ON api_keys
  FOR ALL USING (is_business_admin(business_id) OR is_super_admin())
  WITH CHECK (is_business_admin(business_id) OR is_super_admin());

-- 43. Generated Pages (WordPress specific or generic)
CREATE TABLE IF NOT EXISTS generated_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES wordpress_integrations(id) ON DELETE SET NULL,
  page_title TEXT NOT NULL,
  page_slug TEXT NOT NULL,
  seo_title TEXT,
  seo_meta_description TEXT,
  sections JSONB,
  wordpress_post_id TEXT,
  wordpress_edit_url TEXT,
  wordpress_preview_url TEXT,
  push_status TEXT DEFAULT 'not_pushed' CHECK (push_status IN ('not_pushed', 'pushed_to_wordpress', 'failed', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Generated Pages
ALTER TABLE generated_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own business generated pages" ON generated_pages;
CREATE POLICY "Users can manage own business generated pages" ON generated_pages
  FOR ALL USING (is_business_admin(business_id));

-- 44. Sync Logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES wordpress_integrations(id) ON DELETE SET NULL,
  direction TEXT CHECK (direction IN ('wordpress_to_waas', 'waas_to_wordpress')),
  event_type TEXT,
  status TEXT,
  message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Sync Logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own business sync logs" ON sync_logs;
CREATE POLICY "Users can view own business sync logs" ON sync_logs
  FOR SELECT USING (is_business_admin(business_id));

-- End of schema
-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- 41. AI Control Tables
-- These tables are also managed in supabase_ai_schema.sql but kept here for backward compatibility or core RLS
CREATE TABLE IF NOT EXISTS ai_feature_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL,
  feature_key TEXT NOT NULL UNIQUE,
  credit_cost INTEGER DEFAULT 1,
  minimum_plan TEXT DEFAULT 'starter',
  default_provider TEXT DEFAULT 'google',
  default_model TEXT DEFAULT 'gemini-1.5-flash',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_model_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT,
  feature_id UUID REFERENCES ai_feature_costs(id) ON DELETE CASCADE,
  provider_override TEXT,
  model_override TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for AI Control
ALTER TABLE ai_feature_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins can manage AI costs" ON ai_feature_costs;
CREATE POLICY "Super Admins can manage AI costs" ON ai_feature_costs FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Super Admins can manage AI routes" ON ai_model_routes;
CREATE POLICY "Super Admins can manage AI routes" ON ai_model_routes FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Everyone can view AI costs" ON ai_feature_costs;
CREATE POLICY "Everyone can view AI costs" ON ai_feature_costs FOR SELECT USING (TRUE);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Realtime and Triggers
DO $$
BEGIN
  -- Realtime tables
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE websites;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE businesses;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointment_settings;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

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
      'new_enquiry', 'qualified', 'consultation_scheduled', 'preparing_quotation',
      'quotation_sent', 'awaiting_decision', 'accepted', 'deposit_paid', 'onboarding',
      'design', 'development', 'customer_review', 'final_revisions', 'final_payment',
      'launched', 'maintenance', 'lost'
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
