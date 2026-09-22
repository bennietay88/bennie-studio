import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MARKETING_FEATURES,
  getMarketingCapability,
  normalizeMarketingFeatures,
} from "../src/constants/marketingPro";

test("marketing feature config preserves safe defaults while honoring stored overrides", () => {
  const normalized = normalizeMarketingFeatures({
    seoAudit: "disabled",
    adGenerator: "coming_soon",
    reviews: "definitely-not-a-status",
  });

  assert.equal(normalized.seoAudit, "disabled");
  assert.equal(normalized.adGenerator, "coming_soon");
  assert.equal(normalized.reviews, DEFAULT_MARKETING_FEATURES.reviews);
  assert.equal(normalized.leadFollowUp, "enabled");
});

test("marketing capabilities map to the normal Bennie Studio plan entitlements", () => {
  assert.equal(getMarketingCapability("seoAudit")?.entitlementFeatureId, "advanced_seo");
  assert.equal(getMarketingCapability("adGenerator")?.entitlementFeatureId, "ai_synthesis");
  assert.equal(getMarketingCapability("reviews")?.entitlementFeatureId, "review_management");
  assert.equal(getMarketingCapability("localSeo")?.entitlementFeatureId, "local_seo_geo");
  assert.equal(getMarketingCapability("leadFollowUp")?.entitlementFeatureId, "lead_crm");
  assert.equal(getMarketingCapability("blog")?.entitlementFeatureId, "blog");
});
