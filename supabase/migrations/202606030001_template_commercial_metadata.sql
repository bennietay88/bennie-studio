-- Commercial WAAS template metadata.
-- Safe additive migration: existing templates keep their current config and rendering.

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS admin_name text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS business_category text,
  ADD COLUMN IF NOT EXISTS template_pack text,
  ADD COLUMN IF NOT EXISTS conversion_goal text,
  ADD COLUMN IF NOT EXISTS secondary_conversion_goals jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_plan text,
  ADD COLUMN IF NOT EXISTS supported_page_counts jsonb DEFAULT '[1,3,5]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_type text,
  ADD COLUMN IF NOT EXISTS cta_strategy jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_capture_type text,
  ADD COLUMN IF NOT EXISTS local_seo_readiness boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS urgency_level text DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS style_preset text,
  ADD COLUMN IF NOT EXISTS template_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS best_fit_customer_profile text,
  ADD COLUMN IF NOT EXISTS section_preset jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS editable_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_preset jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS page_structures jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_templates_industry ON templates (industry);
CREATE INDEX IF NOT EXISTS idx_templates_template_pack ON templates (template_pack);
CREATE INDEX IF NOT EXISTS idx_templates_conversion_goal ON templates (conversion_goal);
CREATE INDEX IF NOT EXISTS idx_templates_recommended_plan ON templates (recommended_plan);
CREATE INDEX IF NOT EXISTS idx_templates_local_seo_readiness ON templates (local_seo_readiness);

NOTIFY pgrst, 'reload schema';
