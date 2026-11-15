-- Multiple portal-managed Resend accounts with server-side purpose routing.
-- API keys remain in Supabase Vault; only service_role can read or change credentials.
create table if not exists public.resend_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  from_address text not null,
  api_key_secret_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists resend_provider_accounts_name_lower_uq
  on public.resend_provider_accounts (lower(name));
alter table public.resend_provider_accounts enable row level security;
revoke all on table public.resend_provider_accounts from public, anon, authenticated;
grant select on table public.resend_provider_accounts to service_role;

create table if not exists public.resend_provider_assignments (
  purpose text primary key check (purpose in ('transactional','sales')),
  account_id uuid not null references public.resend_provider_accounts(id) on delete restrict,
  updated_at timestamptz not null default now()
);
alter table public.resend_provider_assignments enable row level security;
revoke all on table public.resend_provider_assignments from public, anon, authenticated;
grant select on table public.resend_provider_assignments to service_role;

-- Preserve existing portal credentials and use them for both existing message categories.
do $$
declare v_account_id uuid;
begin
  if exists (select 1 from public.resend_provider_settings where id=1) then
    insert into public.resend_provider_accounts (name,from_address,api_key_secret_id)
    select 'Legacy default',from_address,api_key_secret_id
      from public.resend_provider_settings where id=1
    on conflict do nothing;
    select id into v_account_id from public.resend_provider_accounts
      where lower(name)=lower('Legacy default');
    insert into public.resend_provider_assignments (purpose,account_id)
      values ('transactional',v_account_id),('sales',v_account_id)
    on conflict (purpose) do nothing;
  end if;
end;
$$;

create or replace function public.save_resend_provider_account(
  p_account_id uuid,
  p_name text,
  p_from_address text,
  p_api_key text default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := btrim(p_name);
  v_from text := btrim(p_from_address);
  v_sender text;
  v_secret_id uuid;
  v_account_id uuid := p_account_id;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  if v_name is null or length(v_name) not between 1 and 80 then
    raise exception 'Invalid Resend account name' using errcode = '22023';
  end if;
  v_sender := case when v_from ~ '^[^<>]+<[^<>]+>$'
    then btrim(substring(v_from from '<([^<>]+)>$')) else v_from end;
  if v_from is null or length(v_from)>320 or v_from ~ '[\r\n]'
    or v_sender !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
    or length(v_sender)>254 then
    raise exception 'Invalid Resend sender address' using errcode = '22023';
  end if;
  if p_api_key is not null and p_api_key !~ '^re_[A-Za-z0-9_-]{12,256}$' then
    raise exception 'Invalid Resend API key format' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(485253178);
  if v_account_id is null then
    if p_api_key is null then
      raise exception 'A Resend API key is required for a new account' using errcode = '22023';
    end if;
    v_secret_id := vault.create_secret(p_api_key,null,'Bennie Studio Resend account: ' || v_name);
    insert into public.resend_provider_accounts (name,from_address,api_key_secret_id)
      values (v_name,v_from,v_secret_id) returning id into v_account_id;
  else
    select api_key_secret_id into v_secret_id from public.resend_provider_accounts
      where id=v_account_id for update;
    if v_secret_id is null then
      raise exception 'Resend account not found' using errcode = 'P0002';
    end if;
    if p_api_key is not null then
      perform vault.update_secret(v_secret_id,p_api_key);
    end if;
    update public.resend_provider_accounts
      set name=v_name,from_address=v_from,updated_at=now()
      where id=v_account_id;
  end if;
  return jsonb_build_object('id',v_account_id,'name',v_name,'from',v_from);
end;
$$;

create or replace function public.assign_resend_provider_account(p_purpose text,p_account_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  if p_purpose not in ('transactional','sales') then
    raise exception 'Invalid Resend purpose' using errcode = '22023';
  end if;
  if p_account_id is null then
    delete from public.resend_provider_assignments where purpose=p_purpose;
    return jsonb_build_object('purpose',p_purpose,'accountId',null);
  end if;
  if not exists (select 1 from public.resend_provider_accounts where id=p_account_id) then
    raise exception 'Resend account not found' using errcode = 'P0002';
  end if;
  insert into public.resend_provider_assignments(purpose,account_id)
    values(p_purpose,p_account_id)
  on conflict(purpose) do update set account_id=excluded.account_id,updated_at=now();
  return jsonb_build_object('purpose',p_purpose,'accountId',p_account_id);
end;
$$;

create or replace function public.delete_resend_provider_account(p_account_id uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_deleted_count integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  if exists (select 1 from public.resend_provider_assignments where account_id=p_account_id) then
    raise exception 'Resend account is assigned' using errcode = '23503';
  end if;
  select api_key_secret_id into v_secret_id from public.resend_provider_accounts where id=p_account_id for update;
  if v_secret_id is null then return false; end if;
  delete from public.resend_provider_accounts where id=p_account_id;
  get diagnostics v_deleted_count = row_count;
  if v_deleted_count > 0 then
    delete from public.resend_provider_settings where api_key_secret_id=v_secret_id;
    if not exists (select 1 from public.resend_provider_accounts where api_key_secret_id=v_secret_id) then
      delete from vault.secrets where id=v_secret_id;
    end if;
  end if;
  return v_deleted_count > 0;
end;
$$;

create or replace function public.get_resend_provider_credentials_for_purpose(p_purpose text)
returns table(api_key text,from_address text,account_id uuid,account_name text)
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  if p_purpose not in ('transactional','sales') then
    raise exception 'Invalid Resend purpose' using errcode = '22023';
  end if;
  return query
    select v.decrypted_secret,a.from_address,a.id,a.name
    from public.resend_provider_assignments x
    join public.resend_provider_accounts a on a.id=x.account_id
    join vault.decrypted_secrets v on v.id=a.api_key_secret_id
    where x.purpose=p_purpose;
end;
$$;

revoke all on function public.save_resend_provider_account(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.assign_resend_provider_account(text,uuid) from public,anon,authenticated;
revoke all on function public.delete_resend_provider_account(uuid) from public,anon,authenticated;
revoke all on function public.get_resend_provider_credentials_for_purpose(text) from public,anon,authenticated;
grant execute on function public.save_resend_provider_account(uuid,text,text,text) to service_role;
grant execute on function public.assign_resend_provider_account(text,uuid) to service_role;
grant execute on function public.delete_resend_provider_account(uuid) to service_role;
grant execute on function public.get_resend_provider_credentials_for_purpose(text) to service_role;
