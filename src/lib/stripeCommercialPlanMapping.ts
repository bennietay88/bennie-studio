export type StripeCommercialPlanCandidate = {
  id?: string;
  slug?: string;
  stripe_price_id?: string | null;
  yearly_stripe_price_id?: string | null;
};

/**
 * Resolve legacy subscriptions by Stripe Price ID and catalog-priced
 * subscriptions by the entitlement plan attached to their commercial product.
 */
export function resolveStripeCommercialPlan<T extends StripeCommercialPlanCandidate>(
  plans: readonly T[],
  priceId: string | undefined,
  requestedPlanSlug: string,
  entitlementPlanSlug?: string | null,
): T | undefined {
  const byPriceId = priceId
    ? plans.find((plan) => plan.stripe_price_id === priceId || plan.yearly_stripe_price_id === priceId)
    : undefined;
  if (byPriceId) return byPriceId;

  const normalize = (value: string | null | undefined) => String(value || "").trim().toLowerCase();
  const entitlementSlug = normalize(entitlementPlanSlug);
  const requestedSlug = normalize(requestedPlanSlug);
  return (
    (entitlementSlug ? plans.find((plan) => normalize(plan.slug) === entitlementSlug) : undefined) ||
    (requestedSlug ? plans.find((plan) => normalize(plan.slug) === requestedSlug) : undefined)
  );
}
