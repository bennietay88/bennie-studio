alter table public.plans
  add column if not exists monthly_update_limit integer not null default 1,
  add column if not exists commitment_months integer not null default 12,
  add column if not exists setup_fee numeric not null default 0,
  add column if not exists market_prices jsonb not null default '{}'::jsonb,
  add column if not exists market_price_ids jsonb not null default '{}'::jsonb,
  add column if not exists yearly_stripe_price_id text,
  add column if not exists sales_motion text not null default 'self_serve';

alter table public.plans drop constraint if exists plans_sales_motion_check;
alter table public.plans add constraint plans_sales_motion_check
  check (sales_motion in ('self_serve', 'proposal', 'custom'));

update public.plans set
  name = 'Launch', project_limit = 1, location_page_limit = 0,
  monthly_update_allowance = '1 consolidated update request each month',
  monthly_update_limit = 1, commitment_months = 12, setup_fee = 149,
  market_prices = '{"MY":{"monthly":199,"setupFee":499,"currency":"MYR","locale":"en-MY"},"SG":{"monthly":69,"setupFee":199,"currency":"SGD","locale":"en-SG"},"GB":{"monthly":39,"setupFee":119,"currency":"GBP","locale":"en-GB"},"US":{"monthly":49,"setupFee":149,"currency":"USD","locale":"en-US"}}'::jsonb,
  sales_motion = 'self_serve'
where slug = 'starter';

update public.plans set
  name = 'Business', project_limit = 3, location_page_limit = 1,
  monthly_update_allowance = '1 consolidated update request each month',
  monthly_update_limit = 1, commitment_months = 12, setup_fee = 299,
  market_prices = '{"MY":{"monthly":399,"setupFee":1200,"currency":"MYR","locale":"en-MY"},"SG":{"monthly":139,"setupFee":399,"currency":"SGD","locale":"en-SG"},"GB":{"monthly":79,"setupFee":239,"currency":"GBP","locale":"en-GB"},"US":{"monthly":99,"setupFee":299,"currency":"USD","locale":"en-US"}}'::jsonb,
  sales_motion = 'self_serve'
where slug = 'business';

update public.plans set
  name = 'Scale', project_limit = 5, location_page_limit = 3,
  monthly_update_allowance = '2 managed update requests each month',
  monthly_update_limit = 2, commitment_months = 12, setup_fee = 499,
  market_prices = '{"MY":{"monthly":799,"setupFee":2000,"currency":"MYR","locale":"en-MY"},"SG":{"monthly":269,"setupFee":699,"currency":"SGD","locale":"en-SG"},"GB":{"monthly":159,"setupFee":399,"currency":"GBP","locale":"en-GB"},"US":{"monthly":199,"setupFee":499,"currency":"USD","locale":"en-US"}}'::jsonb,
  sales_motion = 'self_serve'
where slug = 'growth';

insert into public.plans (
  name, slug, monthly_credit_limit, daily_request_limit, project_limit,
  chatgpt_enabled, monthly_chatgpt_action_limit, price_usd, description,
  location_page_limit, monthly_update_allowance, monthly_update_limit,
  commitment_months, setup_fee, market_prices, sales_motion, is_active,
  sort_order, is_popular, features, enabled_features
) values (
  'Website Growth Partner', 'website_growth_partner', 1000, 100, 10,
  false, 0, 799, 'Consultant-led website strategy, build, tracking and monthly improvement.',
  5, 'Managed monthly improvement sprint', 4,
  6, 1800,
  '{"MY":{"monthly":3299,"setupFee":7500,"currency":"MYR","locale":"en-MY"},"SG":{"monthly":1075,"setupFee":2400,"currency":"SGD","locale":"en-SG"},"GB":{"monthly":625,"setupFee":1400,"currency":"GBP","locale":"en-GB"},"US":{"monthly":799,"setupFee":1800,"currency":"USD","locale":"en-US"}}'::jsonb,
  'proposal', true, 90, false, '[]'::jsonb,
  '["analytics","lead_crm","advanced_seo","custom_domain","monthly_improvement_engine","whatsapp_enquiry_kit","enquiry_path_tracker","campaign_landing_pages","monthly_website_report","priority_support","done_for_you_request_portal"]'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  project_limit = excluded.project_limit,
  location_page_limit = excluded.location_page_limit,
  monthly_update_allowance = excluded.monthly_update_allowance,
  monthly_update_limit = excluded.monthly_update_limit,
  commitment_months = excluded.commitment_months,
  setup_fee = excluded.setup_fee,
  market_prices = excluded.market_prices,
  sales_motion = excluded.sales_motion,
  is_active = excluded.is_active,
  description = excluded.description,
  enabled_features = excluded.enabled_features;

alter table public.businesses drop constraint if exists businesses_plan_check;
alter table public.businesses add constraint businesses_plan_check check (
  plan = any (array['starter','business','growth','premium','authority','website_growth_partner']::text[])
);

update public.settings
set content = jsonb_set(
  content,
  '{pricing}',
  (
    select jsonb_agg(
      item || jsonb_build_object(
        'name', case item->>'id' when 'starter' then 'Launch' when 'growth' then 'Scale' else item->>'name' end,
        'maxPages', case item->>'id' when 'starter' then 1 when 'business' then 3 when 'growth' then 5 else coalesce((item->>'maxPages')::int, 1) end,
        'maxLocationPages', case item->>'id' when 'starter' then 0 when 'business' then 1 when 'growth' then 3 else coalesce((item->>'maxLocationPages')::int, 0) end,
        'monthlyUpdateLimit', case item->>'id' when 'starter' then 1 when 'business' then 1 when 'growth' then 2 else 1 end,
        'monthlyUpdates', case item->>'id' when 'growth' then '2 managed update requests each month' else '1 consolidated update request each month' end,
        'commitmentMonths', 12
      )
      order by ordinality
    )
    from jsonb_array_elements(coalesce(content->'pricing', '[]'::jsonb)) with ordinality as entries(item, ordinality)
  )
)
where id = 'plans' and jsonb_typeof(content->'pricing') = 'array';
