-- Custom domain workflow support.
-- Apply this manually in Supabase before using the custom domain dashboard.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS custom_domain_status text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_domain_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_domain_error text,
  ADD COLUMN IF NOT EXISTS ssl_status text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS ssl_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS domain_dns_records jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_custom_domain_status_check;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_custom_domain_status_check
  CHECK (
    custom_domain_status IN (
      'not_connected',
      'dns_pending',
      'dns_detected',
      'ssl_pending',
      'connected',
      'error'
    )
  );

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_ssl_status_check;

ALTER TABLE businesses
  ADD CONSTRAINT businesses_ssl_status_check
  CHECK (
    ssl_status IN (
      'not_connected',
      'pending',
      'issued',
      'error'
    )
  );

CREATE INDEX IF NOT EXISTS idx_businesses_custom_domain_lookup
  ON businesses ((lower(custom_domain)))
  WHERE custom_domain IS NOT NULL;
