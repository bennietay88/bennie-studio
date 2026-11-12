-- Simple two-page, managed lead funnel add-on. No checkout or entitlement is
-- inferred from the browser: only server routes and verified Stripe webhooks
-- may write these records.
create table if not exists public.simple_funnel_addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  mode text not null check (mode in ('paid','included')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','queued','in_production','approval_required',
      'revision_requested','approved','active','paused','payment_failed','cancelled')),
  offer_name text not null check (length(trim(offer_name)) between 3 and 160),
  audience text not null check (length(trim(audience)) between 3 and 400),
  offer_description text not null check (length(trim(offer_description)) between 10 and 2000),
  contact_email text not null,
  customer_notes text not null default '',
  setup_fee_usd numeric(10,2) not null default 0 check (setup_fee_usd >= 0),
  monthly_fee_usd numeric(10,2) not null default 0 check (monthly_fee_usd >= 0),
  stripe_checkout_session_id text unique,
  stripe_subscription_id text unique,
  cancel_at_period_end boolean not null default false,
  checkout_attempt integer not null default 0 check (checkout_attempt >= 0),
  funnel_id uuid unique references public.funnels(id) on delete set null,
  feature_preexisting boolean,
  feature_granted_at timestamptz,
  approval_notes text,
  revision_count integer not null default 0 check (revision_count between 0 and 1),
  approved_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_simple_funnel_addons_status on public.simple_funnel_addons (status, created_at);
create index if not exists idx_simple_funnel_addons_subscription on public.simple_funnel_addons (stripe_subscription_id) where stripe_subscription_id is not null;
alter table public.simple_funnel_addons enable row level security;
-- No public/authenticated policies: access only through privileged, validated API.
revoke all on public.simple_funnel_addons from public, anon, authenticated;
grant select, insert, update, delete on public.simple_funnel_addons to service_role;

insert into public.settings(id,content,updated_at)
values ('simple_funnel_addon',
  '{"enabled":false,"standardSetupUsd":149,"growthSetupUsd":79,"monthlyUsd":19,"includeGrowthPartner":true}'::jsonb,
  now())
on conflict (id) do nothing;
