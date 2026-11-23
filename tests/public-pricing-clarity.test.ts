import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("homepage pricing displays two primary plans and links to the wider catalogue", () => {
  const homepage = readFileSync("src/components/BrandLedLandingPage.tsx", "utf8");
  const from = homepage.indexOf('<section id="plans"');
  const to = homepage.indexOf('<section className="brand-shell brand-section c26-faq-section">', from);
  assert.ok(from >= 0 && to > from);
  const section = homepage.slice(from, to);
  assert.match(section, /planHighlights\[index\]/);
  assert.match(homepage, /const priced = \[managed, growth\]/);
  assert.doesNotMatch(section, /Standard initial term total|planComparisonRows|Compare SiteFoundry packages/);
  assert.equal((section.match(/<Link\b/g) || []).length, 4);
  assert.match(section, /personal-profile/);
  assert.match(section, /Growth Partner/);
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

test("Personal Profile Concept 2 uses real catalogue pricing, a focused offer and interactive examples", () => {
  const page = readFileSync("src/components/PersonalProfilePage.tsx", "utf8");
  const pricing = readFileSync("src/components/Pricing.tsx", "utf8");
  const stylesheet = readFileSync("src/styles/personalProfileSales.css", "utf8");
  assert.match(page, /A professional website for you/);
  assert.match(page, /Managed by us/);
  assert.match(page, /pp2-hero-price/);
  assert.match(page, /Illustrative concepts with sample names and stock photography/);
  assert.match(page, /aria-pressed=\{active === example.id\}/);
  assert.match(page, /product=personal-profile#plan-personal-profile/);
  assert.match(page, /delivery\.revisions/);
  assert.match(page, /getMinimumTermMonths\(price\)/);
  assert.match(page, /usePublicCommercialPricing/);
  assert.match(page, /priceReady/);
  assert.match(pricing, /requestedProduct !== "personal-profile"/);
  assert.match(pricing, /setPendingProduct\(item\)/);
  assert.match(pricing, /termsAccepted/);
  assert.match(stylesheet, /@media\(max-width:560px\)/);
  assert.match(stylesheet, /prefers-reduced-motion/);
  assert.match(stylesheet, /pp2-laptop/);
  assert.match(stylesheet, /pp2-phone/);
  assert.doesNotMatch(page, /<Pricing\b|\$29\/month USD|Your Name/);
});

test("Personal Profile animations respect reduced motion and retain working checkout", () => {
  const page = readFileSync("src/components/PersonalProfilePage.tsx", "utf8");
  assert.match(page, /useReducedMotion/);
  assert.match(page, /whileInView=/);
  assert.match(page, /viewport=\{\{ once: true/);
  assert.match(page, /AnimatePresence mode="wait"/);
  assert.match(page, /initial=\{reduce \? false/);
  assert.match(page, /OrderLink/);
  assert.match(page, /trackPublicEvent/);
  assert.match(page, /aria-label="Switch illustrative personal website example"/);
  assert.match(page, /aria-labelledby="pp2-faq-title"/);
  assert.match(page, /pp2-final/);
  assert.doesNotMatch(page, /\$149|\$249|\$499|Trusted by professionals/);
});
