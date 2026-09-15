alter table public.businesses
  add column if not exists order_received_at timestamptz,
  add column if not exists project_created_at timestamptz,
  add column if not exists onboarding_sent_at timestamptz,
  add column if not exists generation_started_at timestamptz,
  add column if not exists first_draft_generated_at timestamptz,
  add column if not exists internal_review_completed_at timestamptz,
  add column if not exists customer_review_sent_at timestamptz,
  add column if not exists customer_feedback_received_at timestamptz,
  add column if not exists revision_completed_at timestamptz,
  add column if not exists customer_approved_at timestamptz,
  add column if not exists domain_ready_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists human_touch_minutes numeric not null default 0,
  add column if not exists ai_generation_seconds numeric not null default 0,
  add column if not exists qa_seconds numeric not null default 0,
  add column if not exists customer_wait_minutes numeric not null default 0,
  add column if not exists domain_wait_minutes numeric not null default 0;

create table if not exists public.fulfilment_events (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  website_id uuid references public.websites(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  event_type text not null, plan text, market text, metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(), created_at timestamptz not null default now(), unique (business_id, event_type, occurred_at)
);
create index if not exists idx_fulfilment_events_business_time on public.fulfilment_events (business_id, occurred_at desc);
alter table public.fulfilment_events enable row level security;
drop policy if exists "Platform staff manage fulfilment events" on public.fulfilment_events;
create policy "Platform staff manage fulfilment events" on public.fulfilment_events for all to authenticated using (private.is_super_admin() or has_platform_permission('delivery')) with check (private.is_super_admin() or has_platform_permission('delivery'));
