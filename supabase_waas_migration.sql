
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
