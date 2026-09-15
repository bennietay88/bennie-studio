-- Additive operating-system foundation. Existing business and website records
-- remain valid; new operational records are tenant-scoped and auditable.
alter table public.businesses
  add column if not exists lifecycle_stage text,
  add column if not exists lifecycle_stage_changed_at timestamptz,
  add column if not exists onboarding_started_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists build_started_at timestamptz,
  add column if not exists internal_review_started_at timestamptz,
  add column if not exists customer_review_started_at timestamptz,
  add column if not exists launch_ready_at timestamptz,
  add column if not exists launched_at timestamptz,
  add column if not exists managed_service_started_at timestamptz;
alter table public.businesses drop constraint if exists businesses_lifecycle_stage_check;
alter table public.businesses add constraint businesses_lifecycle_stage_check check (lifecycle_stage in ('prospect','qualified','proposal','checkout','onboarding','content_collection','design_build','internal_review','customer_review','launch_ready','live','managed_service','renewal','cancellation_requested','cancelled','paused'));

alter table public.websites
  add column if not exists template_version text not null default '1',
  add column if not exists design_profile text,
  add column if not exists design_profile_version text,
  add column if not exists renderer_version text not null default '1',
  add column if not exists content_schema_version text not null default '1';

create table if not exists public.business_lifecycle_events (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null, from_stage text, to_stage text not null,
  reason text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists idx_lifecycle_events_business_created on public.business_lifecycle_events (business_id, created_at desc);

create table if not exists public.delivery_tasks (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  website_id uuid references public.websites(id) on delete set null, task_type text not null, source text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'queued' check (status in ('queued','assigned','in_progress','blocked','waiting_customer','review','completed','cancelled')),
  assigned_to uuid references auth.users(id) on delete set null, due_at timestamptz, started_at timestamptz,
  completed_at timestamptz, blocked_reason text, metadata jsonb not null default '{}'::jsonb,
  idempotency_key text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists uq_delivery_tasks_idempotency on public.delivery_tasks (idempotency_key) where idempotency_key is not null;
create index if not exists idx_delivery_tasks_queue on public.delivery_tasks (status, priority, due_at);
create index if not exists idx_delivery_tasks_business on public.delivery_tasks (business_id, status);

create table if not exists public.launch_readiness_checks (
  id uuid primary key default gen_random_uuid(), website_id uuid not null unique references public.websites(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade, score integer not null default 0 check (score between 0 and 100),
  blocking_issues jsonb not null default '[]'::jsonb, warnings jsonb not null default '[]'::jsonb,
  passed_checks jsonb not null default '[]'::jsonb, status text not null default 'blocked' check (status in ('blocked','ready','overridden')),
  last_checked_at timestamptz, override_reason text, overridden_by uuid references auth.users(id) on delete set null, overridden_at timestamptz
);
create index if not exists idx_launch_readiness_business on public.launch_readiness_checks (business_id, status);

create table if not exists public.managed_service_cycles (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null, period_end date not null, status text not null default 'open' check (status in ('open','in_progress','review','completed','skipped')),
  recommendation jsonb not null default '{}'::jsonb, started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(),
  unique (business_id, period_start)
);

create table if not exists public.service_usage (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null, metric text not null, used numeric not null default 0, allowance numeric, override_value numeric,
  source text not null default 'system', updated_at timestamptz not null default now(), unique (business_id, period_start, metric)
);

create table if not exists public.account_cost_entries (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null, category text not null, amount numeric not null default 0, currency text not null default 'USD',
  source text not null default 'manual' check (source in ('actual','estimated','manual')), notes text, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_account_costs_business_period on public.account_cost_entries (business_id, period_start desc);

create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null, period_end date not null, status text not null default 'draft' check (status in ('draft','internal_review','published')),
  metrics jsonb not null default '{}'::jsonb, work_completed jsonb not null default '[]'::jsonb, health_summary jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb, published_at timestamptz, published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (business_id, period_start)
);

create table if not exists public.website_health_checks (
  id uuid primary key default gen_random_uuid(), website_id uuid not null references public.websites(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade, health_status text not null check (health_status in ('healthy','warning','critical')),
  issues jsonb not null default '[]'::jsonb, checks jsonb not null default '{}'::jsonb, checked_at timestamptz not null default now()
);
create index if not exists idx_website_health_latest on public.website_health_checks (website_id, checked_at desc);

create table if not exists public.content_provenance (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade, content_path text not null, source_type text not null check (source_type in ('manual','ai_generated','imported','customer_supplied')),
  verified boolean not null default false, approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz,
  prompt_version text, generation_id uuid, source_facts jsonb not null default '[]'::jsonb, claims_to_verify jsonb not null default '[]'::jsonb,
  value_hash text, created_at timestamptz not null default now()
);
create index if not exists idx_content_provenance_website on public.content_provenance (website_id, content_path, created_at desc);

create table if not exists public.sales_delivery_handoff (
  id uuid primary key default gen_random_uuid(), business_id uuid not null unique references public.businesses(id) on delete cascade,
  brief jsonb not null default '{}'::jsonb, handoff_created_at timestamptz not null default now(), handoff_created_by uuid references auth.users(id) on delete set null,
  handoff_acknowledged_by uuid references auth.users(id) on delete set null, handoff_acknowledged_at timestamptz
);

-- Reuse tenant helper functions from the role-hardening migration.
alter table public.business_lifecycle_events enable row level security;
alter table public.delivery_tasks enable row level security;
alter table public.launch_readiness_checks enable row level security;
alter table public.managed_service_cycles enable row level security;
alter table public.service_usage enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.website_health_checks enable row level security;
alter table public.content_provenance enable row level security;
alter table public.sales_delivery_handoff enable row level security;

-- The schema may already have been provisioned by an operator-run deployment.
-- Recreate policies idempotently so a later migration replay cannot fail on
-- duplicate policy names.
drop policy if exists "Platform staff view lifecycle" on public.business_lifecycle_events;
drop policy if exists "Business admins append lifecycle" on public.business_lifecycle_events;
drop policy if exists "Platform staff view delivery tasks" on public.delivery_tasks;
drop policy if exists "Platform staff manage delivery tasks" on public.delivery_tasks;
drop policy if exists "Platform staff view readiness" on public.launch_readiness_checks;
drop policy if exists "Platform staff manage readiness" on public.launch_readiness_checks;
drop policy if exists "Customers view published reports" on public.monthly_reports;
drop policy if exists "Platform staff manage reports" on public.monthly_reports;
drop policy if exists "Platform staff view health" on public.website_health_checks;
drop policy if exists "Platform staff manage health" on public.website_health_checks;
drop policy if exists "Platform staff view handoff" on public.sales_delivery_handoff;
drop policy if exists "Platform staff manage handoff" on public.sales_delivery_handoff;
drop policy if exists "Platform staff manage internal service data" on public.managed_service_cycles;
drop policy if exists "Platform staff manage usage" on public.service_usage;
drop policy if exists "Platform staff manage costs" on public.account_cost_entries;
drop policy if exists "Platform staff manage provenance" on public.content_provenance;

create policy "Platform staff view lifecycle" on public.business_lifecycle_events for select to authenticated using (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Business admins append lifecycle" on public.business_lifecycle_events for insert to authenticated with check (private.is_business_admin(business_id) or private.is_super_admin());
create policy "Platform staff view delivery tasks" on public.delivery_tasks for select to authenticated using (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Platform staff manage delivery tasks" on public.delivery_tasks for all to authenticated using (private.is_super_admin() or has_platform_permission('delivery')) with check (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Platform staff view readiness" on public.launch_readiness_checks for select to authenticated using (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Platform staff manage readiness" on public.launch_readiness_checks for all to authenticated using (private.is_super_admin() or has_platform_permission('delivery')) with check (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Customers view published reports" on public.monthly_reports for select to authenticated using ((status = 'published' and private.is_business_member(business_id)) or private.is_super_admin() or has_platform_permission('customer_health'));
create policy "Platform staff manage reports" on public.monthly_reports for all to authenticated using (private.is_super_admin() or has_platform_permission('customer_health')) with check (private.is_super_admin() or has_platform_permission('customer_health'));
create policy "Platform staff view health" on public.website_health_checks for select to authenticated using (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Platform staff manage health" on public.website_health_checks for all to authenticated using (private.is_super_admin() or has_platform_permission('delivery')) with check (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Platform staff view handoff" on public.sales_delivery_handoff for select to authenticated using (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Platform staff manage handoff" on public.sales_delivery_handoff for all to authenticated using (private.is_super_admin() or has_platform_permission('delivery')) with check (private.is_super_admin() or has_platform_permission('delivery'));
create policy "Platform staff manage internal service data" on public.managed_service_cycles for all to authenticated using (private.is_super_admin() or has_platform_permission('customer_health')) with check (private.is_super_admin() or has_platform_permission('customer_health'));
create policy "Platform staff manage usage" on public.service_usage for all to authenticated using (private.is_super_admin() or has_platform_permission('customer_health')) with check (private.is_super_admin() or has_platform_permission('customer_health'));
create policy "Platform staff manage costs" on public.account_cost_entries for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy "Platform staff manage provenance" on public.content_provenance for all to authenticated using (private.is_super_admin() or has_platform_permission('delivery')) with check (private.is_super_admin() or has_platform_permission('delivery'));
