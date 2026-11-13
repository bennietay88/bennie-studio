-- Follow-up applied to production Supabase: PostgreSQL regex max repetition bound is 255.
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
  if p_api_key is not null and ((p_api_key !~ '^re_[A-Za-z0-9_-]+$' or length(p_api_key) < 15 or length(p_api_key) > 259)) then
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

