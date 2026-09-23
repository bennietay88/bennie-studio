-- Public claims cleanup support: approved customer testimonials.

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

ALTER TABLE public.customer_testimonials ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_customer_testimonials_public
  ON public.customer_testimonials (publish_status, consent_status, date_approved DESC)
  WHERE publish_status = 'published' AND consent_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_customer_testimonials_business_status
  ON public.customer_testimonials (business_id, publish_status, updated_at DESC);

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

DROP TRIGGER IF EXISTS update_customer_testimonials_updated_at ON public.customer_testimonials;
CREATE TRIGGER update_customer_testimonials_updated_at
  BEFORE UPDATE ON public.customer_testimonials
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

GRANT SELECT ON public.customer_testimonials TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_testimonials TO authenticated;
