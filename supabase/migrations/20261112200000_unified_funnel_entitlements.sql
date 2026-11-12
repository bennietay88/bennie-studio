-- Unified entitlements for the existing Sales Funnel Engine.
-- IMPORTANT: Do not drop simple_funnel_addons or overwrite historical funnels.
-- Migration is intentionally not applied to production from this draft branch.
create table if not exists public.funnel_entitlements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  tier text not null check (tier in ('free','paid')),
  status text not null default 'active' check (status in ('active','pending_payment','payment_failed','cancelled')),
  source text not null default 'admin' check (source in ('admin','checkout','plan','downgrade','migration')),
  limit_overrides jsonb not null default '{}'::jsonb,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text unique,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnel_entitlements_status on public.funnel_entitlements(status,tier);
alter table public.funnel_entitlements enable row level security;
revoke all on public.funnel_entitlements from public, anon, authenticated;
grant select, insert, update, delete on public.funnel_entitlements to service_role;

insert into public.settings(id, content, updated_at) values
('funnel_tiers', '{
  "enabled": false,
  "paidMonthlyUsd": 19,
  "free": {"maxFunnels":1,"maxSteps":2,"workflows":false,"checkout":false,"variants":false,"ai":false},
  "paid": {"maxFunnels":3,"maxSteps":10,"workflows":true,"checkout":true,"variants":true,"ai":true}
}'::jsonb, now())
on conflict (id) do nothing;

-- Trigger protection is needed because existing builder clients write directly
-- through Supabase. Frontend limits alone would be trivially bypassed.
create or replace function private.guard_unified_funnel_limits()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  entitlement public.funnel_entitlements%rowtype;
  config jsonb;
  limits jsonb;
  default_limits jsonb;
  limit_count integer;
  used_count integer;
  allowed boolean;
  has_legacy boolean;
  valid_graph boolean;
begin
  -- Unpublishing is always permitted; do not trap expired funnels online.
  if tg_table_name = 'funnels' and tg_op = 'UPDATE' and new.status in ('draft','archived') and old.status <> 'archived' then
    return new;
  end if;
  -- Preserve access for existing independently entitled advanced customers.
  select * into entitlement from public.funnel_entitlements
    where business_id = new.business_id;
  if not found then
    select coalesce(b.custom_enabled_features, '[]'::jsonb) ? 'sales_funnels'
      into has_legacy from public.businesses b where b.id = new.business_id;
    if has_legacy then return new; end if;
    -- Old paid/included Simple Funnel orders remain deliverable after
    -- retiring the separate ordering UI. They are *not* advanced entitlements.
    if tg_table_name = 'funnels' and new.template_key = 'simple-two-page'
       and exists (select 1 from public.simple_funnel_addons a
         where a.business_id=new.business_id
           and a.status in ('queued','in_production','approval_required','revision_requested','approved')) then
      return new;
    end if;
    if tg_table_name = 'funnel_steps' and exists (
      select 1 from public.funnels f join public.simple_funnel_addons a
        on a.business_id=f.business_id
      where f.id=new.funnel_id and f.business_id=new.business_id
        and f.template_key='simple-two-page'
        and a.status in ('queued','in_production','approval_required','revision_requested','approved')
    ) then
      return new;
    end if;
    raise exception 'FUNNEL_ENTITLEMENT_REQUIRED' using errcode='23514';
  end if;

  if entitlement.status <> 'active' then
    raise exception 'FUNNEL_ENTITLEMENT_INACTIVE' using errcode='23514';
  end if;

  select content into config from public.settings where id='funnel_tiers';
  default_limits := case entitlement.tier when 'free' then
    '{"maxFunnels":1,"maxSteps":2,"workflows":false,"checkout":false,"variants":false}'::jsonb
    else '{"maxFunnels":3,"maxSteps":10,"workflows":true,"checkout":true,"variants":true}'::jsonb end;
  limits := default_limits || coalesce(config -> entitlement.tier, '{}'::jsonb) || entitlement.limit_overrides;

  if tg_table_name = 'funnels' then
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status = 'archived' and new.status <> 'archived') then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.business_id::text, 2211));
      select count(*) into used_count from public.funnels f
        where f.business_id=new.business_id and f.status <> 'archived';
      limit_count := greatest(0, least(100, coalesce((limits->>'maxFunnels')::integer, 1)));
      if used_count >= limit_count then
        raise exception 'FUNNEL_COUNT_LIMIT_REACHED' using errcode='23514';
      end if;
    end if;
    if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
      if not exists (select 1 from public.businesses b where b.id=new.business_id
          and b.status='active' and b.subscription_status in ('active','trialing')) then
        raise exception 'WEBSITE_SUBSCRIPTION_INACTIVE' using errcode='23514';
      end if;
      if (select count(*) from public.funnel_steps s where s.funnel_id=new.id and s.is_entry) <> 1 then
        raise exception 'FUNNEL_REQUIRES_ONE_ENTRY_STEP' using errcode='23514';
      end if;
      if exists (select 1 from public.funnel_steps s where s.funnel_id=new.id and (
        coalesce(pg_catalog.btrim(s.page_content->>'headline'),'') = '' or
        (s.step_type not in ('thank_you','confirmation') and not exists (
          select 1 from public.funnel_connections c where c.funnel_id=new.id and c.source_step_id=s.id
        ))
      )) then
        raise exception 'FUNNEL_HAS_INCOMPLETE_STEPS' using errcode='23514';
      end if;
      if exists (select 1 from public.funnel_steps s where s.funnel_id=new.id
        and s.step_type in ('checkout','order_bump','upsell','downsell')
        and not exists (select 1 from public.funnel_offers o where o.funnel_id=new.id
          and o.step_id=s.id and o.active = true and (o.amount > 0 or o.stripe_price_id is not null))) then
        raise exception 'FUNNEL_CHECKOUT_REQUIRES_OFFER' using errcode='23514';
      end if;
      with recursive paths(id, visited) as (
        select id, array[id] from public.funnel_steps where funnel_id=new.id and is_entry
        union all
        select c.target_step_id, paths.visited || c.target_step_id
        from paths join public.funnel_connections c on c.source_step_id=paths.id and c.funnel_id=new.id
        where not c.target_step_id = any(paths.visited)
      )
      select exists (select 1 from paths join public.funnel_steps s on s.id=paths.id
        where s.step_type in ('thank_you','confirmation') and s.funnel_id=new.id) into valid_graph;
      if not valid_graph then raise exception 'FUNNEL_TERMINAL_UNREACHABLE' using errcode='23514'; end if;
    end if;
  elsif tg_table_name = 'funnel_steps' then
    if entitlement.tier = 'free' and new.step_type not in ('lead_form','thank_you') then
      raise exception 'FUNNEL_STEP_NOT_INCLUDED_IN_FREE' using errcode='23514';
    end if;
    if tg_op = 'INSERT' then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.funnel_id::text, 2212));
      select count(*) into used_count from public.funnel_steps s where s.funnel_id=new.funnel_id;
      limit_count := greatest(0, least(100, coalesce((limits->>'maxSteps')::integer, 2)));
      if used_count >= limit_count then
        raise exception 'FUNNEL_STEP_LIMIT_REACHED' using errcode='23514';
      end if;
    end if;
  elsif tg_table_name in ('funnel_workflows','funnel_workflow_nodes','funnel_workflow_connections') then
    allowed := coalesce((limits->>'workflows')::boolean, false);
    if not allowed then raise exception 'FUNNEL_WORKFLOWS_NOT_INCLUDED' using errcode='23514'; end if;
  elsif tg_table_name = 'funnel_offers' then
    allowed := coalesce((limits->>'checkout')::boolean, false);
    if not allowed then raise exception 'FUNNEL_CHECKOUT_NOT_INCLUDED' using errcode='23514'; end if;
  elsif tg_table_name = 'funnel_variants' then
    allowed := coalesce((limits->>'variants')::boolean, false);
    if not allowed then raise exception 'FUNNEL_VARIANTS_NOT_INCLUDED' using errcode='23514'; end if;
  end if;
  return new;
end
$$;
revoke all on function private.guard_unified_funnel_limits() from public, anon, authenticated;
grant execute on function private.guard_unified_funnel_limits() to service_role;
drop trigger if exists trg_unified_funnel_count on public.funnels;
create trigger trg_unified_funnel_count before insert or update of status on public.funnels
  for each row execute function private.guard_unified_funnel_limits();
drop trigger if exists trg_unified_funnel_steps on public.funnel_steps;
create trigger trg_unified_funnel_steps before insert or update of step_type on public.funnel_steps
  for each row execute function private.guard_unified_funnel_limits();
drop trigger if exists trg_unified_funnel_workflows on public.funnel_workflows;
create trigger trg_unified_funnel_workflows before insert or update on public.funnel_workflows
  for each row execute function private.guard_unified_funnel_limits();
drop trigger if exists trg_unified_funnel_workflow_nodes on public.funnel_workflow_nodes;
create trigger trg_unified_funnel_workflow_nodes before insert or update on public.funnel_workflow_nodes
  for each row execute function private.guard_unified_funnel_limits();
drop trigger if exists trg_unified_funnel_workflow_edges on public.funnel_workflow_connections;
create trigger trg_unified_funnel_workflow_edges before insert or update on public.funnel_workflow_connections
  for each row execute function private.guard_unified_funnel_limits();
drop trigger if exists trg_unified_funnel_offers on public.funnel_offers;
create trigger trg_unified_funnel_offers before insert or update on public.funnel_offers
  for each row execute function private.guard_unified_funnel_limits();
drop trigger if exists trg_unified_funnel_variants on public.funnel_variants;
create trigger trg_unified_funnel_variants before insert or update on public.funnel_variants
  for each row execute function private.guard_unified_funnel_limits();

-- Atomic publish operation. Runs with caller privileges and existing RLS.
create or replace function public.publish_funnel_safely(p_funnel_id uuid, p_publish boolean)
returns void language plpgsql security invoker set search_path = ''
as $funnel_publish$
declare
  f public.funnels%rowtype;
  updated_rows integer;
begin
  select * into f from public.funnels where id=p_funnel_id;
  if not found then raise exception 'FUNNEL_NOT_FOUND' using errcode='42501'; end if;
  if not (private.is_super_admin() or public.has_platform_permission('delivery')
    or (private.business_can_manage_funnels(f.business_id) and f.access_mode <> 'managed')) then
    raise exception 'FUNNEL_EDIT_FORBIDDEN' using errcode='42501';
  end if;
  update public.funnels set status=case when p_publish then 'published' else 'draft' end,
    published_at=case when p_publish then now() else null end, updated_at=now() where id=p_funnel_id;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 1 then raise exception 'FUNNEL_PUBLISH_FAILED' using errcode='42501'; end if;
  update public.funnel_steps set status=case when p_publish then 'published' else 'draft' end
    where funnel_id=p_funnel_id;
end
$funnel_publish$;
revoke all on function public.publish_funnel_safely(uuid,boolean) from public,anon;
grant execute on function public.publish_funnel_safely(uuid,boolean) to authenticated,service_role;

-- Durable trigger queue. Application requests persist the event before returning;
-- workers claim conditionally and can recover jobs interrupted by runtime exits.
create table if not exists public.funnel_trigger_jobs (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  trigger_event text not null,
  lead_id uuid,
  session_id uuid,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','retry','completed','blocked','dead')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnel_trigger_jobs_ready
  on public.funnel_trigger_jobs(status,next_attempt_at,created_at);
alter table public.funnel_trigger_jobs enable row level security;
revoke all on public.funnel_trigger_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.funnel_trigger_jobs to service_role;

-- Persist one run per (durable trigger job, workflow, trigger node).
-- Unique conflict handling prevents a replayed queue job from repeating emails.
alter table public.funnel_workflow_runs
  add column if not exists source_trigger_job_id uuid references public.funnel_trigger_jobs(id) on delete set null,
  add column if not exists source_trigger_node_id uuid;
create unique index if not exists uq_funnel_workflow_runs_trigger_job
  on public.funnel_workflow_runs(source_trigger_job_id, workflow_id, source_trigger_node_id);

-- A published funnel must not accept traffic after entitlement/payment lapses;
-- public API routes also check business and entitlement server-side.
