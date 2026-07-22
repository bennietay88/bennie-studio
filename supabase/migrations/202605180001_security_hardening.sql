-- Security hardening migration for public business data and external API keys.
-- Apply this in Supabase SQL Editor or through the Supabase CLI before deploying
-- code that reads from public_businesses.

DROP POLICY IF EXISTS "Public can view basic business info" ON businesses;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS platform_type TEXT DEFAULT 'waas';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_nature TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ga_measurement_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS chatbot_welcome_message TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS chatbot_model TEXT DEFAULT 'gemini-1.5-flash';

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
  SELECT 1
  FROM websites
  WHERE websites.business_id = businesses.id
    AND websites.status = 'published'
);

GRANT SELECT ON public_businesses TO anon, authenticated;

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

NOTIFY pgrst, 'reload schema';
