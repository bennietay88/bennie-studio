import test from "node:test";
import assert from "node:assert/strict";
import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice, normalizeCommercialMarket } from "../src/lib/commercialPricing.ts";
import { OWN_SALES_SEO_PAGES } from "../src/constants/ownSalesSeoPages.ts";
import { getTemplateReadiness, NICHE_TEMPLATES } from "../src/constants/nicheTemplates.ts";
import { REVIEW_POWERED_PLANS } from "../src/constants/reviewPoweredWaas.ts";

test("market detection uses fixed commercial markets", () => {
  assert.equal(normalizeCommercialMarket("MY"), "MY");
  assert.equal(normalizeCommercialMarket("UK"), "GB");
  assert.equal(normalizeCommercialMarket("CA"), "INTL");
});

test("managed website price book is fixed by market", () => {
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "managed-website");
  assert.equal(getCommercialPrice(product!, "MY")?.monthlyPrice, 299);
  assert.equal(getCommercialPrice(product!, "MY")?.setupFee, 499);
  assert.equal(getCommercialPrice(product!, "MY")?.annualPrice, 2990);
});

test("growth partner is consultation-led, not a self-serve subscription", () => {
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "growth-partner");
  assert.equal(product?.salesMotion, "proposal");
  assert.equal(getCommercialPrice(product!, "SG")?.monthlyPrice, 1250);
});

test("public SEO catalogue contains no retired plan or trial language", () => {
  const copy = JSON.stringify(OWN_SALES_SEO_PAGES);
  const planLabels = OWN_SALES_SEO_PAGES.flatMap((page) => page.examples.map((example) => example.plan));
  assert.doesNotMatch(copy, /14[- ]day free trial|card-required trial/i);
  assert.deepEqual(
    [...new Set(planLabels)].sort(),
    ["Growth Partner", "Managed Website", "Website Growth"],
  );
  assert.doesNotMatch(copy, /RM199|\$49/);
});

test("customer template catalogue only contains production-ready templates", () => {
  const templates = Object.values(NICHE_TEMPLATES);
  assert.ok(templates.length > 0);
  for (const template of templates) {
    const readiness = getTemplateReadiness(template);
    assert.equal(readiness.ready, true, `${template.id}: ${readiness.missing.join(", ")}`);
  }

  const incomplete = getTemplateReadiness({
    id: "draft-template",
    name: "Draft template",
    templateStatus: "draft",
    pages: [],
  });
  assert.equal(incomplete.ready, false);
  assert.ok(incomplete.missing.includes("page content"));
  assert.ok(incomplete.missing.includes("active status"));
});

test("review-powered public offers use the current product language", () => {
  const managed = REVIEW_POWERED_PLANS.find((plan) => plan.id === "starter");
  const growth = REVIEW_POWERED_PLANS.find((plan) => plan.id === "business");
  const partner = REVIEW_POWERED_PLANS.find((plan) => plan.id === "growth");
  assert.equal(managed?.publicName, "Managed Website");
  assert.equal(managed?.price, "US$99/month");
  assert.equal(growth?.publicName, "Website Growth");
  assert.equal(growth?.price, "US$249/month");
  assert.equal(partner?.publicName, "Growth Partner");
  assert.equal(partner?.price, "US$799/month");
  assert.doesNotMatch(JSON.stringify(REVIEW_POWERED_PLANS), /\$49|\bLaunch\b|\bScale\b|\bBusiness\b/);
});
