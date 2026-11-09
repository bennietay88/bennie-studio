import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PORTFOLIO_ITEMS, resolvePortfolioCatalog, publicPortfolioCatalog, isSafePortfolioMediaUrl } from "../src/lib/portfolioCatalog.ts";

test("portfolio provides six existing live demos and twelve unpublished design briefs", () => {
  assert.equal(DEFAULT_PORTFOLIO_ITEMS.length, 18);
  assert.equal(DEFAULT_PORTFOLIO_ITEMS.filter((item) => item.published).length, 6);
  assert.equal(DEFAULT_PORTFOLIO_ITEMS.filter((item) => !item.published).length, 12);
  assert.equal(new Set(DEFAULT_PORTFOLIO_ITEMS.map((item) => item.slug)).size, 18);
  assert.ok(DEFAULT_PORTFOLIO_ITEMS.filter((item) => item.published).every((item) => item.livePreviewSlug === item.slug));
});

test("published catalogue excludes draft designs and keeps configured display order", () => {
  const items = DEFAULT_PORTFOLIO_ITEMS.map((item) => ({ ...item }));
  items[7].published = true;
  items[7].coverImage = "/portfolio/example.webp";
  items[7].order = 0;
  const shown = publicPortfolioCatalog(items);
  assert.equal(shown.length, 7);
  assert.equal(shown[0].slug, items[7].slug);
  assert.equal(publicPortfolioCatalog(null).length, 6);
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
