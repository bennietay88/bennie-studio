import { expect, test } from "@playwright/test";
import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice } from "../src/lib/commercialPricing";

const publicRoutes = ["/", "/pricing", "/how-it-works", "/generate-preview"];

for (const route of publicRoutes) {
  test(`${route} passes public agency QA`, async ({ page }) => {
    await page.route("https://ipapi.co/json/", (request) => request.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ country_code: "US", country_name: "United States" }),
    }));
    await page.route("**/api/public/pricing**", (request) => request.fulfill({
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
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();

    await expect(page.locator("h1").first()).toBeVisible();
    const descriptions = page.locator('meta[name="description"]');
    expect(await descriptions.count(), `${route} should expose at least one meta description`).toBeGreaterThanOrEqual(1);
    expect(await descriptions.last().getAttribute("content")).toBeTruthy();

    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      title: document.title,
    }));
    expect(layout.title.trim().length).toBeGreaterThan(5);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 2);

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
      nodes
        .filter((node) => !node.hasAttribute("alt"))
        .map((node) => (node as HTMLImageElement).src),
    );
    expect(imagesWithoutAlt, `Images on ${route} need alt attributes`).toEqual([]);

    const unsafeLinks = await page.locator("a[href]").evaluateAll((nodes) =>
      nodes
        .map((node) => node.getAttribute("href") || "")
        .filter((href) => href === "" || href.startsWith("javascript:")),
    );
    expect(unsafeLinks).toEqual([]);

    expect(consoleErrors, `No browser console errors are allowed on ${route}`).toEqual([]);
  });
}

test("sales journey exposes delivery safeguards and defined scope", async ({ page }) => {
  await page.route("https://ipapi.co/json/", (request) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ country_code: "US", country_name: "United States" }),
  }));
  await page.route("**/api/public/pricing**", (request) => request.fulfill({
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
  await page.goto("/how-it-works", { waitUntil: "networkidle" });
  await expect(page.getByText(/Generation starts the work/i)).toBeVisible();
  await expect(page.getByText(/human reviews and art-directs every paid build/i)).toBeVisible();

  await page.goto("/pricing", { waitUntil: "networkidle" });
  await expect(page.getByText(/Know exactly what you are buying/i).first()).toBeVisible();
  await expect(page.getByText(/90-day initial commitment/i).first()).toBeVisible();
});
