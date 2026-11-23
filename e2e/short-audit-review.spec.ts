import { expect, test } from "@playwright/test";

const code = "AbCdEfGhIjKlMnOpQrStUv"; // Valid 22-character link; fixture, not a real token.
const report = {
  schemaVersion: 2,
  analyzedUrl: "https://example.test",
  analyzedAt: "2026-11-08T00:00:00Z",
  summary: "Your website could make enquiries easier.",
  findings: [{
    id: "short-link-fixture",
    category: "Conversion",
    title: "Make your enquiry button clearer",
    whatWeFound: "The next step is not prominent.",
    whyItMatters: "Visitors may leave without contacting the business.",
    recommendation: "Add a clear quotation button.",
    exampleImprovement: "Request a quote",
    priority: "high",
    observation: "confirmed",
  }],
};

test("new short review URL displays the private report without long query strings", async ({ page }) => {
  let shortLookupRequests = 0;
  await page.route(`**/api/public/website-audit/shares/${code}`, async (route) => {
    shortLookupRequests++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "private, no-store" },
      body: JSON.stringify({
        id: "00000000-0000-4000-8000-000000000999",
        businessName: "Example Services",
        status: "completed",
        deliveryStatus: "skipped",
        report,
      }),
    });
  });
  await page.goto(`/review/${code}`);
  await expect(page.getByText("Website review complete")).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("link", { name: "Open report" })).toHaveAttribute("href", `/review/${code}`);
  await expect(page.locator('meta[name="robots"][content="noindex,nofollow"]').first()).toHaveCount(1);
  // React StrictMode intentionally mounts effects twice in development; both reads are safe and private.
  expect(shortLookupRequests).toBeGreaterThanOrEqual(1);
  expect(shortLookupRequests).toBeLessThanOrEqual(2);
  expect(new URL(page.url()).search).toBe("");
});

test("invalid short report codes are rejected without exposing report data", async ({ request }) => {
  const response = await request.get("/api/public/website-audit/shares/not-a-valid-code");
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ error: "Review not found." });
});
