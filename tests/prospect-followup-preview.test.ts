import assert from "node:assert/strict";
import test from "node:test";
import { buildProspectFollowUpPlan, normalizeFollowUpDays } from "../server/prospectFollowUps.ts";
import { renderProspectFollowUpOne, resolveProspectFollowUpAsset } from "../server/salesOperations.ts";

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
  assert.match(renderProspectFollowUpOne(company, asset!).body_text, /short review/i);
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
