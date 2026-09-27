-- Commercial workflow launch hardening.
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_commercial_term_months_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_commercial_term_months_check
CHECK (commercial_term_months IS NULL OR (commercial_term_months >= 1 AND commercial_term_months <= 120));

DROP POLICY IF EXISTS "Sales team creates sales_messages" ON public.sales_messages;
DROP POLICY IF EXISTS "Sales team deletes sales_messages" ON public.sales_messages;
DROP POLICY IF EXISTS "Sales team reads sales_messages" ON public.sales_messages;
DROP POLICY IF EXISTS "Sales team updates sales_messages" ON public.sales_messages;
DROP POLICY IF EXISTS "Sales operators manage sales_messages" ON public.sales_messages;
CREATE POLICY "Sales operators manage sales_messages" ON public.sales_messages FOR ALL TO authenticated
USING (private.is_super_admin() OR has_platform_permission('sales'::text))
WITH CHECK (private.is_super_admin() OR has_platform_permission('sales'::text));

DROP POLICY IF EXISTS "Sales team creates sales_tasks" ON public.sales_tasks;
DROP POLICY IF EXISTS "Sales team deletes sales_tasks" ON public.sales_tasks;
DROP POLICY IF EXISTS "Sales team reads sales_tasks" ON public.sales_tasks;
DROP POLICY IF EXISTS "Sales team updates sales_tasks" ON public.sales_tasks;
DROP POLICY IF EXISTS "Sales operators manage sales_tasks" ON public.sales_tasks;
CREATE POLICY "Sales operators manage sales_tasks" ON public.sales_tasks FOR ALL TO authenticated
USING (private.is_super_admin() OR has_platform_permission('sales'::text))
WITH CHECK (private.is_super_admin() OR has_platform_permission('sales'::text));

DROP POLICY IF EXISTS "Customers respond to their approvals" ON public.customer_approvals;

DROP POLICY IF EXISTS "Business users manage own update requests" ON public.monthly_update_requests;
DROP POLICY IF EXISTS "Customer users view own update requests" ON public.monthly_update_requests;
DROP POLICY IF EXISTS "Customer users create own update requests" ON public.monthly_update_requests;
DROP POLICY IF EXISTS "Platform operators manage update requests" ON public.monthly_update_requests;
CREATE POLICY "Customer users view own update requests" ON public.monthly_update_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.business_id=monthly_update_requests.business_id AND p.role=ANY(ARRAY['business_admin'::text,'staff'::text,'client'::text])));
CREATE POLICY "Customer users create own update requests" ON public.monthly_update_requests FOR INSERT TO authenticated
WITH CHECK (profile_id=(SELECT auth.uid()) AND request_type='monthly_update'::text AND status=ANY(ARRAY['draft'::text,'submitted'::text])
AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=(SELECT auth.uid()) AND p.business_id=monthly_update_requests.business_id AND p.role=ANY(ARRAY['business_admin'::text,'staff'::text,'client'::text])));
CREATE POLICY "Platform operators manage update requests" ON public.monthly_update_requests FOR ALL TO authenticated
USING (private.is_super_admin() OR has_platform_permission('delivery'::text) OR has_platform_permission('customer_health'::text) OR has_platform_permission('approvals'::text))
WITH CHECK (private.is_super_admin() OR has_platform_permission('delivery'::text) OR has_platform_permission('customer_health'::text) OR has_platform_permission('approvals'::text));
