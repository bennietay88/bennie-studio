-- Independent internal billing exemption; regular customer role remains unchanged.
alter table public.businesses add column if not exists internal_access_mode text
 check (internal_access_mode in ('owner','plan_test'));

create or replace function private.guard_internal_access_mode()
returns trigger language plpgsql set search_path to pg_catalog,public,private,auth as $$
begin
  if (tg_op='INSERT' and new.internal_access_mode is not null)
     or (tg_op='UPDATE' and new.internal_access_mode is distinct from old.internal_access_mode) then
    if not (session_user='postgres' and current_user='postgres') and not private.is_super_admin() then
      raise exception 'Only a super administrator may configure internal access';
    end if;
  end if;
  if new.internal_access_mode is not null then
    if new.stripe_customer_id is not null or new.stripe_subscription_id is not null then
      raise exception 'Internal workspace cannot be linked to platform Stripe billing';
    end if;
    if tg_op='UPDATE' and (new.plan is distinct from old.plan or new.custom_enabled_features is distinct from old.custom_enabled_features or new.sales_funnels_access_mode is distinct from old.sales_funnels_access_mode) and not (session_user='postgres' and current_user='postgres') and not private.is_super_admin() then
      raise exception 'Only a super administrator may change internal workspace entitlements';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists guard_internal_access_mode on public.businesses;
create trigger guard_internal_access_mode before insert or update on public.businesses
for each row execute function private.guard_internal_access_mode();
revoke all on function private.guard_internal_access_mode() from public,anon,authenticated;
