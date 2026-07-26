-- Restore Stripe credential/account columns expected by the app and audit triggers.
-- Values remain nullable so existing businesses are unaffected.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_publishable_key text,
  ADD COLUMN IF NOT EXISTS stripe_secret_key text,
  ADD COLUMN IF NOT EXISTS stripe_webhook_secret text,
  ADD COLUMN IF NOT EXISTS stripe_connected_account_id text;

CREATE INDEX IF NOT EXISTS idx_businesses_stripe_connected_account_id
  ON public.businesses (stripe_connected_account_id)
  WHERE stripe_connected_account_id IS NOT NULL;
