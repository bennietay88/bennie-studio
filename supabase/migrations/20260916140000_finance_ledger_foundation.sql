-- Finance foundation: source-linked operational ledger. This never replaces Stripe,
-- billing, order, subscription, or affiliate source records.
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  source_type text not null check (source_type in ('STRIPE_PAYMENT','STRIPE_REFUND','SUBSCRIPTION','MANUAL_INCOME','EXPENSE','BANK_TRANSACTION','AFFILIATE_PAYOUT','PROCESSOR_FEE','TRANSFER','OWNER_CONTRIBUTION','OWNER_DRAWING','TAX_PAYMENT','OTHER')),
  source_id text,
  transaction_type text not null check (transaction_type in ('income','refund','expense','fee','transfer','owner_contribution','owner_drawing','tax_payment','other')),
  transaction_date timestamptz not null default now(),
  posted_date timestamptz,
  description text not null,
  counterparty text,
  country text,
  currency text not null check (char_length(currency) between 3 and 3),
  amount numeric(14,2) not null,
  base_currency text check (base_currency is null or char_length(base_currency) = 3),
  base_currency_amount numeric(14,2),
  exchange_rate numeric(18,8),
  exchange_rate_date timestamptz,
  exchange_rate_source text,
  category text,
  subcategory text,
  tax_category text,
  tax_amount numeric(14,2),
  tax_jurisdiction text,
  payment_method text,
  payment_processor text,
  processor_fee numeric(14,2),
  net_amount numeric(14,2),
  status text not null default 'posted' check (status in ('pending','posted','void','failed')),
  reconciliation_status text not null default 'UNRECONCILED' check (reconciliation_status in ('UNRECONCILED','MATCHED','RECONCILED','REVIEW_REQUIRED')),
  document_status text not null default 'MISSING' check (document_status in ('MISSING','ATTACHED','REVIEW_REQUIRED')),
  review_status text not null default 'NOT_REVIEWED' check (review_status in ('NOT_REVIEWED','REVIEW_REQUIRED','REVIEWED')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists finance_transactions_source_key on public.finance_transactions(source_type, source_id) where source_id is not null;
create index if not exists finance_transactions_period_idx on public.finance_transactions(transaction_date desc, transaction_type, currency);
create index if not exists finance_transactions_business_idx on public.finance_transactions(business_id, transaction_date desc);

create table if not exists public.finance_needs_attention (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  transaction_id uuid references public.finance_transactions(id) on delete cascade,
  severity text not null default 'ACTION' check (severity in ('URGENT','ACTION','REVIEW','ACCOUNTANT')),
  issue_code text not null,
  title text not null,
  details text,
  status text not null default 'OPEN' check (status in ('OPEN','RESOLVED','DISMISSED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
create index if not exists finance_attention_open_idx on public.finance_needs_attention(status, severity, created_at desc);

create table if not exists public.finance_settings (
  id text primary key default 'platform',
  base_currency text not null default 'USD' check (char_length(base_currency) = 3),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.finance_settings(id, base_currency) values ('platform','USD') on conflict (id) do nothing;

alter table public.finance_transactions enable row level security;
alter table public.finance_needs_attention enable row level security;
alter table public.finance_settings enable row level security;
drop policy if exists "Finance staff manage transactions" on public.finance_transactions;
create policy "Finance staff manage transactions" on public.finance_transactions for all to authenticated
  using (private.is_super_admin() or public.has_platform_permission('finance'))
  with check (private.is_super_admin() or public.has_platform_permission('finance'));
drop policy if exists "Finance staff manage attention" on public.finance_needs_attention;
create policy "Finance staff manage attention" on public.finance_needs_attention for all to authenticated
  using (private.is_super_admin() or public.has_platform_permission('finance'))
  with check (private.is_super_admin() or public.has_platform_permission('finance'));
drop policy if exists "Finance staff manage settings" on public.finance_settings;
create policy "Finance staff manage settings" on public.finance_settings for all to authenticated
  using (private.is_super_admin() or public.has_platform_permission('finance'))
  with check (private.is_super_admin() or public.has_platform_permission('finance'));
revoke all on public.finance_transactions, public.finance_needs_attention, public.finance_settings from anon;
grant select, insert, update, delete on public.finance_transactions, public.finance_needs_attention, public.finance_settings to authenticated;
