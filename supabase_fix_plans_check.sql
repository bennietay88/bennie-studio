-- Fix for businesses_plan_check constraint violation
-- This migration ensures the database allows the new plan names: starter, business, growth

ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_plan_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_plan_check CHECK (plan IN ('starter', 'business', 'growth', 'premium', 'authority', 'pro', 'elite'));

-- Mapping existing plans to new ones if necessary
-- Note: Run these only if you want to migrate existing data
-- UPDATE businesses SET plan = 'business' WHERE plan = 'pro';
-- UPDATE businesses SET plan = 'growth' WHERE plan = 'premium';
