create index if not exists idx_analytics_events_user_created_at
  on public.analytics_events (user_id, created_at desc);
