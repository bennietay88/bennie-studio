-- Customer dashboard visibility controls.
-- Access remains plan-based; these fields control what customers see in daily navigation.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS dashboard_visible_features jsonb,
  ADD COLUMN IF NOT EXISTS dashboard_hidden_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dashboard_admin_only_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dashboard_visibility_profile text NOT NULL DEFAULT 'simple_website_client',
  ADD COLUMN IF NOT EXISTS dashboard_visibility_notes text;

COMMENT ON COLUMN businesses.dashboard_visible_features IS
  'Optional allow-list of feature IDs visible in the customer dashboard. Null means use default visibility for all features.';

COMMENT ON COLUMN businesses.dashboard_hidden_features IS
  'Feature IDs hidden from the customer dashboard even if included in the plan.';

COMMENT ON COLUMN businesses.dashboard_admin_only_features IS
  'Feature IDs managed by superadmin and hidden from the customer dashboard.';

COMMENT ON COLUMN businesses.dashboard_visibility_profile IS
  'Admin-selected customer dashboard profile for quick visibility setup.';
