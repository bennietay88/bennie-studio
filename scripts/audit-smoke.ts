import assert from "node:assert/strict";
import { analyzeWebsiteHtml, normalizeWebsiteAuditResult } from "../src/lib/websiteAudit.ts";

const completePage = `<!doctype html><html><head>
<title>Dental care in Kuala Lumpur | Example Clinic</title>
<meta name="description" content="Book trusted dental care in Kuala Lumpur, with clear treatment guidance, patient reviews and convenient appointment options.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script type="application/ld+json">{"@type":"Dentist"}</script></head><body>
<h1>Trusted dental care in Kuala Lumpur</h1><h2>Our dental services</h2>
<p>Certified clinicians serving nearby areas. Read patient reviews and opening hours.</p>
<a href="https://wa.me/60123456789">Book appointment</a><form><input name="email"></form>
<section id="faq">Frequently asked questions</section><img src="clinic.jpg" alt="Clinic treatment room">
</body></html>`;

const weakPage = `<!doctype html><html><head></head><body><p>Welcome</p><img src="photo.jpg"><a href="/missing">More</a></body></html>`;

const first = analyzeWebsiteHtml({ url: "https://example.com", html: completePage, statusCode: 200, responseTimeMs: 300, robotsFound: true, sitemapFound: true, checkedLinks: 0, brokenLinks: [] });
const second = analyzeWebsiteHtml({ url: "https://example.com", html: completePage, statusCode: 200, responseTimeMs: 300, robotsFound: true, sitemapFound: true, checkedLinks: 0, brokenLinks: [] });
const weak = analyzeWebsiteHtml({ url: "https://example.com", html: weakPage, statusCode: 200, responseTimeMs: 3000, robotsFound: false, sitemapFound: false, checkedLinks: 1, brokenLinks: ["https://example.com/missing"] });

assert.deepEqual(first.findings, second.findings, "audit findings must be deterministic");
assert.ok(first.findings.length < weak.findings.length, "complete page should have fewer findings than a weak page");
assert.equal(weak.findings.find((item) => item.id === "cta")?.priority, "high");
assert.equal(weak.findings.find((item) => item.id === "links")?.priority, "high");
assert.ok(weak.findings.every((item) => item.whatWeFound && item.whyItMatters && item.recommendation));
assert.equal("overallScore" in first, false, "new audit reports must not contain an overall score");

const legacy = normalizeWebsiteAuditResult({
  analyzedUrl: "https://legacy.example",
  overallScore: 61,
  topProblems: [{ id: "cta", label: "Visible contact action", evidence: "No action found", explanation: "Visitors need an obvious next step.", recommendedAction: "Add a quote CTA.", priority: "high" }],
  suggestedCTA: "Request a Quote",
  recommendedPlan: "business",
});
assert.equal(legacy.schemaVersion, 2);
assert.equal(legacy.findings[0]?.id, "cta");
assert.equal("overallScore" in legacy, false, "legacy normalization must remove score fields");

const cachedV2WithDeprecatedScore = normalizeWebsiteAuditResult({ ...weak, overallScore: 74, seoScore: 70 });
assert.equal("overallScore" in cachedV2WithDeprecatedScore, false, "cached v2 reports must be allow-listed");
assert.equal("seoScore" in cachedV2WithDeprecatedScore, false, "deprecated category scores must not leak from cached reports");

console.log(`Audit smoke passed: complete findings=${first.findings.length}, weak findings=${weak.findings.length}`);
