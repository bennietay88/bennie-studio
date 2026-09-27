
-- Business ownership must never grant tenant access to a non-tenant profile role.

create or replace function private.is_business_owner(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
  select exists (
    select 1
    from public.profiles p
    join public.businesses b on b.id = target_business_id
    where p.id = (select auth.uid())
      and p.role = 'business_admin'
      and coalesce(p.status, 'active') = 'active'
      and b.owner_id = p.id
  );
$function$;

revoke all on function private.is_business_owner(uuid) from public;
grant execute on function private.is_business_owner(uuid) to authenticated;

drop policy if exists "Business members can view own business" on public.businesses;
create policy "Business members can view own business"
  on public.businesses
  for select
  to authenticated
  using (
    private.is_business_owner(id)
    or private.business_id_matches(id)
  );

drop policy if exists "Owners can delete own business" on public.businesses;
create policy "Owners can delete own business"
  on public.businesses
  for delete
  to authenticated
  using (private.is_business_owner(id));

drop policy if exists "Owners can insert business" on public.businesses;
create policy "Owners can insert business"
  on public.businesses
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'business_admin'
        and coalesce(p.status, 'active') = 'active'
    )
  );

drop policy if exists "Business admins can update own business" on public.businesses;
create policy "Business admins can update own business"
  on public.businesses
  for update
  to authenticated
  using (
    private.is_business_owner(id)
    or private.is_business_admin(id)
  )
  with check (
    private.is_business_owner(id)
    or private.is_business_admin(id)
  );

notify pgrst, 'reload schema';
