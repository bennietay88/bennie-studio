-- Billing lifecycle hardening. Webhooks and cancellation workers are server-only.
alter table if exists public.user_subscriptions
  add column if not exists cancellation_scheduled_at timestamptz,
  add column if not exists cancellation_effective_at timestamptz,
  add column if not exists last_stripe_sync_at timestamptz;

alter table if exists public.user_subscriptions
  drop constraint if exists user_subscriptions_renewal_state_check;
alter table if exists public.user_subscriptions
  add constraint user_subscriptions_renewal_state_check
  check (renewal_state in ('active', 'cancellation_requested', 'cancellation_scheduled', 'cancelled', 'expired', 'past_due'));

create index if not exists idx_user_subscriptions_pending_cancellation
  on public.user_subscriptions (minimum_term_end_date, renewal_state, cancel_at_period_end)
  where renewal_state = 'cancellation_requested';

alter table if exists public.stripe_webhook_events
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists failed_at timestamptz;

comment on table public.stripe_webhook_events is
  'Server-only Stripe idempotency ledger. RLS intentionally has no client policies; service_role is required.';

-- Orders are created by the authenticated server checkout flow, never by an anonymous client.
do $$
begin
  if to_regclass('public.orders') is not null then
    revoke insert on table public.orders from anon;
  end if;
end $$;
