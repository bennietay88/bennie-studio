import { expect, test } from "@playwright/test";

// P2 mobile navigation: test what customers actually experience at narrow widths.
test("mobile menu is a body-level dialog with trapped focus and restored scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await expect(trigger).toBeVisible();
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(await dialog.evaluate((node) => node.parentElement?.parentElement === document.body)).toBe(true);
  await expect(dialog.getByRole("button", { name: "Close navigation menu" })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  // Shift+Tab from the first focusable control wraps to the final CTA.
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("link", { name: /Get a free website preview/i })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close navigation menu" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("mobile menu exits cleanly when window expands to desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto("/services", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("dialog", { name: "Navigation menu" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Pricing" })).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("short-screen navigation keeps the bottom action reachable and route changes close the menu", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 430 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Navigation menu" });
  const action = dialog.getByRole("link", { name: /Get a free website preview/i });
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeInViewport();
  await action.click();
  await expect(page).toHaveURL(/\/generate-preview(?:\?|$)/);
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("reduced-motion styles are scoped to the public marketing shell", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const duration = await page.locator(".sfn-signature-window").first().evaluate(
    (node) => getComputedStyle(node).animationDuration,
  );
  expect(duration.split(",").every((value) => {
    const seconds = value.trim().endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
    return Number.isFinite(seconds) && seconds <= 0.01;
  })).toBe(true);
  await expect(page.locator("header.sfn-header")).toBeVisible();
});
