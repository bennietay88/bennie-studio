import test from "node:test";
import assert from "node:assert/strict";
import {
  MARKETING_PRO_CAPABILITIES,
  MARKETING_PRO_PLAN_CONTROLS,
  getMarketingCapability,
} from "../src/constants/marketingPro";

test("Marketing Pro capabilities retain their commercial feature mapping", () => {
  assert.equal(getMarketingCapability("seoAudit")?.entitlementFeatureId, "advanced_seo");
  assert.equal(getMarketingCapability("adGenerator")?.entitlementFeatureId, "ai_synthesis");
  assert.equal(getMarketingCapability("reviews")?.entitlementFeatureId, "review_management");
  assert.equal(getMarketingCapability("localSeo")?.entitlementFeatureId, "local_seo_geo");
  assert.equal(getMarketingCapability("leadFollowUp")?.entitlementFeatureId, "lead_crm");
  assert.equal(getMarketingCapability("blog")?.entitlementFeatureId, "blog");
  assert.equal(getMarketingCapability("blog")?.accessModel, "business");
});

test("Marketing Pro exposes no second commercial enablement state", () => {
  assert.equal(MARKETING_PRO_CAPABILITIES.length, 6);
  assert.equal(MARKETING_PRO_PLAN_CONTROLS.length, 5);
  assert.equal(MARKETING_PRO_PLAN_CONTROLS.some((item) => item.id === "blog"), false);
  for (const capability of MARKETING_PRO_PLAN_CONTROLS) {
    assert.ok(capability.entitlementFeatureId, `${capability.title} must be controlled by a plan entitlement`);
    assert.equal("status" in capability, false);
  }
});
