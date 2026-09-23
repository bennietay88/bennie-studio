import { expect, test } from "@playwright/test";
import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice } from "../src/lib/commercialPricing";

const publicRoutes = [
  "/",
  "/pricing",
  "/templates",
  "/generate-preview",
  "/preview/template/dental-clinic-v1",
  "/preview/template/managed-website-agency-v1",
  "/portfolio/sample/dental",
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000, maxHeadingLines: 3 },
  { name: "tablet", width: 1024, height: 768, maxHeadingLines: 4 },
  { name: "mobile", width: 390, height: 844, maxHeadingLines: 4 },
] as const;

async function mockAnonymousPublicDependencies(page: any) {
  await page.route("https://ipapi.co/json/", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ country_code: "US", country_name: "United States" }),
  }));
  await page.route("**/auth/v1/**", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: null, session: null }),
  }));
  await page.route("**/rest/v1/**", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([]),
  }));
  await page.route("**/api/platform-events", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true }),
  }));
  await page.route("**/api/public/pricing**", (request: any) => request.fulfill({
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
}

for (const viewport of viewports) {
  for (const route of publicRoutes) {
    test(`${route} passes ${viewport.name} visual QA`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockAnonymousPublicDependencies(page);

      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();
      await page.evaluate(async () => { await document.fonts.ready; });

      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      const heading = await h1.evaluate((node) => {
        const element = node as HTMLElement;
        const styles = getComputedStyle(element);
        const fontSize = parseFloat(styles.fontSize);
        const rawLineHeight = parseFloat(styles.lineHeight);
        const lineHeight = Number.isFinite(rawLineHeight) ? rawLineHeight : fontSize * 1.15;
        const rect = element.getBoundingClientRect();
        return {
          fontSize,
          lines: Math.max(1, Math.round(rect.height / lineHeight)),
          width: rect.width,
          viewport: window.innerWidth,
        };
      });
      expect(heading.lines, `${route} h1 is too tall at ${viewport.name}`).toBeLessThanOrEqual(viewport.maxHeadingLines);
      expect(heading.width, `${route} h1 exceeds viewport at ${viewport.name}`).toBeLessThanOrEqual(viewport.width);

      const layout = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
      }));
      expect(layout.title.trim().length).toBeGreaterThan(5);
      expect(layout.scrollWidth, `${route} horizontally overflows at ${viewport.name}`).toBeLessThanOrEqual(layout.innerWidth + 2);

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
        nodes.filter((node) => !node.hasAttribute("alt")).map((node) => (node as HTMLImageElement).src),
      );
      expect(imagesWithoutAlt, `Images on ${route} need alt attributes`).toEqual([]);

      const brokenVisibleImages = await page.locator("img:visible").evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const image = node as HTMLImageElement;
            const source = new URL(image.src, window.location.href);
            return source.origin === window.location.origin && image.complete && image.naturalWidth === 0;
          })
          .map((node) => (node as HTMLImageElement).src),
      );
      expect(brokenVisibleImages, `Visible images on ${route} must load`).toEqual([]);

      const unsafeLinks = await page.locator("a[href]").evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("href") || "").filter((href) => href === "" || href.startsWith("javascript:")),
      );
      expect(unsafeLinks).toEqual([]);
      expect(consoleErrors, `No browser console errors are allowed on ${route}`).toEqual([]);
      expect(pageErrors, `No page errors are allowed on ${route}`).toEqual([]);
    });
  }
}

test("public navigation uses the app route transition", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockAnonymousPublicDependencies(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Pricing", exact: true }).first().click();
  await expect(page).toHaveURL(/\/pricing$/);
  const animationName = await page.locator(".bt-public-route-transition").evaluate((node) => getComputedStyle(node).animationName);
  expect(animationName).toContain("bt-public-route-enter");
});

test("template selector remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAnonymousPublicDependencies(page);
  await page.goto("/templates", { waitUntil: "networkidle" });
  const scroller = page.getByTestId("template-family-scroller");
  await expect(scroller).toBeVisible();
  const geometry = await scroller.evaluate((node) => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
  await expect(scroller.getByRole("button", { pressed: true })).toHaveCount(1);
});

test("generated customer site mobile navigation is accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAnonymousPublicDependencies(page);
  await page.goto("/preview/template/dental-clinic-v1", { waitUntil: "networkidle" });
  const menu = page.getByRole("button", { name: "Open Menu" }).first();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  const closeMenu = page.getByRole("button", { name: "Close Menu" }).first();
  await expect(closeMenu).toHaveAttribute("aria-expanded", "true");
});

test("sales journey exposes delivery safeguards and defined scope", async ({ page }) => {
  await mockAnonymousPublicDependencies(page);
  await page.goto("/how-it-works", { waitUntil: "networkidle" });
  await expect(page.getByText(/Generation starts the work/i)).toBeVisible();
  await expect(page.getByText(/human reviews and art-directs every paid build/i)).toBeVisible();

  await page.goto("/pricing", { waitUntil: "networkidle" });
  const plans = page.locator("#plans");
  await expect(plans).toBeVisible();
  const fees = plans.locator('section[aria-label="What fees cover"]');
  await expect(fees).toBeVisible();
  await expect(fees.getByText(/Know exactly what you are buying/i)).toBeVisible();
  await expect(page.getByText(/90-day initial commitment/i).first()).toBeVisible();
});


test("generated managed website preview uses agency architecture and AA-readable text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockAnonymousPublicDependencies(page);

  const leadId = "11111111-1111-4111-8111-111111111111";
  await page.route("**/api/platform-leads", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, leadId }),
  }));
  await page.route("**/api/public/preview-intake", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      profile: {
        sourceUrl: "https://bennietay.com/",
        businessName: "Bennie Studio",
        description: "Bennie Studio builds and manages conversion-focused websites for service businesses, helping turn visits into enquiries.",
        location: "Kuala Lumpur",
        contactEmail: "hello@bennietay.com",
        contactPhone: "+60123456789",
        services: [
          "Managed website services",
          "Managed Lead-Generation Website",
          "Custom Website Design",
          "Website Audit",
        ],
        heroImage: "/brand-template-preview.svg",
        sourceTitle: "Bennie Studio",
        aiUsed: false,
        estimatedAiCostUsd: 0,
      },
    }),
  }));
  await page.route("**/api/public/preview-site", (request: any) => request.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      businessId: "22222222-2222-4222-8222-222222222222",
      websiteId: "33333333-3333-4333-8333-333333333333",
      shareUrl: "/w/22222222-2222-4222-8222-222222222222",
    }),
  }));

  await page.goto("/generate-preview", { waitUntil: "domcontentloaded" });
  const previewUrlInput = page.locator("#preview-url-first");
  await expect(previewUrlInput).toBeVisible({ timeout: 15000 });
  await previewUrlInput.fill("https://bennietay.com");
  await page.locator("#preview-url-business-type").selectOption("web-marketing-agency");
  await page.locator("#preview-name").fill("Bennie Tay");
  await page.locator("#preview-email").fill("bennie@example.com");
  await page.locator("#preview-phone").fill("+60123456789");
  await page.getByRole("button", { name: /Build preview from my URL/i }).click();

  await expect(page.getByText(/Interactive \d+-page preview/i)).toBeVisible({ timeout: 15000 });
  const renderer = page.locator(".bt-website-renderer").last();
  await expect(renderer).toBeVisible();

  const primary = await renderer.evaluate((node) => getComputedStyle(node).getPropertyValue("--primary").trim());
  expect(primary.toLowerCase()).toBe("#5746e8");

  const primaryNav = renderer.getByRole("navigation", { name: "Main Navigation" });
  const pageLabels = await primaryNav.locator("[data-website-page-nav]").allTextContents();
  const normalizedLabels = pageLabels.map((label) => label.trim()).filter(Boolean);
  for (const required of ["Home", "Services", "About", "Contact"]) {
    expect(normalizedLabels).toContain(required);
  }
  expect(normalizedLabels.length).toBeGreaterThanOrEqual(3);
  expect(normalizedLabels.length).toBeLessThanOrEqual(5);
  expect(normalizedLabels).not.toContain("Programs");

  const auditVisibleTextContrast = async () => renderer.locator("main").evaluate((root) => {
    const parseColor = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      if (parts.length < 3 || parts.some((part, index) => index < 3 && !Number.isFinite(part))) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
    };
    const channel = (value: number) => {
      const normalized = value / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color: { r: number; g: number; b: number }) =>
      0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    const ratio = (foreground: { r: number; g: number; b: number }, background: { r: number; g: number; b: number }) => {
      const a = luminance(foreground);
      const b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };

    const candidates = Array.from(root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,label,a,button,span"))
      .filter((node) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return Boolean(element.innerText?.trim()) && rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });

    const failures: Array<{ text: string; ratio: number; threshold: number; color: string; background: string }> = [];
    for (const node of candidates) {
      const element = node as HTMLElement;
      const style = getComputedStyle(element);
      const foreground = parseColor(style.color);
      if (!foreground || foreground.a < 0.95) continue;

      let cursor: HTMLElement | null = element;
      let background: ReturnType<typeof parseColor> = null;
      let complexSurface = false;
      while (cursor && root.contains(cursor)) {
        const cursorStyle = getComputedStyle(cursor);
        if (cursorStyle.backgroundImage && cursorStyle.backgroundImage !== "none") {
          complexSurface = true;
          break;
        }
        const candidate = parseColor(cursorStyle.backgroundColor);
        if (candidate && candidate.a >= 0.98) {
          background = candidate;
          break;
        }
        if (candidate && candidate.a > 0 && candidate.a < 0.98) {
          complexSurface = true;
          break;
        }
        cursor = cursor.parentElement;
      }
      if (complexSurface || !background) continue;

      const fontSize = Number.parseFloat(style.fontSize);
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const threshold = large ? 3 : 4.5;
      const measured = ratio(foreground, background);
      if (measured + 0.01 < threshold) {
        failures.push({
          text: element.innerText.trim().slice(0, 100),
          ratio: Number(measured.toFixed(2)),
          threshold,
          color: style.color,
          background: "rgb(" + background.r + ", " + background.g + ", " + background.b + ")",
        });
      }
    }
    return failures.slice(0, 20);
  });

  for (const title of ["Home", "Services", "About", "Contact"]) {
    const navButton = renderer.locator("nav button").filter({ hasText: title }).first();
    if (title !== "Home") await navButton.click();
    await expect(renderer.locator("main h1").first()).toBeVisible();
    const failures = await auditVisibleTextContrast();
    expect(failures, title + " generated preview has low-contrast visible text").toEqual([]);
  }
});
