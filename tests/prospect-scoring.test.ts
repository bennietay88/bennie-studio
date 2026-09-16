import test from "node:test";
import assert from "node:assert/strict";
import { scoreProspect } from "../src/lib/prospectScoring";

test("engaged target prospects receive explainable high-intent scores", () => {
  const result = scoreProspect({ industry: "Dental clinic", domain: "example.com", website_status: "weak", audit_score: 42, contact_email: "owner@example.com", outreach_status: "replied", status: "qualified" });
  assert.equal(result.version, "v1");
  assert.equal(result.recommendedNextAction, "REPLY");
  assert.equal(result.category, "high_intent");
  assert.ok(result.score >= 65);
  assert.ok(result.factors.some((factor) => factor.key === "industry_fit"));
});

test("low-information prospects remain in nurture with a clear action", () => {
  const result = scoreProspect({});
  assert.equal(result.category, "nurture");
  assert.equal(result.recommendedNextAction, "SEND_OUTREACH");
  assert.ok(result.score >= 0 && result.score <= 100);
});
