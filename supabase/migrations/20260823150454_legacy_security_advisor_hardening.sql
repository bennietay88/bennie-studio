-- Remove privileged helper functions from the exposed Data API schema while
-- preserving their existing OID dependencies in RLS policies.
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;

alter function public.business_id_matches(uuid) set schema private;
alter function public.get_auth_business_id() set schema private;
alter function public.is_business_admin(uuid) set schema private;
alter function public.is_super_admin() set schema private;

revoke all on function private.business_id_matches(uuid) from public;
revoke all on function private.get_auth_business_id() from public;
revoke all on function private.is_business_admin(uuid) from public;
revoke all on function private.is_super_admin() from public;
grant execute on function private.business_id_matches(uuid) to anon, authenticated, service_role;
grant execute on function private.get_auth_business_id() to anon, authenticated, service_role;
grant execute on function private.is_business_admin(uuid) to anon, authenticated, service_role;
grant execute on function private.is_super_admin() to anon, authenticated, service_role;

-- These operations are now reached only through authenticated server routes.
-- The service role is allowed here; the API routes perform the user/role check.
create or replace function public.convert_prospect_to_customer(
  p_prospect_id uuid,
  p_plan text,
  p_subdomain text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_prospect public.prospects%rowtype;
  v_business_id uuid;
  v_subdomain text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not public.has_platform_permission('sales') then
    raise exception 'Not authorized';
  end if;

  if p_plan not in ('starter', 'business', 'growth', 'premium', 'authority') then
    raise exception 'Invalid plan';
  end if;

  v_subdomain := lower(regexp_replace(trim(p_subdomain), '[^a-zA-Z0-9-]+', '-', 'g'));
  v_subdomain := trim(both '-' from v_subdomain);
  if length(v_subdomain) < 3 then
    raise exception 'Subdomain must contain at least three characters';
  end if;

  select * into v_prospect
  from public.prospects
  where id = p_prospect_id
  for update;

  if not found then raise exception 'Prospect not found'; end if;
  if v_prospect.converted_business_id is not null then
    return v_prospect.converted_business_id;
  end if;

  insert into public.businesses (
    name, plan, status, subscription_status, trial_ends_at,
    industry, location, subdomain, platform_type
  ) values (
    v_prospect.name, p_plan, 'active', 'trialing', now() + interval '14 days',
    v_prospect.industry, v_prospect.location, v_subdomain, 'waas'
  ) returning id into v_business_id;

  insert into public.projects (
    business_id, title, type, package_name, status, priority
  ) values (
    v_business_id, v_prospect.name || ' Managed Website', 'waas', p_plan,
    'pending', case when v_prospect.opportunity_level = 'high' then 'high' else 'medium' end
  );

  insert into public.onboarding_sessions (
    business_id, current_step, status, progress, notes
  ) values (
    v_business_id, 'Business details required', 'In Progress', 5,
    'Created from prospect conversion.'
  );

  update public.prospects
  set converted_business_id = v_business_id,
      converted_at = now(),
      outreach_status = 'won',
      status = 'converted',
      updated_at = now()
  where id = p_prospect_id;

  insert into public.admin_action_audit_logs (
    actor_user_id, action_type, target_type, target_id, target_label, metadata
  ) values (
    auth.uid(), 'prospect.converted', 'business', v_business_id::text,
    v_prospect.name, jsonb_build_object('prospect_id', p_prospect_id, 'plan', p_plan)
  );

  return v_business_id;
end;
$$;

create or replace function public.set_handover_platform_type(
  p_business_id uuid,
  p_platform_type text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not public.has_platform_permission('delivery') then
    raise exception 'Not authorized';
  end if;
  if p_platform_type not in ('waas', 'wordpress') then
    raise exception 'Invalid platform type';
  end if;
  update public.businesses set platform_type = p_platform_type where id = p_business_id;
  if not found then raise exception 'Business not found'; end if;
end;
$$;

create or replace function public.sum_unpaid_earnings()
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not private.is_super_admin() then
    raise exception 'Not authorized';
  end if;
  return (select coalesce(sum(unpaid_earnings), 0) from public.affiliates);
end;
$$;

revoke all on function public.convert_prospect_to_customer(uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_handover_platform_type(uuid, text) from public, anon, authenticated;
revoke all on function public.sum_unpaid_earnings() from public, anon, authenticated;
grant execute on function public.convert_prospect_to_customer(uuid, text, text) to service_role;
grant execute on function public.set_handover_platform_type(uuid, text) to service_role;
grant execute on function public.sum_unpaid_earnings() to service_role;
