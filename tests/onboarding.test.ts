import assert from "node:assert/strict";
import test from "node:test";

import { resolveOnboardingPlan } from "../server/onboarding";

test("onboarding uses the server-stored product instead of a browser value", () => {
  assert.equal(resolveOnboardingPlan({ storedPlan: "business" }), "business");
});

test("a verified proposal may set the onboarding product", () => {
  assert.equal(
    resolveOnboardingPlan({ storedPlan: "business", verifiedProposalPlan: "website_growth_partner" }),
    "website_growth_partner",
  );
});

test("onboarding stops when no server-side product exists", () => {
  assert.throws(() => resolveOnboardingPlan({ storedPlan: "" }), /PRODUCT_NOT_RESOLVED/);
});
