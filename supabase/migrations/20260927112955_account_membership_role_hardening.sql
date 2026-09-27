
-- Account membership is tenant scope and must not survive logically when a user
-- moves to platform staff or affiliate roles.

create or replace function private.is_account_member(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
  select exists (
    select 1
    from public.account_memberships am
    join public.profiles p on p.id = am.user_id
    where am.account_id = target_account_id
      and am.user_id = (select auth.uid())
      and am.status = 'active'
      and p.role in ('business_admin', 'staff', 'client')
      and coalesce(p.status, 'active') = 'active'
  );
$function$;

create or replace function private.is_account_admin(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
  select exists (
    select 1
    from public.account_memberships am
    join public.profiles p on p.id = am.user_id
    where am.account_id = target_account_id
      and am.user_id = (select auth.uid())
      and am.status = 'active'
      and am.role in ('owner', 'admin')
      and p.role = 'business_admin'
      and coalesce(p.status, 'active') = 'active'
  );
$function$;

notify pgrst, 'reload schema';
