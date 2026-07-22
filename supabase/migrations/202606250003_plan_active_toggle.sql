-- Add active/inactive control for subscription plans.
-- Inactive plans stay stored for existing customers/admin history, but are hidden
-- from new customer-facing plan selection by the app.

ALTER TABLE IF EXISTS plans
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

UPDATE plans
SET is_active = true
WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_plans_is_active
  ON public.plans (is_active);

NOTIFY pgrst, 'reload schema';
