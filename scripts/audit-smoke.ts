import assert from "node:assert/strict";
import { analyzeWebsiteHtml } from "../src/lib/websiteAudit.ts";

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

assert.equal(first.overallScore, second.overallScore, "audit score must be deterministic");
assert.deepEqual(first.categoryScores, second.categoryScores, "category scores must be deterministic");
assert.ok(first.overallScore > weak.overallScore, "complete page should score above weak page");
assert.equal(weak.checks.find((item) => item.id === "title")?.status, "fail");
assert.equal(weak.checks.find((item) => item.id === "cta")?.status, "fail");
assert.equal(weak.checks.find((item) => item.id === "links")?.status, "fail");
assert.ok(first.checks.every((item) => Number.isFinite(item.scoreContribution)));

console.log(`Audit smoke passed: complete=${first.overallScore}, weak=${weak.overallScore}`);
