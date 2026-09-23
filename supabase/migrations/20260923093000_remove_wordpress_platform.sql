-- Retire the legacy external CMS integration completely.
-- Production audit before this migration found zero integration records,
-- quotation records, external-platform businesses, linked generated pages,
-- or plans carrying the retired feature entitlement.

UPDATE public.plans
SET enabled_features = COALESCE(enabled_features, '[]'::jsonb) - 'wordpress_sync'
WHERE COALESCE(enabled_features, '[]'::jsonb) ? 'wordpress_sync';

UPDATE public.settings AS s
SET content = jsonb_set(
  s.content,
  '{pricing}',
  (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_set(
          plan_row,
          '{enabled_features}',
          COALESCE(plan_row->'enabled_features', '[]'::jsonb) - 'wordpress_sync',
          true
        )
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements(COALESCE(s.content->'pricing', '[]'::jsonb)) AS plan_row
  ),
  true
)
WHERE s.id = 'plans'
  AND jsonb_typeof(s.content->'pricing') = 'array';

ALTER TABLE public.leads
  ALTER COLUMN source_platform SET DEFAULT 'website';

ALTER TABLE public.tracking_events
  ALTER COLUMN source_platform SET DEFAULT 'website';

ALTER TABLE public.generated_pages
  DROP COLUMN IF EXISTS integration_id,
  DROP COLUMN IF EXISTS wordpress_post_id,
  DROP COLUMN IF EXISTS wordpress_edit_url,
  DROP COLUMN IF EXISTS wordpress_preview_url,
  DROP COLUMN IF EXISTS push_status;

ALTER TABLE public.leads DROP COLUMN IF EXISTS integration_id;
ALTER TABLE public.tracking_events DROP COLUMN IF EXISTS integration_id;
ALTER TABLE public.sync_logs DROP COLUMN IF EXISTS integration_id;

DROP TABLE IF EXISTS public.wordpress_project_leads CASCADE;
DROP TABLE IF EXISTS public.wordpress_integrations CASCADE;

DROP FUNCTION IF EXISTS public.set_handover_platform_type(uuid, text);

ALTER TABLE public.seo_projects
  DROP CONSTRAINT IF EXISTS seo_projects_adapter_type_check;
ALTER TABLE public.seo_projects
  ADD CONSTRAINT seo_projects_adapter_type_check
  CHECK (adapter_type IN ('waas','api_cms','manual'));

ALTER TABLE public.sync_logs
  DROP CONSTRAINT IF EXISTS sync_logs_direction_check;
ALTER TABLE public.sync_logs
  ADD CONSTRAINT sync_logs_direction_check
  CHECK (direction IN ('export','website_lead','system','inbound','outbound'));

DROP VIEW IF EXISTS public.public_businesses;

ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS platform_type;

CREATE VIEW public.public_businesses
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  plan,
  status,
  industry,
  business_nature,
  location,
  subdomain,
  custom_domain,
  business_type,
  ga_measurement_id,
  meta_pixel_id,
  chatbot_enabled,
  chatbot_welcome_message,
  chatbot_model,
  created_at
FROM public.businesses
WHERE EXISTS (
  SELECT 1
  FROM public.websites
  WHERE websites.business_id = businesses.id
    AND websites.status = 'published'
);

GRANT SELECT ON public.public_businesses TO anon, authenticated, service_role;
