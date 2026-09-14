-- Additive launch foundation for the OTC + MRC commercial model.
-- This migration intentionally does not replace current catalogue values or touch
-- existing customer subscriptions. The new fields are consumed only when the
-- otc_mrc_catalogue feature flag is enabled.

alter table if exists public.commercial_market_prices
  add column if not exists recurring_monthly_price numeric(12,2),
  add column if not exists recurring_setup_fee numeric(12,2),
  add column if not exists recurring_annual_price numeric(12,2),
  add column if not exists minimum_term_months integer not null default 12,
  add column if not exists recurring_stripe_monthly_price_id text,
  add column if not exists recurring_stripe_annual_price_id text,
  add column if not exists recurring_stripe_setup_price_id text,
  add column if not exists recurring_config_status text not null default 'draft';

alter table if exists public.commercial_market_prices
  drop constraint if exists commercial_market_prices_minimum_term_months_check;
alter table if exists public.commercial_market_prices
  add constraint commercial_market_prices_minimum_term_months_check
  check (minimum_term_months between 1 and 120);
alter table if exists public.commercial_market_prices
  drop constraint if exists commercial_market_prices_recurring_config_status_check;
alter table if exists public.commercial_market_prices
  add constraint commercial_market_prices_recurring_config_status_check
  check (recurring_config_status in ('draft', 'preview', 'live', 'disabled'));
alter table if exists public.commercial_market_prices
  drop constraint if exists commercial_market_prices_recurring_prices_nonnegative_check;
alter table if exists public.commercial_market_prices
  add constraint commercial_market_prices_recurring_prices_nonnegative_check
  check (
    (recurring_monthly_price is null or recurring_monthly_price >= 0)
    and (recurring_setup_fee is null or recurring_setup_fee >= 0)
    and (recurring_annual_price is null or recurring_annual_price >= 0)
  );

create index if not exists idx_commercial_market_prices_recurring_status
  on public.commercial_market_prices (recurring_config_status, market, active);

alter table if exists public.user_subscriptions
  add column if not exists commercial_product_slug text,
  add column if not exists commercial_market text,
  add column if not exists contract_start_date date,
  add column if not exists minimum_term_months integer,
  add column if not exists minimum_term_end_date date,
  add column if not exists renewal_state text not null default 'active',
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancellation_reason text,
  add column if not exists last_payment_status text,
  add column if not exists payment_failure_count integer not null default 0,
  add column if not exists last_webhook_event_id text;

alter table if exists public.user_subscriptions
  drop constraint if exists user_subscriptions_minimum_term_months_check;
alter table if exists public.user_subscriptions
  add constraint user_subscriptions_minimum_term_months_check
  check (minimum_term_months is null or minimum_term_months between 1 and 120);
alter table if exists public.user_subscriptions
  drop constraint if exists user_subscriptions_renewal_state_check;
alter table if exists public.user_subscriptions
  add constraint user_subscriptions_renewal_state_check
  check (renewal_state in ('active', 'cancellation_requested', 'cancelled', 'expired', 'past_due'));

create index if not exists idx_user_subscriptions_contract_end
  on public.user_subscriptions (minimum_term_end_date, renewal_state);
create index if not exists idx_user_subscriptions_product_market
  on public.user_subscriptions (commercial_product_slug, commercial_market);
create unique index if not exists idx_user_subscriptions_last_webhook_event
  on public.user_subscriptions (last_webhook_event_id)
  where last_webhook_event_id is not null;

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  event_type text not null check (event_type in ('allocation', 'top_up', 'debit', 'refund', 'expiry', 'adjustment')),
  credits integer not null,
  source text not null default 'internal',
  stripe_payment_intent_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_credit_ledger enable row level security;
drop policy if exists "Users can view own AI credit ledger" on public.ai_credit_ledger;
create policy "Users can view own AI credit ledger"
  on public.ai_credit_ledger for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'platform_staff')
    )
  );

create index if not exists idx_ai_credit_ledger_business_created
  on public.ai_credit_ledger (business_id, created_at desc);
create index if not exists idx_ai_credit_ledger_user_created
  on public.ai_credit_ledger (user_id, created_at desc);

-- Draft recurring values are configuration only. Existing one-time rows remain
-- the source of public pricing until the feature flag is explicitly enabled.
update public.commercial_market_prices p
set recurring_monthly_price = v.monthly_price,
    recurring_setup_fee = v.setup_fee,
    minimum_term_months = 12,
    recurring_config_status = 'draft'
from (values
  ('managed-website', 'MY', 199::numeric, 1099::numeric),
  ('website-growth', 'MY', 399::numeric, 2499::numeric),
  ('growth-partner', 'MY', 799::numeric, 4999::numeric),
  ('managed-website', 'SG', 99::numeric, 399::numeric),
  ('website-growth', 'SG', 199::numeric, 799::numeric),
  ('growth-partner', 'SG', 399::numeric, 1499::numeric),
  ('managed-website', 'GB', 79::numeric, 249::numeric),
  ('website-growth', 'GB', 149::numeric, 499::numeric),
  ('growth-partner', 'GB', 299::numeric, 999::numeric),
  ('managed-website', 'INTL', 89::numeric, 299::numeric),
  ('website-growth', 'INTL', 179::numeric, 599::numeric),
  ('growth-partner', 'INTL', 349::numeric, 1199::numeric)
) as v(slug, market, monthly_price, setup_fee)
join public.commercial_products cp on cp.slug = v.slug
where p.product_id = cp.id and p.market = v.market;

insert into public.settings (id, content, updated_at)
values ('launch_flags', jsonb_build_object(
  'otc_mrc_catalogue', false,
  'internal_ai_content_engine', false,
  'analytics_v2', false,
  'customer_ai_controls', false
), now())
on conflict (id) do nothing;

alter table if exists public.ai_generation_logs
  add column if not exists provenance jsonb not null default '{}'::jsonb,
  add column if not exists review_status text not null default 'draft';
alter table if exists public.ai_generation_logs
  drop constraint if exists ai_generation_logs_review_status_check;
alter table if exists public.ai_generation_logs
  add constraint ai_generation_logs_review_status_check
  check (review_status in ('draft', 'approved', 'rejected', 'published'));
create index if not exists idx_ai_generation_logs_review_status
  on public.ai_generation_logs (review_status, created_at desc);
