import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("buyer comparison guides are complete, linked and avoid unsupported competitor claims", () => {
  const guides = readFileSync("src/content/comparisonGuides.ts", "utf8") + readFileSync("src/components/ComparisonGuidePage.tsx", "utf8");
  const app = readFileSync("src/App.tsx", "utf8");
  const footer = readFileSync("src/components/PublicSiteChrome.tsx", "utf8");
  assert.match(guides, /diy:\s*\{/);
  assert.match(guides, /agency:\s*\{/);
  assert.match(guides, /published catalogue/);
  assert.match(guides, /rows:\s*\[/);
  assert.match(guides, /goodFit:\s*\[/);
  assert.match(guides, /questions:\s*\[/);
  assert.match(guides, /Other providers’ offers vary/);
  assert.doesNotMatch(guides, /guaranteed leads|proven to increase|cheapest|industry-leading/i);
  assert.match(app, /path="\/managed-website-vs-diy"/);
  assert.match(app, /path="\/managed-website-vs-agency"/);
  assert.match(footer, /Managed website vs DIY/);
  assert.match(footer, /Managed website vs agency/);
});
