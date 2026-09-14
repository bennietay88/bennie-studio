-- Fix first-delivery ownership: an INSERT done by this invocation is already its claim.
create or replace function public.claim_stripe_webhook_event(
  p_stripe_event_id text,
  p_event_type text,
  p_stale_after_seconds integer default 600
)
returns table(claimed boolean, current_status text, attempt_count integer, reason text)
language plpgsql security definer set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.stripe_webhook_events%rowtype;
  v_inserted public.stripe_webhook_events%rowtype;
  v_attempt integer;
begin
  insert into public.stripe_webhook_events (stripe_event_id, event_type, status, started_at, processing_started_at, last_attempt_at, attempt_count, metadata)
  values (p_stripe_event_id, p_event_type, 'processing', v_now, v_now, v_now, 1, jsonb_build_object('source', 'stripe'))
  on conflict (stripe_event_id) do nothing returning * into v_inserted;
  if v_inserted.id is not null then
    return query select true, 'processing'::text, 1, 'claimed'::text;
    return;
  end if;

  select * into v_row from public.stripe_webhook_events where stripe_event_id = p_stripe_event_id for update;
  if v_row.status = 'completed' then
    return query select false, v_row.status, coalesce(v_row.attempt_count, 0), 'completed'; return;
  end if;
  if v_row.status = 'processing' and v_row.processing_started_at is not null
     and v_now - v_row.processing_started_at <= make_interval(secs => greatest(p_stale_after_seconds, 1)) then
    return query select false, v_row.status, coalesce(v_row.attempt_count, 0), 'active_processing'; return;
  end if;
  v_attempt := coalesce(v_row.attempt_count, 0) + 1;
  update public.stripe_webhook_events
  set status = 'processing', event_type = coalesce(event_type, p_event_type),
      started_at = coalesce(started_at, v_now), processing_started_at = v_now,
      last_attempt_at = v_now, attempt_count = v_attempt, error_message = null, failed_at = null
  where stripe_event_id = p_stripe_event_id;
  return query select true, 'processing'::text, v_attempt, 'claimed'::text;
end;
$$;
revoke all on function public.claim_stripe_webhook_event(text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text, integer) to service_role;
