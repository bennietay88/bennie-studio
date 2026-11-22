import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInboundNewsletterMessages,
  INBOUND_NEWSLETTER_CONSENT,
  isSupportedNewsletterMarket,
  newsletterSourceId,
} from "../server/inboundNewsletter";

const LEAD_ID = "e3fb1465-32a2-4ceb-b8cd-35a844fcf32a";
const NOW = new Date("2026-11-22T12:00:00Z");

test("newsletter country is explicitly limited to supported markets", () => {
  for (const c of ["MY", "SG", "GB", "US"]) assert.equal(isSupportedNewsletterMarket(c), true);
  for (const c of ["", "my", "XX", "AU", null, 0]) assert.equal(isSupportedNewsletterMarket(c), false);
  assert.match(INBOUND_NEWSLETTER_CONSENT, /unsubscribe/i);
});

test("newsletter series is unique per normalized address and step", () => {
  const a = buildInboundNewsletterMessages({email:" Subscriber@Example.com ",leadId:LEAD_ID,now:NOW});
  const b = buildInboundNewsletterMessages({email:"subscriber@example.com",leadId:LEAD_ID,now:NOW});
  assert.equal(a.length, 5);
  assert.equal(new Set(a.map(m => m.idempotency_key)).size, 5);
  assert.deepEqual(a.map(m => m.idempotency_key),b.map(m => m.idempotency_key));
  assert.equal(a[0].recipient, "subscriber@example.com");
  assert.ok(a.every(m => m.status === "queued" && m.direction === "outbound" && m.channel === "email"));
  assert.ok(a.every(m => m.lead_id === LEAD_ID && m.provider_payload && (m.provider_payload as any).source === "explicit_inbound_newsletter"));
  assert.equal(newsletterSourceId("SUBSCRIBER@EXAMPLE.COM"),newsletterSourceId("subscriber@example.com"));
});

test("welcome, follow-ups and final offer use bounded cadence with no fabricated claims", () => {
  const messages = buildInboundNewsletterMessages({email:"subscriber@example.com",leadId:LEAD_ID,now:NOW,sourcePage:"/"});
  assert.deepEqual(messages.map(m => (new Date(String(m.scheduled_at)).getTime() - NOW.getTime()) / 86_400_000), [0,3,7,12,18]);
  assert.match(String(messages[0].body_text), /7-point checklist/i);
  assert.match(String(messages[0].body_text), /no.*promise/i);
  assert.match(String(messages[2].body_text), /managed/i);
  assert.match(String(messages[4].body_text), /last message/i);
});

test("reject malformed email, lead identifier or scheduling timestamp", () => {
  assert.throws(() => buildInboundNewsletterMessages({email:"invalid",leadId:LEAD_ID}), /INVALID_NEWSLETTER_EMAIL/);
  assert.throws(() => buildInboundNewsletterMessages({email:"x@y.com",leadId:"not-a-lead"}), /INVALID_NEWSLETTER_LEAD/);
  assert.throws(() => buildInboundNewsletterMessages({email:"x@y.com",leadId:LEAD_ID,now:new Date("bad")}), /INVALID_NEWSLETTER_DATE/);
});
