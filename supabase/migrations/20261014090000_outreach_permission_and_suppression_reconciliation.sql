-- Keep all outbound revenue operations behind the explicit sales permission.
-- Existing unrestricted staff policies are replaced rather than layered.
DO $migration$
DECLARE t text; verb text;
BEGIN
  FOREACH t IN ARRAY ARRAY['outreach_sequences','outreach_sequence_steps','outreach_enrollments','sales_suppressions']
  LOOP
    FOREACH verb IN ARRAY ARRAY['reads','creates','updates','deletes']
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Sales team '||verb||' '||t, t);
    END LOOP;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Sales operators manage '||t, t);
    FOREACH verb IN ARRAY ARRAY['readers','inserts','updates','deletes']
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Sales authorized '||verb||' '||t, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.is_super_admin() OR has_platform_permission(''sales''))', 'Sales authorized readers '||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.is_super_admin() OR has_platform_permission(''sales''))', 'Sales authorized inserts '||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (private.is_super_admin() OR has_platform_permission(''sales'')) WITH CHECK (private.is_super_admin() OR has_platform_permission(''sales''))', 'Sales authorized updates '||t, t);
    IF t <> 'sales_suppressions' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.is_super_admin() OR has_platform_permission(''sales''))', 'Sales authorized deletes '||t, t);
    END IF;
  END LOOP;
END $migration$;

-- Race-safe single active enrollment per contact, including paused sequences.
CREATE UNIQUE INDEX IF NOT EXISTS outreach_one_active_prospect_idx
  ON public.outreach_enrollments (prospect_id)
  WHERE prospect_id IS NOT NULL AND status IN ('pending','active','paused');
CREATE UNIQUE INDEX IF NOT EXISTS outreach_one_active_lead_idx
  ON public.outreach_enrollments (lead_id)
  WHERE lead_id IS NOT NULL AND status IN ('pending','active','paused');

-- Historical reconciliation: retain every suppression and prospect; only clear
-- invalid future contact reminders and open contact tasks.
UPDATE public.prospects p SET next_follow_up_at = NULL, updated_at = NOW()
 WHERE p.next_follow_up_at IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.sales_suppressions s
                WHERE s.email IS NOT NULL AND lower(trim(s.email)) = lower(trim(p.contact_email)));
UPDATE public.sales_tasks task SET status = 'dismissed', updated_at = NOW()
 WHERE task.status = 'open'
   AND task.task_type IN ('follow_up','reply','new_lead_response','call_follow_up')
   AND EXISTS (SELECT 1 FROM public.prospects p
                JOIN public.sales_suppressions s ON s.email IS NOT NULL
                 AND lower(trim(s.email)) = lower(trim(p.contact_email))
                WHERE p.id = task.prospect_id);

NOTIFY pgrst, 'reload schema';
