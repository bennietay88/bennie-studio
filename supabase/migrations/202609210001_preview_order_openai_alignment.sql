-- Bennie Studio AI provider + commercial term alignment.
-- Public previews remain deterministic and do not consume AI tokens.

UPDATE public.ai_feature_costs
SET default_provider = 'openai',
    default_model = 'gpt-5.6-luna'
WHERE is_active = true;

UPDATE public.ai_model_routes
SET provider = 'openai',
    model = 'gpt-5.6-luna'
WHERE is_active = true;

UPDATE public.businesses
SET ai_model_config = jsonb_build_object(
      'seo', 'gpt-5.6-luna',
      'blog', 'gpt-5.6-luna',
      'chatbot', 'gpt-5.6-luna',
      'marketing', 'gpt-5.6-luna',
      'synthesis', 'gpt-5.6-luna'
    ),
    chatbot_model = CASE
      WHEN chatbot_model IS NULL
        OR chatbot_model = ''
        OR chatbot_model ILIKE 'gemini%'
      THEN 'gpt-5.6-luna'
      ELSE chatbot_model
    END
WHERE ai_model_config::text ILIKE '%gemini%'
   OR chatbot_model ILIKE 'gemini%';

-- New managed website orders use a 90-day initial commitment.
-- Existing customer-specific overrides are preserved.
ALTER TABLE public.commercial_market_prices
  ALTER COLUMN minimum_term_months SET DEFAULT 3;

UPDATE public.commercial_market_prices
SET minimum_term_months = 3,
    updated_at = now()
WHERE active = true
  AND billing_interval = 'month'
  AND recurring_config_status IN ('draft', 'preview', 'live');

UPDATE public.businesses
SET commercial_term_months = 3
WHERE commercial_term_months = 12
  AND lifecycle_stage IN ('prospect', 'checkout', 'onboarding')
  AND stripe_subscription_id IS NULL;


-- Keep the entitlement catalogue aligned for future customers. Existing
-- subscriptions retain their stored contract dates and business-level term.
UPDATE public.plans
SET commitment_months = 3
WHERE is_active = true
  AND slug IN ('starter', 'business', 'growth', 'website_growth_partner');
