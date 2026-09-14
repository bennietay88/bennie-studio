-- Profiles are tenant/security records, not a client-writable settings table.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

revoke insert, update on table public.profiles from anon, authenticated;
grant insert on table public.profiles to service_role;
grant update on table public.profiles to service_role;
grant update (full_name, onboarding_completed) on table public.profiles to authenticated;

create or replace function public.create_customer_profile()
returns public.profiles
language plpgsql security definer set search_path = public, auth
as $$
declare v_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.profiles (id, email, role, created_at)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'business_admin', now())
  on conflict (id) do update set email = excluded.email
  returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function public.create_customer_profile() from public, anon;
grant execute on function public.create_customer_profile() to authenticated;

