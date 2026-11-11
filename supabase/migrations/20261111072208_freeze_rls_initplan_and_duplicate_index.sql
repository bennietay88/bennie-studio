-- Applied to production on 2026-11-11; preserve predicate semantics while
-- permitting auth.uid() to be planned once per statement.
ALTER POLICY "Operators record delivery effort" ON public.delivery_work_logs
WITH CHECK (
  (private.is_super_admin() OR public.has_platform_permission('delivery') OR public.has_platform_permission('finance'))
  AND created_by = (SELECT auth.uid())
);

ALTER POLICY "Customers create manual monthly growth report drafts" ON public.monthly_growth_reports
WITH CHECK (
  status = 'draft' AND source_kind = 'manual'
  AND business_id IN (
    SELECT p.business_id FROM public.profiles AS p WHERE p.id = (SELECT auth.uid())
  )
);

ALTER POLICY "Customers read published monthly growth reports" ON public.monthly_growth_reports
USING (
  status = 'published'
  AND (
    private.is_super_admin()
    OR business_id IN (
      SELECT p.business_id FROM public.profiles AS p WHERE p.id = (SELECT auth.uid())
    )
  )
);

-- Redundant unique index (same key and predicate as
-- idx_monthly_update_requests_client_request). Keep the other index.
DROP INDEX IF EXISTS public.update_requests_client_retry_idx;
