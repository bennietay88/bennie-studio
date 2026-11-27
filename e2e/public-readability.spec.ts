import { test, expect } from "@playwright/test";

/** The user-visible public site must not depend on incidental CSS inheritance
 * for readable text. Check actual browser-computed foreground/background pairs.
 * These are surfaces without image overlays or transparent gradients. */
const samples = [
  { route: "/", selector: ".sfn-hero h1", surface: ".sfn-hero", label: "home headline" },
  { route: "/", selector: ".sfn-hero h1 em", surface: ".sfn-hero", label: "home emphasized headline" },
  { route: "/", selector: ".sfn-hero .c26-intro", surface: ".sfn-hero", label: "home value proposition" },
  { route: "/", selector: ".c26-value .c26-value-description", surface: ".c26-value", label: "dark benefits copy" },
  { route: "/", selector: ".sfn-work-heading p:not(.sfn-kicker)", surface: ".sfn-work-section", label: "work intro" },
  { route: "/services", selector: ".s28-services-copy h1", surface: ".s28-services-hero", label: "services headline" },
  { route: "/services", selector: ".s28-services-copy h1 em", surface: ".s28-services-hero", label: "services heading emphasis" },
  { route: "/services", selector: ".s28-services-copy .s28-large-copy", surface: ".s28-services-hero", label: "services body" },
  { route: "/services", selector: ".s28-services-copy .s28-text-link", surface: ".s28-services-hero", label: "services text CTA" },
  { route: "/services", selector: ".s28-services-showcase-art .s28-art-caption", surface: ".s28-services-showcase-art", label: "services art caption" },
  { route: "/pricing", selector: ".s28-pricing-hero h1", surface: ".s28-pricing-hero", label: "pricing headline" },
  { route: "/pricing", selector: ".s28-pricing-hero-content > p", surface: ".s28-pricing-hero", label: "pricing description" },
  { route: "/case-studies/showcase/dental-clinic", selector: ".sfn-study-intro .c27-major", surface: ".sfn-study-intro", label: "case-study headline" },
  { route: "/case-studies/showcase/dental-clinic", selector: ".sfn-study-intro .c27-quiet", surface: ".sfn-study-intro", label: "case-study back link" },
] as const;

const parseRgb = (color: string) => {
  const parts = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
  return parts.length === 3 ? parts : null;
};
const luminance = (rgb: number[]) => {
  const [r,g,b] = rgb.map(c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (text: string, background: string) => {
  const foreground = parseRgb(text), surface = parseRgb(background);
  if (!foreground || !surface) throw new Error(`Unexpected color ${text} or ${background}`);
  const a = luminance(foreground), b = luminance(surface);
  return (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05);
};

for (const route of ["/", "/services", "/pricing", "/case-studies/showcase/dental-clinic"]) {
  test(`readable text contrast on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    for (const sample of samples.filter(x => x.route === route)) {
      const item = page.locator(sample.selector).first();
      await expect(item).toBeVisible();
      const colors = await page.evaluate(({ selector, surface }) => {
        const fg = document.querySelector(selector), bg = document.querySelector(surface);
        if (!fg || !bg) throw Error(`Missing public element: ${selector}`);
        return { color: getComputedStyle(fg).color, background: getComputedStyle(bg).backgroundColor,
          fontPx: parseFloat(getComputedStyle(fg).fontSize) };
      }, sample);
      const ratio = contrast(colors.color, colors.background);
      expect(ratio, `${sample.label} ratio ${ratio.toFixed(2)}:1, ${colors.color} on ${colors.background}`).toBeGreaterThanOrEqual(4.5);
      expect(colors.fontPx, `${sample.label} must be at least 14px`).toBeGreaterThanOrEqual(14);
    }
  });
}

test("home portfolio contains large legible concept copy, not tiny preview thumbnails", async ({ page }) => {
  await page.goto("/", {waitUntil:"domcontentloaded"});
  const stage = page.locator(".sfn-signature-window .sfn-concept");
  await expect(stage).toBeVisible();
  await expect(stage.locator(".bt-template-preview")).toHaveCount(0);
  await expect(page.locator(".sfn-work-card")).toHaveCount(3);
  const heading = await stage.locator(".sfn-concept-title").evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(heading).toBeGreaterThanOrEqual(22);
});


test("desktop public navigation tagline stays readable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const tagline = page.locator("header.sfn-header").getByText("Websites that convert", { exact: true });
  await expect(tagline).toBeVisible();
  const fontSize = await tagline.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize, "brand tagline should never render below 12px on desktop").toBeGreaterThanOrEqual(12);
});

test("process copy does not promise zero commitment for every plan", async ({ page }) => {
  await page.goto("/how-it-works", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/there is no minimum term|with no minimum term/i)).toHaveCount(0);
  await expect(page.getByText(/minimum commitment/i).first()).toBeVisible();
});


test("pricing comparison text remains readable on desktop and mobile", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    const selector = width < 768 ? ".s28-compare section[aria-label] :is(dt,dd)" : ".s28-compare table :is(th,td)";
    const cells = page.locator(selector);
    await expect(cells.first()).toBeVisible();
    const colors = await cells.evaluateAll(elements => elements.map(element => {
      let surface: Element | null = element;
      while (surface && getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)") surface = surface.parentElement;
      const style = getComputedStyle(element);
      return { text: element.textContent, color: style.color, background: surface ? getComputedStyle(surface).backgroundColor : "rgb(255, 255, 255)", size: parseFloat(style.fontSize) };
    }));
    for (const cell of colors) {
      expect(contrast(cell.color, cell.background), cell.text || "comparison cell").toBeGreaterThanOrEqual(4.5);
      expect(cell.size, cell.text || "comparison cell").toBeGreaterThanOrEqual(14);
    }
  }
});

test("public navigation keeps a stable untransformed route shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/services", { waitUntil: "domcontentloaded" });
  const shell = page.locator(".bt-public-route-transition");
  await expect(shell).toBeVisible();
  const handle = await shell.elementHandle();
  if (!handle) throw new Error("Missing public route shell");
  const pricing = page.locator('header a[href="/pricing"]').first();
  await expect(pricing).toBeVisible();
  await pricing.hover();
  await pricing.click();
  await expect(page).toHaveURL(/\/pricing(?:[?#].*)?$/);
  await expect(page.locator(".s28-compare")).toBeVisible();
  expect(await handle.evaluate(el => el.isConnected)).toBe(true);
  expect(await shell.evaluate(el => getComputedStyle(el).transform)).toBe("none");
  expect(await shell.evaluate(el => getComputedStyle(el).opacity)).toBe("1");
});

for (const route of ["/managed-website-vs-diy", "/managed-website-vs-agency"]) {
  test(route + " remains readable and responsive", async ({ page }) => {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto(route,{waitUntil:"domcontentloaded"});
      await expect(page.locator("main h1")).toBeVisible();
      const comparison = page.locator(width < 768 ? "main article" : "main table").first();
      await expect(comparison).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+3);
    }
  });
}
