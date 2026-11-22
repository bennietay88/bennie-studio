import test from "node:test";
import assert from "node:assert/strict";
import { parseFeed, markdownReport, collectReferences, SOURCES } from "../scripts/design-trend-review.mjs";

test("parses safe feed titles and links without untrusted HTML", () => {
  const feed = '<rss><channel><item><title><![CDATA[Better <b>Layouts</b>]]></title><link>https://example.org/layouts</link><pubDate>2026-11-01</pubDate></item><item><title>Unsafe</title><link>javascript:alert(1)</link></item></channel></rss>';
  assert.deepEqual(parseFeed(feed), [{title:"Better Layouts",url:"https://example.org/layouts",published:"2026-11-01"}]);
});
test("failed sources are recorded but do not block review", async () => {
  const results = await collectReferences(async () => { throw new Error("offline"); });
  assert.equal(results.length, SOURCES.length);
  assert.ok(results.every(result => result.error === "offline"));
  assert.match(markdownReport(results, new Date("2026-11-22T00:00:00Z")), /Design trend review|design research/);
  assert.match(markdownReport(results), /Do not modify existing client websites/);
});
