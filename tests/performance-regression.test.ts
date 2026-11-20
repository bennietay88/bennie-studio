import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPublicSiteConfig } from "../src/lib/publicSiteConfigCache.ts";

const source = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("marketing pages do not eagerly preload the full Recharts vendor", () => {
  const vite = source("vite.config.ts");
  assert.doesNotMatch(vite, /"vendor-charts"\s*:\s*\["recharts"\]/);
  assert.match(source("src/App.tsx"), /lazy\(\(\) => import/);
});

test("global animation controller mounts once, not once per root and router", () => {
  assert.doesNotMatch(source("src/main.tsx"), /<AgencyMotionDirector\s*\/>/);
  assert.equal((source("src/App.tsx").match(/<AgencyMotionDirector\s*\/>/g) || []).length, 2);
  // Two code branches (customer-domain and primary router) are mutually exclusive.
});

test("public CSS is loaded by public chrome rather than the universal App bundle", () => {
  assert.doesNotMatch(source("src/App.tsx"), /import ["']\.\/styles\/publicBrand\.css/);
  assert.match(source("src/components/PublicSiteChrome.tsx"), /import ["']\.\.\/styles\/publicBrand\.css/);
});

test("public site configuration uses a shared in-flight request and TTL cache", async () => {
  const previous = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
      calls++;
      return { ok: true, json: async () => ({ platform: { salesPageTitle: "Verified" } }) } as Response;
    }) as typeof fetch;
    const [one, two] = await Promise.all([getPublicSiteConfig(), getPublicSiteConfig()]);
    const three = await getPublicSiteConfig();
    assert.equal(calls, 1);
    assert.equal(one?.platform?.salesPageTitle, "Verified");
    assert.equal(two, one);
    assert.equal(three, one);
  } finally {
    globalThis.fetch = previous;
  }
});

test("heavy outreach history is projected before reporting, not sent as full rows", () => {
  const routes = source("server/outreachCompletionRoutes.ts");
  assert.match(routes, /getAll\(db,"sales_messages","id,prospect_id,/);
  assert.doesNotMatch(routes, /getAll\(db,"sales_messages"\)/);
  assert.match(routes, /reportsInFlight\.set\(key,pending\)/);
  assert.match(routes, /expiresAt:Date\.now\(\)\+15_000/);
});

test("both health endpoint aliases use the same dependency-checking handler", () => {
  assert.match(source("api/index.ts"), /app\.get\(\["\/api\/health-check", "\/api\/health"\]/);
});
