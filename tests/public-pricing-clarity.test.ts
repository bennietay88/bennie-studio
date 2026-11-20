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
  assert.match(page, /product=personal-profile#plan-personal-profile/);
  assert.doesNotMatch(page, /<Pricing\b|\$99 setup|\$29\/month USD|Your Name|Consultant · Coach · Specialist/);
  assert.match(page, /PublicSiteHeader/);
  assert.match(page, /PublicSiteFooter/);
});

test("homepage FAQs have consistent horizontal inset and visible focus styles", () => {
  const home = readFileSync("src/components/BrandLedLandingPage.tsx", "utf8");
  const faqStart = home.indexOf("Common questions");
  const faqEnd = home.indexOf("c26-close", faqStart);
  const faq = home.slice(faqStart, faqEnd);
  assert.match(faq, /px-5 py-5 sm:px-8/);
  assert.match(faq, /focus-visible:ring-2/);
  assert.match(faq, /max-w-2xl pb-2 pt-3/);
});

test("Personal Profile landing makes the offer visible, demonstrates profiles and links directly to its order review", () => {
  const page = readFileSync("src/components/PersonalProfilePage.tsx", "utf8");
  const pricing = readFileSync("src/components/Pricing.tsx", "utf8");
  const stylesheet = readFileSync("src/styles/personalProfileSales.css", "utf8");
  assert.match(page, /Make your first impression/);
  assert.match(page, /pp-sales-hero-price/);
  assert.match(page, /Sample names, content and stock imagery are illustrative/);
  assert.match(page, /aria-pressed=\{active === example.id\}/);
  assert.match(page, /product=personal-profile#plan-personal-profile/);
  assert.match(page, /delivery\.revisions/);
  assert.match(page, /getMinimumTermMonths\(price\)/);
  assert.match(page, /usePublicCommercialPricing/);
  assert.match(page, /priceReady/);
  assert.match(pricing, /requestedProduct !== "personal-profile"/);
  assert.match(pricing, /setPendingProduct\(item\)/);
  assert.match(pricing, /termsAccepted/);
  assert.match(stylesheet, /@media\(max-width:620px\)/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  assert.doesNotMatch(page, /<Pricing\b|\$29\/month USD|Your Name/);
});
