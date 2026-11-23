import { expect, test } from "@playwright/test";

const marketingRoutes = ["/", "/services", "/dental-clinics", "/website-audit",
  "/templates", "/book-demo", "/contact"];
const widths = [
  { name: "desktop", width: 1440, height: 900, minH1: 44, maxH1: 96 },
  { name: "tablet", width: 1024, height: 820, minH1: 38, maxH1: 90 },
  { name: "mobile", width: 390, height: 844, minH1: 32, maxH1: 56 },
];

test.describe("Bennie Studio design-system master QA", () => {
  for (const viewport of widths) {
    for (const route of marketingRoutes) {
      test(viewport.name+" "+route+" uses shared chrome, readable H1 and no horizontal overflow", async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("header").first()).toBeVisible();
        await expect(page.locator("footer").last()).toBeVisible();
        await expect(page.locator("nav[aria-label='Main navigation']")).toBeVisible();
        const h1 = page.locator("main h1").first();
        await expect(h1).toBeVisible();
        const size = await h1.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
        expect(size).toBeGreaterThanOrEqual(viewport.minH1 - 0.5);
        expect(size).toBeLessThanOrEqual(viewport.maxH1 + 0.5);
        const overflow = await page.evaluate(() => ({
          body: document.body.scrollWidth,
          doc: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }));
        expect(Math.max(overflow.body,overflow.doc)).toBeLessThanOrEqual(overflow.viewport + 2);
        const hero = page.locator(".c27-marketing-hero .brand-shell").first();
        if (viewport.width >= 1024 && await hero.count()) {
          const columns = hero.locator(":scope > div");
          if (await columns.count() >= 2) {
            const left = await columns.nth(0).boundingBox();
            const right = await columns.nth(1).boundingBox();
            expect(left&&right ? right.x-(left.x+left.width) : 0).toBeGreaterThanOrEqual(39.5);
          }
        }
        if (viewport.width===390) {
          const bounding = await h1.boundingBox();
          expect(bounding?.x ?? -1).toBeGreaterThanOrEqual(0);
          expect((bounding?.x||0)+(bounding?.width||0)).toBeLessThanOrEqual(392);
        }
      });
    }
  }
  test("shared navigation exposes the five primary links and footer navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/services");
    for (const label of ["Services","Website Examples","Pricing","How it works","About"]) {
      await expect(page.locator("nav[aria-label='Main navigation']").getByRole("link", { name: label, exact: true })).toHaveCount(1);
    }
    await expect(page.getByRole("link",{name:"Client login",exact:true}).first()).toBeVisible();
    await expect(page.locator("footer").last()).toHaveCSS("background-color","rgb(23, 43, 66)");
  });
});
