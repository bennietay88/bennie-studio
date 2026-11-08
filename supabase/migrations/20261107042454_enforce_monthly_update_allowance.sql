-- Server-side monthly update allowance enforcement.
-- Customer requests are serialized on the business row so concurrent inserts
-- cannot overrun the allowance. Existing request rows and in-progress work are
-- left intact; only future customer submissions use this RPC.

CREATE OR REPLACE FUNCTION public.submit_monthly_update_request(p_request jsonb)
RETURNS public.monthly_update_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_business public.businesses%ROWTYPE;
  v_existing public.monthly_update_requests%ROWTYPE;
  v_request public.monthly_update_requests%ROWTYPE;
  v_month text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
  v_period text;
  v_request_id text;
  v_limit integer;
  v_extra_limit integer := 0;
  v_used integer;
  v_profile_id uuid;
  v_response_days integer;
  v_due_at timestamptz := now();
  v_business_days_added integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'monthly_update_auth_required' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_business_id := (p_request->>'business_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'monthly_update_business_invalid' USING ERRCODE = '22023';
  END;
  v_period := p_request->>'allowance_period';
  v_request_id := NULLIF(btrim(p_request->>'client_request_id'), '');

  IF v_request_id IS NULL OR length(v_request_id) > 128 THEN
    RAISE EXCEPTION 'monthly_update_request_id_required' USING ERRCODE = '22023';
  END IF;
  IF v_period IS DISTINCT FROM v_month THEN
    RAISE EXCEPTION 'monthly_update_period_invalid' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(p_request->>'title'), '') IS NULL THEN
    RAISE EXCEPTION 'monthly_update_title_required' USING ERRCODE = '22023';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.id = v_user_id
    AND p.business_id = v_business_id
    AND p.role = ANY(ARRAY['business_admin', 'staff', 'client']::text[]);
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'monthly_update_business_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT b.* INTO v_business
  FROM public.businesses b
  WHERE b.id = v_business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'monthly_update_business_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Keep response estimates authoritative and plan based. These are
  -- operational targets, not contractual guarantees; weekends are excluded.
  v_response_days := CASE v_business.plan
    WHEN 'website_growth_partner' THEN 1
    WHEN 'growth' THEN 2
    WHEN 'premium' THEN 2
    WHEN 'website_growth' THEN 2
    ELSE 3
  END;
  WHILE v_business_days_added < v_response_days LOOP
    v_due_at := v_due_at + interval '1 day';
    IF extract(isodow FROM (v_due_at AT TIME ZONE 'UTC')) < 6 THEN
      v_business_days_added := v_business_days_added + 1;
    END IF;
  END LOOP;

  -- A retry after a successful insert returns the original row and does not
  -- consume another allowance. The unique index remains a second guard.
  SELECT r.* INTO v_existing
  FROM public.monthly_update_requests r
  WHERE r.business_id = v_business_id
    AND r.client_request_id = v_request_id
    AND r.profile_id = v_user_id;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT p.monthly_update_limit INTO v_limit
  FROM public.plans p
  WHERE p.slug = v_business.plan
  LIMIT 1;
  IF v_limit IS NULL OR v_limit < 0 THEN
    RAISE EXCEPTION 'monthly_update_allowance_unavailable' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(sum(o.allowance_delta), 0)::integer INTO v_extra_limit
  FROM public.monthly_update_allowance_overrides o
  WHERE o.business_id = v_business_id
    AND o.allowance_period = v_month
    AND o.revoked_at IS NULL;

  SELECT count(*)::integer INTO v_used
  FROM public.monthly_update_requests r
  WHERE r.business_id = v_business_id
    AND r.allowance_period = v_month
    AND COALESCE(r.consumes_allowance, true)
    AND r.status NOT IN ('draft', 'declined', 'cancelled');
  IF v_used >= v_limit + v_extra_limit THEN
    RAISE EXCEPTION 'monthly_update_allowance_exceeded' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.monthly_update_requests (
    business_id, profile_id, request_type, update_category, priority,
    status, title, details, allowance_period, client_request_id,
    submitted_at, estimated_response_at, customer_draft
  ) VALUES (
    v_business_id,
    v_user_id,
    'monthly_update',
    COALESCE(NULLIF(btrim(p_request->>'update_category'), ''), 'content_update'),
    'normal',
    'submitted',
    left(btrim(p_request->>'title'), 180),
    left(COALESCE(p_request->>'details', ''), 10000),
    v_month,
    v_request_id,
    now(),
    v_due_at,
    COALESCE(p_request->'customer_draft', '{}'::jsonb)
  ) RETURNING * INTO v_request;

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_monthly_update_request(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_monthly_update_request(jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
