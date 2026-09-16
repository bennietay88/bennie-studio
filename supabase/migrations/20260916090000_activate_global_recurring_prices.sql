-- Activate the verified live Stripe recurring catalogue for the SG and GB markets.
-- This is intentionally additive and preserves existing customer/subscription data.
do $$
declare
  missing_count integer;
begin
  select count(*) into missing_count
  from public.commercial_market_prices mp
  join public.commercial_products cp on cp.id = mp.product_id
  where (mp.market, cp.slug) in (
    ('SG', 'managed-website'),
    ('SG', 'website-growth'),
    ('SG', 'growth-partner'),
    ('GB', 'managed-website'),
    ('GB', 'website-growth'),
    ('GB', 'growth-partner')
  )
  and mp.minimum_term_months = 12
  and mp.billing_interval = 'month'
  and mp.currency in ('SGD', 'GBP');

  if missing_count <> 6 then
    raise exception 'Expected six SG/GB commercial price rows with a 12-month monthly commitment; found %', missing_count;
  end if;
end $$;

update public.commercial_market_prices mp
set recurring_stripe_monthly_price_id = case (mp.market || ':' || cp.slug)
  when 'SG:managed-website' then 'price_1UG6EDAmAJybXjuMzqFYhH9i'
  when 'SG:website-growth' then 'price_1UG6JAAmAJybXjuMeW0EQEXb'
  when 'SG:growth-partner' then 'price_1UG6LHAmAJybXjuM8ZM9T5Em'
  when 'GB:managed-website' then 'price_1UG6HuAmAJybXjuMmisbhx9N'
  when 'GB:website-growth' then 'price_1UG6K2AmAJybXjuMdMpSxcG8'
  when 'GB:growth-partner' then 'price_1UG6MBAmAJybXjuMJM2Bqwfb'
end,
recurring_stripe_setup_price_id = case (mp.market || ':' || cp.slug)
  when 'SG:managed-website' then 'price_1UG6ErAmAJybXjuMehnZOfjJ'
  when 'SG:website-growth' then 'price_1UG6JbAmAJybXjuMjNFXs72H'
  when 'SG:growth-partner' then 'price_1UG6LjAmAJybXjuMyTDz13nG'
  when 'GB:managed-website' then 'price_1UG6IMAmAJybXjuMGaXckBTQ'
  when 'GB:website-growth' then 'price_1UG6KSAmAJybXjuMGJTJD9il'
  when 'GB:growth-partner' then 'price_1UG6MdAmAJybXjuMpjEElshu'
end,
recurring_config_status = 'live',
updated_at = now()
from public.commercial_products cp
where cp.id = mp.product_id
  and (mp.market, cp.slug) in (
    ('SG', 'managed-website'),
    ('SG', 'website-growth'),
    ('SG', 'growth-partner'),
    ('GB', 'managed-website'),
    ('GB', 'website-growth'),
    ('GB', 'growth-partner')
  );

-- Annual billing is intentionally not enabled for the launch catalogue.
update public.commercial_market_prices mp
set recurring_stripe_annual_price_id = null,
    recurring_annual_price = null,
    updated_at = now()
from public.commercial_products cp
where cp.id = mp.product_id
  and cp.slug in ('managed-website', 'website-growth', 'growth-partner')
  and mp.market in ('MY', 'SG', 'GB', 'INTL');
