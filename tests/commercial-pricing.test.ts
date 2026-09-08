import test from "node:test";
import assert from "node:assert/strict";
import { COMMERCIAL_DEFAULT_COMMITMENT_MONTHS, COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice, normalizeCommercialMarket } from "../src/lib/commercialPricing.ts";
import { OWN_SALES_SEO_PAGES } from "../src/constants/ownSalesSeoPages.ts";
import { getTemplateReadiness, NICHE_TEMPLATES } from "../src/constants/nicheTemplates.ts";
import { REVIEW_POWERED_PLANS } from "../src/constants/reviewPoweredWaas.ts";

test("market detection uses fixed commercial markets", () => {
  assert.equal(normalizeCommercialMarket("MY"), "MY");
  assert.equal(normalizeCommercialMarket("UK"), "GB");
  assert.equal(normalizeCommercialMarket("CA"), "INTL");
});

test("starter website package price book is fixed by market", () => {
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "managed-website");
  assert.equal(getCommercialPrice(product!, "MY")?.monthlyPrice, 999);
  assert.equal(getCommercialPrice(product!, "MY")?.setupFee, 0);
  assert.equal(getCommercialPrice(product!, "MY")?.annualPrice, null);
  assert.equal(getCommercialPrice(product!, "MY")?.billingInterval, "one_time");
  assert.equal(COMMERCIAL_DEFAULT_COMMITMENT_MONTHS, 6);
});

test("growth website is a self-serve one-time package", () => {
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "growth-partner");
  assert.equal(product?.salesMotion, "self_serve");
  assert.equal(getCommercialPrice(product!, "SG")?.monthlyPrice, 1499);
  assert.equal(getCommercialPrice(product!, "SG")?.billingInterval, "one_time");
});

test("business website is a one-time total with no duplicate setup fee", () => {
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "website-growth");
  assert.equal(getCommercialPrice(product!, "MY")?.monthlyPrice, 2999);
  assert.equal(getCommercialPrice(product!, "MY")?.setupFee, 0);
  assert.equal(getCommercialPrice(product!, "INTL")?.monthlyPrice, 659);
  assert.equal(getCommercialPrice(product!, "INTL")?.setupFee, 0);
  assert.equal(getCommercialPrice(product!, "INTL")?.billingInterval, "one_time");
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
  assert.equal(managed?.publicName, "Website Growth System");
  assert.equal(managed?.price, "From US$2,490/month");
  assert.equal(growth?.publicName, "Website Growth Partner");
  assert.equal(growth?.price, "From US$4,500/month");
  assert.equal(partner?.publicName, "Growth Partner");
  assert.equal(partner?.price, "US$799/month");
  assert.doesNotMatch(JSON.stringify(REVIEW_POWERED_PLANS), /\$49|\bLaunch\b|\bScale\b|\bBusiness\b/);
});
