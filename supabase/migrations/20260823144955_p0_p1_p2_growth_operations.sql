-- P0-P2 sales proof, delivery operations, and measured customer growth.
-- Additive and backward-compatible: existing prospects, leads, projects,
-- testimonials, reports, and affiliate records remain valid.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS preview_personalization jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preview_generated_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_channel text,
  ADD COLUMN IF NOT EXISTS response_owner uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS launch_target_at timestamptz,
  ADD COLUMN IF NOT EXISTS capacity_status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS launch_blocker text;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_capacity_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_capacity_status_check
  CHECK (capacity_status IN ('planned','in_progress','waiting_customer','blocked','ready','launched'));

ALTER TABLE public.customer_testimonials
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS before_summary text,
  ADD COLUMN IF NOT EXISTS changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS result_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS before_image_url text,
  ADD COLUMN IF NOT EXISTS after_image_url text;

CREATE UNIQUE INDEX IF NOT EXISTS customer_testimonials_slug_unique
  ON public.customer_testimonials(slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS prospects_preview_queue_idx
  ON public.prospects(preview_generated_at, created_at DESC)
  WHERE preview_url IS NULL AND status <> 'lost';

CREATE INDEX IF NOT EXISTS leads_response_sla_idx
  ON public.leads(created_at DESC)
  WHERE first_response_at IS NULL;

CREATE INDEX IF NOT EXISTS projects_capacity_idx
  ON public.projects(capacity_status, launch_target_at);

CREATE TABLE IF NOT EXISTS public.customer_growth_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_business_profile','manual')),
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected','connected','needs_attention','paused')),
  external_location_id text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider)
);

CREATE TABLE IF NOT EXISTS public.customer_health_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','attention','urgent')),
  title text NOT NULL,
  evidence text,
  recommended_action text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  source text NOT NULL DEFAULT 'manual',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.template_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','running','paused','completed','cancelled')),
  hypothesis text NOT NULL,
  primary_event text NOT NULL,
  variant_a jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant_b jsonb NOT NULL DEFAULT '{}'::jsonb,
  minimum_sessions integer NOT NULL DEFAULT 200 CHECK (minimum_sessions >= 1),
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vertical_delivery_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  template_id text NOT NULL,
  market text NOT NULL DEFAULT 'MY',
  required_inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  proof_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  launch_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_growth_integrations_business_idx
  ON public.customer_growth_integrations(business_id, provider);
CREATE INDEX IF NOT EXISTS customer_health_signals_open_idx
  ON public.customer_health_signals(business_id, status, severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS template_experiments_status_idx
  ON public.template_experiments(status, template_id);

ALTER TABLE public.customer_growth_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_health_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_delivery_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers read own growth integrations" ON public.customer_growth_integrations;
CREATE POLICY "Customers read own growth integrations"
  ON public.customer_growth_integrations FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.business_id = customer_growth_integrations.business_id
    )
  );

DROP POLICY IF EXISTS "Platform manages growth integrations" ON public.customer_growth_integrations;
CREATE POLICY "Platform manages growth integrations"
  ON public.customer_growth_integrations FOR ALL TO authenticated
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

DROP POLICY IF EXISTS "Customers read own health signals" ON public.customer_health_signals;
CREATE POLICY "Customers read own health signals"
  ON public.customer_health_signals FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.business_id = customer_health_signals.business_id
    )
  );

DROP POLICY IF EXISTS "Platform manages health signals" ON public.customer_health_signals;
CREATE POLICY "Platform manages health signals"
  ON public.customer_health_signals FOR ALL TO authenticated
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform manages template experiments" ON public.template_experiments;
CREATE POLICY "Platform manages template experiments"
  ON public.template_experiments FOR ALL TO authenticated
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

DROP POLICY IF EXISTS "Platform manages vertical delivery kits" ON public.vertical_delivery_kits;
CREATE POLICY "Platform manages vertical delivery kits"
  ON public.vertical_delivery_kits FOR ALL TO authenticated
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

REVOKE ALL ON public.customer_growth_integrations, public.customer_health_signals, public.template_experiments, public.vertical_delivery_kits FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_growth_integrations, public.customer_health_signals, public.template_experiments, public.vertical_delivery_kits TO authenticated;

DROP TRIGGER IF EXISTS update_customer_growth_integrations_updated_at ON public.customer_growth_integrations;
CREATE TRIGGER update_customer_growth_integrations_updated_at
  BEFORE UPDATE ON public.customer_growth_integrations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_health_signals_updated_at ON public.customer_health_signals;
CREATE TRIGGER update_customer_health_signals_updated_at
  BEFORE UPDATE ON public.customer_health_signals
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_experiments_updated_at ON public.template_experiments;
CREATE TRIGGER update_template_experiments_updated_at
  BEFORE UPDATE ON public.template_experiments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vertical_delivery_kits_updated_at ON public.vertical_delivery_kits;
CREATE TRIGGER update_vertical_delivery_kits_updated_at
  BEFORE UPDATE ON public.vertical_delivery_kits
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

INSERT INTO public.vertical_delivery_kits (slug, name, template_id, required_inputs, proof_requirements, launch_checklist)
VALUES
  ('clinic-my', 'Clinic launch kit', 'dental-clinic-v1', '["Treatments","Practitioner details","Opening hours","Appointment method","Location"]', '["Practitioner credentials","Approved patient reviews","Clinic photographs"]', '["Appointment CTA tested","Phone and WhatsApp tested","Medical claims reviewed","Location details verified"]'),
  ('renovation-my', 'Renovation launch kit', 'renovation-contractor-v1', '["Services","Service areas","Quote requirements","Contact details"]', '["Completed project photographs","Approved customer reviews","Warranty or process information"]', '["Quote form tested","WhatsApp message tested","Project gallery approved","Service areas verified"]'),
  ('professional-my', 'Professional services launch kit', 'law-firm-v1', '["Services","Advisor profiles","Consultation method","Contact details"]', '["Credentials","Approved case studies","Professional registrations where relevant"]', '["Consultation path tested","Claims reviewed","Privacy copy approved","Contact routing verified"]'),
  ('education-my', 'Education launch kit', 'tuition-centre-v1', '["Programmes","Age or level groups","Class schedule","Trial class method"]', '["Teacher profiles","Approved parent reviews","Actual programme outcomes where documented"]', '["Trial CTA tested","Programme details verified","Parent enquiry routing tested","Safeguarding copy reviewed"]'),
  ('beauty-my', 'Beauty and hospitality launch kit', 'salon-spa-v1', '["Treatment menu","Prices or price context","Opening hours","Booking method"]', '["Original treatment or venue images","Approved customer reviews","Practitioner details"]', '["Booking path tested","Treatment claims reviewed","Gallery approved","Location details verified"]')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  template_id = EXCLUDED.template_id,
  required_inputs = EXCLUDED.required_inputs,
  proof_requirements = EXCLUDED.proof_requirements,
  launch_checklist = EXCLUDED.launch_checklist,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
