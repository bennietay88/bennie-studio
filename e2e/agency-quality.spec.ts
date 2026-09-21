import { expect, test } from "@playwright/test";
import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice } from "../src/lib/commercialPricing";

const publicRoutes = [
  "/",
  "/pricing",
  "/templates",
  "/generate-preview",
  "/preview/template/dental-clinic-v1",
  "/portfolio/sample/dental",
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000, maxHeadingLines: 3 },
  { name: "tablet", width: 1024, height: 768, maxHeadingLines: 4 },
  { name: "mobile", width: 390, height: 844, maxHeadingLines: 4 },
] as const;

async function mockAnonymousPublicDependencies(page: any) {
  await page.route("https://ipapi.co/json/", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ country_code: "US", country_name: "United States" }),
  }));
  await page.route("**/auth/v1/**", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: null, session: null }),
  }));
  await page.route("**/rest/v1/**", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([]),
  }));
  await page.route("**/api/platform-events", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true }),
  }));
  await page.route("**/api/public/pricing**", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      products: COMMERCIAL_FALLBACK_PRODUCTS.map((product) => ({
        ...product,
        price: {
          ...getCommercialPrice(product, "INTL"),
          monthlyConfigured: product.salesMotion === "self_serve",
          recurringConfigured: product.salesMotion === "self_serve",
          recurringConfigStatus: product.salesMotion === "self_serve" ? "live" : "draft",
        },
      })),
    }),
  }));
}

for (const viewport of viewports) {
  for (const route of publicRoutes) {
    test(`${route} passes ${viewport.name} visual QA`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockAnonymousPublicDependencies(page);

      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();
      await page.evaluate(async () => { await document.fonts.ready; });

      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      const heading = await h1.evaluate((node) => {
        const element = node as HTMLElement;
        const styles = getComputedStyle(element);
        const fontSize = parseFloat(styles.fontSize);
        const rawLineHeight = parseFloat(styles.lineHeight);
        const lineHeight = Number.isFinite(rawLineHeight) ? rawLineHeight : fontSize * 1.15;
        const rect = element.getBoundingClientRect();
        return {
          fontSize,
          lines: Math.max(1, Math.round(rect.height / lineHeight)),
          width: rect.width,
          viewport: window.innerWidth,
        };
      });
      expect(heading.lines, `${route} h1 is too tall at ${viewport.name}`).toBeLessThanOrEqual(viewport.maxHeadingLines);
      expect(heading.width, `${route} h1 exceeds viewport at ${viewport.name}`).toBeLessThanOrEqual(viewport.width);

      const layout = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
      }));
      expect(layout.title.trim().length).toBeGreaterThan(5);
      expect(layout.scrollWidth, `${route} horizontally overflows at ${viewport.name}`).toBeLessThanOrEqual(layout.innerWidth + 2);

      const unnamedActions = await page.locator("a:visible, button:visible").evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const element = node as HTMLElement;
            const text = element.innerText?.trim();
            const aria = element.getAttribute("aria-label")?.trim();
            const title = element.getAttribute("title")?.trim();
            return !text && !aria && !title;
          })
          .map((node) => (node as HTMLElement).outerHTML.slice(0, 220)),
      );
      expect(unnamedActions, `Visible actions on ${route} need accessible names`).toEqual([]);

      const imagesWithoutAlt = await page.locator("img").evaluateAll((nodes) =>
        nodes.filter((node) => !node.hasAttribute("alt")).map((node) => (node as HTMLImageElement).src),
      );
      expect(imagesWithoutAlt, `Images on ${route} need alt attributes`).toEqual([]);

      const brokenVisibleImages = await page.locator("img:visible").evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const image = node as HTMLImageElement;
            const source = new URL(image.src, window.location.href);
            return source.origin === window.location.origin && image.complete && image.naturalWidth === 0;
          })
          .map((node) => (node as HTMLImageElement).src),
      );
      expect(brokenVisibleImages, `Visible images on ${route} must load`).toEqual([]);

      const unsafeLinks = await page.locator("a[href]").evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("href") || "").filter((href) => href === "" || href.startsWith("javascript:")),
      );
      expect(unsafeLinks).toEqual([]);
      expect(consoleErrors, `No browser console errors are allowed on ${route}`).toEqual([]);
      expect(pageErrors, `No page errors are allowed on ${route}`).toEqual([]);
    });
  }
}

test("public navigation uses the app route transition", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockAnonymousPublicDependencies(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Pricing", exact: true }).first().click();
  await expect(page).toHaveURL(/\/pricing$/);
  const animationName = await page.locator(".bt-public-route-transition").evaluate((node) => getComputedStyle(node).animationName);
  expect(animationName).toContain("bt-public-route-enter");
});

test("template selector remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAnonymousPublicDependencies(page);
  await page.goto("/templates", { waitUntil: "networkidle" });
  const scroller = page.getByTestId("template-family-scroller");
  await expect(scroller).toBeVisible();
  const geometry = await scroller.evaluate((node) => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
  await expect(scroller.getByRole("button", { pressed: true })).toHaveCount(1);
});

test("generated customer site mobile navigation is accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAnonymousPublicDependencies(page);
  await page.goto("/preview/template/dental-clinic-v1", { waitUntil: "networkidle" });
  const menu = page.getByRole("button", { name: "Open Menu" }).first();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
});

test("sales journey exposes delivery safeguards and defined scope", async ({ page }) => {
  await mockAnonymousPublicDependencies(page);
  await page.goto("/how-it-works", { waitUntil: "networkidle" });
  await expect(page.getByText(/Generation starts the work/i)).toBeVisible();
  await expect(page.getByText(/human reviews and art-directs every paid build/i)).toBeVisible();

  await page.goto("/pricing", { waitUntil: "networkidle" });
  const fees = page.getByRole("region", { name: "What fees cover" });
  await expect(fees).toBeVisible();
  await expect(fees.getByText(/Know exactly what you are buying/i)).toBeVisible();
  await expect(page.getByText(/90-day initial commitment/i).first()).toBeVisible();
});
