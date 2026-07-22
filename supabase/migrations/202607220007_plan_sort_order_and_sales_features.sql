-- Make Super Admin plan order and public included lists authoritative
-- for the sales pricing page.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS sort_order integer;

UPDATE public.plans
SET sort_order = CASE slug
  WHEN 'starter' THEN 0
  WHEN 'business' THEN 1
  WHEN 'growth' THEN 2
  ELSE COALESCE(sort_order, 99)
END
WHERE sort_order IS NULL OR slug IN ('starter', 'business', 'growth');

UPDATE public.plans
SET features = CASE slug
  WHEN 'starter' THEN '[
    "1-page lead website",
    "Clear offer sections",
    "Contact form",
    "WhatsApp CTA"
  ]'::jsonb
  WHEN 'business' THEN '[
    "Home, Services, Contact",
    "Review-powered trust",
    "WhatsApp/quote flow",
    "3 monthly managed updates"
  ]'::jsonb
  WHEN 'growth' THEN '[
    "Up to 10 pages",
    "Campaign landing pages",
    "Local service-area pages",
    "Monthly website improvement support"
  ]'::jsonb
  ELSE features
END
WHERE slug IN ('starter', 'business', 'growth')
  AND (features IS NULL OR features = '[]'::jsonb);

CREATE INDEX IF NOT EXISTS idx_plans_public_sort
  ON public.plans (is_active, sort_order, price_usd);

NOTIFY pgrst, 'reload schema';
