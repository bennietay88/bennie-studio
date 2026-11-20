import test from "node:test";
import assert from "node:assert/strict";
import { scoreProspect } from "../src/lib/prospectScoring";

const NOW = new Date("2026-11-19T12:00:00.000Z");
const evidence = (value: string | number | boolean) => ({ verified: true, value, sourceUrl: "https://example.com/source", verifiedAt: "2026-11-18T12:00:00.000Z", method: "manual review", confidence: "high" as const });

test("unknown website and email syntax alone earn no qualification points", () => {
  const result = scoreProspect({ industry: "Dental clinic", contact_email: "owner@example.com", website_status: "unknown" }, NOW);
  assert.equal(result.version, "v2");
  assert.equal(result.score, 0);
  assert.equal(result.category, "tier_c");
  assert.equal(result.componentScores.specific_need, 0);
  assert.equal(result.componentScores.contact_quality, 0);
  assert.equal(result.recommendedNextAction, "RESEARCH_WEBSITE");
});

test("verified evidence scores by category and passes the Tier A gates only with need and fit", () => {
  const result = scoreProspect({
    industry: "Dental clinic", website_status: "weak", website_evidence_source_url: "https://example.com", website_verified_at: "2026-11-18T12:00:00.000Z",
    website_verification_method: "manual browser review", website_finding: "Booking link returns an error", website_evidence_confidence: "high", website_verified_by: "reviewer",
    qualification_evidence: {
      service_product_fit: evidence("strong"), operating_activity: evidence(true), specific_website_need: evidence(true),
      ability_to_pay: evidence(12), buying_intent_or_trigger: evidence(13), decision_maker: evidence(true),
      contact_quality: evidence(9), timing_urgency: evidence(4),
    },
  }, NOW);
  assert.equal(result.score, 93);
  assert.equal(result.category, "tier_a");
  assert.equal(result.componentScores.specific_need, 20);
  assert.ok(result.factors.every((factor) => factor.evidence?.verified));
});

test("missing domains and overdue follow-ups never imply no-site need or buying intent", () => {
  const result = scoreProspect({ domain: null, website_status: "unknown", next_follow_up_at: "2026-11-01T00:00:00.000Z", contact_email: "person@example.com" }, NOW);
  assert.equal(result.componentScores.specific_need, 0);
  assert.equal(result.componentScores.buying_intent, 0);
  assert.equal(result.score, 0);
});

test("invalid or noncompliant contacts are rejected regardless of score", () => {
  const result = scoreProspect({ status: "suppressed", qualification_evidence: { service_product_fit: evidence("strong") } }, NOW);
  assert.equal(result.category, "reject");
});
