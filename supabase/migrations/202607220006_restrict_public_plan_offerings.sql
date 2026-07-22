-- Remove legacy broad public plans policy now that the sales page only needs
-- active plan offerings.

DROP POLICY IF EXISTS "Public read plans" ON public.plans;

NOTIFY pgrst, 'reload schema';
