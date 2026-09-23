-- Bennie Studio Sales Funnel Engine V1-V4.
-- One graph model powers build, performance, automation, and intelligence.

alter table public.businesses
  add column if not exists custom_enabled_features jsonb not null default '[]'::jsonb,
  add column if not exists sales_funnels_access_mode text not null default 'managed';

alter table public.businesses drop constraint if exists businesses_sales_funnels_access_mode_check;
alter table public.businesses add constraint businesses_sales_funnels_access_mode_check
  check (sales_funnels_access_mode in ('managed','collaborative','self_managed'));

create or replace function private.business_has_custom_feature(target_business_id uuid, feature_key text)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and coalesce(b.custom_enabled_features, '[]'::jsonb) ? feature_key
  );
$$;
revoke all on function private.business_has_custom_feature(uuid, text) from public, anon;
grant execute on function private.business_has_custom_feature(uuid, text) to authenticated, service_role;

create or replace function private.business_can_manage_funnels(target_business_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    join public.businesses b on b.id = p.business_id
    where p.id = (select auth.uid())
      and p.business_id = target_business_id
      and p.role = 'business_admin'
      and coalesce(p.status, 'active') = 'active'
      and coalesce(b.custom_enabled_features, '[]'::jsonb) ? 'sales_funnels'
      and b.sales_funnels_access_mode <> 'managed'
  );
$$;
revoke all on function private.business_can_manage_funnels(uuid) from public, anon;
grant execute on function private.business_can_manage_funnels(uuid) to authenticated, service_role;

create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  slug text not null,
  objective text not null default 'lead' check (objective in ('lead','appointment','quote','application','sale','subscription')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  access_mode text not null default 'managed' check (access_mode in ('managed','collaborative','self_managed')),
  template_key text,
  description text,
  primary_domain text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);
create index if not exists idx_funnels_business_status on public.funnels (business_id, status, updated_at desc);

create table if not exists public.funnel_steps (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  step_type text not null check (step_type in ('landing','sales','lead_form','survey','application','appointment','checkout','order_bump','upsell','downsell','confirmation','thank_you','custom')),
  name text not null,
  slug text not null,
  position_x numeric not null default 100,
  position_y numeric not null default 100,
  is_entry boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  page_content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (funnel_id, slug)
);
create index if not exists idx_funnel_steps_funnel on public.funnel_steps (funnel_id, sort_order, created_at);

create table if not exists public.funnel_connections (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_step_id uuid not null references public.funnel_steps(id) on delete cascade,
  target_step_id uuid not null references public.funnel_steps(id) on delete cascade,
  label text,
  condition_type text not null default 'always' check (condition_type in ('always','field','score','event','purchased','not_purchased')),
  condition_config jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  unique (source_step_id, target_step_id, label)
);
create index if not exists idx_funnel_connections_funnel on public.funnel_connections (funnel_id, priority, created_at);

create table if not exists public.funnel_variants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  step_id uuid not null references public.funnel_steps(id) on delete cascade,
  name text not null,
  weight integer not null default 50 check (weight between 0 and 100),
  status text not null default 'active' check (status in ('active','paused','winner','archived')),
  page_content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnel_variants_step on public.funnel_variants (step_id, status);

create table if not exists public.funnel_offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  step_id uuid references public.funnel_steps(id) on delete cascade,
  offer_type text not null default 'primary' check (offer_type in ('primary','order_bump','upsell','downsell')),
  name text not null,
  description text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  stripe_price_id text,
  active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnel_offers_funnel on public.funnel_offers (funnel_id, active, offer_type);

create table if not exists public.funnel_sessions (
  id uuid primary key default gen_random_uuid(),
  public_session_key text not null unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  first_step_id uuid references public.funnel_steps(id) on delete set null,
  current_step_id uuid references public.funnel_steps(id) on delete set null,
  first_source text,
  first_medium text,
  first_campaign text,
  last_source text,
  last_medium text,
  last_campaign text,
  referrer text,
  device text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_funnel_sessions_funnel on public.funnel_sessions (funnel_id, last_seen_at desc);

create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  step_id uuid references public.funnel_steps(id) on delete set null,
  variant_id uuid references public.funnel_variants(id) on delete set null,
  session_id uuid references public.funnel_sessions(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  event_type text not null,
  source text,
  medium text,
  campaign text,
  content text,
  term text,
  referrer text,
  device text,
  revenue numeric(12,2),
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_funnel_events_funnel_created on public.funnel_events (funnel_id, created_at desc);
create index if not exists idx_funnel_events_step_type on public.funnel_events (step_id, event_type, created_at desc);
create index if not exists idx_funnel_events_session on public.funnel_events (session_id, created_at);

create table if not exists public.funnel_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  step_id uuid not null references public.funnel_steps(id) on delete cascade,
  session_id uuid references public.funnel_sessions(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  submission_type text not null default 'form',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_funnel_submissions_funnel on public.funnel_submissions (funnel_id, created_at desc);

create table if not exists public.funnel_workflows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  description text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnel_workflows_business on public.funnel_workflows (business_id, status, updated_at desc);

create table if not exists public.funnel_workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.funnel_workflows(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  node_kind text not null check (node_kind in ('trigger','action','condition','delay')),
  action_type text not null,
  name text not null,
  position_x numeric not null default 100,
  position_y numeric not null default 100,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnel_workflow_nodes_workflow on public.funnel_workflow_nodes (workflow_id);

create table if not exists public.funnel_workflow_connections (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.funnel_workflows(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_node_id uuid not null references public.funnel_workflow_nodes(id) on delete cascade,
  target_node_id uuid not null references public.funnel_workflow_nodes(id) on delete cascade,
  branch_key text not null default 'next',
  label text,
  created_at timestamptz not null default now(),
  unique (source_node_id, target_node_id, branch_key)
);
create index if not exists idx_funnel_workflow_edges_workflow on public.funnel_workflow_connections (workflow_id);

create table if not exists public.funnel_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.funnel_workflows(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  session_id uuid references public.funnel_sessions(id) on delete set null,
  current_node_id uuid references public.funnel_workflow_nodes(id) on delete set null,
  status text not null default 'running' check (status in ('running','waiting','completed','failed','cancelled')),
  trigger_event text,
  context jsonb not null default '{}'::jsonb,
  next_run_at timestamptz,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnel_workflow_runs_due on public.funnel_workflow_runs (status, next_run_at) where status='waiting';

create table if not exists public.funnel_workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.funnel_workflow_runs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  node_id uuid references public.funnel_workflow_nodes(id) on delete set null,
  event_type text not null,
  status text not null default 'completed',
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_funnel_workflow_events_run on public.funnel_workflow_events (workflow_run_id, created_at);

create table if not exists public.funnel_insights (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  insight_type text not null,
  severity text not null default 'info' check (severity in ('info','opportunity','warning','critical')),
  confidence text not null default 'medium' check (confidence in ('low','medium','high')),
  title text not null,
  observation text not null,
  recommendation text,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','accepted','dismissed','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_funnel_insights_funnel on public.funnel_insights (funnel_id, status, created_at desc);

-- RLS: custom-build customers can read their own funnel system when enabled.
-- Editing is intentionally stricter: Super Admin / delivery staff always manage;
-- business admins can manage only collaborative or self-managed funnels.
alter table public.funnels enable row level security;
alter table public.funnel_steps enable row level security;
alter table public.funnel_connections enable row level security;
alter table public.funnel_variants enable row level security;
alter table public.funnel_offers enable row level security;
alter table public.funnel_sessions enable row level security;
alter table public.funnel_events enable row level security;
alter table public.funnel_submissions enable row level security;
alter table public.funnel_workflows enable row level security;
alter table public.funnel_workflow_nodes enable row level security;
alter table public.funnel_workflow_connections enable row level security;
alter table public.funnel_workflow_runs enable row level security;
alter table public.funnel_workflow_events enable row level security;
alter table public.funnel_insights enable row level security;

drop policy if exists "Public can view published funnels" on public.funnels;
drop policy if exists "Tenant members can view funnels" on public.funnels;
drop policy if exists "Funnel managers can manage funnels" on public.funnels;
create policy "Public can view published funnels" on public.funnels for select to anon using (status='published');
create policy "Tenant members can view funnels" on public.funnels for select to authenticated using (
  (private.is_business_member(business_id) and private.business_has_custom_feature(business_id,'sales_funnels'))
  or private.is_super_admin() or has_platform_permission('delivery')
);
create policy "Funnel managers can manage funnels" on public.funnels for all to authenticated using (
  private.is_super_admin() or has_platform_permission('delivery')
  or (private.business_can_manage_funnels(business_id) and access_mode <> 'managed')
) with check (
  private.is_super_admin() or has_platform_permission('delivery')
  or (private.business_can_manage_funnels(business_id) and access_mode <> 'managed')
);

drop policy if exists "Public can view published funnel steps" on public.funnel_steps;
drop policy if exists "Tenant members can view funnel steps" on public.funnel_steps;
drop policy if exists "Funnel managers can manage funnel steps" on public.funnel_steps;
create policy "Public can view published funnel steps" on public.funnel_steps for select to anon using (
  exists(select 1 from public.funnels f where f.id=funnel_id and f.status='published')
);
create policy "Tenant members can view funnel steps" on public.funnel_steps for select to authenticated using (
  (private.is_business_member(business_id) and private.business_has_custom_feature(business_id,'sales_funnels'))
  or private.is_super_admin() or has_platform_permission('delivery')
);
create policy "Funnel managers can manage funnel steps" on public.funnel_steps for all to authenticated using (
  private.is_super_admin() or has_platform_permission('delivery')
  or exists(select 1 from public.funnels f where f.id=funnel_id and private.business_can_manage_funnels(f.business_id) and f.access_mode <> 'managed')
) with check (
  private.is_super_admin() or has_platform_permission('delivery')
  or exists(select 1 from public.funnels f where f.id=funnel_id and private.business_can_manage_funnels(f.business_id) and f.access_mode <> 'managed')
);

-- Tenant reads stay broad enough for reporting, but customer writes must respect
-- the funnel's access mode. Managed funnels are database-level read-only to customers.
drop policy if exists "Tenant funnel read" on public.funnel_connections;
drop policy if exists "Platform funnel manage" on public.funnel_connections;
drop policy if exists "Tenant funnel read" on public.funnel_variants;
drop policy if exists "Platform funnel manage" on public.funnel_variants;
drop policy if exists "Tenant funnel read" on public.funnel_offers;
drop policy if exists "Platform funnel manage" on public.funnel_offers;

create policy "Tenant funnel read" on public.funnel_connections for select to authenticated using (
  (private.is_business_member(business_id) and private.business_has_custom_feature(business_id,'sales_funnels'))
  or private.is_super_admin() or has_platform_permission('delivery')
);
create policy "Platform funnel manage" on public.funnel_connections for all to authenticated using (
  private.is_super_admin() or has_platform_permission('delivery')
  or exists(select 1 from public.funnels f where f.id=funnel_id and f.access_mode <> 'managed'
    and private.business_can_manage_funnels(f.business_id))
) with check (
  private.is_super_admin() or has_platform_permission('delivery')
  or exists(select 1 from public.funnels f where f.id=funnel_id and f.access_mode <> 'managed'
    and private.business_can_manage_funnels(f.business_id))
);

create policy "Tenant funnel read" on public.funnel_variants for select to authenticated using (
  (private.is_business_member(business_id) and private.business_has_custom_feature(business_id,'sales_funnels'))
  or private.is_super_admin() or has_platform_permission('delivery')
);
create policy "Platform funnel manage" on public.funnel_variants for all to authenticated using (
  private.is_super_admin() or has_platform_permission('delivery')
  or exists(select 1 from public.funnels f where f.id=funnel_id and f.access_mode <> 'managed'
    and private.business_can_manage_funnels(f.business_id))
) with check (
  private.is_super_admin() or has_platform_permission('delivery')
  or exists(select 1 from public.funnels f where f.id=funnel_id and f.access_mode <> 'managed'
    and private.business_can_manage_funnels(f.business_id))
);

create policy "Tenant funnel read" on public.funnel_offers for select to authenticated using (
  (private.is_business_member(business_id) and private.business_has_custom_feature(business_id,'sales_funnels'))
  or private.is_super_admin() or has_platform_permission('delivery')
);
create policy "Platform funnel manage" on public.funnel_offers for all to authenticated using (
  private.is_super_admin() or has_platform_permission('delivery')
  or exists(select 1 from public.funnels f where f.id=funnel_id and f.access_mode <> 'managed'
    and private.business_can_manage_funnels(f.business_id))
) with check (
  private.is_super_admin() or has_platform_permission('delivery')
  or exists(select 1 from public.funnels f where f.id=funnel_id and f.access_mode <> 'managed'
    and private.business_can_manage_funnels(f.business_id))
);

-- Visitor/session facts are server-owned. Customers can read them for reporting.
do $$
declare tbl text;
begin
  foreach tbl in array array['funnel_sessions','funnel_events','funnel_submissions','funnel_workflow_runs','funnel_workflow_events','funnel_insights']
  loop
    execute format('drop policy if exists "Tenant funnel read" on public.%I', tbl);
    execute format('drop policy if exists "Platform funnel manage" on public.%I', tbl);
    execute format('create policy "Tenant funnel read" on public.%I for select to authenticated using ((private.is_business_member(business_id) and private.business_has_custom_feature(business_id,''sales_funnels'')) or private.is_super_admin() or has_platform_permission(''delivery''))', tbl);
    execute format('create policy "Platform funnel manage" on public.%I for all to authenticated using (private.is_super_admin() or has_platform_permission(''delivery'')) with check (private.is_super_admin() or has_platform_permission(''delivery''))', tbl);
  end loop;
end $$;

drop policy if exists "Tenant funnel read" on public.funnel_workflows;
drop policy if exists "Platform funnel manage" on public.funnel_workflows;
create policy "Tenant funnel read" on public.funnel_workflows for select to authenticated using (
  (private.is_business_member(business_id) and private.business_has_custom_feature(business_id,'sales_funnels'))
  or private.is_super_admin() or has_platform_permission('delivery')
);
create policy "Platform funnel manage" on public.funnel_workflows for all to authenticated using (
  private.is_super_admin() or has_platform_permission('delivery')
  or (
    funnel_id is not null
    and private.business_can_manage_funnels(business_id)
    and exists(select 1 from public.funnels f where f.id=funnel_id and f.access_mode <> 'managed')
  )
) with check (
  private.is_super_admin() or has_platform_permission('delivery')
  or (
    funnel_id is not null
    and private.business_can_manage_funnels(business_id)
    and exists(select 1 from public.funnels f where f.id=funnel_id and f.access_mode <> 'managed')
  )
);

-- Workflow design nodes inherit editability from their parent workflow/funnel.
do $$
declare tbl text;
begin
  foreach tbl in array array['funnel_workflow_nodes','funnel_workflow_connections']
  loop
    execute format('drop policy if exists "Tenant funnel read" on public.%I', tbl);
    execute format('drop policy if exists "Platform funnel manage" on public.%I', tbl);
    execute format('create policy "Tenant funnel read" on public.%I for select to authenticated using ((private.is_business_member(business_id) and private.business_has_custom_feature(business_id,''sales_funnels'')) or private.is_super_admin() or has_platform_permission(''delivery''))', tbl);
    execute format('create policy "Platform funnel manage" on public.%I for all to authenticated using (private.is_super_admin() or has_platform_permission(''delivery'') or (private.business_can_manage_funnels(business_id) and exists(select 1 from public.funnel_workflows w join public.funnels f on f.id=w.funnel_id where w.id=workflow_id and f.access_mode <> ''managed''))) with check (private.is_super_admin() or has_platform_permission(''delivery'') or (private.business_can_manage_funnels(business_id) and exists(select 1 from public.funnel_workflows w join public.funnels f on f.id=w.funnel_id where w.id=workflow_id and f.access_mode <> ''managed'')))', tbl);
  end loop;
end $$;

drop policy if exists "Public can view active funnel offers" on public.funnel_offers;
create policy "Public can view active funnel offers" on public.funnel_offers for select to anon using (
  active and exists(select 1 from public.funnels f where f.id=funnel_id and f.status='published')
);

revoke all on function private.business_has_custom_feature(uuid, text) from public, anon;
grant execute on function private.business_has_custom_feature(uuid, text) to authenticated, service_role;
