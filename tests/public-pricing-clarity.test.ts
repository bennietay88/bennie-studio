import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("homepage pricing displays concise plan highlights and only two secondary links", () => {
  const homepage = readFileSync("src/components/BrandLedLandingPage.tsx", "utf8");
  const from = homepage.indexOf('<section id="plans"');
  const to = homepage.indexOf('<section className="brand-shell brand-section">', from);
  assert.ok(from >= 0 && to > from);
  const section = homepage.slice(from, to);
  assert.match(section, /planHighlights\[index\]/);
  assert.match(section, /formatCommitmentLabel\(getMinimumTermMonths\(priced\[0\]/);
  assert.doesNotMatch(section, /Standard initial term total|planComparisonRows|Compare SiteFoundry packages/);
  assert.equal((section.match(/<Link\b/g) || []).length, 2);
  assert.match(section, /Compare full plan scope/);
  assert.match(section, /Get a free website direction/);
});

test("Personal Profile is its own focused page with live-priced product instead of the full pricing catalogue", () => {
  const page = readFileSync("src/components/PersonalProfilePage.tsx", "utf8");
  assert.match(page, /usePublicCommercialPricing/);
  assert.match(page, /getCommercialPrice\(product, "INTL"\)/);
  assert.match(page, /PLAN_DELIVERY_STANDARDS\["personal-profile"\]/);
  assert.match(page, /pricing#plan-personal-profile/);
  assert.doesNotMatch(page, /<Pricing\b|\$99 setup|\$29\/month USD|Your Name|Consultant · Coach · Specialist/);
  assert.match(page, /PublicSiteHeader/);
  assert.match(page, /PublicSiteFooter/);
});
