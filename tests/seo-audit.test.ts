import assert from "node:assert/strict";
import test from "node:test";
import { analyzeTechnicalSeo } from "../server/seo/auditEngine.js";

const completeHtml = `<!doctype html>
<html><head>
  <title>Dental Care in Petaling Jaya</title>
  <meta name="description" content="Book trusted dental care in Petaling Jaya." />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="https://example.com/" />
  <script type="application/ld+json">{"@type":"Dentist"}</script>
</head><body><h1>Dental Care in Petaling Jaya</h1></body></html>`;

test("technical health is derived from visible configured checks", () => {
  const result = analyzeTechnicalSeo({
    url: "https://example.com/",
    html: completeHtml,
    statusCode: 200,
    responseTimeMs: 120,
    robotsFound: true,
    sitemapFound: true,
    checkedLinks: 0,
    brokenLinks: [],
  });

  assert.equal(result.score, 100);
  assert.equal(result.findings.length, 0);
  assert.equal(result.scoreExplanation.components.reduce((sum, item) => sum + item.weight, 0), 100);
  assert.match(result.scoreExplanation.methodology, /No AI opinion/);
});

test("missing technical elements create evidence and recommendations without fabricated impact", () => {
  const result = analyzeTechnicalSeo({
    url: "http://example.com/",
    html: "<html><head></head><body><p>Service information</p></body></html>",
    statusCode: 200,
    responseTimeMs: 250,
    robotsFound: false,
    sitemapFound: false,
    checkedLinks: 0,
    brokenLinks: [],
  });

  assert.ok(result.score < 100);
  assert.ok(result.findings.some((item) => item.issueKey === "title_missing"));
  assert.ok(result.findings.every((item) => item.whatWeFound && item.whyItMatters && item.recommendedAction));
  const allCopy = JSON.stringify(result).toLowerCase();
  assert.doesNotMatch(allCopy, /losing \d+%|revenue increase|conversion rate/);
});

test("noindex is identified as an observable critical issue", () => {
  const result = analyzeTechnicalSeo({
    url: "https://example.com/private",
    html: completeHtml.replace("index,follow", "noindex,nofollow"),
    statusCode: 200,
    responseTimeMs: 100,
    robotsFound: true,
    sitemapFound: true,
    checkedLinks: 0,
    brokenLinks: [],
  });

  const finding = result.findings.find((item) => item.issueKey === "page_noindex");
  assert.equal(finding?.severity, "critical");
  assert.deepEqual(finding?.evidence, { robots: "noindex,nofollow" });
});
