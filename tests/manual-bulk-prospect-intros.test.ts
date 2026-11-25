import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MAX_MANUAL_BULK_INTRO, prepareManualBulkIntro } from "../src/lib/manualBulkProspectIntros.ts";

const CONTACT = {
  id: "p1", name: "Example Carpentry", contact_email: "info@example.com",
  outreach_status: "not_started", status: "qualified",
  marketing_consent: true, consent_email: "info@example.com",
  consent_timestamp: "2026-08-25T10:00:00Z", consent_source: "Recipient requested information via website signup",
  contact_jurisdiction: "US", contact_recipient_type: "business", contact_lawful_basis: "consent",
};
const SENT = { direction: "outbound", channel: "email", status: "sent", sent_at: "2026-10-01T09:00:00Z" };

test("manual bulk introductions show up to 25 personalized opening emails", () => {
  assert.equal(MAX_MANUAL_BULK_INTRO, 25);
  const preview = prepareManualBulkIntro(CONTACT, []);
  assert.equal(preview.kind, "ready");
  assert.match(String(preview.subject), /Example Carpentry/);
  assert.match(String(preview.bodyText), /Bennie Studio/);
  assert.match(String(preview.bodyText), /Example Carpentry team/);
});

test("saved intro template overrides are rendered for every individual prospect", () => {
  const preview = prepareManualBulkIntro({ ...CONTACT, contact_first_name: "Jamie" }, [], {
    intro: { subject: "Hello {{business_name}}", body: "Hi {{first_name}},\n\nHere is our portfolio: {{portfolio_url}}\n\nBennie" },
  });
  assert.equal(preview.kind, "ready");
  assert.equal(preview.subject, "Hello Example Carpentry");
  assert.match(String(preview.bodyText), /Hi Jamie,/);
  assert.match(String(preview.bodyText), /https:\/\/app\.bennietay\.com\/portfolio/);
});

test("manual bulk introductions skip any existing email record, including drafts, failures and cancellations", () => {
  for (const status of ["sent", "delivered", "draft", "sending", "queued", "failed", "cancelled", "bounced"]) {
    const outcome = prepareManualBulkIntro(CONTACT, [{ ...SENT, status }]);
    assert.equal(outcome.kind, "skip", status);
    assert.match(String(outcome.reason), /already exists/);
  }
  const reply = prepareManualBulkIntro(CONTACT, [{ direction: "inbound", status: "replied" }]);
  assert.equal(reply.kind, "skip");
  assert.match(String(reply.reason), /replied/);
});

test("manual bulk introductions exclude missing emails, queued and closed or converted prospects", () => {
  assert.equal(prepareManualBulkIntro({ ...CONTACT, contact_email: "" }, []).kind, "skip");
  assert.equal(prepareManualBulkIntro({ ...CONTACT, contact_email: "bad-email" }, []).kind, "skip");
  assert.equal(prepareManualBulkIntro({ ...CONTACT, outreach_status: "queued" }, []).kind, "skip");
  assert.equal(prepareManualBulkIntro({ ...CONTACT, outreach_status: "contacted" }, []).kind, "skip");
  assert.equal(prepareManualBulkIntro({ ...CONTACT, outreach_status: "replied" }, []).kind, "skip");
  assert.equal(prepareManualBulkIntro({ ...CONTACT, status: "lost" }, []).kind, "skip");
  assert.equal(prepareManualBulkIntro({ ...CONTACT, outreach_exhausted_at: "2026-10-01" }, []).kind, "skip");
  assert.equal(prepareManualBulkIntro({ ...CONTACT, converted_business_id: "customer-1" }, []).kind, "skip");
});

test("unresolved placeholders never become send-ready messages", () => {
  const outcome = prepareManualBulkIntro(CONTACT, [], {
    intro: { subject: "For {{business_name}}", body: "Hello {{first_name}}, please see [INSERT LINK]." },
  });
  assert.equal(outcome.kind, "skip");
  assert.match(String(outcome.reason), /missing information/);
});


test("bulk send uses an explicit send action without separate permission management", () => {
  const bulkIntro = readFileSync("src/components/SuperAdmin/ManualBulkProspectIntros.tsx", "utf8");
  const bulkFollowUp = readFileSync("src/components/SuperAdmin/ManualBulkProspectFollowUps.tsx", "utf8");
  for (const bulk of [bulkIntro, bulkFollowUp]) {
    assert.match(bulk, /if \(sending \|\| finished \|\| loading \|\| !ready.length \|\| loadError\) return;/);
    assert.match(bulk, /Authorization: "Bearer " \+ session.access_token/);
    assert.doesNotMatch(bulk, /InlineRecipientPermission|Recipient Consent Import|recipientPermissionConfirmed|permissionConfirmed/);
    assert.match(bulk, /dispatchLock.current = true/);
    assert.match(bulk, /CONTACT_PERMISSION_NOT_VERIFIED/);
    assert.match(bulk, /onClick=\{\(\) => void sendSelected\(\)\}/);
  }
});

test("manual preview reports missing permission without fabricating opt-in", () => {
  const prospect = { ...CONTACT, marketing_consent: false, consent_timestamp: null, consent_email: null };
  const preview = prepareManualBulkIntro(prospect, []);
  assert.equal(preview.kind, "permission_review");
  assert.equal(prospect.marketing_consent, false);
});

test("manual preview does not assert jurisdiction proof from missing fields", () => {
  const preview = prepareManualBulkIntro({ ...CONTACT, contact_jurisdiction: "" }, []);
  assert.equal(preview.kind, "permission_review");
});

test("bulk preview consolidates permission-ineligible prospects under skipped without bypassing eligibility", () => {
  const ui = readFileSync("src/components/SuperAdmin/ManualBulkProspectIntros.tsx", "utf8");
  assert.doesNotMatch(ui, /permissionReview.length|Permission review · Not sent|permission review · not sent/i);
  assert.match(ui, /preview\.kind === "permission_review"[^\n]*delivery: "skipped"/);
  assert.match(ui, /CONTACT_PERMISSION_NOT_VERIFIED/);
  assert.match(ui, /reason: preview\.reason/);
  assert.match(ui, /No delivery attempted/);
  assert.match(ui, /blockedByPermission/);
  assert.match(ui, /"Send " \+ ready.length \+ " introduction"/);
});

test("intro preview reports specific eligibility failures", () => {
 assert.match(prepareManualBulkIntro({...CONTACT, contact_jurisdiction:"XX"},[]).reason || "", /jurisdiction is missing or unsupported/);
 assert.match(prepareManualBulkIntro({...CONTACT, contact_recipient_type:"unknown"},[]).reason || "", /Recipient type is missing/);
 assert.match(prepareManualBulkIntro({...CONTACT, contact_lawful_basis:null},[]).reason || "", /consent basis is missing/);
 for (const country of ["CA","AU"]) assert.equal(prepareManualBulkIntro({...CONTACT,contact_jurisdiction:country},[]).kind,"ready");
});

test("draft-only introduction previews defer consent verification to dispatch without modifying recipient data", () => {
  const prospect = { ...CONTACT, marketing_consent: false, consent_timestamp: null, consent_email: null, contact_jurisdiction: "" };
  const before = JSON.stringify(prospect);
  const draft = prepareManualBulkIntro(prospect, [], {}, { draftOnly: true });
  assert.equal(draft.kind, "ready");
  assert.ok(draft.subject && draft.bodyText);
  assert.equal(JSON.stringify(prospect), before);
  assert.equal(prepareManualBulkIntro(prospect, [SENT], {}, { draftOnly: true }).kind, "skip");
  assert.equal(prepareManualBulkIntro({...prospect, outreach_status:"replied"}, [], {}, { draftOnly: true }).kind, "skip");
  assert.equal(prepareManualBulkIntro(prospect, []).kind, "permission_review");
  const ui = readFileSync("src/components/SuperAdmin/ManualBulkProspectIntros.tsx", "utf8");
  assert.match(ui, /draftOnly: true/);
  assert.match(ui, /drafts prepared/);
  const server = readFileSync("server/salesOperations.ts", "utf8");
  assert.match(server, /salesEmailPermissionBlockReason\(prospect, new Date\(now\)\)/);
  assert.match(server, /CONTACT_PERMISSION_NOT_VERIFIED/);
});
