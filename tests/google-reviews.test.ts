import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const types = readFileSync("src/types.ts", "utf8");
const templates = readFileSync("src/constants/sectionTemplates.ts", "utf8");
const renderer = readFileSync("src/components/WebsiteRenderer.tsx", "utf8");
const editor = readFileSync("src/components/WebsiteEditor.tsx", "utf8");
const api = readFileSync("api/index.ts", "utf8");

test("google reviews is a native website section", () => {
  assert.match(types, /\| "google_reviews"/);
  assert.match(templates, /google_reviews:/);
  assert.match(templates, /featureId: "review_management"/);
  assert.match(renderer, /case "google_reviews"/);
});

test("google reviews can be connected from the website editor", () => {
  assert.match(editor, /GoogleReviewsEditor/);
  assert.match(editor, /\/api\/admin\/google-places\/search/);
  assert.match(editor, /placeId/);
});

test("google places key stays on the server", () => {
  assert.match(api, /process\.env\.GOOGLE_PLACES_API_KEY/);
  assert.doesNotMatch(renderer, /GOOGLE_PLACES_API_KEY/);
  assert.doesNotMatch(editor, /GOOGLE_PLACES_API_KEY/);
});

test("public review feed only resolves a configured published section", () => {
  assert.match(api, /"\/api\/public\/google-reviews"/);
  assert.match(api, /\.eq\("status", "published"\)/);
  assert.match(api, /candidate\?\.type === "google_reviews"/);
  assert.match(api, /X-Goog-FieldMask/);
});


test("google reviews stays implemented but hidden from the current launch editor", () => {
  assert.match(editor, /type !== "google_reviews"/);
  assert.match(renderer, /case "google_reviews"/);
  assert.match(api, /"\/api\/public\/google-reviews"/);
});
