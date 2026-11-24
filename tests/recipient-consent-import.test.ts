import assert from "node:assert/strict";
import test from "node:test";
import { parseRecipientConsentCsv, CONSENT_COLUMNS } from "../src/lib/recipientConsentImport.ts";
import { salesEmailPermissionBlockReason } from "../src/lib/salesAutomation.ts";
const header=CONSENT_COLUMNS.join(",");
const valid='info@example.com,2026-01-01T00:00:00Z,"Recipient signup record #123",MY,business';
const now=new Date("2026-11-24T00:00:00Z");
test("recipient consent import binds genuine evidence to the exact address",()=>{
 const [row]=parseRecipientConsentCsv(header+"\n"+valid,now);
 assert.equal(salesEmailPermissionBlockReason({...row,contact_email:"info@example.com"},now),null);
 assert.notEqual(salesEmailPermissionBlockReason({...row,contact_email:"other@example.com"},now),null);
});
test("rejects missing evidence, duplicate recipients, blanket prospect list and future dates",()=>{
 for(const csv of [header+"\n"+valid.replace("Recipient signup record #123",""),header+"\n"+valid+"\n"+valid,"name,email\nExample,info@example.com",header+"\n"+valid.replace("2026-01-01","2027-01-01")]) assert.throws(()=>parseRecipientConsentCsv(csv,now));
});

test("Canadian and Australian consent is eligible only with genuine address-bound evidence",()=>{
 for(const country of ["CA","AU"]) {
  const [row]=parseRecipientConsentCsv(header+"\n"+valid.replace(",MY,",","+country+","),now);
  assert.equal(salesEmailPermissionBlockReason({...row,contact_email:"info@example.com"},now),null);
  assert.equal(salesEmailPermissionBlockReason({...row,contact_email:"other@example.com"},now),"recipient_consent_missing_or_not_bound_to_address");
  assert.notEqual(salesEmailPermissionBlockReason({...row,marketing_consent:false,contact_email:"info@example.com"},now),null);
 }
 assert.throws(()=>parseRecipientConsentCsv(header+"\n"+valid.replace(",MY,",",XX,"),now));
});
