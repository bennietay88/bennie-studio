import test from "node:test";
import assert from "node:assert/strict";
import { resolveStripeCommercialPlan } from "../src/lib/stripeCommercialPlanMapping.ts";

const plans = [
  { id: "profile-id", slug: "profile", stripe_price_id: null, yearly_stripe_price_id: null },
  { id: "starter-id", slug: "starter", stripe_price_id: "price_legacy", yearly_stripe_price_id: "price_yearly" },
];

test("inline commercial prices resolve through the product entitlement plan", () => {
  assert.equal(
    resolveStripeCommercialPlan(plans, "price_inline", "", "profile")?.id,
    "profile-id",
  );
});

test("legacy subscriptions continue resolving by Stripe Price ID", () => {
  assert.equal(
    resolveStripeCommercialPlan(plans, "price_legacy", "profile", "profile")?.id,
    "starter-id",
  );
});

test("requested plan slug remains a fallback when no entitlement plan is present", () => {
  assert.equal(
    resolveStripeCommercialPlan(plans, undefined, "profile")?.id,
    "profile-id",
  );
});
