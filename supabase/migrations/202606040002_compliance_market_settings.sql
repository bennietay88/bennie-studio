-- UK-ready compliance and market settings for the WAAS platform.
-- Safe, additive migration only.

ALTER TABLE IF EXISTS plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS enabled_features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location_page_limit integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_update_allowance text,
  ADD COLUMN IF NOT EXISTS upgrade_prompt text,
  ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS leads
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS form_version text;

INSERT INTO settings (id, content, updated_at)
VALUES (
  'compliance_market',
  '{
    "targetMarket": "UK",
    "currency": "GBP",
    "currencySymbol": "£",
    "wordingVariant": "uk",
    "ukTemplatesEnabled": true,
    "cookieBannerEnabled": true,
    "analyticsRequiresConsent": true,
    "marketingRequiresConsent": true,
    "analyticsScriptsEnabled": false,
    "marketingScriptsEnabled": false,
    "secureFormsEnabled": true,
    "marketingConsentEnabled": true,
    "retentionPeriodDays": 365,
    "plans": [
      { "id": "starter", "name": "Starter", "price": "£49/month", "description": "A managed one-page website for fast launch." },
      { "id": "growth", "name": "Growth", "price": "£99/month", "description": "A complete small business website with key pages." },
      { "id": "authority", "name": "Authority", "price": "£199/month", "description": "More pages, local SEO structure, and growth support." }
    ],
    "customWebsiteFrom": "£1,500",
    "customWebsiteRange": "from £1,500",
    "legal": {
      "businessLegalName": "Bennie Studio",
      "businessAddress": "",
      "contactEmail": "hello@bennietay.com",
      "privacyEmail": "support@bennietay.com",
      "servicesOffered": "Managed website subscriptions, custom website services, support, and related digital services.",
      "dataCollected": "Name, email address, phone number, business details, website enquiries, billing and support information.",
      "thirdPartyTools": "Hosting, database, email, payments, analytics, DNS/security, and support tools.",
      "marketingConsentCollected": true
    },
    "hosting": {
      "sslStatus": "Enabled",
      "hostingProvider": "Managed hosting provider",
      "deploymentUrl": "",
      "customDomainStatus": "Not connected",
      "backupStatus": "Managed platform backups where available",
      "dpaUrl": ""
    },
    "subprocessors": [
      { "category": "Hosting", "provider": "Managed hosting provider", "purpose": "Website hosting and delivery" },
      { "category": "Database", "provider": "Supabase", "purpose": "Database, authentication, and lead storage" },
      { "category": "Payments", "provider": "Stripe", "purpose": "Subscription and payment processing" },
      { "category": "Email", "provider": "Email service provider", "purpose": "Transactional notifications" },
      { "category": "Analytics", "provider": "Analytics provider", "purpose": "Consent-based traffic measurement" }
    ],
    "generatedPages": {
      "privacy": "",
      "cookies": "",
      "terms": "",
      "subprocessors": "",
      "dpa": "",
      "acceptableUse": ""
    }
  }'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE
SET content = settings.content || EXCLUDED.content,
    updated_at = now();

NOTIFY pgrst, 'reload schema';
