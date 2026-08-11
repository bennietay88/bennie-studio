-- Server-side analytics events used by public lead capture and account exports.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (char_length(event_type) between 1 and 120),
  page_path text,
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_created_at
  on public.analytics_events (created_at desc);
create index if not exists idx_analytics_events_business_created_at
  on public.analytics_events (business_id, created_at desc);
create index if not exists idx_analytics_events_event_type_created_at
  on public.analytics_events (event_type, created_at desc);

alter table public.analytics_events enable row level security;

revoke all on table public.analytics_events from anon;
revoke all on table public.analytics_events from authenticated;
grant select, insert, update, delete on table public.analytics_events to service_role;

drop policy if exists "Service role manages analytics events" on public.analytics_events;
create policy "Service role manages analytics events"
on public.analytics_events
for all
to service_role
using (true)
with check (true);

notify pgrst, 'reload schema';
