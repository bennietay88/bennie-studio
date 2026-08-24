-- Current commercial catalogue. Legacy `plans` and subscription rows remain untouched.
create table if not exists public.commercial_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  product_type text not null check (product_type in ('managed_website','website_growth','growth_partner','custom_website')),
  sales_motion text not null default 'self_serve' check (sales_motion in ('self_serve','proposal','quote')),
  includes_product_slug text references public.commercial_products(slug),
  entitlement_plan_slug text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_market_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commercial_products(id) on delete restrict,
  market text not null check (market in ('MY','SG','GB','INTL')),
  currency text not null check (currency in ('MYR','SGD','GBP','USD')),
  monthly_price numeric(12,2),
  setup_fee numeric(12,2) not null default 0,
  annual_price numeric(12,2),
  stripe_monthly_price_id text,
  stripe_annual_price_id text,
  stripe_setup_price_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, market),
  check (monthly_price is null or monthly_price >= 0),
  check (annual_price is null or annual_price >= 0),
  check (setup_fee >= 0)
);

create table if not exists public.commercial_promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  market text check (market is null or market in ('MY','SG','GB','INTL')),
  product_id uuid references public.commercial_products(id) on delete restrict,
  promotional_monthly_price numeric(12,2),
  promotional_setup_fee numeric(12,2),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  commitment_months integer,
  stripe_monthly_price_id text,
  stripe_setup_price_id text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (usage_limit is null or usage_limit > 0),
  check (usage_count >= 0),
  check (promotional_monthly_price is null or promotional_monthly_price >= 0),
  check (promotional_setup_fee is null or promotional_setup_fee >= 0)
);

alter table public.commercial_products enable row level security;
alter table public.commercial_market_prices enable row level security;
alter table public.commercial_promotions enable row level security;

revoke all on public.commercial_products from anon, authenticated;
revoke all on public.commercial_market_prices from anon, authenticated;
revoke all on public.commercial_promotions from anon, authenticated;

drop policy if exists "super admins manage commercial products" on public.commercial_products;
create policy "super admins manage commercial products" on public.commercial_products
  for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
drop policy if exists "super admins manage commercial market prices" on public.commercial_market_prices;
create policy "super admins manage commercial market prices" on public.commercial_market_prices
  for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
drop policy if exists "super admins manage commercial promotions" on public.commercial_promotions;
create policy "super admins manage commercial promotions" on public.commercial_promotions
  for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

insert into public.commercial_products (slug, name, description, product_type, sales_motion, entitlement_plan_slug, sort_order)
values
  ('managed-website', 'Managed Website', 'Your business website built, hosted, maintained and continuously managed to turn more visitors into enquiries.', 'managed_website', 'self_serve', 'business', 10),
  ('website-growth', 'Website Growth', 'Ongoing website growth, conversion optimisation, local SEO expansion and performance improvement.', 'website_growth', 'self_serve', 'growth', 20),
  ('growth-partner', 'Growth Partner', 'Ongoing website, conversion, SEO and digital growth strategy led personally by Bennie Studio.', 'growth_partner', 'proposal', 'website_growth_partner', 30),
  ('custom-website', 'Custom Website', 'Bespoke websites for ecommerce, complex integrations, multilingual and advanced content requirements.', 'custom_website', 'quote', null, 40)
on conflict (slug) do update set name = excluded.name, description = excluded.description, product_type = excluded.product_type,
  sales_motion = excluded.sales_motion, entitlement_plan_slug = excluded.entitlement_plan_slug, sort_order = excluded.sort_order, updated_at = now();
update public.commercial_products set includes_product_slug = 'managed-website', updated_at = now() where slug = 'website-growth';

insert into public.commercial_market_prices (product_id, market, currency, monthly_price, setup_fee, annual_price)
select p.id, v.market, v.currency, v.monthly_price, v.setup_fee, v.annual_price
from public.commercial_products p
join (values
  ('managed-website','MY','MYR',299::numeric,499::numeric,2990::numeric), ('managed-website','SG','SGD',149::numeric,249::numeric,null), ('managed-website','GB','GBP',99::numeric,199::numeric,null), ('managed-website','INTL','USD',99::numeric,199::numeric,null),
  ('website-growth','MY','MYR',699::numeric,499::numeric,null), ('website-growth','SG','SGD',349::numeric,249::numeric,null), ('website-growth','GB','GBP',249::numeric,199::numeric,null), ('website-growth','INTL','USD',249::numeric,199::numeric,null),
  ('growth-partner','MY','MYR',2500::numeric,3000::numeric,null), ('growth-partner','SG','SGD',1250::numeric,0::numeric,null), ('growth-partner','GB','GBP',750::numeric,0::numeric,null), ('growth-partner','INTL','USD',799::numeric,0::numeric,null),
  ('custom-website','MY','MYR',null,5000::numeric,null), ('custom-website','SG','SGD',null,2500::numeric,null), ('custom-website','GB','GBP',null,1500::numeric,null), ('custom-website','INTL','USD',null,1800::numeric,null)
) as v(slug, market, currency, monthly_price, setup_fee, annual_price) on v.slug = p.slug
on conflict (product_id, market) do update set currency = excluded.currency, monthly_price = excluded.monthly_price, setup_fee = excluded.setup_fee, annual_price = excluded.annual_price, updated_at = now();

alter table public.businesses add column if not exists commercial_product_slug text;
alter table public.businesses add column if not exists commercial_market text;
alter table public.businesses add column if not exists commercial_currency text;
alter table public.businesses add column if not exists commercial_term_months integer;
alter table public.businesses add column if not exists commercial_started_at timestamptz;
alter table public.businesses drop constraint if exists businesses_commercial_market_check;
alter table public.businesses add constraint businesses_commercial_market_check check (commercial_market is null or commercial_market in ('MY','SG','GB','INTL'));
alter table public.businesses drop constraint if exists businesses_commercial_currency_check;
alter table public.businesses add constraint businesses_commercial_currency_check check (commercial_currency is null or commercial_currency in ('MYR','SGD','GBP','USD'));
alter table public.businesses drop constraint if exists businesses_plan_check;
alter table public.businesses add constraint businesses_plan_check check (plan in ('starter','business','growth','premium','authority','pro','elite','website_growth_partner','managed-website','website-growth','growth-partner','custom-website'));

alter table public.leads add column if not exists first_touch_source text;
alter table public.leads add column if not exists last_touch_source text;
alter table public.leads add column if not exists referrer text;
alter table public.leads add column if not exists preview_id text;
alter table public.leads add column if not exists market text;
alter table public.leads add column if not exists currency text;
alter table public.leads add column if not exists campaign text;

create index if not exists commercial_market_prices_active_idx on public.commercial_market_prices (market, active);
create index if not exists commercial_promotions_active_window_idx on public.commercial_promotions (active, starts_at, ends_at);
create index if not exists commercial_products_includes_product_idx on public.commercial_products (includes_product_slug);
create index if not exists commercial_promotions_product_idx on public.commercial_promotions (product_id);
create index if not exists businesses_commercial_product_idx on public.businesses (commercial_product_slug);
