-- Per-business automation policy and explainable health snapshot fields.
alter table public.businesses
  add column if not exists automation_mode text not null default 'assisted',
  add column if not exists customer_health_score integer,
  add column if not exists customer_health_status text,
  add column if not exists customer_health_reasons jsonb not null default '[]'::jsonb,
  add column if not exists customer_health_calculated_at timestamptz;
alter table public.businesses drop constraint if exists businesses_automation_mode_check;
alter table public.businesses add constraint businesses_automation_mode_check check (automation_mode in ('off','assisted','full'));
alter table public.businesses drop constraint if exists businesses_customer_health_status_check;
alter table public.businesses add constraint businesses_customer_health_status_check check (customer_health_status is null or customer_health_status in ('healthy','watch','at_risk','critical'));
alter table public.businesses drop constraint if exists businesses_customer_health_score_check;
alter table public.businesses add constraint businesses_customer_health_score_check check (customer_health_score is null or customer_health_score between 0 and 100);
create index if not exists businesses_health_queue_idx on public.businesses (customer_health_status, customer_health_score, customer_health_calculated_at);
