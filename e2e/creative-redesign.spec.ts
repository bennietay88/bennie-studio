import { test, expect } from "@playwright/test";

test.describe("Bennie Studio expressive public redesign", () => {
  test("homepage has a composed design stage instead of an iframe", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const stage = page.getByLabel("Three website directions");
    await expect(stage).toBeVisible();
    await expect(stage.locator("iframe")).toHaveCount(0);
    await expect(stage.getByRole("tabpanel")).toHaveAttribute("aria-label", /LOCAL SERVICE/);
    await stage.getByRole("tab", { name: /HEALTHCARE/ }).click();
    await expect(stage.getByRole("tabpanel")).toHaveAttribute("aria-label", /HEALTHCARE/);
    await expect(stage.getByText("A calmer first impression.")).toBeVisible();
    await stage.getByRole("button", { name: "Next design" }).click();
    await expect(stage.getByRole("tabpanel")).toHaveAttribute("aria-label", /PROFESSIONAL/);
    await expect(stage.getByRole("link", { name: /Explore design decisions/i })).toHaveAttribute("href", /professional-advisory/);
    await expect(page.getByRole("heading", { name: /Different businesses/i })).toBeVisible();
    await expect(page.locator(".sfn-work-card")).toHaveCount(3);
  });

  for (const width of [390, 1024, 1440]) {
    test(`homepage and studio work do not overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 820 });
      for (const route of ["/", "/case-studies", "/case-studies/showcase/dental-clinic", "/services", "/pricing"]) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("main h1").first()).toBeVisible();
        const size = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
        }));
        expect(Math.max(size.documentWidth, size.bodyWidth), `${route} at ${width}px`).toBeLessThanOrEqual(size.viewportWidth + 3);
      }
    });
  }

  test("concept labeling and free preview path survive creative styling", async ({ page }) => {
    await page.goto("/case-studies/showcase/dental-clinic");
    await expect(page.getByText(/Illustrative design concept, not a claimed client/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Get a preview for my business/i })).toHaveAttribute("href", /generate-preview/);
  });
});
