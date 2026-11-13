-- Shared, fail-closed rolling 24-hour Hostinger SMTP budget.
-- All app instances must reserve a slot BEFORE attempting SMTP delivery.
-- Claims are intentionally not released on failures because acceptance may be uncertain.
create table if not exists public.hostinger_smtp_quota_claims (
  id uuid primary key default gen_random_uuid(),
  mailbox text not null,
  claimed_at timestamptz not null default now()
);
create index if not exists hostinger_smtp_claims_mailbox_time
  on public.hostinger_smtp_quota_claims (mailbox, claimed_at desc);

alter table public.hostinger_smtp_quota_claims enable row level security;
revoke all on public.hostinger_smtp_quota_claims from anon, authenticated, public;

create or replace function public.claim_hostinger_smtp_slot(
  p_mailbox text,
  p_daily_limit integer default 100
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
  v_now timestamptz := now();
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role'
     and auth.role() is distinct from 'service_role' then
    raise exception 'service_role only' using errcode = '42501';
  end if;
  if p_mailbox is null or length(trim(p_mailbox)) < 5 or p_daily_limit < 1 or p_daily_limit > 100 then
    raise exception 'Invalid quota reservation' using errcode = '22023';
  end if;
  -- Avoid concurrent serverless reservations exceeding the same mailbox allowance.
  perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_mailbox)), 0));
  select count(*) into v_count
  from public.hostinger_smtp_quota_claims
  where mailbox = lower(trim(p_mailbox))
    and claimed_at > v_now - interval '24 hours';
  if v_count >= p_daily_limit then
    return false;
  end if;
  insert into public.hostinger_smtp_quota_claims(mailbox, claimed_at)
    values (lower(trim(p_mailbox)), v_now);
  return true;
end;
$$;
revoke all on function public.claim_hostinger_smtp_slot(text, integer) from public, anon, authenticated;
grant execute on function public.claim_hostinger_smtp_slot(text, integer) to service_role;
