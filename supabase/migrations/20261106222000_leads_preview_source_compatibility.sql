-- Production compatibility: internal sales previews filter on leads.source.
-- Existing deployments used source_platform; preserve historical attribution.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.leads ALTER COLUMN source SET DEFAULT 'website';

UPDATE public.leads
SET source = COALESCE(NULLIF(BTRIM(source_platform), ''), 'website')
WHERE source IS NULL;

CREATE INDEX IF NOT EXISTS leads_source_preview_lookup_idx
ON public.leads (source, preview_id)
WHERE preview_id IS NOT NULL;
