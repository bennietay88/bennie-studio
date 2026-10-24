import test from "node:test";
import assert from "node:assert/strict";
import { evaluateOutreachQualification, type OutreachQualificationInput } from "../src/lib/outreachQualification";

const now = new Date("2026-10-24T00:00:00.000Z");
const valid: OutreachQualificationInput = {
  fitScore: 20, intentScore: 15, issueScore: 15, offerFitScore: 15, contactScore: 10, recencyScore: 5,
  intentEvidence: "Published request for a website redesign and quote form.",
  intentSourceUrl: "https://example.com/news/website-request",
  intentObservedAt: "2026-10-20",
  identityAndContactVerified: true,
  marketRulesChecked: true,
};

test("first-touch qualification passes at 80 total and 15 intent with current sourced evidence", () => {
  const result = evaluateOutreachQualification(valid, now);
  assert.equal(result.totalScore, 80);
  assert.equal(result.eligible, true);
});

test("first-touch qualification rejects scores below either threshold", () => {
  assert.equal(evaluateOutreachQualification({ ...valid, issueScore: 14 }, now).eligible, false);
  assert.equal(evaluateOutreachQualification({ ...valid, intentScore: 14, issueScore: 20 }, now).eligible, false);
});

test("first-touch qualification requires recent HTTPS evidence and operator checks", () => {
  assert.equal(evaluateOutreachQualification({ ...valid, intentObservedAt: "2026-08-01" }, now).eligible, false);
  assert.equal(evaluateOutreachQualification({ ...valid, intentSourceUrl: "http://example.com/request" }, now).eligible, false);
  assert.equal(evaluateOutreachQualification({ ...valid, identityAndContactVerified: false }, now).eligible, false);
  assert.equal(evaluateOutreachQualification({ ...valid, marketRulesChecked: false }, now).eligible, false);
});

test("first-touch qualification rejects a future signal and invalid score ranges", () => {
  assert.equal(evaluateOutreachQualification({ ...valid, intentObservedAt: "2026-10-25" }, now).eligible, false);
  assert.equal(evaluateOutreachQualification({ ...valid, fitScore: 21 }, now).eligible, false);
});
