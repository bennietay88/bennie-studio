-- Premium public catalogue. Stable slugs and payment mappings remain unchanged
-- so existing subscriptions continue to resolve safely.
update public.commercial_products
set name = 'Website Growth System',
    description = 'A premium managed website built, hosted and continuously improved around conversion, trust, local visibility and qualified enquiries.',
    updated_at = now()
where slug = 'managed-website';

update public.commercial_products
set name = 'Website Growth Partner',
    description = 'A consultant-led engagement for deeper conversion strategy, landing pages, expanded local SEO and ongoing growth direction.',
    sales_motion = 'proposal',
    updated_at = now()
where slug = 'website-growth';

update public.commercial_market_prices p
set monthly_price = v.monthly_price,
    setup_fee = v.setup_fee,
    annual_price = null,
    updated_at = now()
from (values
  ('managed-website','MY',4900::numeric,5000::numeric),
  ('managed-website','SG',2490::numeric,2500::numeric),
  ('managed-website','GB',1990::numeric,2000::numeric),
  ('managed-website','INTL',2490::numeric,2500::numeric),
  ('website-growth','MY',7500::numeric,0::numeric),
  ('website-growth','SG',4500::numeric,0::numeric),
  ('website-growth','GB',4000::numeric,0::numeric),
  ('website-growth','INTL',4500::numeric,0::numeric)
) as v(slug, market, monthly_price, setup_fee)
join public.commercial_products cp on cp.slug = v.slug
where p.product_id = cp.id and p.market = v.market;
