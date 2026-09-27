-- Affiliate E2E hardening: enforce server-owned attribution and self-referral protection at the database boundary.

create or replace function public.record_affiliate_commission(
  p_affiliate_id uuid,
  p_amount numeric,
  p_sale_amount numeric,
  p_referred_user_id uuid,
  p_plan_slug text,
  p_business_id uuid,
  p_stripe_session_id text,
  p_stripe_subscription_id text,
  p_tier_name text,
  p_idempotency_key text
)
returns table(recorded boolean, referral_id uuid)
language plpgsql
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_status text;
  v_affiliate_uid uuid;
  v_referral_id uuid;
  v_business_affiliate_id uuid;
  v_business_owner_id uuid;
begin
  if p_affiliate_id is null
     or coalesce(p_amount, 0) <= 0
     or coalesce(p_sale_amount, 0) <= 0
     or nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'INVALID_AFFILIATE_COMMISSION';
  end if;

  select status, uid
  into v_status, v_affiliate_uid
  from public.affiliates
  where id = p_affiliate_id
  for update;

  if not found or coalesce(v_status, '') not in ('active', 'approved') then
    raise exception 'AFFILIATE_NOT_ACTIVE';
  end if;

  if p_referred_user_id is not null and p_referred_user_id = v_affiliate_uid then
    raise exception 'SELF_REFERRAL_NOT_ALLOWED';
  end if;

  select referred_by_affiliate_id, owner_id
  into v_business_affiliate_id, v_business_owner_id
  from public.businesses
  where id = p_business_id;

  if not found or v_business_affiliate_id is distinct from p_affiliate_id then
    raise exception 'AFFILIATE_ATTRIBUTION_MISMATCH';
  end if;

  if p_referred_user_id is not null
     and v_business_owner_id is not null
     and p_referred_user_id is distinct from v_business_owner_id then
    raise exception 'REFERRED_USER_MISMATCH';
  end if;

  insert into public.affiliate_referrals (
    affiliate_id,
    referred_user_id,
    status,
    event_type,
    commission_amount,
    sale_amount,
    plan_slug,
    converted_at,
    commission_status,
    idempotency_key,
    metadata
  )
  values (
    p_affiliate_id,
    p_referred_user_id,
    'converted',
    'paid_subscription',
    p_amount,
    p_sale_amount,
    p_plan_slug,
    now(),
    'approved',
    p_idempotency_key,
    jsonb_build_object(
      'businessId', p_business_id,
      'stripeSessionId', p_stripe_session_id,
      'stripeSubscriptionId', p_stripe_subscription_id,
      'tierName', coalesce(p_tier_name, 'Default')
    )
  )
  on conflict do nothing
  returning id into v_referral_id;

  if v_referral_id is null then
    return query select false, null::uuid;
    return;
  end if;

  update public.affiliates
  set total_earnings = coalesce(total_earnings, 0) + p_amount,
      unpaid_earnings = coalesce(unpaid_earnings, 0) + p_amount,
      total_referrals = coalesce(total_referrals, 0) + 1
  where id = p_affiliate_id;

  return query select true, v_referral_id;
end;
$function$;

revoke all on function public.record_affiliate_commission(uuid, numeric, numeric, uuid, text, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_affiliate_commission(uuid, numeric, numeric, uuid, text, uuid, text, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
