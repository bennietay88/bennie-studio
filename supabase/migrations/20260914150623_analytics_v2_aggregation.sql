create or replace function public.get_qualified_analytics_summary(
  p_business_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
) returns jsonb
language sql security definer set search_path = public
as $$
  with qualified_views as (
    select count(*)::integer as views,
           count(distinct coalesce(session_id, visitor_id::text, id::text))::integer as sessions
    from public.page_views
    where business_id = p_business_id and created_at >= p_from and created_at < p_to
      and coalesce(user_agent, '') !~* '(bot|crawler|spider|headless|preview)'
  ), funnel as (
    select
      count(*) filter (where event_type in ('whatsapp_click','call_click','email_click','lead_form_submit','booking_click','appointment_requested','appointment_booked','quote_button_click'))::integer as intent_events,
      count(*) filter (where event_type in ('lead_form_submit','appointment_requested','appointment_booked'))::integer as qualified_events,
      count(*) filter (where event_type in ('appointment_booked','proposal_accepted','checkout_completed'))::integer as booked_or_won_events
    from public.tracking_events
    where business_id = p_business_id and created_at >= p_from and created_at < p_to
  )
  select jsonb_build_object('from', p_from, 'to', p_to,
    'qualifiedViews', (select views from qualified_views),
    'qualifiedSessions', (select sessions from qualified_views),
    'funnel', jsonb_build_object('intentEvents', (select intent_events from funnel), 'qualifiedEvents', (select qualified_events from funnel), 'bookedOrWonEvents', (select booked_or_won_events from funnel)));
$$;
revoke all on function public.get_qualified_analytics_summary(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_qualified_analytics_summary(uuid, timestamptz, timestamptz) to service_role;
