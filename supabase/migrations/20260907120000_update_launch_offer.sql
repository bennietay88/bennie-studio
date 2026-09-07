-- Align the active public Malaysia launch offer with the approved commercial brief.
-- This changes only the current catalogue row; legacy plans, subscriptions,
-- customer records, and Stripe identifiers are intentionally preserved.
update public.commercial_market_prices as prices
set
  monthly_price = 3500,
  setup_fee = 5000,
  updated_at = now()
from public.commercial_products as products
where prices.product_id = products.id
  and products.slug = 'managed-website'
  and prices.market = 'MY';
