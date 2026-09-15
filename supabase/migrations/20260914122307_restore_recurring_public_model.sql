-- Restore the public catalogue to Bennie Studio's recurring managed-service
-- model. This is additive and deliberately does not alter customer records,
-- legacy prices, Stripe IDs, or active subscriptions.

update public.commercial_products
set name = case slug
  when 'managed-website' then 'Managed Website'
  when 'website-growth' then 'Website Growth'
  when 'growth-partner' then 'Growth Partner'
  else name
end,
description = case slug
  when 'managed-website' then 'A professionally built, hosted and continuously managed website for service businesses that want more qualified enquiries.'
  when 'website-growth' then 'A managed website growth system with stronger lead capture, trust sections, analytics and local SEO foundations.'
  when 'growth-partner' then 'A consultant-led managed website engagement with deeper conversion strategy, landing pages, expanded SEO and growth direction.'
  else description
end,
updated_at = now()
where slug in ('managed-website', 'website-growth', 'growth-partner');

update public.commercial_products
set sales_motion = 'self_serve', updated_at = now()
where slug in ('managed-website', 'website-growth', 'growth-partner');

-- Legacy one-time catalogue columns remain available for historical customers,
-- but are no longer the public billing interval for new managed products.
update public.commercial_market_prices prices
set billing_interval = 'month',
    updated_at = now()
from public.commercial_products products
where prices.product_id = products.id
  and products.slug in ('managed-website', 'website-growth', 'growth-partner');

insert into public.settings (id, content, updated_at)
values ('launch_flags', jsonb_build_object('otc_mrc_catalogue', true), now())
on conflict (id) do update
set content = public.settings.content || jsonb_build_object('otc_mrc_catalogue', true),
    updated_at = now();
