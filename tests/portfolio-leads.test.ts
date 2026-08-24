import assert from "node:assert/strict";
import test from "node:test";
import { normalizePortfolioLead } from "../src/lib/portfolioLead.ts";

const validLead = {
  name: "  Aisha Tan  ",
  email: " Aisha@example.com ",
  industry: "Clinic",
  message: "I would like to discuss a new website for our clinic.",
  source: "portfolio",
  sourcePage: "/examples/clinic",
  consent: true,
  consentGiven: true,
  consentTimestamp: "2026-08-24T10:00:00+08:00",
  privacyPolicyVersion: "v1.0",
  utmSource: "portfolio",
  utmMedium: "referral",
  utmCampaign: "clinic",
  utmContent: "hero",
  utmTerm: "managed website",
  honeypot: "",
};

test("normalizes a valid portfolio lead", () => {
  const lead = normalizePortfolioLead(validLead);
  assert.equal(lead.name, "Aisha Tan");
  assert.equal(lead.email, "aisha@example.com");
  assert.equal(lead.source, "portfolio");
});

test("rejects invalid consent, source, unknown fields and short messages", () => {
  assert.throws(() => normalizePortfolioLead({ ...validLead, consent: false }));
  assert.throws(() => normalizePortfolioLead({ ...validLead, source: "website" }));
  assert.throws(() => normalizePortfolioLead({ ...validLead, extra: "unexpected" }));
  assert.throws(() => normalizePortfolioLead({ ...validLead, message: "too short" }));
});

test("preserves a normalized honeypot for the endpoint to reject", () => {
  const lead = normalizePortfolioLead({ ...validLead, honeypot: "bot" });
  assert.equal(lead.honeypot, "bot");
});
