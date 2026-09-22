-- Finance V2: safe base-currency aggregation, Stripe settlement traceability,
-- exception deduplication, and operational tax/customer evidence.
-- This remains an operational bookkeeping layer; Stripe and the accountant remain
-- the sources of truth for processor settlement and statutory tax decisions.

alter table public.finance_transactions
  add column if not exists settlement_currency text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_balance_transaction_id text,
  add column if not exists stripe_payout_id text,
  add column if not exists stripe_fee_amount numeric(14,2),
  add column if not exists stripe_fee_currency text,
  add column if not exists stripe_exchange_rate numeric(18,8),
  add column if not exists source_event_id text;

alter table public.finance_transactions
  drop constraint if exists finance_transactions_currency_check;
alter table public.finance_transactions
  add constraint finance_transactions_currency_check check (currency = upper(currency) and char_length(currency) = 3);
alter table public.finance_transactions
  add constraint finance_transactions_settlement_currency_check check (settlement_currency is null or (settlement_currency = upper(settlement_currency) and char_length(settlement_currency) = 3));

-- Refunds must be keyed by the Stripe refund object, not the charge. Existing
-- source IDs remain traceable; new refund rows use re_<id> as source_id.
drop index if exists public.finance_transactions_source_key;
create unique index if not exists finance_transactions_source_key
  on public.finance_transactions(source_type, source_id)
  where source_id is not null;
create unique index if not exists finance_transactions_stripe_refund_key
  on public.finance_transactions(source_type, source_id)
  where source_type = 'STRIPE_REFUND' and source_id is not null;
create index if not exists finance_transactions_stripe_trace_idx
  on public.finance_transactions(stripe_payment_intent_id, stripe_balance_transaction_id, stripe_payout_id);

-- Open exceptions are deduplicated per affected transaction and rule.
create unique index if not exists finance_attention_open_rule_key
  on public.finance_needs_attention(transaction_id, issue_code)
  where status = 'OPEN' and transaction_id is not null;

-- Customer/business tax evidence is kept separately from inferred country logic.
create table if not exists public.finance_customer_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  stripe_customer_id text,
  legal_name text,
  company_registration_number text,
  billing_country text,
  billing_address jsonb not null default '{}'::jsonb,
  tax_id text,
  tax_id_type text,
  tax_id_validation_status text not null default 'UNKNOWN' check (tax_id_validation_status in ('UNKNOWN','PENDING','VALID','INVALID','UNVERIFIED','REVIEW_REQUIRED')),
  customer_type text not null default 'BUSINESS' check (customer_type in ('BUSINESS','CONSUMER','UNKNOWN')),
  tax_treatment text not null default 'REVIEW_REQUIRED' check (tax_treatment in ('NORMAL','REVERSE_CHARGE','EXEMPT','ZERO_RATE','OUTSIDE_SCOPE','REVIEW_REQUIRED')),
  evidence_source text,
  evidence jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);
create index if not exists finance_customer_tax_profiles_stripe_idx on public.finance_customer_tax_profiles(stripe_customer_id);

alter table public.finance_customer_tax_profiles enable row level security;
create policy "Finance staff manage customer tax profiles" on public.finance_customer_tax_profiles for all to authenticated
  using (private.is_super_admin() or public.has_platform_permission('finance'))
  with check (private.is_super_admin() or public.has_platform_permission('finance'));
revoke all on public.finance_customer_tax_profiles from anon;
grant select, insert, update on public.finance_customer_tax_profiles to authenticated;

-- Server-side aggregation deliberately excludes foreign-currency rows without a
-- trusted converted value. It never falls back to the original amount.
create or replace function public.finance_period_summary(p_from timestamptz, p_to timestamptz)
returns table (
  base_currency text,
  gross_revenue numeric,
  refunds numeric,
  net_revenue numeric,
  processor_fees numeric,
  operating_expenses numeric,
  tax_collected numeric,
  net_cash_movement numeric,
  operating_profit_estimate numeric,
  unresolved_fx_value numeric,
  unresolved_fx_count bigint,
  unreconciled_count bigint,
  review_needed_count bigint,
  transaction_count bigint
)
language sql
stable
security invoker
as $$
  with cfg as (select upper(base_currency) as base_currency from public.finance_settings where id = 'platform'),
  scoped as (
    select t.*, cfg.base_currency as configured_base_currency,
      case when t.currency = cfg.base_currency and t.base_currency_amount is null then null else t.base_currency_amount end as safe_amount
    from public.finance_transactions t cross join cfg
    where t.transaction_date >= p_from and t.transaction_date <= p_to and t.status <> 'void'
  ),
  totals as (
    select
      coalesce(max(configured_base_currency), 'MYR') as base_currency,
      coalesce(sum(safe_amount) filter (where transaction_type = 'income'), 0) as gross_revenue,
      coalesce(sum(safe_amount) filter (where transaction_type = 'refund'), 0) as refunds,
      coalesce(sum(safe_amount) filter (where transaction_type = 'fee'), 0) as processor_fees,
      coalesce(sum(safe_amount) filter (where transaction_type = 'expense'), 0) as operating_expenses,
      coalesce(sum(tax_amount) filter (where tax_amount is not null), 0) as tax_collected,
      coalesce(sum(safe_amount) filter (where transaction_type in ('income','refund','expense','fee')), 0) as safe_operating_sum,
      coalesce(sum(abs(amount)) filter (where safe_amount is null and currency <> configured_base_currency), 0) as unresolved_fx_value,
      count(*) filter (where safe_amount is null and currency <> configured_base_currency) as unresolved_fx_count,
      count(*) filter (where reconciliation_status <> 'RECONCILED') as unreconciled_count,
      count(*) filter (where review_status <> 'REVIEWED') as review_needed_count,
      count(*) as transaction_count
    from scoped
  )
  select base_currency, gross_revenue, refunds, gross_revenue - refunds as net_revenue,
    processor_fees, operating_expenses, tax_collected, net_cash_movement,
    gross_revenue - refunds - processor_fees - operating_expenses as operating_profit_estimate,
    unresolved_fx_value, unresolved_fx_count, unreconciled_count, review_needed_count, transaction_count
  from totals;
$$;
revoke all on function public.finance_period_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.finance_period_summary(timestamptz, timestamptz) to service_role;

-- Missing FX and neutral bank rows become visible exceptions without duplicates.
create or replace function public.finance_exception_trigger()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.currency <> coalesce(new.base_currency, new.currency) and new.base_currency_amount is null then
    insert into public.finance_needs_attention(transaction_id, business_id, severity, issue_code, title, details)
    values (new.id, new.business_id, 'ACTION', 'MISSING_FX_RATE', 'Trusted FX rate required', 'Foreign-currency transaction is excluded from consolidated totals until a trusted conversion is supplied.')
    on conflict (transaction_id, issue_code) where status = 'OPEN' do nothing;
  end if;
  if new.source_type = 'BANK_TRANSACTION' and (new.category is null or new.transaction_type = 'other') then
    insert into public.finance_needs_attention(transaction_id, business_id, severity, issue_code, title, details)
    values (new.id, new.business_id, 'REVIEW', 'BANK_UNCLASSIFIED', 'Bank transaction requires classification', 'Bank imports are neutral until matched to Stripe payout, expense, transfer, tax payment, owner movement, or genuine income.')
    on conflict (transaction_id, issue_code) where status = 'OPEN' do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists finance_transaction_exception_trigger on public.finance_transactions;
create trigger finance_transaction_exception_trigger
after insert or update of currency, base_currency, base_currency_amount, source_type, transaction_type, category
on public.finance_transactions for each row execute function public.finance_exception_trigger();

-- The live operational company reports in MYR; this only changes the empty
-- platform setting created by the Finance foundation migration.
update public.finance_settings set base_currency = 'MYR', updated_at = now()
where id = 'platform' and base_currency = 'USD'
  and not exists (select 1 from public.finance_transactions);

alter function public.finance_period_summary(timestamptz, timestamptz) set search_path = public, pg_catalog;
alter function public.finance_exception_trigger() set search_path = public, pg_catalog;
