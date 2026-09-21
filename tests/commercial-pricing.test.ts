import test from "node:test";
import assert from "node:assert/strict";
import { COMMERCIAL_DEFAULT_COMMITMENT_MONTHS, COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice, isRecurringCheckoutEnabled, normalizeCommercialMarket } from "../src/lib/commercialPricing.ts";
import { OWN_SALES_SEO_PAGES } from "../src/constants/ownSalesSeoPages.ts";
import { getTemplateReadiness, NICHE_TEMPLATES } from "../src/constants/nicheTemplates.ts";
import { REVIEW_POWERED_PLANS } from "../src/constants/reviewPoweredWaas.ts";

test("market detection uses fixed commercial markets", () => {
  assert.equal(normalizeCommercialMarket("MY"), "MY");
  assert.equal(normalizeCommercialMarket("UK"), "GB");
  assert.equal(normalizeCommercialMarket("CA"), "INTL");
});

test("checkout stays closed for draft international markets", () => {
  assert.equal(isRecurringCheckoutEnabled({ recurringConfigStatus: "draft", monthlyConfigured: false }), false);
  assert.equal(isRecurringCheckoutEnabled({ recurringConfigStatus: "live", monthlyConfigured: true }), true);
});

test("managed website recurring price book is fixed by market", () => {
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "managed-website");
  assert.equal(getCommercialPrice(product!, "MY")?.monthlyPrice, 199);
  assert.equal(getCommercialPrice(product!, "MY")?.setupFee, 1099);
  assert.equal(getCommercialPrice(product!, "MY")?.annualPrice, null);
  assert.equal(getCommercialPrice(product!, "MY")?.billingInterval, "month");
  assert.equal(getCommercialPrice(product!, "MY")?.minimumTermMonths, 3);
  assert.equal(COMMERCIAL_DEFAULT_COMMITMENT_MONTHS, 3);
});

test("all four launch markets keep the approved recurring catalogue", () => {
  const expected = {
    MY: [199, 1099, "MYR"],
    SG: [99, 399, "SGD"],
    GB: [79, 249, "GBP"],
    INTL: [89, 299, "USD"],
  } as const;
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "managed-website")!;
  for (const [market, [monthly, setup, currency]] of Object.entries(expected)) {
    const price = getCommercialPrice(product, market as keyof typeof expected);
    assert.equal(price?.monthlyPrice, monthly);
    assert.equal(price?.setupFee, setup);
    assert.equal(price?.currency, currency);
    assert.equal(price?.minimumTermMonths, 3);
    assert.equal(price?.billingInterval, "month");
  }
});

test("recurring checkout remains fail-closed until the market row is live and complete", () => {
  assert.equal(isRecurringCheckoutEnabled({ recurringConfigStatus: "live", monthlyConfigured: true }), true);
  assert.equal(isRecurringCheckoutEnabled({ recurringConfigStatus: "live", monthlyConfigured: false }), false);
  assert.equal(isRecurringCheckoutEnabled({ recurringConfigStatus: "draft", monthlyConfigured: true }), false);
  assert.equal(isRecurringCheckoutEnabled({ recurringConfigStatus: "disabled", monthlyConfigured: true }), false);
  assert.equal(isRecurringCheckoutEnabled(null), false);
});

test("growth partner is a self-serve recurring service", () => {
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "growth-partner");
  assert.equal(product?.salesMotion, "self_serve");
  assert.equal(getCommercialPrice(product!, "SG")?.monthlyPrice, 399);
  assert.equal(getCommercialPrice(product!, "SG")?.setupFee, 1499);
  assert.equal(getCommercialPrice(product!, "SG")?.billingInterval, "month");
});

test("website growth is recurring with a separate setup fee", () => {
  const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "website-growth");
  assert.equal(getCommercialPrice(product!, "MY")?.monthlyPrice, 399);
  assert.equal(getCommercialPrice(product!, "MY")?.setupFee, 2499);
  assert.equal(getCommercialPrice(product!, "INTL")?.monthlyPrice, 179);
  assert.equal(getCommercialPrice(product!, "INTL")?.setupFee, 599);
  assert.equal(getCommercialPrice(product!, "INTL")?.billingInterval, "month");
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
