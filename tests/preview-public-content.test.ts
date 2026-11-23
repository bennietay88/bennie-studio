import test from "node:test";
import assert from "node:assert/strict";
import { fetchPublishedPreviewContent, isPreviewPublicRead, PREVIEW_MARKETING_READ_PATHS } from "../server/previewPublicContent";

test("preview public proxy only enables unauthenticated reads with missing preview DB", () => {
  for (const path of PREVIEW_MARKETING_READ_PATHS) {
    assert.equal(isPreviewPublicRead({ VERCEL_ENV: "preview" }, "GET", path, false), true);
    assert.equal(isPreviewPublicRead({ VERCEL_ENV: "production" }, "GET", path, false), false);
    assert.equal(isPreviewPublicRead({ VERCEL_ENV: "preview" }, "POST", path, false), false);
    assert.equal(isPreviewPublicRead({ VERCEL_ENV: "preview" }, "GET", path, true), false);
    assert.equal(isPreviewPublicRead({ VERCEL_ENV: "preview", E2E_TEST: "true" }, "GET", path, false), false);
  }
  assert.equal(isPreviewPublicRead({ VERCEL_ENV: "preview" }, "GET", "/api/public/plan-checkout", false), false);
  assert.equal(isPreviewPublicRead({ VERCEL_ENV: "preview" }, "GET", "/api/public/site-config/../../private", false), false);
});

test("published pricing uses the fixed canonical origin with no request credentials", async () => {
  let url = "";
  let options: RequestInit | undefined;
  const response = await fetchPublishedPreviewContent("/api/public/pricing", async (target, init) => {
    url = String(target);
    options = init;
    return new Response(JSON.stringify({ products: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  assert.deepEqual(response, { products: [] });
  assert.equal(url, "https://app.bennietay.com/api/public/pricing?market=INTL");
  assert.equal(options?.method, "GET");
  assert.equal(JSON.stringify(options?.headers), JSON.stringify({ Accept: "application/json" }));
});

test("refuses writes, arbitrary paths, invalid payloads and upstream failures", async () => {
  const noFetch = async () => { throw Error("must not fetch"); };
  await assert.rejects(fetchPublishedPreviewContent("/api/private/settings", noFetch));
  await assert.rejects(fetchPublishedPreviewContent("/api/public/pricing", async () => new Response(JSON.stringify({ products: null }), { status: 200 })));
  await assert.rejects(fetchPublishedPreviewContent("/api/public/site-config", async () => new Response("{}", { status: 502 })));
});
