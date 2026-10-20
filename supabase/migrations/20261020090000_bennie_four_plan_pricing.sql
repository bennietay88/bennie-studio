-- 2026-10-20 Four-plan OTC/MRC pricing for NEW customers; existing subscriptions are not mutated.
begin;
insert into public.commercial_products(slug,name,description,product_type,sales_motion,entitlement_plan_slug,active,sort_order)
values('personal-profile','Personal Profile','Done-for-you 3–5 page professional identity website. Includes hosting, maintenance and one small monthly content edit.','managed_website','self_serve','profile',true,5)
on conflict(slug) do update set name=excluded.name,description=excluded.description,entitlement_plan_slug=excluded.entitlement_plan_slug,active=true,sort_order=5,updated_at=now();
with approved(slug,market,currency,mrc,otc) as (values
('personal-profile','MY','MYR',129,449),
('personal-profile','SG','SGD',39,129),
('personal-profile','GB','GBP',25,79),
('personal-profile','INTL','USD',29,99),
('managed-website','MY','MYR',269,899),
('managed-website','SG','SGD',79,259),
('managed-website','GB','GBP',49,159),
('managed-website','INTL','USD',59,199),
('website-growth','MY','MYR',449,1349),
('website-growth','SG','SGD',129,399),
('website-growth','GB','GBP',79,239),
('website-growth','INTL','USD',99,299),
('growth-partner','MY','MYR',899,2249),
('growth-partner','SG','SGD',259,659),
('growth-partner','GB','GBP',159,399),
('growth-partner','INTL','USD',199,499)
)
insert into public.commercial_market_prices(product_id,market,currency,monthly_price,setup_fee,recurring_monthly_price,recurring_setup_fee,recurring_annual_price,minimum_term_months,recurring_config_status,recurring_stripe_monthly_price_id,recurring_stripe_setup_price_id,active)
select cp.id,a.market,a.currency,null,0,a.mrc,a.otc,null,3,'live',null,null,true from approved a join public.commercial_products cp on cp.slug=a.slug
on conflict(product_id,market) do update set currency=excluded.currency,recurring_monthly_price=excluded.recurring_monthly_price,recurring_setup_fee=excluded.recurring_setup_fee,recurring_annual_price=null,minimum_term_months=3,recurring_config_status='live',recurring_stripe_monthly_price_id=null,recurring_stripe_setup_price_id=null,active=true,updated_at=now();
commit;