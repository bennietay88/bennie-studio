-- Industry content modules for customer-managed niche content:
-- real estate listings, menus, service packages, classes, rooms, jobs, events, and portfolio projects.

CREATE TABLE IF NOT EXISTS public.industry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  module_type text NOT NULL DEFAULT 'real_estate_listing',
  title text NOT NULL,
  slug text,
  status text NOT NULL DEFAULT 'draft',
  category text,
  price_label text,
  location text,
  short_description text,
  description text,
  image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  cta_label text,
  cta_type text NOT NULL DEFAULT 'contact_form',
  cta_target text,
  enquiry_message text,
  seo_title text,
  seo_description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT industry_items_module_type_check CHECK (
    module_type IN (
      'real_estate_listing',
      'restaurant_menu_item',
      'service_package',
      'class_program',
      'vehicle_listing',
      'room_listing',
      'job_opening',
      'event_listing',
      'portfolio_project'
    )
  ),
  CONSTRAINT industry_items_status_check CHECK (
    status IN (
      'draft',
      'available',
      'reserved',
      'sold',
      'rented',
      'inactive',
      'archived',
      'published',
      'featured',
      'limited',
      'sold_out',
      'new_intake',
      'full',
      'unavailable',
      'urgent',
      'closed'
    )
  ),
  CONSTRAINT industry_items_cta_type_check CHECK (
    cta_type IN (
      'contact_form',
      'whatsapp',
      'phone',
      'email',
      'booking_link',
      'external_url',
      'checkout_link',
      'none'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_industry_items_business_slug
  ON public.industry_items (business_id, module_type, slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_industry_items_business_module
  ON public.industry_items (business_id, module_type, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_industry_items_public
  ON public.industry_items (business_id, module_type, is_visible, status)
  WHERE is_visible = true;

ALTER TABLE public.industry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view visible industry items" ON public.industry_items;
CREATE POLICY "Public can view visible industry items"
  ON public.industry_items
  FOR SELECT
  USING (
    is_visible = true
    AND status NOT IN ('draft', 'inactive', 'archived')
  );

DROP POLICY IF EXISTS "Business users can view own industry items" ON public.industry_items;
CREATE POLICY "Business users can view own industry items"
  ON public.industry_items
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (
      SELECT profiles.business_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business admins can insert own industry items" ON public.industry_items;
CREATE POLICY "Business admins can insert own industry items"
  ON public.industry_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR business_id IN (
      SELECT profiles.business_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('business_admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Business admins can update own industry items" ON public.industry_items;
CREATE POLICY "Business admins can update own industry items"
  ON public.industry_items
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (
      SELECT profiles.business_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('business_admin', 'staff')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (
      SELECT profiles.business_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('business_admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Business admins can delete own industry items" ON public.industry_items;
CREATE POLICY "Business admins can delete own industry items"
  ON public.industry_items
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (
      SELECT profiles.business_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('business_admin', 'staff')
    )
  );

CREATE TABLE IF NOT EXISTS public.industry_item_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.industry_items(id) ON DELETE SET NULL,
  lead_id uuid,
  name text,
  email text,
  phone text,
  message text,
  source_page text,
  status text NOT NULL DEFAULT 'new',
  consent_given boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT industry_item_enquiries_status_check CHECK (
    status IN ('new', 'contacted', 'qualified', 'closed', 'spam', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS idx_industry_item_enquiries_business
  ON public.industry_item_enquiries (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_industry_item_enquiries_item
  ON public.industry_item_enquiries (item_id, created_at DESC);

ALTER TABLE public.industry_item_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit industry item enquiries" ON public.industry_item_enquiries;
CREATE POLICY "Public can submit industry item enquiries"
  ON public.industry_item_enquiries
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Business users can view own industry item enquiries" ON public.industry_item_enquiries;
CREATE POLICY "Business users can view own industry item enquiries"
  ON public.industry_item_enquiries
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (
      SELECT profiles.business_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business admins can manage own industry item enquiries" ON public.industry_item_enquiries;
CREATE POLICY "Business admins can manage own industry item enquiries"
  ON public.industry_item_enquiries
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (
      SELECT profiles.business_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('business_admin', 'staff')
    )
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (
      SELECT profiles.business_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('business_admin', 'staff')
    )
  );

GRANT SELECT ON public.industry_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.industry_items TO authenticated;
GRANT INSERT ON public.industry_item_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.industry_item_enquiries TO authenticated;

NOTIFY pgrst, 'reload schema';
