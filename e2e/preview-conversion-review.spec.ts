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

test("homepage newsletter collects explicit consent separately from a free preview", async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;
  await page.route("**/api/platform-leads", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, leadId: "consent-test" }) });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const form = page.getByRole("form", { name: /Subscribe to Bennie Studio website tips/i });
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  await form.getByLabel("Work email").fill("visitor@example.com");
  await form.getByLabel("Country where you receive email").selectOption("MY");
  await form.getByLabel("Subscribing as").selectOption("business");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: /Get website tips/i }).click();
  await expect(form.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("status").getByText(/subscription has been recorded/i)).toBeVisible();
  expect(submitted).toMatchObject({
    email: "visitor@example.com",
    leadType: "newsletter_opt_in",
    marketingConsent: true,
    country: "MY",
    recipientType: "business",
    sourcePage: "/",
  });
});

test("pricing illustration accurately represents four plans and USD billing", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Illustration of four managed website service levels")).toBeVisible();
  await expect(page.getByText("All plans billed in USD. See verified fees below")).toBeVisible();
});

test("pricing visitors can request the checklist without purchasing a plan", async ({ page }) => {
  const requestBodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/platform-leads", async (route) => {
    requestBodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, leadId: "test-opt-in" }) });
  });
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  const form = page.getByRole("form", { name: "Website tips email signup" });
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  await form.getByRole("button", { name: /Send me the checklist/i }).click();
  expect(requestBodies).toHaveLength(0);
  await form.getByLabel("Email address").fill("buyer@example.com");
  await form.getByLabel("Country").selectOption("MY");
  await form.getByLabel("Subscribing as").selectOption("business");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: /Send me the checklist/i }).click();
  await expect(form.getByRole("status")).toContainText("Subscription recorded");
  expect(requestBodies).toHaveLength(1);
  expect(requestBodies[0]).toMatchObject({
    email: "buyer@example.com",
    country: "MY",
    recipientType: "business",
    leadType: "newsletter_opt_in",
    marketingConsent: true,
    sourcePage: "/pricing",
  });
});
