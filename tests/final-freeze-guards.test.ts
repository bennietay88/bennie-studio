import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("crawlable pricing copy matches the verified USD-only checkout", () => {
  const html = read("pricing/index.html");
  assert.match(html, /billed in US dollars \(USD\)/i);
  assert.match(html, /your local currency/i);
  assert.doesNotMatch(html, /Pricing is market-specific|choose your regional currency|Select your billing market|Different regions have their own published rates/i);

  const pricing = read("src/lib/commercialPricing.ts");
  assert.match(pricing, /marketForCurrency = \(_currency[^\n]*=> "INTL"/);
  assert.match(pricing, /CHECKOUT_CURRENCIES[\s\S]*?value: "USD"/);
});

test("commercial product availability remains an explicitly authorized Super Admin operation", () => {
  const api = read("api/index.ts");
  assert.match(api, /app\.patch\("\/api\/admin\/commercial-catalogue\/products\/:id", authenticate, superAdminOnly/);
  assert.match(api, /z\.object\(\{ active: z\.boolean\(\) \}\)/);
  assert.match(api, /\["personal-profile", "managed-website", "website-growth", "growth-partner"\]\.includes\(existing\.slug\)/);

  const admin = read("src/components/SuperAdmin/CommercialCatalogue.tsx");
  assert.match(admin, /toggleProductAvailability/);
  assert.match(admin, /Pause new sales/);
  assert.match(admin, /Existing customer subscriptions are not changed/);
});

test("the browser no longer exposes a bulk ecosystem purge operation", () => {
  const admin = read("src/components/SuperAdminDashboard.tsx");
  assert.doesNotMatch(admin, /handleClearAllData|VITE_ENABLE_PLATFORM_PURGE|Purge Entire Ecosystem/);
  assert.doesNotMatch(admin, /purgeConfirmText|isPurgeDialogOpen/);
  assert.match(admin, /Bulk deletion of platform, customer, subscription, and billing records is not available/);
});

test("declared Node engine is pinned to the supported Vercel Node 26 LTS runtime", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.engines.node, "26.x");
  assert.equal(lock.packages[""].engines.node, pkg.engines.node);
});
