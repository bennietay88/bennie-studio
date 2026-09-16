-- Controlled founding-customer commitment overrides.
-- NULL means the commercial catalogue default (currently 12 months).
alter table public.businesses
  drop constraint if exists businesses_commercial_term_months_check;

alter table public.businesses
  add constraint businesses_commercial_term_months_check
  check (commercial_term_months is null or commercial_term_months in (3, 6, 9, 12));

comment on column public.businesses.commercial_term_months is
  'Internal per-customer commitment override in months. NULL uses the public catalogue default; approved values are 3, 6, 9, or 12.';
