-- Repair the active catalogue entitlements without changing pricing, contracts,
-- or existing customer rows.
begin;

-- Personal Profile checkout stores its entitlement slug on businesses.plan.
-- The legacy allow-list omitted that sold slug, so checkout could fail before
-- Stripe session creation even though the commercial product was configured.
alter table public.businesses drop constraint if exists businesses_plan_check;
alter table public.businesses add constraint businesses_plan_check check (
  plan in (
    'starter', 'business', 'growth', 'premium', 'authority', 'pro', 'elite',
    'website_growth_partner', 'managed-website', 'website-growth',
    'growth-partner', 'custom-website', 'profile'
  )
);

-- Create the missing plan only if absent. Commercial prices continue to come
-- from commercial_products/commercial_market_prices; this is entitlement data.
insert into public.plans (
  name, slug, monthly_credit_limit, daily_request_limit, project_limit,
  chatgpt_enabled, monthly_chatgpt_action_limit, price_usd, description,
  location_page_limit, monthly_update_allowance, monthly_update_limit,
  commitment_months, setup_fee, market_prices, market_price_ids, sales_motion,
  is_active, sort_order, is_popular, features, enabled_features, upgrade_prompt
) values (
  'Personal Profile', 'profile', 0, 100, 5,
  false, 0, 29, 'Standardized 3–5 page website for independent professionals.',
  0, '1 small update, up to 15 minutes', 1,
  3, 99, '{"US":{"monthly":29,"setupFee":99,"currency":"USD","locale":"en-US"}}'::jsonb,
  '{}'::jsonb, 'self_serve', true, 5, false,
  '["3–5 professional profile pages","Fixed responsive layouts","Professional bio and credentials","Expertise and portfolio","Contact form and social links","Basic SEO and SSL","Managed hosting","One prelaunch revision","One small monthly content update"]'::jsonb,
  '["custom_domain","done_for_you_request_portal"]'::jsonb,
  'Upgrade to Managed Website when you need custom business website services.'
)
on conflict (slug) do nothing;

-- Managed Website is promised up to five core pages. The app consumes
-- `project_limit` as this plan's page allowance.
update public.plans
set project_limit = 5,
    updated_at = now()
where slug = 'business'
  and is_active = true
  and project_limit <> 5;

commit;

notify pgrst, 'reload schema';
