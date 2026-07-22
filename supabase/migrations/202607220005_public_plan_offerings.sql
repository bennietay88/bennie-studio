-- Let the public sales page read active plan offerings from the same plans table
-- edited in Super Admin > Billing Plans.

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read plans" ON public.plans;
DROP POLICY IF EXISTS "Public can view active plans" ON public.plans;
CREATE POLICY "Public can view active plans"
  ON public.plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

GRANT SELECT ON public.plans TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
