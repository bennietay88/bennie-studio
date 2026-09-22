-- Portable website handover and managed-service offboarding.
-- Keeps cancellation, migration access, and permanent account deletion as distinct lifecycle states.

alter table if exists public.businesses
  add column if not exists managed_service_cancellation_requested_at timestamptz,
  add column if not exists managed_service_cancellation_effective_at timestamptz,
  add column if not exists handover_grace_until timestamptz,
  add column if not exists last_handover_export_at timestamptz;

create index if not exists idx_businesses_handover_grace_until
  on public.businesses (handover_grace_until)
  where handover_grace_until is not null;

comment on column public.businesses.managed_service_cancellation_requested_at is
  'When the customer requested managed-service cancellation. This does not delete the account or website.';

comment on column public.businesses.managed_service_cancellation_effective_at is
  'When the managed subscription actually ended.';

comment on column public.businesses.handover_grace_until is
  'End of the post-cancellation website migration window. Tenant hosting may continue until this timestamp.';

comment on column public.businesses.last_handover_export_at is
  'Most recent successful customer self-service portable website handover export.';
