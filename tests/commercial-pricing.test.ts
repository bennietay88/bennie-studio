import test from "node:test";
import assert from "node:assert/strict";
import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice, normalizeCommercialMarket } from "../src/lib/commercialPricing.ts";

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
