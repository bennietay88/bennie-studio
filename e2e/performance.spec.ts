import { test } from "@playwright/test";
import { expect } from "@playwright/test";

test("public homepage records navigation and rendering performance", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0 };
    Object.assign(window, { __performanceMetrics: metrics });
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput) metrics.cls += shift.value || 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch { /* Browser support varies; unsupported measurements are not zero-latency claims. */ }
  });
  const response = await page.goto("/", { waitUntil: "load" });
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("h1").first()).toBeVisible();
  await page.waitForTimeout(1200);
  const result = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const m = (window as unknown as { __performanceMetrics: { lcp: number; cls: number } }).__performanceMetrics;
    return { lcpMs: m.lcp || null, cls: m.cls, ttfbMs: nav?.responseStart ?? null, loadMs: nav?.loadEventEnd ?? null };
  });
  await testInfo.attach("public-performance.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  if (process.env.STRICT_PERFORMANCE === "true" && testInfo.project.name.includes("chromium")) {
    expect(result.lcpMs).not.toBeNull();
    expect(result.lcpMs!).toBeLessThanOrEqual(2500);
    expect(result.cls).toBeLessThanOrEqual(0.1);
  }
});
