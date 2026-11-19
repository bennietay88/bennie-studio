import assert from "node:assert/strict";
import test from "node:test";
import { buildProspectFollowUpPlan, normalizeFollowUpDays } from "../server/prospectFollowUps.ts";
import { BENNIE_STUDIO_PORTFOLIO_URL, renderProspectFollowUpOne, renderProspectFollowUpStage, resolveProspectFollowUpAsset } from "../server/salesOperations.ts";

const now = new Date("2026-11-06T00:00:00.000Z");
const company = { name: "Example Dental", contact_first_name: "Jane" };
const designUrl = "https://app.bennietay.com/preview/prospect/preview_1234567890";
const auditUrl = "https://app.bennietay.com/website-audit?report=example-report&key=example-access-key";

test("the prospect follow-up schedule contains at most three reminders at +3/+5/+7 intervals", () => {
  assert.deepEqual(normalizeFollowUpDays([15, 3, 8]), [3, 8, 15]);
  assert.throws(() => normalizeFollowUpDays([2, 3, 8, 15]), /1 and 3/);
  const plan = buildProspectFollowUpPlan("2026-11-07T00:00:00.000Z", [3, 8, 15], now);
  assert.deepEqual(plan.map((step) => step.dueAt), [
    "2026-11-10T00:00:00.000Z",
    "2026-11-15T00:00:00.000Z",
    "2026-11-22T00:00:00.000Z",
  ]);
});

test("first follow-up prefers a persisted bespoke design preview over a review", () => {
  const asset = resolveProspectFollowUpAsset({ ...company, design_preview_url: designUrl, audit_report_url: auditUrl });
  assert.deepEqual(asset, { kind: "design", url: designUrl });
  const email = renderProspectFollowUpOne(company, asset!);
  assert.match(email.subject, /website concept/i);
  assert.match(email.body_text, /homepage concept/i);
  assert.ok(email.body_text.includes(designUrl));
  assert.ok(email.body_text.includes("\n\n"));
});

test("first follow-up uses the authenticated audit report when no design concept exists", () => {
  const asset = resolveProspectFollowUpAsset({ ...company, audit_report_url: auditUrl });
  assert.deepEqual(asset, { kind: "audit", url: auditUrl });
  assert.match(renderProspectFollowUpOne(company, asset!).body_text, /short outline|earlier note/i);
});

test("generic template previews, foreign hosts and missing reports never qualify", () => {
  assert.equal(resolveProspectFollowUpAsset({ design_preview_url: "https://evil.example/preview/prospect/preview_1234567890" }), null);
  assert.equal(resolveProspectFollowUpAsset({ design_preview_url: "https://app.bennietay.com/preview/template/dental" }), null);
  assert.equal(resolveProspectFollowUpAsset({ audit_report_url: "https://app.bennietay.com/website-audit" }), null);
  assert.equal(resolveProspectFollowUpAsset({}), null);
});

test("invalid design link falls back to a genuine audit, not to an unverified concept", () => {
  assert.deepEqual(resolveProspectFollowUpAsset({
    design_preview_url: "https://app.bennietay.com/preview/template/dental",
    preview_url: auditUrl,
  }), { kind: "audit", url: auditUrl });
});

test("no-site Day 3 follow-up requires documented investigation and avoids nonexistent reviews", () => {
  const prospect = { name: "American Carpentry NC LLC", website_status: "no_website", domain: null,
    website_evidence_source_url: "https://directory.example/company", website_verified_at: "2026-11-05T00:00:00.000Z",
    website_verification_method: "Search official profile and local listings", website_finding: "No independent website found",
    website_verified_by: "admin", website_evidence_confidence: "high" };
  const message = renderProspectFollowUpOne(prospect, resolveProspectFollowUpAsset(prospect));
  assert.match(message.subject, /Following up on my earlier email/);
  assert.match(message.body_text, /Just following up on my earlier email/);
  assert.ok(message.body_text.includes(BENNIE_STUDIO_PORTFOLIO_URL));
  assert.match(message.body_text, /website could be useful/i);
  assert.doesNotMatch(message.body_text, /I (prepared|audited|reviewed)|your current website/i);
});

test("an unreviewable existing website gets a neutral portfolio follow-up without false findings", () => {
  const prospect = { name: "Example Dental", website_status: "unreviewable", domain: "example.com" };
  const message = renderProspectFollowUpStage(prospect, 1, null);
  assert.match(message.body_text, /websites for service businesses|current website could work harder/i);
  assert.doesNotMatch(message.body_text, /I prepared a short review|I put together a homepage concept/i);
});

test("Day 8 and Day 15 templates are tailored to site availability without claiming audit evidence", () => {
  const evidence = { website_evidence_source_url: "https://example.com", website_verified_at: "2026-11-05T00:00:00.000Z",
    website_verification_method: "Manual review", website_finding: "Verified website", website_verified_by: "admin", website_evidence_confidence: "high" };
  const greenfield = { name: "Example Carpentry", domain: null, website_status: "no_website", ...evidence };
  const existing = { name: "Example Dental", domain: "example.com", website_status: "strong", ...evidence };
  const noSiteDay8 = renderProspectFollowUpStage(greenfield, 2);
  const existingDay8 = renderProspectFollowUpStage(existing, 2);
  assert.match(noSiteDay8.body_text, /initial setup and ongoing updates/);
  assert.match(noSiteDay8.body_text, /setup and monthly costs/);
  assert.match(existingDay8.body_text, /improve the website and take care of ongoing updates/);
  assert.doesNotMatch(noSiteDay8.body_text, /review|audited|identified|I noticed/i);
  assert.doesNotMatch(existingDay8.body_text, /I noticed|audit found/i);
  for (const prospect of [greenfield, existing]) {
    const final = renderProspectFollowUpStage(prospect, 3);
    assert.match(final.subject, /Closing the loop/);
    assert.match(final.body_text, /won't send further follow-ups/);
    assert.doesNotMatch(final.body_text, /audit report|review found/i);
  }
});
