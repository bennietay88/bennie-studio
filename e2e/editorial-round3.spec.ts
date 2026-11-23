import { expect, test } from "@playwright/test";

const routes = ["/case-studies", "/how-it-works", "/about"];

for (const route of routes) {
  test(`${route} has one main and visible conversion routes`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main").getByRole("link", { name: /free website preview|preview a site for my business/i }).first()).toBeVisible();
  });

  for (const width of [320, 390, 768, 1440]) {
    test(`${route} is responsive at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 820 });
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width + 3);
    });
  }
}

test("portfolio filters work, clear and open real study pages", async ({ page }) => {
  await page.goto("/case-studies", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-testid=editorial-work-page]")).toHaveCount(1);
  await expect(page.locator("[data-testid=portfolio-card]").first()).toBeVisible();
  await expect(page.locator(".s32-portfolio-disclosure")).toContainText("not presented as client projects");
  const initial = await page.locator("[data-testid=portfolio-card]").count();
  expect(initial).toBeGreaterThan(0);
  const category = page.getByRole("combobox", { name: "Filter by industry" });
  await category.selectOption({ index: 1 });
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
  const reduced = await page.locator("[data-testid=portfolio-card]").count();
  expect(reduced).toBeGreaterThan(0);
  expect(reduced).toBeLessThanOrEqual(initial);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("[data-testid=portfolio-card]")).toHaveCount(initial);
  await page.locator("[data-testid=portfolio-card]").first().getByRole("link", { name: /View .* design study/i }).click();
  await expect(page).toHaveURL(/\/case-studies\/showcase\/[^/]+$/);
});

test("all process steps are visible and the commercial boundary is explicit", async ({ page }) => {
  await page.goto("/how-it-works", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".s32-step")).toHaveCount(5);
  await expect(page.locator(".s32-step-stage-free")).toHaveCount(2);
  await expect(page.locator(".s32-commitment")).toContainText("No card, no obligation");
  await expect(page.locator(".s32-input-list li")).toHaveCount(4);
  const questions = page.locator(".s32-accordion details");
  await expect(questions).toHaveCount(5);
  await questions.first().locator("summary").click();
  await expect(questions.first()).toHaveAttribute("open");
});

test("about page identifies the founder without invented portrait or results", async ({ page }) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".s32-founder-card")).toContainText("Bennie Tay");
  await expect(page.locator(".s32-founder-mark")).toHaveText("BT");
  await expect(page.locator(".s32-evidence-copy")).toContainText("Avoid invented proof");
  await expect(page.locator(".s32-standards-grid article")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /Review plan scope and pricing/i })).toHaveAttribute("href", "/pricing");
});
