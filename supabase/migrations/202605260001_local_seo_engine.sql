-- Local SEO Engine extension.
-- Safe additive migration. It does not modify existing website, auth, or billing data.

CREATE TABLE IF NOT EXISTS public.local_seo_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  state_region text,
  city text,
  district text,
  nearby_areas text[] DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  page_type text NOT NULL DEFAULT 'service_location',
  status text NOT NULL DEFAULT 'draft',
  slug text NOT NULL,
  country text,
  state_region text,
  city text,
  main_service text,
  industry text,
  seo_title text,
  meta_description text,
  h1 text,
  focus_keyword text,
  supporting_keywords text[] DEFAULT '{}',
  local_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  schema_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_score integer NOT NULL DEFAULT 0,
  duplicate_risk text NOT NULL DEFAULT 'low',
  suggestions text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monthly_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'content_update',
  status text NOT NULL DEFAULT 'new',
  title text NOT NULL,
  details text,
  allowance_period text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_seo_pages_business_id ON public.local_seo_pages(business_id);
CREATE INDEX IF NOT EXISTS idx_local_seo_pages_status ON public.local_seo_pages(status);
CREATE INDEX IF NOT EXISTS idx_local_seo_pages_city_service ON public.local_seo_pages(city, main_service);
CREATE INDEX IF NOT EXISTS idx_monthly_update_requests_business_id ON public.monthly_update_requests(business_id);

ALTER TABLE public.local_seo_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_update_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage local seo locations" ON public.local_seo_locations;
CREATE POLICY "Super admins manage local seo locations" ON public.local_seo_locations
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Business users view own local seo pages" ON public.local_seo_pages;
CREATE POLICY "Business users view own local seo pages" ON public.local_seo_pages
  FOR SELECT USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Business admins manage own local seo pages" ON public.local_seo_pages;
CREATE POLICY "Business admins manage own local seo pages" ON public.local_seo_pages
  FOR ALL USING (
    is_super_admin()
    OR business_id IN (
      SELECT business_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('business_admin', 'staff')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (
      SELECT business_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('business_admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Business users manage own update requests" ON public.monthly_update_requests;
CREATE POLICY "Business users manage own update requests" ON public.monthly_update_requests
  FOR ALL USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
