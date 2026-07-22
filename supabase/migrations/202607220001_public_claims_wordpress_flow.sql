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
      'new_enquiry',
      'qualified',
      'consultation_scheduled',
      'preparing_quotation',
      'quotation_sent',
      'awaiting_decision',
      'accepted',
      'deposit_paid',
      'onboarding',
      'design',
      'development',
      'customer_review',
      'final_revisions',
      'final_payment',
      'launched',
      'maintenance',
      'lost'
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
