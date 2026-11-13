-- Applied to the Bennie Studio Supabase production project on 2026-11-13.
-- PostgREST exposes the service JWT role through request.jwt.claims.
-- Legacy-only current_setting('request.jwt.claim.role') checks incorrectly denied
-- service-role calls with SQLSTATE 42501. auth.role() handles the actual JWT
-- claim format while the function EXECUTE grants remain service_role-only.
create or replace function public.save_hostinger_smtp_settings(
  p_smtp_user text,
  p_from_email text,
  p_smtp_port integer,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_user text := lower(btrim(p_smtp_user));
  v_from text := lower(btrim(p_from_email));
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  if v_user !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(v_user) > 254 or v_from <> v_user
    or p_smtp_port not in (465, 587) then
    raise exception 'Invalid SMTP configuration' using errcode = '22023';
  end if;
  if p_password is not null and (length(p_password) < 1 or length(p_password) > 1024) then
    raise exception 'Invalid SMTP password' using errcode = '22023';
  end if;

  -- Serialize concurrent updates of the one configured mailbox.
  perform pg_advisory_xact_lock(485253176);
  select password_secret_id into v_secret_id
    from public.hostinger_smtp_settings where id = 1 for update;
  -- A changed mailbox must never inherit a previous mailbox's SMTP secret.
  if exists (
    select 1 from public.hostinger_smtp_settings
    where id = 1 and smtp_user <> v_user
  ) and (p_password is null or p_password = '') then
    raise exception 'A password is required when changing the mailbox' using errcode = '22023';
  end if;
  if v_secret_id is null and (p_password is null or p_password = '') then
    raise exception 'A password is required for the first configuration' using errcode = '22023';
  end if;
  if p_password is not null and p_password <> '' then
    if v_secret_id is null then
      v_secret_id := vault.create_secret(p_password, null, 'Bennie Studio Hostinger SMTP');
    else
      perform vault.update_secret(v_secret_id, p_password);
    end if;
  end if;

  insert into public.hostinger_smtp_settings(id, smtp_user, from_email, smtp_port, password_secret_id)
    values (1, v_user, v_from, p_smtp_port, v_secret_id)
  on conflict (id) do update set
    smtp_user = excluded.smtp_user,
    from_email = excluded.from_email,
    smtp_port = excluded.smtp_port,
    password_secret_id = excluded.password_secret_id,
    updated_at = now();
  return jsonb_build_object('configured', true, 'from', v_from, 'smtpPort', p_smtp_port);
end;
$$;

-- The database decrypts only for server-side delivery. This result must NEVER
-- be forwarded to a browser, logged, or cached in a public response.
create or replace function public.get_hostinger_smtp_credentials()
returns table(smtp_user text, smtp_password text, from_email text, smtp_port integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role only' using errcode = '42501';
  end if;
  return query
    select c.smtp_user, v.decrypted_secret, c.from_email, c.smtp_port
    from public.hostinger_smtp_settings c
    inner join vault.decrypted_secrets v on v.id = c.password_secret_id
    where c.id = 1;
end;
$$;


revoke all on function public.save_hostinger_smtp_settings(text, text, integer, text) from public, anon, authenticated;
revoke all on function public.get_hostinger_smtp_credentials() from public, anon, authenticated;
grant execute on function public.save_hostinger_smtp_settings(text, text, integer, text) to service_role;
grant execute on function public.get_hostinger_smtp_credentials() to service_role;
