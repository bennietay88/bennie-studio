
-- Harden account role transitions and make the affiliate program production-safe.

alter table public.businesses
  add column if not exists referred_by_affiliate_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_referred_by_affiliate_id_fkey'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_referred_by_affiliate_id_fkey
      foreign key (referred_by_affiliate_id)
      references public.affiliates(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_businesses_referred_by_affiliate_id
  on public.businesses (referred_by_affiliate_id)
  where referred_by_affiliate_id is not null;

comment on column public.businesses.referred_by_affiliate_id is
  'Server-resolved affiliate attribution for Bennie Studio customer acquisition. Never trust a client-supplied affiliate id.';

update public.profiles
set business_id = null,
    default_account_id = null
where role in ('platform_staff', 'affiliate')
  and (business_id is not null or default_account_id is not null);

alter table public.profiles
  drop constraint if exists profiles_non_tenant_role_scope_check;

alter table public.profiles
  add constraint profiles_non_tenant_role_scope_check
  check (
    role not in ('platform_staff', 'affiliate')
    or (business_id is null and default_account_id is null)
  );

create or replace function private.business_id_matches(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
  select exists (
    select 1
    from public.profiles p
    left join public.businesses b on b.id = target_id
    where p.id = (select auth.uid())
      and p.role in ('business_admin', 'staff', 'client')
      and (
        p.business_id = target_id
        or (b.account_id is not null and private.is_account_member(b.account_id))
      )
      and coalesce(p.status, 'active') = 'active'
  );
$function$;

drop index if exists public.idx_affiliates_platform_uid;
create unique index idx_affiliates_platform_uid
  on public.affiliates (uid)
  where business_id is null;

with ranked as (
  select
    ct.id,
    row_number() over (
      partition by ct.program_id, lower(ct.name)
      order by ct.created_at desc, ct.id desc
    ) as row_rank
  from public.commission_tiers ct
  join public.affiliate_programs ap on ap.id = ct.program_id
  where ap.is_platform_program = true
)
delete from public.commission_tiers ct
using ranked r
where ct.id = r.id
  and r.row_rank > 1;

update public.commission_tiers ct
set commission_rate = case lower(ct.name)
      when 'starter affiliate' then 0.10
      when 'growth affiliate' then 0.15
      when 'partner affiliate' then 0.20
      else ct.commission_rate
    end,
    requirement_type = case
      when lower(ct.name) in ('starter affiliate', 'growth affiliate', 'partner affiliate')
        then 'referral_count'
      else ct.requirement_type
    end,
    requirement_value = case lower(ct.name)
      when 'starter affiliate' then 0
      when 'growth affiliate' then 5
      when 'partner affiliate' then 20
      else ct.requirement_value
    end,
    minimum_referral_count = case lower(ct.name)
      when 'starter affiliate' then 0
      when 'growth affiliate' then 5
      when 'partner affiliate' then 20
      else ct.minimum_referral_count
    end
from public.affiliate_programs ap
where ap.id = ct.program_id
  and ap.is_platform_program = true
  and lower(ct.name) in ('starter affiliate', 'growth affiliate', 'partner affiliate');

create unique index if not exists idx_commission_tiers_program_name_unique
  on public.commission_tiers (program_id, lower(name));

alter table public.affiliate_referrals
  add column if not exists idempotency_key text;

create unique index if not exists idx_affiliate_referrals_idempotency_key
  on public.affiliate_referrals (idempotency_key)
  where idempotency_key is not null;

drop policy if exists "Public can check referral code" on public.affiliates;
revoke select on table public.affiliates from anon;

drop policy if exists "Users can apply to platform affiliate program" on public.affiliates;
create policy "Users can apply to platform affiliate program"
  on public.affiliates
  for insert
  to authenticated
  with check (
    (select auth.uid()) = uid
    and business_id is null
  );

drop policy if exists "Users can apply to business affiliate program" on public.affiliates;
create policy "Users can apply to business affiliate program"
  on public.affiliates
  for insert
  to authenticated
  with check (
    (select auth.uid()) = uid
    and business_id is not null
    and exists (
      select 1
      from public.affiliate_programs ap
      where ap.business_id = affiliates.business_id
        and ap.is_enabled = true
    )
    and not exists (
      select 1
      from public.businesses b
      where b.id = affiliates.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Affiliates can view their earnings" on public.affiliates;
create policy "Affiliates can view their earnings"
  on public.affiliates
  for select
  to authenticated
  using (uid = (select auth.uid()));

drop policy if exists "Affiliates can view their referrals" on public.affiliate_referrals;
create policy "Affiliates can view their referrals"
  on public.affiliate_referrals
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.affiliates a
      where a.id = affiliate_referrals.affiliate_id
        and a.uid = (select auth.uid())
    )
  );

drop policy if exists "Affiliates can view their payouts" on public.affiliate_payouts;
create policy "Affiliates can view their payouts"
  on public.affiliate_payouts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.affiliates a
      where a.id = affiliate_payouts.affiliate_id
        and a.uid = (select auth.uid())
    )
  );

drop policy if exists "Affiliates can insert payout requests" on public.affiliate_payouts;

drop policy if exists "Affiliates can view applicable commission tiers" on public.commission_tiers;
create policy "Affiliates can view applicable commission tiers"
  on public.commission_tiers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.affiliate_programs ap
      join public.affiliates a
        on a.uid = (select auth.uid())
      where ap.id = commission_tiers.program_id
        and ap.is_enabled = true
        and (
          (ap.is_platform_program = true and a.business_id is null)
          or (ap.business_id is not null and a.business_id = ap.business_id)
        )
    )
  );

create or replace function public.request_affiliate_payout(
  p_affiliate_id uuid,
  p_user_id uuid
)
returns table(payout_id uuid, amount numeric)
language plpgsql
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_affiliate public.affiliates%rowtype;
  v_minimum numeric := 0;
  v_payout_id uuid;
  v_amount numeric;
begin
  select *
  into v_affiliate
  from public.affiliates
  where id = p_affiliate_id
    and uid = p_user_id
  for update;

  if not found then
    raise exception 'AFFILIATE_NOT_FOUND';
  end if;

  if coalesce(v_affiliate.status, '') not in ('active', 'approved') then
    raise exception 'AFFILIATE_NOT_ACTIVE';
  end if;

  if nullif(trim(coalesce(v_affiliate.payout_method, '')), '') is null then
    raise exception 'PAYOUT_METHOD_REQUIRED';
  end if;

  if exists (
    select 1
    from public.affiliate_payouts p
    where p.affiliate_id = v_affiliate.id
      and p.status = 'pending'
  ) then
    raise exception 'PAYOUT_ALREADY_PENDING';
  end if;

  select coalesce(ap.payout_minimum, 0)
  into v_minimum
  from public.affiliate_programs ap
  where ap.is_enabled = true
    and (
      (v_affiliate.business_id is null and ap.is_platform_program = true)
      or (v_affiliate.business_id is not null and ap.business_id = v_affiliate.business_id)
    )
  order by ap.is_platform_program desc
  limit 1;

  if not found then
    raise exception 'AFFILIATE_PROGRAM_NOT_FOUND';
  end if;

  v_amount := coalesce(v_affiliate.unpaid_earnings, 0);
  if v_amount <= 0 or v_amount < v_minimum then
    raise exception 'PAYOUT_MINIMUM_NOT_MET';
  end if;

  insert into public.affiliate_payouts (
    affiliate_id,
    amount,
    status,
    payment_method
  )
  values (
    v_affiliate.id,
    v_amount,
    'pending',
    v_affiliate.payout_method
  )
  returning id into v_payout_id;

  update public.affiliates
  set unpaid_earnings = 0
  where id = v_affiliate.id;

  return query select v_payout_id, v_amount;
end;
$function$;

revoke all on function public.request_affiliate_payout(uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_affiliate_payout(uuid, uuid) to service_role;

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
  v_referral_id uuid;
begin
  if p_affiliate_id is null
     or coalesce(p_amount, 0) <= 0
     or coalesce(p_sale_amount, 0) <= 0
     or nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'INVALID_AFFILIATE_COMMISSION';
  end if;

  select status
  into v_status
  from public.affiliates
  where id = p_affiliate_id
  for update;

  if not found or coalesce(v_status, '') not in ('active', 'approved') then
    raise exception 'AFFILIATE_NOT_ACTIVE';
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
