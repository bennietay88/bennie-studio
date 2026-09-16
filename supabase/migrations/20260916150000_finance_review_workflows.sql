create table if not exists public.finance_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  transaction_id uuid references public.finance_transactions(id) on delete cascade,
  document_type text not null check (document_type in ('receipt','vendor_invoice','customer_invoice','credit_note','payment_confirmation','bank_document','contract','other')),
  file_path text not null,
  file_name text not null,
  mime_type text,
  extraction jsonb not null default '{}'::jsonb,
  extraction_confidence numeric(5,4),
  review_status text not null default 'REVIEW_REQUIRED' check (review_status in ('REVIEW_REQUIRED','ACCEPTED','EDITED','REJECTED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists finance_documents_transaction_idx on public.finance_documents(transaction_id, created_at desc);

create table if not exists public.finance_reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.finance_transactions(id) on delete cascade,
  matched_source_type text not null,
  matched_source_id text not null,
  match_status text not null default 'PROPOSED' check (match_status in ('PROPOSED','MATCHED','REJECTED')),
  confidence numeric(5,4),
  notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique(transaction_id, matched_source_type, matched_source_id)
);

create table if not exists public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  source_invoice_id text unique,
  customer_name text not null,
  customer_email text,
  billing_country text,
  currency text not null check (char_length(currency) = 3),
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  issue_date date not null default current_date,
  due_date date,
  payment_status text not null default 'DRAFT' check (payment_status in ('DRAFT','SENT','VIEWED','PARTIALLY_PAID','PAID','OVERDUE','VOID','REFUNDED')),
  payment_reference text,
  line_items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_invoices_status_idx on public.finance_invoices(payment_status, due_date);

create table if not exists public.finance_vendor_bills (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  vendor_name text not null,
  invoice_number text,
  currency text not null check (char_length(currency) = 3),
  amount numeric(14,2) not null,
  category text,
  invoice_date date,
  due_date date,
  payment_status text not null default 'DUE' check (payment_status in ('DRAFT','DUE','OVERDUE','PAID','CANCELLED')),
  document_id uuid references public.finance_documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_vendor_bills_due_idx on public.finance_vendor_bills(payment_status, due_date);

create table if not exists public.finance_recurring_costs (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null,
  category text,
  currency text not null check (char_length(currency) = 3),
  expected_amount numeric(14,2) not null,
  frequency text not null check (frequency in ('monthly','quarterly','annual','other')),
  next_renewal_date date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_close_periods (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  readiness_percent integer not null default 0 check (readiness_percent between 0 and 100),
  blocking_items jsonb not null default '[]'::jsonb,
  status text not null default 'OPEN' check (status in ('OPEN','READY','CLOSED')),
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  unique(period_start, period_end)
);

alter table public.finance_documents enable row level security;
alter table public.finance_reconciliation_matches enable row level security;
alter table public.finance_invoices enable row level security;
alter table public.finance_vendor_bills enable row level security;
alter table public.finance_recurring_costs enable row level security;
alter table public.finance_close_periods enable row level security;
do $$ declare t text; begin foreach t in array array['finance_documents','finance_reconciliation_matches','finance_invoices','finance_vendor_bills','finance_recurring_costs','finance_close_periods'] loop execute format('drop policy if exists "Finance staff manage %1$s" on public.%1$s', t); execute format('create policy "Finance staff manage %1$s" on public.%1$s for all to authenticated using (private.is_super_admin() or public.has_platform_permission(''finance'')) with check (private.is_super_admin() or public.has_platform_permission(''finance''))', t); execute format('revoke all on public.%1$s from anon', t); execute format('grant select, insert, update, delete on public.%1$s to authenticated', t); end loop; end $$;
