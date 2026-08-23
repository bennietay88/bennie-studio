-- Harden public API exposure while keeping published customer websites available.

alter view public.public_businesses set (security_invoker = true);

drop policy if exists "Public can view published businesses" on public.businesses;
create policy "Public can view published businesses"
on public.businesses
for select
to anon
using (
  exists (
    select 1
    from public.websites
    where websites.business_id = businesses.id
      and websites.status = 'published'
  )
);

grant select (
  id, name, platform_type, plan, status, industry, business_nature, location,
  subdomain, custom_domain, business_type, ga_measurement_id, meta_pixel_id,
  chatbot_enabled, chatbot_welcome_message, chatbot_model, created_at
) on public.businesses to anon;

-- RLS helper functions need authenticated access and return false/null for anon users,
-- but they must not inherit the mutable caller search path.
alter function public.business_id_matches(uuid) set search_path = pg_catalog, public, auth;
alter function public.get_auth_business_id() set search_path = pg_catalog, public, auth;
alter function public.is_business_admin(uuid) set search_path = pg_catalog, public, auth;
alter function public.is_super_admin() set search_path = pg_catalog, public, auth;
alter function public.is_platform_operator() set search_path = pg_catalog, public, auth;
alter function public.has_platform_permission(text) set search_path = pg_catalog, public, auth;

-- Server-only balance, payout and platform analytics functions must not be callable
-- directly with a browser anon/authenticated token.
revoke all on function public.deduct_ai_credits(uuid, integer) from public, anon, authenticated;
revoke all on function public.increment_ai_usage(uuid, integer) from public, anon, authenticated;
revoke all on function public.increment_ai_usage(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.validate_and_deduct_credits(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.process_payout(uuid) from public, anon, authenticated;
revoke all on function public.reward_affiliate(uuid, numeric, numeric) from public, anon, authenticated;
revoke all on function public.get_platform_traffic_stats(integer) from public, anon, authenticated;
revoke all on function public.get_daily_traffic_trend(integer) from public, anon, authenticated;

grant execute on function public.deduct_ai_credits(uuid, integer) to service_role;
grant execute on function public.increment_ai_usage(uuid, integer) to service_role;
grant execute on function public.increment_ai_usage(uuid, integer, text, text) to service_role;
grant execute on function public.validate_and_deduct_credits(uuid, text, boolean) to service_role;
grant execute on function public.process_payout(uuid) to service_role;
grant execute on function public.reward_affiliate(uuid, numeric, numeric) to service_role;
grant execute on function public.get_platform_traffic_stats(integer) to service_role;
grant execute on function public.get_daily_traffic_trend(integer) to service_role;

alter function public.deduct_ai_credits(uuid, integer) set search_path = pg_catalog, public, auth;
alter function public.increment_ai_usage(uuid, integer) set search_path = pg_catalog, public, auth;
alter function public.increment_ai_usage(uuid, integer, text, text) set search_path = pg_catalog, public, auth;
alter function public.validate_and_deduct_credits(uuid, text, boolean) set search_path = pg_catalog, public, auth;
alter function public.process_payout(uuid) set search_path = pg_catalog, public, auth;
alter function public.reward_affiliate(uuid, numeric, numeric) set search_path = pg_catalog, public, auth;
alter function public.get_platform_traffic_stats(integer) set search_path = pg_catalog, public, auth;
alter function public.get_daily_traffic_trend(integer) set search_path = pg_catalog, public, auth;

-- These RPCs contain their own role checks; anon callers do not need execute access.
revoke all on function public.convert_prospect_to_customer(uuid, text, text) from public, anon;
revoke all on function public.set_handover_platform_type(uuid, text) from public, anon;
grant execute on function public.convert_prospect_to_customer(uuid, text, text) to authenticated, service_role;
grant execute on function public.set_handover_platform_type(uuid, text) to authenticated, service_role;
alter function public.convert_prospect_to_customer(uuid, text, text) set search_path = pg_catalog, public, auth;
alter function public.set_handover_platform_type(uuid, text) set search_path = pg_catalog, public, auth;

-- Global affiliate totals are super-admin only even when called by an authenticated user.
create or replace function public.sum_unpaid_earnings()
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Not authorized';
  end if;
  return (select coalesce(sum(unpaid_earnings), 0) from public.affiliates);
end;
$$;
revoke all on function public.sum_unpaid_earnings() from public, anon;
grant execute on function public.sum_unpaid_earnings() to authenticated, service_role;

-- Trigger functions are invoked by their triggers, not by API clients.
revoke all on function public.capture_operations_activity() from public, anon, authenticated;
revoke all on function public.notify_new_lead() from public, anon, authenticated;
revoke all on function public.notify_new_appointment() from public, anon, authenticated;
revoke all on function public.notify_new_payout_request() from public, anon, authenticated;
revoke all on function public.update_updated_at_column() from public, anon, authenticated;
alter function public.capture_operations_activity() set search_path = pg_catalog, public, auth;
alter function public.notify_new_lead() set search_path = pg_catalog, public, auth;
alter function public.notify_new_appointment() set search_path = pg_catalog, public, auth;
alter function public.notify_new_payout_request() set search_path = pg_catalog, public, auth;
alter function public.update_updated_at_column() set search_path = pg_catalog, public, auth;
