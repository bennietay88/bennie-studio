-- Portal-managed Resend sender and API key (server side only).
-- Existing RESEND_API_KEY/RESEND_FROM_EMAIL env vars remain a temporary fallback
-- until a portal key has been configured; no secret is migrated from a live env.
create table if not exists public.resend_provider_settings (
  id integer primary key default 1 check (id = 1),
  from_address text not null,
  api_key_secret_id uuid not null,
  updated_at timestamptz not null default now()
);
alter table public.resend_provider_settings enable row level security;
revoke all on table public.resend_provider_settings from public, anon, authenticated;
grant select on table public.resend_provider_settings to service_role;

create or replace function public.save_resend_provider_settings(
  p_from_address text,
  p_api_key text default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_from text := btrim(p_from_address);
  v_sender text;
  v_secret_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  v_sender := case
    when v_from ~ '^[^<>]+<[^<>]+>$' then btrim(substring(v_from from '<([^<>]+)>$'))
    else v_from end;
  if v_from is null or length(v_from) > 320 or v_from ~ '[\r\n]'
    or v_sender !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
    or length(v_sender) > 254 then
    raise exception 'Invalid Resend sender address' using errcode = '22023';
  end if;
  if p_api_key is not null and (p_api_key !~ '^re_[A-Za-z0-9_-]{12,256}$') then
    raise exception 'Invalid Resend API key format' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(485253177);
  select api_key_secret_id into v_secret_id
  from public.resend_provider_settings where id = 1 for update;
  if v_secret_id is null and p_api_key is null then
    raise exception 'A Resend API key is required for first configuration' using errcode = '22023';
  end if;
  if p_api_key is not null then
    if v_secret_id is null then
      v_secret_id := vault.create_secret(p_api_key, null, 'Bennie Studio Resend API key');
    else
      perform vault.update_secret(v_secret_id, p_api_key);
    end if;
  end if;
  insert into public.resend_provider_settings (id,from_address,api_key_secret_id)
    values (1,v_from,v_secret_id)
  on conflict (id) do update set
    from_address=excluded.from_address,
    api_key_secret_id=excluded.api_key_secret_id,
    updated_at=now();
  return jsonb_build_object('configured',true,'from',v_from);
end;
$$;

create or replace function public.get_resend_provider_credentials()
returns table(api_key text, from_address text)
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  return query
  select v.decrypted_secret, s.from_address
    from public.resend_provider_settings s
    join vault.decrypted_secrets v on v.id=s.api_key_secret_id
    where s.id=1;
end;
$$;

revoke all on function public.save_resend_provider_settings(text,text) from public,anon,authenticated;
revoke all on function public.get_resend_provider_credentials() from public,anon,authenticated;
grant execute on function public.save_resend_provider_settings(text,text) to service_role;
grant execute on function public.get_resend_provider_credentials() to service_role;
