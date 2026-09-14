-- Launch hardening: make webhook ownership atomic and keep orders server-created.
create or replace function public.claim_stripe_webhook_event(
  p_stripe_event_id text,
  p_event_type text,
  p_stale_after_seconds integer default 600
)
returns table(claimed boolean, current_status text, attempt_count integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.stripe_webhook_events%rowtype;
  v_attempt integer;
begin
  insert into public.stripe_webhook_events (stripe_event_id, event_type, status, started_at, processing_started_at, last_attempt_at, attempt_count, metadata)
  values (p_stripe_event_id, p_event_type, 'processing', v_now, v_now, v_now, 1, jsonb_build_object('source', 'stripe'))
  on conflict (stripe_event_id) do nothing;

  select * into v_row
  from public.stripe_webhook_events
  where stripe_event_id = p_stripe_event_id
  for update;

  if v_row.status = 'completed' then
    return query select false, v_row.status, coalesce(v_row.attempt_count, 0), 'completed';
    return;
  end if;

  if v_row.status = 'processing'
     and v_row.processing_started_at is not null
     and v_now - v_row.processing_started_at <= make_interval(secs => greatest(p_stale_after_seconds, 1)) then
    return query select false, v_row.status, coalesce(v_row.attempt_count, 0), 'active_processing';
    return;
  end if;

  v_attempt := coalesce(v_row.attempt_count, 0) + case when v_row.status = 'processing' then 1 else 1 end;
  update public.stripe_webhook_events
  set status = 'processing',
      event_type = coalesce(event_type, p_event_type),
      started_at = coalesce(started_at, v_now),
      processing_started_at = v_now,
      last_attempt_at = v_now,
      attempt_count = v_attempt,
      error_message = null,
      failed_at = null
  where stripe_event_id = p_stripe_event_id;

  return query select true, 'processing'::text, v_attempt, 'claimed'::text;
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text, integer) to service_role;

do $$
begin
  if to_regclass('public.orders') is not null then
    revoke insert on table public.orders from anon, authenticated;
    drop policy if exists "Anyone can create an order" on public.orders;
    drop policy if exists "Public can create orders" on public.orders;
    drop policy if exists "Anyone can insert orders" on public.orders;
  end if;
end $$;

create table if not exists public.billing_worker_runs (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','failed')),
  scanned_count integer not null default 0,
  processed_count integer not null default 0,
  failed_count integer not null default 0,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_billing_worker_runs_name_started on public.billing_worker_runs(worker_name, started_at desc);
alter table public.billing_worker_runs enable row level security;
revoke all on table public.billing_worker_runs from anon, authenticated;
grant all on table public.billing_worker_runs to service_role;

-- Analytics v2 is intentionally behind its launch flag, but its aggregation
-- primitive is production-safe and avoids shipping raw event rows to clients.
create or replace function public.get_qualified_analytics_summary(
  p_business_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
) returns jsonb
language sql
security definer
set search_path = public
as $$
  with qualified_views as (
    select count(*)::integer as views,
           count(distinct coalesce(session_id, visitor_id::text, id::text))::integer as sessions
    from public.page_views
    where business_id = p_business_id
      and created_at >= p_from and created_at < p_to
      and coalesce(user_agent, '') !~* '(bot|crawler|spider|headless|preview)'
  ), funnel as (
    select
      count(*) filter (where event_type in ('whatsapp_click','call_click','email_click','lead_form_submit','booking_click','appointment_requested','appointment_booked','quote_button_click'))::integer as intent_events,
      count(*) filter (where event_type in ('lead_form_submit','appointment_requested','appointment_booked'))::integer as qualified_events,
      count(*) filter (where event_type in ('appointment_booked','proposal_accepted','checkout_completed'))::integer as booked_or_won_events
    from public.tracking_events
    where business_id = p_business_id and created_at >= p_from and created_at < p_to
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'qualifiedViews', (select views from qualified_views),
    'qualifiedSessions', (select sessions from qualified_views),
    'funnel', jsonb_build_object(
      'intentEvents', (select intent_events from funnel),
      'qualifiedEvents', (select qualified_events from funnel),
      'bookedOrWonEvents', (select booked_or_won_events from funnel)
    )
  );
$$;
revoke all on function public.get_qualified_analytics_summary(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_qualified_analytics_summary(uuid, timestamptz, timestamptz) to service_role;
