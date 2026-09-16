-- Keep the launch catalogue on the two supported providers only.
-- Existing customer balances and generation logs are intentionally preserved.
UPDATE public.ai_feature_costs
SET default_provider = CASE
      WHEN default_provider = 'openai' THEN 'openai'
      ELSE 'deepseek'
    END,
    default_model = CASE
      WHEN default_provider = 'openai' AND default_model IN ('gpt-4o', 'gpt-4o-mini') THEN default_model
      WHEN default_provider = 'openai' THEN 'gpt-4o-mini'
      ELSE 'deepseek-chat'
    END
WHERE default_provider IS NULL OR default_provider NOT IN ('openai', 'deepseek')
   OR default_model LIKE 'gemini%';

UPDATE public.ai_model_routes
SET provider = CASE
      WHEN provider = 'openai' THEN 'openai'
      ELSE 'deepseek'
    END,
    model = CASE
      WHEN provider = 'openai' AND model IN ('gpt-4o', 'gpt-4o-mini') THEN model
      WHEN provider = 'openai' THEN 'gpt-4o-mini'
      ELSE 'deepseek-chat'
    END
WHERE provider IS NULL OR provider NOT IN ('openai', 'deepseek')
   OR model LIKE 'gemini%';

ALTER TABLE public.ai_model_routes
  DROP CONSTRAINT IF EXISTS ai_model_routes_provider_check;

ALTER TABLE public.ai_model_routes
  ADD CONSTRAINT ai_model_routes_provider_check
  CHECK (provider IN ('openai', 'deepseek'));
