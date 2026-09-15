-- Keep authorization semantics explicit: business_admin is an administrator,
-- while staff/client are members with tenant-scoped access only.
create or replace function private.is_business_member(target_business_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.business_id = target_business_id
      and p.role in ('business_admin','staff','client')
      and coalesce(p.status, 'active') = 'active'
  );
$$;

create or replace function private.is_business_admin(target_business_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.role = 'super_admin' or (p.role = 'business_admin' and p.business_id = target_business_id))
      and coalesce(p.status, 'active') = 'active'
  );
$$;

revoke all on function private.is_business_member(uuid) from public, anon;
grant execute on function private.is_business_member(uuid) to authenticated, service_role;
revoke all on function private.is_business_admin(uuid) from public, anon;
grant execute on function private.is_business_admin(uuid) to authenticated, service_role;

drop policy if exists "Authenticated users can view permitted websites" on public.websites;
drop policy if exists "Authenticated users can insert permitted websites" on public.websites;
drop policy if exists "Authenticated users can update permitted websites" on public.websites;
drop policy if exists "Authenticated users can delete permitted websites" on public.websites;

create policy "Tenant members can view websites"
on public.websites for select to authenticated
using (private.is_business_member(business_id) or private.is_super_admin() or has_platform_permission('customer_health') or has_platform_permission('delivery'));

create policy "Business admins can insert websites"
on public.websites for insert to authenticated
with check (private.is_business_admin(business_id) or private.is_super_admin());

create policy "Business admins can update websites"
on public.websites for update to authenticated
using (private.is_business_admin(business_id) or private.is_super_admin())
with check (private.is_business_admin(business_id) or private.is_super_admin());

create policy "Business admins can delete websites"
on public.websites for delete to authenticated
using (private.is_business_admin(business_id) or private.is_super_admin());
