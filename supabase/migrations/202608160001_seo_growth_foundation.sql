-- SEO Growth foundation for the existing Bennie Studio application.
-- Additive only: existing website, Local SEO, analytics, billing, and audit data remain untouched.

create table if not exists public.async_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority integer not null default 100,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  last_error text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists async_jobs_idempotency_key_idx
  on public.async_jobs (idempotency_key) where idempotency_key is not null;
create index if not exists async_jobs_dequeue_idx
  on public.async_jobs (status, run_after, priority, created_at);
create index if not exists async_jobs_business_idx on public.async_jobs (business_id);
create index if not exists async_jobs_user_idx on public.async_jobs (user_id);
create index if not exists async_jobs_type_status_idx on public.async_jobs (job_type, status);

create table if not exists public.seo_product_config (
  id text primary key default 'default',
  product_name text not null default 'SEO Growth',
  is_enabled boolean not null default true,
  addon_prices jsonb not null default '{"US":{"amount":299,"currency":"USD"},"GB":{"amount":235,"currency":"GBP"},"SG":{"amount":399,"currency":"SGD"},"MY":{"amount":1299,"currency":"MYR"}}'::jsonb,
  included_plan_keys text[] not null default array['website_growth_partner']::text[],
  default_limits jsonb not null default '{"pagesPerAudit":100,"auditsPerMonth":4,"keywords":100,"competitors":5,"locations":1,"contentItems":4,"outreachEmailsPerDay":0,"outreachEmailsPerMonth":0,"aiCostUsd":25}'::jsonb,
  emergency_stop boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_module_definitions (
  module_key text primary key,
  label text not null,
  description text not null default '',
  category text not null default 'intelligence',
  is_enabled boolean not null default true,
  customer_visible boolean not null default true,
  default_approval_level text not null default 'manual_only'
    check (default_approval_level in ('automatic', 'ai_human', 'manual_only')),
  default_config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null,
  module_key text not null references public.seo_module_definitions(module_key) on delete cascade,
  access_mode text not null default 'unavailable'
    check (access_mode in ('included', 'addon', 'unavailable')),
  limits jsonb not null default '{}'::jsonb,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_key, module_key)
);

create table if not exists public.seo_business_entitlements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'disabled', 'trial', 'expired')),
  access_mode text not null default 'addon'
    check (access_mode in ('included', 'addon', 'trial', 'custom')),
  enabled_modules text[],
  limit_overrides jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

create table if not exists public.seo_projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  name text not null,
  domain text,
  adapter_type text not null default 'waas'
    check (adapter_type in ('waas', 'wordpress', 'api_cms', 'manual')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'disabled', 'archived')),
  approval_level text not null default 'manual_only'
    check (approval_level in ('automatic', 'ai_human', 'manual_only')),
  settings jsonb not null default '{}'::jsonb,
  last_audited_at timestamptz,
  next_audit_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id)
);

create table if not exists public.seo_project_overrides (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  module_key text not null references public.seo_module_definitions(module_key) on delete cascade,
  is_enabled boolean,
  limits jsonb not null default '{}'::jsonb,
  configuration jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, module_key)
);

create table if not exists public.seo_audit_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  job_id uuid references public.async_jobs(id) on delete set null,
  run_type text not null default 'technical',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  source_url text,
  pages_requested integer not null default 1 check (pages_requested >= 0),
  pages_crawled integer not null default 0 check (pages_crawled >= 0),
  health_score integer check (health_score between 0 and 100),
  health_explanation jsonb not null default '{}'::jsonb,
  summary text,
  metrics jsonb not null default '{}'::jsonb,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.seo_issues (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  audit_run_id uuid references public.seo_audit_runs(id) on delete set null,
  issue_key text not null,
  module_key text not null default 'technical',
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  title text not null,
  what_we_found text not null,
  why_it_matters text not null,
  recommended_action text not null,
  evidence jsonb not null default '{}'::jsonb,
  affected_urls text[] not null default '{}'::text[],
  status text not null default 'open'
    check (status in ('open', 'planned', 'in_progress', 'awaiting_approval', 'implemented', 'validated', 'dismissed')),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, issue_key)
);

create table if not exists public.seo_opportunities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  source_issue_id uuid references public.seo_issues(id) on delete set null,
  module_key text not null,
  title text not null,
  what_we_found text not null,
  why_it_matters text not null,
  recommended_action text not null,
  expected_impact text,
  effort text check (effort is null or effort in ('low', 'medium', 'high')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  evidence jsonb not null default '{}'::jsonb,
  automation_available boolean not null default false,
  status text not null default 'detected'
    check (status in ('detected', 'recommended', 'planned', 'in_progress', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  opportunity_id uuid references public.seo_opportunities(id) on delete set null,
  issue_id uuid references public.seo_issues(id) on delete set null,
  module_key text not null,
  task_type text not null,
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  title text not null,
  description text,
  recommended_action text,
  assigned_user_id uuid references auth.users(id) on delete set null,
  fulfillment_type text not null default 'human' check (fulfillment_type in ('ai', 'human', 'hybrid')),
  status text not null default 'backlog'
    check (status in ('backlog', 'planned', 'in_progress', 'awaiting_approval', 'blocked', 'completed', 'cancelled')),
  approval_state text not null default 'not_required'
    check (approval_state in ('not_required', 'pending', 'approved', 'changes_requested', 'rejected')),
  due_at timestamptz,
  estimated_effort_minutes integer check (estimated_effort_minutes is null or estimated_effort_minutes >= 0),
  actual_effort_minutes integer check (actual_effort_minutes is null or actual_effort_minutes >= 0),
  result jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  report_month date not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'published')),
  measured_results jsonb not null default '{}'::jsonb,
  search_performance jsonb not null default '{}'::jsonb,
  work_completed jsonb not null default '[]'::jsonb,
  observations jsonb not null default '[]'::jsonb,
  next_priorities jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, report_month)
);

create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  keyword text not null,
  cluster text,
  intent text check (intent is null or intent in ('informational', 'commercial', 'transactional', 'navigational', 'local')),
  location text,
  target_url text,
  source text not null default 'manual',
  status text not null default 'tracked' check (status in ('idea', 'tracked', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, keyword, location)
);

create table if not exists public.seo_rankings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  keyword_id uuid not null references public.seo_keywords(id) on delete cascade,
  provider text not null,
  observed_at timestamptz not null,
  position numeric,
  result_url text,
  location text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.seo_competitors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  name text not null,
  domain text not null,
  source text not null default 'manual',
  observed_data jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, domain)
);

create table if not exists public.seo_content_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  opportunity_id uuid references public.seo_opportunities(id) on delete set null,
  content_type text not null,
  title text not null,
  target_keyword text,
  search_intent text,
  brief jsonb not null default '{}'::jsonb,
  draft text,
  quality_checks jsonb not null default '{}'::jsonb,
  status text not null default 'brief'
    check (status in ('brief', 'draft', 'seo_review', 'human_review', 'awaiting_approval', 'approved', 'published', 'archived')),
  published_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_backlinks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  source_url text not null,
  target_url text,
  anchor_text text,
  link_status text not null default 'observed' check (link_status in ('observed', 'new', 'lost', 'suspicious')),
  provider text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, source_url, target_url)
);

create table if not exists public.seo_outreach (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  prospect_name text,
  prospect_domain text,
  contact_email text,
  campaign text,
  provider text,
  status text not null default 'prospect'
    check (status in ('prospect', 'qualified', 'drafted', 'approved', 'sent', 'replied', 'won', 'lost', 'suppressed')),
  personalization jsonb not null default '{}'::jsonb,
  outcome jsonb not null default '{}'::jsonb,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  name text not null,
  country text,
  region text,
  city text,
  business_info jsonb not null default '{}'::jsonb,
  observed_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_ai_visibility (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  provider text not null,
  query text not null,
  observed_at timestamptz not null,
  observation_type text not null check (observation_type in ('observed', 'estimated', 'inferred')),
  brand_mentioned boolean,
  cited_urls text[] not null default '{}'::text[],
  competitor_mentions text[] not null default '{}'::text[],
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.seo_integrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  provider text not null,
  status text not null default 'not_connected'
    check (status in ('not_connected', 'connected', 'error', 'disabled')),
  credential_reference text,
  configuration jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider)
);

create table if not exists public.seo_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  job_type text not null,
  is_enabled boolean not null default true,
  schedule_expression text not null,
  timezone text not null default 'UTC',
  configuration jsonb not null default '{}'::jsonb,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, job_type)
);

create table if not exists public.seo_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid references public.seo_projects(id) on delete cascade,
  usage_date date not null default current_date,
  metric_key text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  cost_usd numeric not null default 0 check (cost_usd >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (business_id, project_id, usage_date, metric_key)
);

create table if not exists public.seo_activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  project_id uuid references public.seo_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  object_type text,
  object_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.seo_product_config (id) values ('default') on conflict (id) do nothing;

insert into public.seo_module_definitions
  (module_key, label, description, category, customer_visible, default_approval_level, default_config, sort_order)
values
  ('overview', 'Overview', 'Measured search performance, current work, and next actions.', 'intelligence', true, 'manual_only', '{}', 10),
  ('audit', 'Audit', 'Evidence-based website search audit.', 'intelligence', false, 'manual_only', '{}', 20),
  ('crawler', 'Crawler', 'Controlled website discovery and page inspection.', 'intelligence', false, 'manual_only', '{"defaultPageLimit":100}', 30),
  ('technical', 'Technical', 'Observable technical search issues and validated fixes.', 'intelligence', true, 'ai_human', '{"healthWeights":{"httpStatus":20,"https":10,"title":15,"description":10,"h1":10,"canonical":10,"robots":10,"sitemap":10,"structuredData":5}}', 40),
  ('keywords', 'Keywords', 'Tracked keyword themes and observed rankings.', 'intelligence', true, 'manual_only', '{}', 50),
  ('rankings', 'Rankings', 'Observed ranking history from connected providers.', 'intelligence', false, 'manual_only', '{}', 60),
  ('competitors', 'Competitors', 'Actionable gaps supported by observed competitor data.', 'intelligence', true, 'manual_only', '{}', 70),
  ('opportunities', 'Opportunities', 'Evidence-backed improvements prioritized without arbitrary ratings.', 'strategy', true, 'manual_only', '{}', 80),
  ('content', 'Content', 'Brief, review, approval, publishing, and monitoring workflow.', 'fulfillment', true, 'manual_only', '{}', 90),
  ('internal_links', 'Internal Links', 'Orphan pages and contextual linking opportunities.', 'fulfillment', false, 'ai_human', '{}', 100),
  ('local_seo', 'Local SEO', 'Locations, local pages, business information, and local visibility.', 'growth', true, 'manual_only', '{}', 110),
  ('backlinks', 'Authority', 'Observed backlinks and legitimate authority opportunities.', 'growth', true, 'manual_only', '{}', 120),
  ('outreach', 'Outreach', 'Optional provider-agnostic outreach workflow.', 'growth', false, 'manual_only', '{"dailySendLimit":0,"monthlySendLimit":0}', 130),
  ('ai_visibility', 'AI Visibility', 'Observed, estimated, and inferred AI visibility kept clearly separate.', 'growth', true, 'manual_only', '{}', 140),
  ('strategy', 'Strategy', 'Editable rolling 90-day SEO roadmap.', 'strategy', false, 'manual_only', '{}', 150),
  ('tasks', 'Tasks', 'Operational fulfillment and approval queue.', 'fulfillment', true, 'manual_only', '{}', 160),
  ('implementation', 'Implementation', 'Adapter-based fix preparation and validation.', 'fulfillment', false, 'manual_only', '{}', 170),
  ('reports', 'Reports', 'Readable monthly results, work completed, and next priorities.', 'strategy', true, 'manual_only', '{}', 180),
  ('integrations', 'Integrations', 'Search, analytics, CMS, and delivery provider connections.', 'platform', false, 'manual_only', '{}', 190),
  ('settings', 'Settings', 'Project controls, schedules, limits, and approval rules.', 'platform', false, 'manual_only', '{}', 200)
on conflict (module_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  customer_visible = excluded.customer_visible,
  default_config = excluded.default_config,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.seo_plan_entitlements (plan_key, module_key, access_mode)
select plan_key, module_key,
  case when plan_key = 'website_growth_partner' then 'included' else 'addon' end
from unnest(array['starter','business','growth','website_growth_partner']) as plan_key
cross join (select module_key from public.seo_module_definitions) modules
on conflict (plan_key, module_key) do nothing;

create index if not exists seo_plan_entitlements_plan_idx on public.seo_plan_entitlements (plan_key);
create index if not exists seo_business_entitlements_business_idx on public.seo_business_entitlements (business_id);
create index if not exists seo_projects_business_idx on public.seo_projects (business_id, status);
create index if not exists seo_projects_website_idx on public.seo_projects (website_id);
create index if not exists seo_project_overrides_business_idx on public.seo_project_overrides (business_id, project_id);
create index if not exists seo_audit_runs_project_idx on public.seo_audit_runs (project_id, created_at desc);
create index if not exists seo_audit_runs_business_status_idx on public.seo_audit_runs (business_id, status);
create index if not exists seo_issues_project_status_idx on public.seo_issues (project_id, status, severity);
create index if not exists seo_issues_business_idx on public.seo_issues (business_id);
create index if not exists seo_opportunities_project_status_idx on public.seo_opportunities (project_id, status, priority);
create index if not exists seo_opportunities_business_idx on public.seo_opportunities (business_id);
create index if not exists seo_tasks_project_status_idx on public.seo_tasks (project_id, status, due_at);
create index if not exists seo_tasks_assignee_idx on public.seo_tasks (assigned_user_id, status);
create index if not exists seo_tasks_business_idx on public.seo_tasks (business_id);
create index if not exists seo_reports_business_idx on public.seo_reports (business_id, report_month desc);
create index if not exists seo_keywords_project_idx on public.seo_keywords (project_id, status);
create index if not exists seo_rankings_keyword_idx on public.seo_rankings (keyword_id, observed_at desc);
create index if not exists seo_rankings_project_idx on public.seo_rankings (project_id, observed_at desc);
create index if not exists seo_competitors_project_idx on public.seo_competitors (project_id);
create index if not exists seo_content_project_idx on public.seo_content_items (project_id, status);
create index if not exists seo_backlinks_project_idx on public.seo_backlinks (project_id, link_status);
create index if not exists seo_outreach_project_idx on public.seo_outreach (project_id, status);
create index if not exists seo_locations_project_idx on public.seo_locations (project_id);
create index if not exists seo_ai_visibility_project_idx on public.seo_ai_visibility (project_id, observed_at desc);
create index if not exists seo_integrations_project_idx on public.seo_integrations (project_id, status);
create index if not exists seo_schedules_project_idx on public.seo_schedules (project_id, next_run_at);
create index if not exists seo_usage_business_date_idx on public.seo_usage (business_id, usage_date desc);
create index if not exists seo_activity_business_idx on public.seo_activity_logs (business_id, created_at desc);
create index if not exists seo_activity_project_idx on public.seo_activity_logs (project_id, created_at desc);

alter table public.async_jobs enable row level security;
alter table public.seo_product_config enable row level security;
alter table public.seo_module_definitions enable row level security;
alter table public.seo_plan_entitlements enable row level security;
alter table public.seo_business_entitlements enable row level security;
alter table public.seo_projects enable row level security;
alter table public.seo_project_overrides enable row level security;
alter table public.seo_audit_runs enable row level security;
alter table public.seo_issues enable row level security;
alter table public.seo_opportunities enable row level security;
alter table public.seo_tasks enable row level security;
alter table public.seo_reports enable row level security;
alter table public.seo_keywords enable row level security;
alter table public.seo_rankings enable row level security;
alter table public.seo_competitors enable row level security;
alter table public.seo_content_items enable row level security;
alter table public.seo_backlinks enable row level security;
alter table public.seo_outreach enable row level security;
alter table public.seo_locations enable row level security;
alter table public.seo_ai_visibility enable row level security;
alter table public.seo_integrations enable row level security;
alter table public.seo_schedules enable row level security;
alter table public.seo_usage enable row level security;
alter table public.seo_activity_logs enable row level security;

revoke all on table public.async_jobs from anon, authenticated;
grant select, insert, update, delete on table public.async_jobs to service_role;

grant select, insert, update, delete on table
  public.seo_product_config,
  public.seo_module_definitions,
  public.seo_plan_entitlements,
  public.seo_business_entitlements,
  public.seo_projects,
  public.seo_project_overrides,
  public.seo_audit_runs,
  public.seo_issues,
  public.seo_opportunities,
  public.seo_tasks,
  public.seo_reports,
  public.seo_keywords,
  public.seo_rankings,
  public.seo_competitors,
  public.seo_content_items,
  public.seo_backlinks,
  public.seo_outreach,
  public.seo_locations,
  public.seo_ai_visibility,
  public.seo_integrations,
  public.seo_schedules,
  public.seo_usage,
  public.seo_activity_logs
to service_role;

grant select on table
  public.seo_business_entitlements,
  public.seo_projects,
  public.seo_project_overrides,
  public.seo_audit_runs,
  public.seo_issues,
  public.seo_opportunities,
  public.seo_tasks,
  public.seo_reports,
  public.seo_keywords,
  public.seo_rankings,
  public.seo_competitors,
  public.seo_content_items,
  public.seo_backlinks,
  public.seo_outreach,
  public.seo_locations,
  public.seo_ai_visibility,
  public.seo_integrations,
  public.seo_schedules,
  public.seo_usage,
  public.seo_activity_logs
to authenticated;

drop policy if exists "Service role manages async jobs" on public.async_jobs;
create policy "Service role manages async jobs" on public.async_jobs
  for all to service_role using (true) with check (true);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'seo_business_entitlements','seo_projects','seo_project_overrides','seo_audit_runs',
    'seo_issues','seo_opportunities','seo_tasks','seo_reports','seo_keywords','seo_rankings',
    'seo_competitors','seo_content_items','seo_backlinks','seo_outreach','seo_locations',
    'seo_ai_visibility','seo_integrations','seo_schedules','seo_usage','seo_activity_logs'
  ]
  loop
    execute format('drop policy if exists "Customers read own SEO data" on public.%I', table_name);
    execute format(
      'create policy "Customers read own SEO data" on public.%I for select to authenticated using ((select is_super_admin()) or business_id in (select business_id from public.profiles where id = (select auth.uid())))',
      table_name
    );
  end loop;
end $$;

create or replace function public.touch_seo_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_async_jobs_updated_at on public.async_jobs;
create trigger trg_touch_async_jobs_updated_at
before update on public.async_jobs
for each row execute function public.touch_seo_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'seo_product_config','seo_module_definitions','seo_plan_entitlements','seo_business_entitlements',
    'seo_projects','seo_project_overrides','seo_issues','seo_opportunities','seo_tasks','seo_reports',
    'seo_keywords','seo_competitors','seo_content_items','seo_outreach','seo_locations',
    'seo_integrations','seo_schedules'
  ]
  loop
    execute format('drop trigger if exists trg_touch_seo_updated_at on public.%I', table_name);
    execute format('create trigger trg_touch_seo_updated_at before update on public.%I for each row execute function public.touch_seo_updated_at()', table_name);
  end loop;
end $$;

revoke execute on function public.touch_seo_updated_at() from public, anon, authenticated;
grant execute on function public.touch_seo_updated_at() to service_role;

notify pgrst, 'reload schema';
