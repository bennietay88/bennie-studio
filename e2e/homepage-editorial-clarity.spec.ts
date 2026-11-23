import { expect, test } from "@playwright/test";

test("homepage removes dated branding and curates exactly three uniquely numbered concepts", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const main = page.locator("main");
  await expect(main).not.toContainText(/est\\.\\s*2026/i);
  const cards = main.locator(".sfn-work-card");
  await expect(cards).toHaveCount(3);
  const labels = await cards.locator(".sfn-work-card-top > span:first-child").allTextContents();
  expect(labels.map((label) => label.trim().slice(0, 2))).toEqual(["01", "02", "03"]);
  await expect(main.getByRole("heading", { name: "Different businesses. Different design directions." })).toBeVisible();
});

test("all four process steps are visible without previous or next controls", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const process = page.locator(".c26-process");
  const steps = process.locator(".sfn-timeline-all > li");
  await expect(steps).toHaveCount(4);
  for (const [index, title] of ["Share your business", "Review your preview", "Approve, build and launch", "Ongoing website care"].entries()) {
    await expect(steps.nth(index).getByRole("heading", { name: title })).toBeVisible();
  }
  await expect(process.getByRole("button", { name: /Previous step|Next step/i })).toHaveCount(0);
});

test("homepage footer is clean with no newsletter or empty signup disclosure", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator("footer").getByRole("form", { name: "Website tips email signup" })).toHaveCount(0);
  await expect(page.locator(".c26-footer-newsletter")).toHaveCount(0);
  await expect(page.locator("footer").getByText(/Website improvement tips/i)).toHaveCount(0);
  await expect(page.locator("footer").getByRole("link", { name: /Bennie Studio Websites that/i })).toBeVisible();
});

test("pricing offers two highlighted plans and preserves the other product links", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const plans = page.locator("#plans");
  await expect(plans.locator("article")).toHaveCount(2);
  for (const name of ["Managed Website", "Website Growth"]) {
    await expect(plans.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(plans.getByRole("link", { name: "Personal Profile" })).toBeVisible();
  await expect(plans.getByRole("link", { name: "Growth Partner" })).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test("homepage layout and headline remain readable at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 820 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const docWidth = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
    expect(docWidth).toBeLessThanOrEqual(width + 3);
    const heading = page.locator(".sfn-signature-window .sfn-concept-title");
    await expect(heading).toBeVisible();
    const styles = await heading.evaluate(el => ({
      wordBreak: getComputedStyle(el).wordBreak,
      overflowWrap: getComputedStyle(el).overflowWrap,
      fontSize: parseFloat(getComputedStyle(el).fontSize),
    }));
    expect(styles.wordBreak).toBe("normal");
    expect(styles.overflowWrap).toBe("normal");
    expect(styles.fontSize).toBeGreaterThanOrEqual(20);
    const processHeading = await page.locator(".c26-process h2").evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    const proofHeading = await page.locator(".c27-studio-proof h2").evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(Math.abs(processHeading - proofHeading)).toBeLessThan(3);
  });
}

test("process is singular, with a real founder byline and a visual proof section", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".c26-process")).toHaveCount(1);
  await expect(page.locator(".c26-services")).toHaveCount(0);
  const proof = page.locator(".c27-studio-proof");
  await expect(proof.getByText("Bennie Tay", { exact: true })).toBeVisible();
  await expect(proof.locator(".c27-proof-browser")).toBeVisible();
  await expect(page.locator(".sfn-work-card .c27-work-browser")).toHaveCount(3);
  await expect(page.locator(".sfn-work-card .sfn-concept-cta")).toHaveCount(3);
});

test("pricing has distinct calls to action and prominent secondary plans", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const pricing = page.locator("#plans");
  await expect(pricing.getByRole("button", { name: /Get a free website preview/i })).toBeVisible();
  await expect(pricing.getByRole("button", { name: /View Managed Website plan/i })).toBeVisible();
  await expect(pricing.locator(".c27-alternative-option")).toHaveCount(2);
});
