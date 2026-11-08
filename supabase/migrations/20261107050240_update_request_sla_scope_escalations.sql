-- Add an auditable, opt-in managed-update SLA workflow. All changes are
-- additive; notifications are in-app only and no customer email is sent.

ALTER TABLE public.monthly_update_requests
  ADD COLUMN IF NOT EXISTS consumes_allowance boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS scope_classification text,
  ADD COLUMN IF NOT EXISTS scope_notes text,
  ADD COLUMN IF NOT EXISTS scope_classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS scope_classified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_response text,
  ADD COLUMN IF NOT EXISTS customer_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_paused_seconds bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_resume_status text,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text;

-- Revision requests created by the approval workflow are not allowance-based
-- managed updates. Preserve and correct legacy rows without changing status.
UPDATE public.monthly_update_requests
SET consumes_allowance = false
WHERE request_type = 'website_approval_change' OR update_category = 'website_approval';

DO $$ BEGIN
  ALTER TABLE public.monthly_update_requests
    ADD CONSTRAINT monthly_update_requests_scope_classification_check
    CHECK (scope_classification IS NULL OR scope_classification IN ('included', 'clarification', 'out_of_scope'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.monthly_update_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.monthly_update_requests(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('customer', 'staff', 'system')),
  event_type text NOT NULL CHECK (event_type IN (
    'status_changed', 'scope_classified', 'customer_response', 'sla_escalated',
    'allowance_override_granted', 'allowance_override_revoked'
  )),
  from_status text,
  to_status text,
  idempotency_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, idempotency_key)
);

ALTER TABLE public.monthly_update_request_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_update_request_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.monthly_update_request_events TO authenticated;
GRANT SELECT, INSERT ON public.monthly_update_request_events TO service_role;

DROP POLICY IF EXISTS "Platform operators read update request events" ON public.monthly_update_request_events;
CREATE POLICY "Platform operators read update request events"
  ON public.monthly_update_request_events FOR SELECT TO authenticated
  USING (
    private.is_super_admin()
    OR public.has_platform_permission('delivery')
    OR public.has_platform_permission('customer_health')
  );

CREATE TABLE IF NOT EXISTS public.monthly_update_allowance_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  allowance_period text NOT NULL CHECK (allowance_period ~ '^\d{4}-\d{2}$'),
  allowance_delta integer NOT NULL CHECK (allowance_delta BETWEEN 1 AND 10),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 500),
  granted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL UNIQUE,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoke_reason text,
  CHECK ((revoked_at IS NULL AND revoked_by IS NULL AND revoke_reason IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND char_length(btrim(COALESCE(revoke_reason, ''))) >= 10))
);

CREATE INDEX IF NOT EXISTS idx_monthly_update_allowance_overrides_active
  ON public.monthly_update_allowance_overrides(business_id, allowance_period)
  WHERE revoked_at IS NULL;

ALTER TABLE public.monthly_update_allowance_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_update_allowance_overrides FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.monthly_update_allowance_overrides TO service_role;

CREATE OR REPLACE FUNCTION public.maintain_monthly_update_request_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_paused_seconds bigint;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'waiting_for_customer' AND OLD.status <> 'waiting_for_customer' THEN
    NEW.sla_paused_at := COALESCE(NEW.sla_paused_at, clock_timestamp());
    NEW.sla_resume_status := CASE
      WHEN OLD.status IN ('submitted', 'acknowledged', 'in_progress') THEN OLD.status
      ELSE 'in_progress'
    END;
  ELSIF OLD.status = 'waiting_for_customer' AND NEW.status <> 'waiting_for_customer' THEN
    v_paused_seconds := GREATEST(0, floor(extract(epoch FROM (clock_timestamp() - COALESCE(OLD.sla_paused_at, clock_timestamp()))))::bigint);
    NEW.sla_paused_seconds := COALESCE(OLD.sla_paused_seconds, 0) + v_paused_seconds;
    IF OLD.estimated_response_at IS NOT NULL THEN
      NEW.estimated_response_at := OLD.estimated_response_at + make_interval(secs => v_paused_seconds);
    END IF;
    NEW.sla_paused_at := NULL;
    NEW.sla_resume_status := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintain_monthly_update_request_sla ON public.monthly_update_requests;
CREATE TRIGGER trg_maintain_monthly_update_request_sla
  BEFORE UPDATE OF status ON public.monthly_update_requests
  FOR EACH ROW EXECUTE FUNCTION public.maintain_monthly_update_request_sla();

CREATE OR REPLACE FUNCTION public.get_monthly_update_allowance(p_business_id uuid)
RETURNS TABLE (
  allowance_period text,
  base_allowance integer,
  extra_allowance integer,
  used_allowance integer,
  remaining_allowance integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan text;
  v_month text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id AND p.business_id = p_business_id
      AND p.role = ANY(ARRAY['business_admin', 'staff', 'client']::text[])
  ) THEN
    RAISE EXCEPTION 'monthly_update_business_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT b.plan INTO v_plan FROM public.businesses b WHERE b.id = p_business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'monthly_update_business_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  WITH allowance AS (
    SELECT COALESCE(p.monthly_update_limit, 0)::integer AS base,
      COALESCE((SELECT sum(o.allowance_delta)::integer FROM public.monthly_update_allowance_overrides o
        WHERE o.business_id = p_business_id AND o.allowance_period = v_month AND o.revoked_at IS NULL), 0) AS extra
    FROM public.plans p WHERE p.slug = v_plan LIMIT 1
  ), usage AS (
    SELECT count(*)::integer AS used FROM public.monthly_update_requests r
    WHERE r.business_id = p_business_id AND r.allowance_period = v_month
      AND COALESCE(r.consumes_allowance, true)
      AND r.status NOT IN ('draft', 'declined', 'cancelled')
  )
  SELECT v_month, COALESCE(a.base, 0), COALESCE(a.extra, 0), u.used,
    GREATEST(0, COALESCE(a.base, 0) + COALESCE(a.extra, 0) - u.used)
  FROM allowance a CROSS JOIN usage u
  UNION ALL
  SELECT v_month, 0, COALESCE((SELECT sum(o.allowance_delta)::integer FROM public.monthly_update_allowance_overrides o
    WHERE o.business_id = p_business_id AND o.allowance_period = v_month AND o.revoked_at IS NULL), 0), u.used,
    GREATEST(0, COALESCE((SELECT sum(o.allowance_delta)::integer FROM public.monthly_update_allowance_overrides o
      WHERE o.business_id = p_business_id AND o.allowance_period = v_month AND o.revoked_at IS NULL), 0) - u.used)
  FROM usage u WHERE NOT EXISTS (SELECT 1 FROM public.plans p WHERE p.slug = v_plan);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_monthly_update_request(
  p_request_id uuid,
  p_status text DEFAULT NULL,
  p_scope_classification text DEFAULT NULL,
  p_scope_notes text DEFAULT NULL,
  p_admin_response text DEFAULT NULL
)
RETURNS public.monthly_update_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.monthly_update_requests%ROWTYPE;
  v_previous public.monthly_update_requests%ROWTYPE;
  v_allowed_statuses text[] := ARRAY['submitted','acknowledged','in_progress','waiting_for_customer','completed','declined','cancelled'];
BEGIN
  IF v_actor IS NULL OR NOT COALESCE(private.is_super_admin() OR public.has_platform_permission('delivery') OR public.has_platform_permission('customer_health'), false) THEN
    RAISE EXCEPTION 'monthly_update_admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT NULL AND NOT (p_status = ANY(v_allowed_statuses)) THEN
    RAISE EXCEPTION 'monthly_update_status_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_scope_classification IS NOT NULL AND p_scope_classification NOT IN ('included','clarification','out_of_scope') THEN
    RAISE EXCEPTION 'monthly_update_scope_invalid' USING ERRCODE = '22023';
  END IF;
  IF p_scope_classification IS NOT NULL AND char_length(btrim(COALESCE(p_scope_notes, ''))) < 10 THEN
    RAISE EXCEPTION 'monthly_update_scope_reason_required' USING ERRCODE = '22023';
  END IF;

  SELECT r.* INTO v_request FROM public.monthly_update_requests r WHERE r.id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'monthly_update_request_not_found' USING ERRCODE = 'P0002'; END IF;
  v_previous := v_request;
  IF p_status = 'waiting_for_customer' AND v_request.status <> 'waiting_for_customer'
    AND char_length(btrim(COALESCE(p_admin_response, ''))) < 10 THEN
    RAISE EXCEPTION 'monthly_update_customer_message_required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.monthly_update_requests r SET
    status = COALESCE(p_status, r.status),
    completed_at = CASE WHEN p_status = 'completed' THEN COALESCE(r.completed_at, now()) ELSE r.completed_at END,
    admin_response = CASE WHEN p_admin_response IS NOT NULL THEN left(btrim(p_admin_response), 5000) ELSE r.admin_response END,
    scope_classification = COALESCE(p_scope_classification, r.scope_classification),
    scope_notes = CASE WHEN p_scope_classification IS NOT NULL THEN left(btrim(p_scope_notes), 2000) ELSE r.scope_notes END,
    scope_classified_at = CASE WHEN p_scope_classification IS NOT NULL THEN now() ELSE r.scope_classified_at END,
    scope_classified_by = CASE WHEN p_scope_classification IS NOT NULL THEN v_actor ELSE r.scope_classified_by END,
    updated_at = now()
  WHERE r.id = p_request_id RETURNING r.* INTO v_request;

  IF v_previous.status IS DISTINCT FROM v_request.status THEN
    INSERT INTO public.monthly_update_request_events(request_id,business_id,actor_id,actor_type,event_type,from_status,to_status,metadata)
    VALUES(v_request.id,v_request.business_id,v_actor,'staff','status_changed',v_previous.status,v_request.status,
      jsonb_build_object('responseProvided', p_admin_response IS NOT NULL));
  END IF;
  IF v_previous.scope_classification IS DISTINCT FROM v_request.scope_classification
    OR v_previous.scope_notes IS DISTINCT FROM v_request.scope_notes THEN
    INSERT INTO public.monthly_update_request_events(request_id,business_id,actor_id,actor_type,event_type,from_status,to_status,metadata)
    VALUES(v_request.id,v_request.business_id,v_actor,'staff','scope_classified',v_previous.status,v_request.status,
      jsonb_build_object('from',v_previous.scope_classification,'to',v_request.scope_classification,'reason',v_request.scope_notes));
  END IF;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_respond_monthly_update_request(
  p_request_id uuid,
  p_response text,
  p_idempotency_key text
)
RETURNS public.monthly_update_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.monthly_update_requests%ROWTYPE;
  v_event public.monthly_update_request_events%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR char_length(btrim(COALESCE(p_response,''))) < 2 OR char_length(p_response) > 5000
    OR NULLIF(btrim(p_idempotency_key),'') IS NULL OR char_length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'monthly_update_response_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT r.* INTO v_request FROM public.monthly_update_requests r WHERE r.id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'monthly_update_request_not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_actor
      AND p.business_id = v_request.business_id AND p.role = ANY(ARRAY['business_admin','staff','client']::text[])
  ) THEN RAISE EXCEPTION 'monthly_update_business_forbidden' USING ERRCODE = '42501'; END IF;

  SELECT e.* INTO v_event FROM public.monthly_update_request_events e
    WHERE e.request_id = p_request_id AND e.idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN v_request; END IF;
  IF v_request.status <> 'waiting_for_customer' THEN
    RAISE EXCEPTION 'monthly_update_not_waiting_for_customer' USING ERRCODE = '22023';
  END IF;

  UPDATE public.monthly_update_requests r SET
    customer_response = left(btrim(p_response), 5000),
    customer_response_at = now(),
    status = CASE WHEN r.sla_resume_status IN ('submitted','acknowledged','in_progress') THEN r.sla_resume_status ELSE 'in_progress' END,
    updated_at = now()
  WHERE r.id = p_request_id RETURNING r.* INTO v_request;
  INSERT INTO public.monthly_update_request_events(request_id,business_id,actor_id,actor_type,event_type,from_status,to_status,idempotency_key,metadata)
  VALUES(v_request.id,v_request.business_id,v_actor,'customer','customer_response','waiting_for_customer',v_request.status,p_idempotency_key,
    jsonb_build_object('response',left(btrim(p_response),5000)));
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_monthly_update_allowance_override(
  p_business_id uuid,
  p_allowance_period text,
  p_allowance_delta integer,
  p_reason text,
  p_idempotency_key text
)
RETURNS public.monthly_update_allowance_overrides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_override public.monthly_update_allowance_overrides%ROWTYPE;
  v_month text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
  IF v_actor IS NULL OR NOT COALESCE(private.is_super_admin(), false) THEN
    RAISE EXCEPTION 'monthly_update_override_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_allowance_period IS DISTINCT FROM v_month OR p_allowance_delta IS NULL OR p_allowance_delta NOT BETWEEN 1 AND 10
    OR char_length(btrim(COALESCE(p_reason,''))) NOT BETWEEN 10 AND 500
    OR NULLIF(btrim(p_idempotency_key),'') IS NULL OR char_length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'monthly_update_override_invalid' USING ERRCODE = '22023';
  END IF;
  SELECT o.* INTO v_override FROM public.monthly_update_allowance_overrides o WHERE o.idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN v_override; END IF;

  PERFORM 1 FROM public.businesses b WHERE b.id = p_business_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'monthly_update_business_not_found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.monthly_update_allowance_overrides(business_id,allowance_period,allowance_delta,reason,granted_by,idempotency_key)
  VALUES(p_business_id,p_allowance_period,p_allowance_delta,left(btrim(p_reason),500),v_actor,p_idempotency_key)
  RETURNING * INTO v_override;
  INSERT INTO public.monthly_update_request_events(request_id,business_id,actor_id,actor_type,event_type,metadata)
  VALUES(NULL,p_business_id,v_actor,'staff','allowance_override_granted',jsonb_build_object(
    'overrideId',v_override.id,'allowancePeriod',p_allowance_period,'allowanceDelta',p_allowance_delta,'reason',left(btrim(p_reason),500)
  ));
  RETURN v_override;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_monthly_update_allowance_override(p_override_id uuid, p_reason text)
RETURNS public.monthly_update_allowance_overrides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_override public.monthly_update_allowance_overrides%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT COALESCE(private.is_super_admin(), false) THEN
    RAISE EXCEPTION 'monthly_update_override_forbidden' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(COALESCE(p_reason,''))) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'monthly_update_override_reason_required' USING ERRCODE = '22023';
  END IF;
  SELECT o.* INTO v_override FROM public.monthly_update_allowance_overrides o WHERE o.id = p_override_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'monthly_update_override_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_override.revoked_at IS NOT NULL THEN RETURN v_override; END IF;

  UPDATE public.monthly_update_allowance_overrides o SET
    revoked_at = now(), revoked_by = v_actor, revoke_reason = left(btrim(p_reason),500)
  WHERE o.id = p_override_id RETURNING o.* INTO v_override;
  INSERT INTO public.monthly_update_request_events(business_id,actor_id,actor_type,event_type,metadata)
  VALUES(v_override.business_id,v_actor,'staff','allowance_override_revoked',jsonb_build_object(
    'overrideId',v_override.id,'allowancePeriod',v_override.allowance_period,
    'allowanceDelta',v_override.allowance_delta,'reason',v_override.revoke_reason
  ));
  RETURN v_override;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_monthly_update_allowance_overrides(p_business_id uuid)
RETURNS TABLE (
  id uuid,
  allowance_period text,
  allowance_delta integer,
  reason text,
  granted_by uuid,
  granted_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(private.is_super_admin(), false) THEN
    RAISE EXCEPTION 'monthly_update_override_forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT o.id, o.allowance_period, o.allowance_delta, o.reason, o.granted_by, o.granted_at, o.revoked_at, o.revoke_reason
  FROM public.monthly_update_allowance_overrides o
  WHERE o.business_id = p_business_id
  ORDER BY o.granted_at DESC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.escalate_monthly_update_request(p_request_id uuid, p_reason text)
RETURNS public.monthly_update_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.monthly_update_requests%ROWTYPE;
  v_business_name text;
BEGIN
  IF v_actor IS NULL OR NOT COALESCE(private.is_super_admin() OR public.has_platform_permission('delivery') OR public.has_platform_permission('customer_health'), false) THEN
    RAISE EXCEPTION 'monthly_update_admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(COALESCE(p_reason,''))) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'monthly_update_escalation_reason_required' USING ERRCODE = '22023';
  END IF;
  SELECT r.* INTO v_request FROM public.monthly_update_requests r WHERE r.id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'monthly_update_request_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_request.escalated_at IS NOT NULL THEN RETURN v_request; END IF;
  IF v_request.status IN ('waiting_for_customer','completed','declined','cancelled')
    OR v_request.estimated_response_at IS NULL OR v_request.estimated_response_at > now() THEN
    RAISE EXCEPTION 'monthly_update_not_escalatable' USING ERRCODE = '22023';
  END IF;

  UPDATE public.monthly_update_requests SET escalated_at = now(), escalation_reason = left(btrim(p_reason),500), updated_at = now()
  WHERE id = p_request_id RETURNING * INTO v_request;
  SELECT b.name INTO v_business_name FROM public.businesses b WHERE b.id = v_request.business_id;
  INSERT INTO public.monthly_update_request_events(request_id,business_id,actor_id,actor_type,event_type,from_status,to_status,metadata)
  VALUES(v_request.id,v_request.business_id,v_actor,'staff','sla_escalated',v_request.status,v_request.status,
    jsonb_build_object('reason',left(btrim(p_reason),500)));
  INSERT INTO public.notifications(user_id,business_id,title,message,type,metadata)
  SELECT p.id,v_request.business_id,'Overdue update request escalated',
    format('An overdue update request for %s needs internal review.',COALESCE(v_business_name,'a customer')),
    'sla_escalation',jsonb_build_object('requestId',v_request.id,'businessId',v_request.business_id)
  FROM public.profiles p WHERE p.status = 'active' AND p.role IN ('super_admin','platform_staff');
  RETURN v_request;
END;
$$;

ALTER TABLE public.funnel_events
  ADD COLUMN IF NOT EXISTS revenue_verified boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_events_unique_stripe_purchase
  ON public.funnel_events ((metadata->>'stripeSessionId'))
  WHERE event_type = 'purchase_completed' AND metadata->>'stripeSessionId' IS NOT NULL;

REVOKE ALL ON FUNCTION public.get_monthly_update_allowance(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_monthly_update_request(uuid,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_respond_monthly_update_request(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_monthly_update_allowance_override(uuid,text,integer,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_monthly_update_allowance_override(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_monthly_update_allowance_overrides(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.escalate_monthly_update_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_update_allowance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_monthly_update_request(uuid,text,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_respond_monthly_update_request(uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.grant_monthly_update_allowance_override(uuid,text,integer,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_monthly_update_allowance_override(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_monthly_update_allowance_overrides(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escalate_monthly_update_request(uuid,text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
