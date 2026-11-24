-- Reviewed deployment SQL: apply through a controlled Supabase migration.
-- Existing row-level security applies to the caller. No elevated privileges.
create or replace function public.bs_prospect_summary_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'total', count(*),
    'high', count(*) filter (where opportunity_level = 'high'),
    'contacted', count(*) filter (where outreach_status in ('contacted','replied','call_booked','won')),
    'booked', count(*) filter (where outreach_status = 'call_booked'),
    'due', count(*) filter (where next_follow_up_at <= now() and outreach_status not in ('won','lost')),
    'notContacted', count(*) filter (where outreach_status in ('not_started','queued'))
  )
  from public.prospects
  where outreach_exhausted_at is null;
$$;
revoke all on function public.bs_prospect_summary_v1() from public, anon;
grant execute on function public.bs_prospect_summary_v1() to authenticated;

-- Matches inbox filtering and chronological retrieval; no data or policy changes.
create index if not exists bs_sales_messages_direction_created_prospect_idx
  on public.sales_messages (direction, created_at desc)
  where prospect_id is not null;
