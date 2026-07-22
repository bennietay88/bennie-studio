-- Template taxonomy, live-preview metadata, and section library support.
-- Apply manually in Supabase. Existing templates remain compatible.

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS page_type text,
  ADD COLUMN IF NOT EXISTS plan_access text[] NOT NULL DEFAULT ARRAY['Starter']::text[],
  ADD COLUMN IF NOT EXISTS premium_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS recommended_use_case text,
  ADD COLUMN IF NOT EXISTS included_sections text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS seo_readiness text NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS conversion_goal text,
  ADD COLUMN IF NOT EXISTS filter_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS preview_image text,
  ADD COLUMN IF NOT EXISTS font_pairing text,
  ADD COLUMN IF NOT EXISTS layout_variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE templates
  DROP CONSTRAINT IF EXISTS templates_premium_status_check;

ALTER TABLE templates
  ADD CONSTRAINT templates_premium_status_check
  CHECK (premium_status IN ('free', 'premium'));

CREATE TABLE IF NOT EXISTS template_taxonomy_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  label text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, slug)
);

CREATE TABLE IF NOT EXISTS section_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  section_type text NOT NULL,
  category text,
  description text,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  editable_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  plan_access text[] NOT NULL DEFAULT ARRAY['Starter']::text[],
  is_premium boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE template_taxonomy_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active template taxonomy" ON template_taxonomy_options;
CREATE POLICY "Anyone can view active template taxonomy"
  ON template_taxonomy_options
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage template taxonomy" ON template_taxonomy_options;
CREATE POLICY "Super admins can manage template taxonomy"
  ON template_taxonomy_options
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Anyone can view active section templates" ON section_templates;
CREATE POLICY "Anyone can view active section templates"
  ON section_templates
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage section templates" ON section_templates;
CREATE POLICY "Super admins can manage section templates"
  ON section_templates
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

INSERT INTO template_taxonomy_options (type, label, slug, sort_order)
VALUES
  ('category', 'Landing Page', 'landing-page', 10),
  ('category', 'Single Page Website', 'single-page-website', 20),
  ('category', 'Sales Funnel', 'sales-funnel', 30),
  ('category', 'Homepage', 'homepage', 40),
  ('category', 'About Page', 'about-page', 50),
  ('category', 'Services Page', 'services-page', 60),
  ('category', 'Contact Page', 'contact-page', 70),
  ('category', 'Pricing Page', 'pricing-page', 80),
  ('category', 'Blog Page', 'blog-page', 90),
  ('category', 'Thank You Page', 'thank-you-page', 100),
  ('category', 'Lead Generation Page', 'lead-generation-page', 110),
  ('category', 'Booking Page', 'booking-page', 120),
  ('category', 'Webinar Page', 'webinar-page', 130),
  ('category', 'Product Launch Page', 'product-launch-page', 140),
  ('industry', 'Consultant', 'consultant', 10),
  ('industry', 'Coach', 'coach', 20),
  ('industry', 'Agency', 'agency', 30),
  ('industry', 'Local Services', 'local-services', 40),
  ('industry', 'Beauty Salon', 'beauty-salon', 50),
  ('industry', 'Dental Clinic', 'dental-clinic', 60),
  ('industry', 'Fitness Studio', 'fitness-studio', 70),
  ('industry', 'Contractor', 'contractor', 80),
  ('industry', 'Real Estate', 'real-estate', 90),
  ('industry', 'Accountant', 'accountant', 100),
  ('industry', 'Lawyer', 'lawyer', 110),
  ('industry', 'Restaurant', 'restaurant', 120),
  ('industry', 'Education Centre', 'education-centre', 130),
  ('industry', 'Cleaning Service', 'cleaning-service', 140),
  ('industry', 'Home Repair', 'home-repair', 150)
ON CONFLICT (type, slug) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();
