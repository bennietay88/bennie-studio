-- Replace the premium monthly-first launch offer with clear one-time website
-- build packages. Existing price mappings and customer subscriptions remain
-- untouched; new checkout uses the dedicated one-time price column.
alter table public.commercial_market_prices
  add column if not exists billing_interval text not null default 'month',
  add column if not exists stripe_one_time_price_id text;

alter table public.commercial_market_prices
  drop constraint if exists commercial_market_prices_billing_interval_check;
alter table public.commercial_market_prices
  add constraint commercial_market_prices_billing_interval_check
  check (billing_interval in ('month', 'year', 'one_time'));

update public.commercial_products
set name = case slug
  when 'managed-website' then 'Starter Website'
  when 'website-growth' then 'Business Website'
  when 'growth-partner' then 'Growth Website'
  else name end,
    description = case slug
  when 'managed-website' then 'A focused, conversion-ready website for a business that needs a credible online presence quickly.'
  when 'website-growth' then 'A complete service-business website with stronger lead capture, trust sections, analytics and local SEO foundations.'
  when 'growth-partner' then 'A larger website build with deeper conversion structure, service pages, local visibility and launch support.'
  else description end,
    sales_motion = case when slug in ('managed-website','website-growth','growth-partner') then 'self_serve' else sales_motion end,
    active = case when slug in ('managed-website','website-growth','growth-partner') then true else active end,
    updated_at = now()
where slug in ('managed-website','website-growth','growth-partner');

update public.commercial_market_prices p
set monthly_price = v.package_price,
    setup_fee = 0,
    annual_price = null,
    billing_interval = 'one_time',
    stripe_one_time_price_id = null,
    updated_at = now()
from (values
  ('managed-website','MY',999::numeric), ('website-growth','MY',2999::numeric), ('growth-partner','MY',4999::numeric),
  ('managed-website','SG',299::numeric), ('website-growth','SG',899::numeric), ('growth-partner','SG',1499::numeric),
  ('managed-website','GB',169::numeric), ('website-growth','GB',509::numeric), ('growth-partner','GB',849::numeric),
  ('managed-website','INTL',219::numeric), ('website-growth','INTL',659::numeric), ('growth-partner','INTL',1099::numeric)
) as v(slug, market, package_price)
join public.commercial_products cp on cp.slug = v.slug
where p.product_id = cp.id and p.market = v.market;

comment on column public.commercial_market_prices.stripe_one_time_price_id is
  'Stripe one-time Price ID for the current website build package. Legacy recurring IDs are preserved separately.';
