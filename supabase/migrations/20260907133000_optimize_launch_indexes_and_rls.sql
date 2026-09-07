-- Add covering indexes for every public foreign key that did not already have
-- one. This improves tenant-scoped joins, deletes, and dashboard queries.
do $$
declare
  fk record;
  indexed_columns text;
  index_name text;
begin
  for fk in
    select
      n.nspname as schema_name,
      c.oid as table_oid,
      c.relname as table_name,
      con.conname,
      con.conkey
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where con.contype = 'f'
      and n.nspname = 'public'
      and not exists (
        select 1
        from pg_index i
        where i.indrelid = c.oid
          and i.indisvalid
          and i.indkey::int2[] @> con.conkey
      )
  loop
    select string_agg(format('%I', a.attname), ', ' order by keys.ord)
      into indexed_columns
    from unnest(fk.conkey) with ordinality as keys(attnum, ord)
    join pg_attribute a on a.attrelid = fk.table_oid and a.attnum = keys.attnum;

    index_name := left('idx_fk_' || fk.table_name || '_' || fk.conname, 63);
    execute format(
      'create index if not exists %I on %I.%I (%s)',
      index_name, fk.schema_name, fk.table_name, indexed_columns
    );
  end loop;
end $$;

-- Consolidate the overlapping websites policies without changing the access
-- model. Public visitors may still read published sites; authenticated users
-- receive one tenant-scoped policy per operation.
drop policy if exists "Business admins can manage websites" on public.websites;
drop policy if exists "Business members can delete own websites" on public.websites;
drop policy if exists "Business members can insert websites" on public.websites;
drop policy if exists "Business members can update own websites" on public.websites;
drop policy if exists "Business members can view own websites" on public.websites;
drop policy if exists "Health staff view websites" on public.websites;
drop policy if exists "Super Admins can manage all websites" on public.websites;

create policy "Authenticated users can view permitted websites"
on public.websites for select to authenticated
using (
  private.is_business_admin(business_id)
  or private.is_super_admin()
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.business_id = websites.business_id)
  or has_platform_permission('customer_health')
  or has_platform_permission('delivery')
);

create policy "Authenticated users can insert permitted websites"
on public.websites for insert to authenticated
with check (
  private.is_business_admin(business_id)
  or private.is_super_admin()
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.business_id = websites.business_id)
);

create policy "Authenticated users can update permitted websites"
on public.websites for update to authenticated
using (
  private.is_business_admin(business_id)
  or private.is_super_admin()
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.business_id = websites.business_id)
)
with check (
  private.is_business_admin(business_id)
  or private.is_super_admin()
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.business_id = websites.business_id)
);

create policy "Authenticated users can delete permitted websites"
on public.websites for delete to authenticated
using (
  private.is_business_admin(business_id)
  or private.is_super_admin()
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.business_id = websites.business_id)
);

-- WordPress leads are a retained compatibility table. Public submissions are
-- anonymous; authenticated operators retain their existing management policy.
drop policy if exists "Anyone can submit WordPress project leads" on public.wordpress_project_leads;
create policy "Anonymous visitors can submit WordPress project leads"
on public.wordpress_project_leads for insert to anon
with check (pipeline_status = 'new_enquiry');
