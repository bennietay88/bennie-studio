-- Keep onboarding resilient while older production clients may still submit the
-- transitional "pending" billing state. New application code uses "incomplete"
-- as the canonical pre-activation Stripe-compatible status.

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_subscription_status_check;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_subscription_status_check
  CHECK (
    subscription_status IN (
      'pending',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'cancelled',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused'
    )
  );

NOTIFY pgrst, 'reload schema';
