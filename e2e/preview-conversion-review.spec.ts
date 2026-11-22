import { expect, test } from "@playwright/test";

test("free-preview visitor can explore locally without entering an email or submitting a lead", async ({ page }) => {
  const postRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/(?:public\/(?:platform-leads|preview-intake|preview-site)|platform-leads)/.test(new URL(request.url()).pathname)) {
      postRequests.push(request.url());
    }
  });
  await page.goto("/generate-preview", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /I need a website from scratch/i }).click();
  await page.locator("#preview-business-type").selectOption("dental-clinic");
  await page.locator("#preview-business").fill("Sample Dental");
  await page.getByRole("button", { name: /Show instant concept/i }).click();

  await expect(page.locator("#generated-preview")).toBeVisible();
  await expect(page.getByText(/Unsaved illustrative concept/)).toBeVisible();
  expect(postRequests).toEqual([]);
  await expect(page.locator("#preview-email")).toHaveValue("");
  await expect(page.locator("#generated-preview")).toContainText("Sample Dental");
  await expect(page.getByRole("button", { name: /Explore plans & pricing/i })).toBeVisible();
  await page.getByRole("button", { name: /Explore plans & pricing/i }).click();
  await expect(page).toHaveURL(/\/pricing$/);
});

test("mobile conversion paths have no horizontal overflow and remain usable", async ({ page }) => {
  for (const width of [320, 375, 390, 768]) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of ["/", "/services", "/pricing", "/case-studies", "/generate-preview"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal scroll on ${route} at ${width}px`).toBeLessThanOrEqual(2);
    }
  }
});

test("public site distinguishes studio examples from commissioned client work", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: /Website Examples/i })).toBeVisible();
  await expect(page.getByText(/not client commissions or measured commercial results/i)).toBeVisible();
});
