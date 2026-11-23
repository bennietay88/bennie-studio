import { expect, test } from "@playwright/test";

test("marketing footer is legible and uses a compact desktop grid", async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/", {waitUntil:"domcontentloaded"});
  const footer=page.locator(".sfn-footer");
  await expect(footer).toBeVisible();
  const diagnostics=await footer.evaluate(el => {
    const desc=el.querySelector("p");
    const groups=[...el.querySelectorAll(":scope > div:first-child > div")];
    const style=getComputedStyle(el);
    const text=desc?getComputedStyle(desc).color:"";
    return {background:style.backgroundColor,text,gridCols:getComputedStyle(el.querySelector(":scope > div")!).gridTemplateColumns,groups:groups.length};
  });
  expect(diagnostics.background).toBe("rgb(23, 43, 66)");
  expect(diagnostics.text).toBe("rgb(229, 237, 248)");
  expect(diagnostics.gridCols.split(" ").length).toBe(6);
  expect(diagnostics.groups).toBeGreaterThanOrEqual(5);
});

test("portfolio has no empty screenshot placeholders", async ({page}) => {
  await page.goto("/case-studies", {waitUntil:"domcontentloaded"});
  await expect(page.getByText("Screenshot to be added")).toHaveCount(0);
  await expect(page.locator('[data-testid="portfolio-card"]')).toHaveCount(18);
  await expect(page.locator(".portfolio-concept-preview")).not.toHaveCount(0);
  const cards=page.locator('[data-testid="portfolio-card"]');
  for (const i of [6,7,8]) {
    await expect(cards.nth(i).locator(".portfolio-concept-preview")).toBeVisible();
    await expect(cards.nth(i).locator(".portfolio-concept-message > strong")).not.toBeEmpty();
  }
});

test("unverified prices do not masquerade as monthly quote amounts", async ({page}) => {
  await page.goto("/pricing", {waitUntil:"domcontentloaded"});
  await expect(page.locator(".s28-price-card")).toHaveCount(4);
  const first=page.locator(".s28-price-card").first();
  await expect(first.locator(".s28-price-amount")).toBeVisible();
  await expect(first.locator(".s28-price-amount")).not.toHaveText("Ask for quote");
  await expect(first.locator(".s28-price-amount")).not.toHaveText("By quote");
  // The rate can be live or unavailable. If unavailable, enquiry remains possible
  // but checkout cannot silently use invented fallback dollars.
  if (await first.locator(".s28-price-amount").textContent() === "Price unavailable") {
    await expect(first.locator(".s28-price-period")).toHaveCount(0);
    await expect(first.getByRole("button",{name:/Ask about this plan/i})).toBeEnabled();
  }
});
