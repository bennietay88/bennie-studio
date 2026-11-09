import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PORTFOLIO_ITEMS, resolvePortfolioCatalog, publicPortfolioCatalog, isSafePortfolioMediaUrl } from "../src/lib/portfolioCatalog.ts";
import { EXPANDED_DEMO_SLUGS, INTERACTIVE_DEMOS, hasExpandedDemo, portfolioDemoSlug } from "../src/lib/studioInteractiveDemos.ts";

test("portfolio provides 18 published concepts with six original and twelve expanded demos", () => {
  assert.equal(DEFAULT_PORTFOLIO_ITEMS.length, 18);
  assert.equal(DEFAULT_PORTFOLIO_ITEMS.filter((item) => item.published).length, 18);
  assert.equal(DEFAULT_PORTFOLIO_ITEMS.filter((item) => !item.published).length, 0);
  assert.equal(new Set(DEFAULT_PORTFOLIO_ITEMS.map((item) => item.slug)).size, 18);
  assert.ok(DEFAULT_PORTFOLIO_ITEMS.filter((item) => item.published).every((item) => portfolioDemoSlug(item.slug, item.livePreviewSlug) === item.slug));
});

test("published catalogue excludes draft designs and keeps configured display order", () => {
  const items = DEFAULT_PORTFOLIO_ITEMS.map((item) => ({ ...item }));
  items[7].published = false;
  items[8].order = 0;
  const shown = publicPortfolioCatalog(items);
  assert.equal(shown.length, 17);
  assert.equal(shown[0].slug, items[8].slug);
  assert.ok(!shown.some((item) => item.slug === items[7].slug));
  assert.equal(publicPortfolioCatalog(null).length, 18);
});

test("portfolio media inputs accept only safe site-relative and HTTPS paths", () => {
  for (const value of ["", "/portfolio/clinic.webp", "https://example.com/demo.webp"]) {
    assert.equal(isSafePortfolioMediaUrl(value), true, value);
  }
  for (const value of ["http://example.com/a.jpg", "//example.com/a.jpg", "javascript:alert(1)", "/image onerror=alert(1)", "/image\\evil"]) {
    assert.equal(isSafePortfolioMediaUrl(value), false, value);
  }
});

test("malformed stored portfolio records are discarded instead of producing unsafe links", () => {
  const candidates = [{ ...DEFAULT_PORTFOLIO_ITEMS[0], coverImage: "javascript:alert(1)" }, DEFAULT_PORTFOLIO_ITEMS[1]];
  const catalog = resolvePortfolioCatalog(candidates);
  assert.deepEqual(catalog.map((item) => item.slug), [DEFAULT_PORTFOLIO_ITEMS[1].slug]);
});

test("all twelve expanded demos have distinct content, three services and working route mappings", () => {
  assert.equal(EXPANDED_DEMO_SLUGS.length, 12);
  assert.equal(new Set(EXPANDED_DEMO_SLUGS).size, 12);
  for (const slug of EXPANDED_DEMO_SLUGS) {
    const item = DEFAULT_PORTFOLIO_ITEMS.find((entry) => entry.slug === slug);
    assert.ok(item?.published, slug + " should be published");
    assert.ok(hasExpandedDemo(slug));
    assert.equal(portfolioDemoSlug(slug, item?.livePreviewSlug || ""), slug);
    const data = INTERACTIVE_DEMOS[slug];
    assert.ok(data.headline.length >= 18);
    assert.ok(data.intro.length >= 45);
    assert.ok(data.services.length >= 3);
    assert.ok(data.process.length >= 3);
    assert.ok(data.faqs.length >= 2);
    assert.ok(data.accent.startsWith("#"));
    assert.ok(data.services.every((service) => service.title && service.detail));
  }
  assert.equal(portfolioDemoSlug("dental-clinic","dental-clinic"), "dental-clinic");
  assert.equal(hasExpandedDemo("nonexistent"), false);
});
