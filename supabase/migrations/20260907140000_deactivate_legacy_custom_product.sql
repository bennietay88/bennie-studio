-- Keep legacy custom-product records for historical references, but remove
-- them from active commercial and public selection for new customers.
update public.commercial_products
set active = false,
    name = 'Scoped Platform Exception',
    description = 'Retained for historical compatibility; new customers use the standardized managed website platform.',
    updated_at = now()
where slug = 'custom-website';

update public.commercial_market_prices
set active = false,
    updated_at = now()
where product_id = (select id from public.commercial_products where slug = 'custom-website');
