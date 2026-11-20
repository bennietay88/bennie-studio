-- Outreach completion, additive only. Do not backfill or send messages.
-- Apply in isolated staging, test RLS/queries, then approve a production migration.
create table if not exists public.outreach_experiments (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 3 and 140),
 hypothesis text not null check (char_length(hypothesis) between 8 and 2000),
 segment text not null default 'all',
 status text not null default 'draft' check (status in ('draft','paused','active','completed','archived')),
 primary_metric text not null default 'human_reply' check (primary_metric in ('human_reply','positive_reply','meeting','verified_payment')),
 variant_a jsonb not null default '{}'::jsonb,
 variant_b jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id),
 started_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint outreach_experiments_distinct_copy check (variant_a is distinct from variant_b)
);
create table if not exists public.outreach_experiment_assignments (
 id uuid primary key default gen_random_uuid(),
 experiment_id uuid not null references public.outreach_experiments(id) on delete restrict,
 prospect_id uuid not null references public.prospects(id) on delete restrict,
 variant text not null check (variant in ('A','B')),
 assigned_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 unique (experiment_id,prospect_id)
);
create index if not exists outreach_experiment_assignment_prospect_idx
 on public.outreach_experiment_assignments(prospect_id,created_at desc);
alter table public.sales_messages
 add column if not exists outreach_experiment_id uuid references public.outreach_experiments(id),
 add column if not exists outreach_experiment_variant text check (outreach_experiment_variant in ('A','B'));
create index if not exists sales_messages_experiment_idx
 on public.sales_messages(outreach_experiment_id,outreach_experiment_variant,created_at desc)
 where outreach_experiment_id is not null;
create table if not exists public.outreach_attribution_events (
 id uuid primary key default gen_random_uuid(),
 prospect_id uuid references public.prospects(id) on delete restrict,
 lead_id uuid references public.leads(id) on delete restrict,
 business_id uuid references public.businesses(id) on delete restrict,
 proposal_id uuid references public.proposals(id) on delete restrict,
 message_id uuid references public.sales_messages(id) on delete restrict,
 event_type text not null check (event_type in ('qualified_conversation','meeting_confirmed','proposal_sent','proposal_accepted','customer_won','customer_lost','payment_verified')),
 occurred_at timestamptz not null,
 amount numeric(18,2) check (amount is null or amount >= 0),
 currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
 evidence_url text,
 notes text,
 provider_verified boolean not null default false,
 verification_source text not null default 'manual' check (verification_source in ('manual','stripe')),
 source_event_key text unique,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 constraint outreach_attribution_has_contact check (prospect_id is not null or lead_id is not null),
 constraint outreach_attribution_verified_payment check (
   event_type <> 'payment_verified' or
   (provider_verified = true and verification_source = 'stripe' and source_event_key is not null)
 ),
 constraint outreach_attribution_manual_not_verified check (
   verification_source <> 'manual' or provider_verified = false
 )
);
create index if not exists outreach_attribution_prospect_created_idx
 on public.outreach_attribution_events(prospect_id,occurred_at desc);
create index if not exists outreach_attribution_lead_created_idx
 on public.outreach_attribution_events(lead_id,occurred_at desc);
create table if not exists public.outreach_evidence_audit (
 id uuid primary key default gen_random_uuid(),
 prospect_id uuid not null references public.prospects(id) on delete restrict,
 event_type text not null check (event_type in ('website_verified','qualification_scored','contact_permission_reviewed','task_reviewed')),
 actor_id uuid not null references auth.users(id),
 previous_record jsonb not null default '{}'::jsonb,
 new_record jsonb not null default '{}'::jsonb,
 source_url text,
 created_at timestamptz not null default now()
);
create index if not exists outreach_evidence_audit_prospect_idx on public.outreach_evidence_audit(prospect_id,created_at desc);
-- Server-only tables: service-role access, no browser access, and RLS defense in depth.
alter table public.outreach_experiments enable row level security;
alter table public.outreach_experiment_assignments enable row level security;
alter table public.outreach_attribution_events enable row level security;
alter table public.outreach_evidence_audit enable row level security;
revoke all on public.outreach_experiments, public.outreach_experiment_assignments, public.outreach_attribution_events, public.outreach_evidence_audit from anon,authenticated;
grant select,insert,update on public.outreach_experiments to service_role;
grant select,insert on public.outreach_experiment_assignments to service_role;
grant select,insert on public.outreach_attribution_events to service_role;
grant select,insert on public.outreach_evidence_audit to service_role;
create or replace function private.reject_outreach_audit_mutation() returns trigger
language plpgsql set search_path = '' as $audit$
begin
 raise exception 'outreach audit and attribution events are append-only';
end;
$audit$;
drop trigger if exists outreach_evidence_audit_append_only on public.outreach_evidence_audit;
create trigger outreach_evidence_audit_append_only
 before update or delete on public.outreach_evidence_audit
 for each row execute function private.reject_outreach_audit_mutation();
drop trigger if exists outreach_attribution_append_only on public.outreach_attribution_events;
create trigger outreach_attribution_append_only
 before update or delete on public.outreach_attribution_events
 for each row execute function private.reject_outreach_audit_mutation();
notify pgrst, 'reload schema';
