import assert from "node:assert/strict";
import test from "node:test";
import { MAX_MANUAL_BULK_FOLLOW_UP, prepareManualBulkFollowUp, safeProspectFollowUpAsset } from "../src/lib/manualBulkProspectFollowUps.ts";

const INTRO = { direction: "outbound", channel: "email", status: "sent", sent_at: "2026-11-01T09:00:00Z" };
const OUTBOUND = { direction: "outbound", channel: "email", status: "sent" };
const CONTACT = { id: "p1", name: "Carpentry Service", contact_email: "info@example.com", website_status: "no_website",
  marketing_consent: true, consent_email: "info@example.com", consent_timestamp: "2026-10-01T09:00:00Z",
  consent_source: "Recipient requested promotional information through signup", contact_jurisdiction: "US", contact_recipient_type: "business", contact_lawful_basis: "consent",
  website_evidence_source_url: "https://directory.example/company", website_verified_at: "2026-10-30T09:00:00Z",
  website_verification_method: "Manual research", website_finding: "No independent website found", website_verified_by: "admin", website_evidence_confidence: "high" };

test("manual bulk review only offers confirmed, due follow-up stages", () => {
  assert.equal(MAX_MANUAL_BULK_FOLLOW_UP, 25);
  const due = prepareManualBulkFollowUp(CONTACT, [INTRO], {}, new Date("2026-11-04T09:00:00Z"));
  assert.equal(due.kind, "ready");
  assert.equal(due.stage, 1);
  assert.equal(due.templateId, "day3_portfolio_no_site");
  assert.match(String(due.subject), /Carpentry Service/);
  assert.match(String(due.bodyText), /app.bennietay.com/);
  const waiting = prepareManualBulkFollowUp(CONTACT, [INTRO], {}, new Date("2026-11-03T09:00:00Z"));
  assert.equal(waiting.kind, "skip");
  assert.match(String(waiting.reason), /Not due until/);
  assert.match(String(prepareManualBulkFollowUp(CONTACT, [], {}, new Date("2026-11-04T09:00:00Z")).reason), /confirmed opening/);
});

test("manual bulk respects replies, previous steps and exhausted or converted contacts", () => {
  const now = new Date("2026-11-18T09:00:00Z");
  const day3 = { ...OUTBOUND, sent_at: "2026-11-04T09:00:00Z" };
  const day8 = { ...OUTBOUND, sent_at: "2026-11-09T09:00:00Z" };
  assert.equal(prepareManualBulkFollowUp(CONTACT, [INTRO, day3], {}, now).stage, 2);
  assert.equal(prepareManualBulkFollowUp(CONTACT, [INTRO, day3, day8], {}, now).stage, 3);
  assert.equal(prepareManualBulkFollowUp(CONTACT,
    [INTRO, day3, { direction: "inbound", status: "replied" }], {}, now).kind, "skip");
  assert.equal(prepareManualBulkFollowUp(CONTACT, [INTRO, day3, day8, { ...OUTBOUND, sent_at: "2026-11-16T09:00:00Z" }], {}, now).kind, "skip");
  assert.equal(prepareManualBulkFollowUp({ ...CONTACT, converted_business_id: "customer-id" }, [INTRO], {}, now).kind, "skip");
  assert.equal(prepareManualBulkFollowUp({ ...CONTACT, contact_email: "" }, [INTRO], {}, now).kind, "skip");
  assert.equal(prepareManualBulkFollowUp(CONTACT, [INTRO, { ...OUTBOUND, status: "queued", provider_payload: { directStage: 1 } }], {}, now).kind, "skip");
});

test("review assets must be genuinely prospect-specific and on the approved host", () => {
  const bespoke = "https://app.bennietay.com/preview/prospect/example_preview_123456";
  const audit = "https://app.bennietay.com/review/1234567890123456789012";
  assert.deepEqual(safeProspectFollowUpAsset({ ...CONTACT, design_preview_url: bespoke }), { kind: "design", url: bespoke });
  assert.deepEqual(safeProspectFollowUpAsset({ ...CONTACT, audit_report_url: audit }), { kind: "audit", url: audit });
  assert.equal(safeProspectFollowUpAsset({ ...CONTACT, design_preview_url: "https://other.example.com/preview/prospect/example_preview_123456" }), null);
  assert.equal(safeProspectFollowUpAsset({ ...CONTACT, design_preview_url: "https://app.bennietay.com/preview/template/cleaner" }), null);
  const preview = prepareManualBulkFollowUp({ ...CONTACT, design_preview_url: bespoke },
    [INTRO], {}, new Date("2026-11-04T09:00:00Z"));
  assert.equal(preview.templateId, "day3_design");
  assert.match(String(preview.bodyText), /example_preview_123456/);
});

test("manual batch previews use validated saved template overrides", () => {
  const result = prepareManualBulkFollowUp(CONTACT, [INTRO], {
    day3_portfolio_no_site: {
      subject: "A note for {{business_name}}",
      body: "Hi {{first_name}},\n\nYou can see our work here: {{portfolio_url}}\n\nBennie",
    },
  }, new Date("2026-11-04T09:00:00Z"));
  assert.equal(result.subject, "A note for Carpentry Service");
  assert.match(String(result.bodyText), /Carpentry Service team/);
});

test("missing or mismatched recipient consent is skipped before sending", () => {
  const now = new Date("2026-11-04T09:00:00Z");
  for (const prospect of [{ ...CONTACT, marketing_consent: false }, { ...CONTACT, consent_email: "other@example.com" }]) {
    const result = prepareManualBulkFollowUp(prospect, [INTRO], {}, now);
    assert.equal(result.kind, "skip");
    assert.match(String(result.reason), /No email attempted/);
  }
});

test("draft-only follow-up preview defers consent verification but respects due dates and replies", () => {
  const now = new Date("2026-11-04T09:00:00Z");
  const prospect = { ...CONTACT, marketing_consent: false, consent_email: "other@example.com" };
  const before = JSON.stringify(prospect);
  const draft = prepareManualBulkFollowUp(prospect, [INTRO], {}, now, { draftOnly: true });
  assert.equal(draft.kind, "ready");
  assert.ok(draft.subject && draft.bodyText);
  assert.equal(JSON.stringify(prospect), before);
  assert.equal(prepareManualBulkFollowUp(prospect, [INTRO], {}, new Date("2026-11-02T09:00:00Z"), { draftOnly: true }).kind, "skip");
  assert.equal(prepareManualBulkFollowUp(prospect, [INTRO, { direction:"inbound", status:"replied" }], {}, now, { draftOnly: true }).kind, "skip");
  assert.equal(prepareManualBulkFollowUp(prospect, [INTRO], {}, now).kind, "skip");
});
