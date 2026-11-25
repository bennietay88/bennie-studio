import assert from "node:assert/strict";
import test from "node:test";
import { resolveManualRecipientEvidence } from "../src/lib/manualRecipientEvidence.ts";
const now = new Date("2026-11-25T00:00:00Z");
const record = {email:"info@example.com",timestamp:"2026-11-01T00:00:00Z",reference:"Original opt-in record 123",jurisdiction:"MY",recipientType:"business"};
const contact = {contact_email:"info@example.com",marketing_consent:false};
test("manual external evidence is address-bound, time-bound and respects existing withdrawal", () => {
  assert.ok(resolveManualRecipientEvidence(record,contact,now));
  for (const invalid of [{...record,email:"other@example.com"},{...record,timestamp:"2027-01-01T00:00:00Z"},{...record,reference:""},{...record,jurisdiction:"XX"},{...record,timestamp:"2026-11-01"}]) assert.equal(resolveManualRecipientEvidence(invalid,contact,now),null);
  assert.equal(resolveManualRecipientEvidence(record,{...contact,consent_timestamp:"2026-11-02T00:00:00Z"},now),null);
  assert.equal(contact.marketing_consent,false);
});
