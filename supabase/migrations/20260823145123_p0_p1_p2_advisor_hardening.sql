-- Follow-up hardening from Supabase database advisors.

CREATE INDEX IF NOT EXISTS template_experiments_created_by_idx
  ON public.template_experiments(created_by)
  WHERE created_by IS NOT NULL;

DROP POLICY IF EXISTS "Customers read own growth integrations" ON public.customer_growth_integrations;
DROP POLICY IF EXISTS "Platform manages growth integrations" ON public.customer_growth_integrations;

CREATE POLICY "Customers and platform read growth integrations"
  ON public.customer_growth_integrations FOR SELECT TO authenticated
  USING (
    public.is_platform_operator()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.business_id = customer_growth_integrations.business_id
    )
  );

CREATE POLICY "Platform creates growth integrations"
  ON public.customer_growth_integrations FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_operator());

CREATE POLICY "Platform updates growth integrations"
  ON public.customer_growth_integrations FOR UPDATE TO authenticated
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

CREATE POLICY "Platform deletes growth integrations"
  ON public.customer_growth_integrations FOR DELETE TO authenticated
  USING (public.is_platform_operator());

DROP POLICY IF EXISTS "Customers read own health signals" ON public.customer_health_signals;
DROP POLICY IF EXISTS "Platform manages health signals" ON public.customer_health_signals;

CREATE POLICY "Customers and platform read health signals"
  ON public.customer_health_signals FOR SELECT TO authenticated
  USING (
    public.is_platform_operator()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.business_id = customer_health_signals.business_id
    )
  );

CREATE POLICY "Platform creates health signals"
  ON public.customer_health_signals FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_operator());

CREATE POLICY "Platform updates health signals"
  ON public.customer_health_signals FOR UPDATE TO authenticated
  USING (public.is_platform_operator())
  WITH CHECK (public.is_platform_operator());

CREATE POLICY "Platform deletes health signals"
  ON public.customer_health_signals FOR DELETE TO authenticated
  USING (public.is_platform_operator());

NOTIFY pgrst, 'reload schema';
