import { chromium } from "@playwright/test";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3111";
const routes = ["/", "/pricing", "/book-demo", "/case-studies"];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("response", (response) => {
  if (response.status() >= 400) errors.push(`response ${response.status()}: ${response.url()}`);
});

for (const route of routes) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const textLength = (await page.locator("body").innerText()).trim().length;
  if (textLength < 100) errors.push(`${route}: page body is unexpectedly empty`);
  const screenshotName = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
  await page.screenshot({ path: `/private/tmp/bennie-${screenshotName}.png`, fullPage: true });
  console.log(`${route}: ${textLength} visible characters, title "${await page.title()}"`);
}

await browser.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Visual checks passed without browser console errors.");
