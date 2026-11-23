-- Shared, concurrency-safe abuse counters using the existing Supabase PostgreSQL.
-- No visitor IP or email is persisted here: application supplies HMAC/SHA256.
-- This backend is used only when dedicated Upstash Redis is not configured.

create table if not exists public.bs_abuse_counters (
  counter_key text primary key,
  request_count integer not null check (request_count >= 1),
  expires_at timestamptz not null
);

create index if not exists bs_abuse_counters_expires_idx
  on public.bs_abuse_counters (expires_at);

alter table public.bs_abuse_counters enable row level security;
revoke all on table public.bs_abuse_counters from public, anon, authenticated;
grant select, insert, update, delete on table public.bs_abuse_counters to service_role;

-- SECURITY INVOKER is sufficient because only the service role can run this RPC.
-- The atomic ON CONFLICT statement serializes concurrent updates to one key.
create or replace function public.bs_consume_abuse_quota(
  p_key text,
  p_max integer,
  p_window_ms integer
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_expires timestamptz;
  v_ttl bigint;
begin
  if p_key is null
     or p_key !~ '^bs:rate:v2:[a-zA-Z0-9:_-]{1,80}:[a-f0-9]{64}$'
     or char_length(p_key) > 180
     or p_max is null or p_max < 1 or p_max > 100000
     or p_window_ms is null or p_window_ms < 1000 or p_window_ms > 604800000 then
    raise exception 'Invalid abuse counter arguments' using errcode = '22023';
  end if;

  insert into public.bs_abuse_counters as counter (counter_key, request_count, expires_at)
    values (p_key, 1, v_now + (p_window_ms::text || ' milliseconds')::interval)
    on conflict (counter_key) do update
      set request_count =
        case when counter.expires_at <= v_now then 1
             else least(counter.request_count + 1, p_max + 1) end,
          expires_at =
        case when counter.expires_at <= v_now then v_now + (p_window_ms::text || ' milliseconds')::interval
             else counter.expires_at end
    returning request_count, expires_at into v_count, v_expires;

  v_ttl := greatest(1, floor(extract(epoch from (v_expires - clock_timestamp())) * 1000)::bigint);

  -- Low-frequency housekeeping without an additional paid cron service.
  if random() < 0.002 then
    delete from public.bs_abuse_counters
      where counter_key in (
        select counter_key from public.bs_abuse_counters
        where expires_at < v_now - interval '1 day'
        limit 100
      );
  end if;

  return jsonb_build_array(
    case when v_count <= p_max then 1 else 0 end,
    v_count,
    v_ttl
  );
end;
$$;

revoke execute on function public.bs_consume_abuse_quota(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.bs_consume_abuse_quota(text, integer, integer)
  to service_role;

comment on function public.bs_consume_abuse_quota(text, integer, integer)
  is 'Atomic service-role-only rate-limit counter for Bennie Studio server API.';
