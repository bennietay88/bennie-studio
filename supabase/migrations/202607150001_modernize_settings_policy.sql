-- Modernize settings RLS policy to avoid auth.role() and use an explicit role target.
-- Supabase now recommends policy TO clauses instead of auth.role() checks.

DROP POLICY IF EXISTS "Authenticated read shared settings" ON public.settings;

CREATE POLICY "Authenticated read shared settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (
    id LIKE 'landing_page%' OR
    id LIKE 'business_policies_%' OR
    id = 'plans' OR
    id = 'marketing_hub_config' OR
    id = 'platform_public' OR
    id = 'archetype_config'
  );
