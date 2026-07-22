-- Core revenue path hardening: draft previews, button health, and lead attribution.
-- Safe additive migration.

ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS generation_error text,
  ADD COLUMN IF NOT EXISTS preview_status text DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS button_health jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_report jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_page text,
  ADD COLUMN IF NOT EXISTS form_name text,
  ADD COLUMN IF NOT EXISTS raw_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS visitor_id text;

CREATE TABLE IF NOT EXISTS public.website_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  technical_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_websites_business_preview_status ON public.websites (business_id, preview_status);
CREATE INDEX IF NOT EXISTS idx_leads_website_id ON public.leads (website_id);
CREATE INDEX IF NOT EXISTS idx_website_error_logs_business ON public.website_error_logs (business_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
