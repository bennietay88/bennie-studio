import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageSalesOperations, deliveryStatus, normalizeSalesEmail, recordSalesDeliveryEvent,
  recordSalesReply, runSalesDelivery, saveManualOutreach, saveSalesCallOutcome, sendDirectProspectOutreach, suppressSalesRecipient,
} from "../server/salesOperations.ts";
import { classifyReply, getOutreachObservation, hasDocumentedMarketingConsent, toLocalFollowUpInput } from "../src/lib/salesAutomation.ts";
import { parseProspectCsv } from "../src/lib/prospectImport.ts";

type Row = Record<string, any>;
const NOW = "2026-08-31T10:00:00.000Z";

// In-memory adapter exercises the real service queries, including conditional
// updates and unique upserts. It never loads app env vars or contacts a provider.
class MemoryDb {
  tables: Record<string, Row[]>;
  fail?: (table: string, op: string, values: Row) => boolean;
  constructor(seed: Record<string, Row[]> = {}) {
    this.tables = structuredClone({ sales_messages: [], sales_suppressions: [], sales_tasks: [], outreach_enrollments: [], outreach_sequences: [], outreach_sequence_steps: [], leads: [], prospects: [], sales_call_bookings: [], ...seed });
  }
  from = (table: string): any => new Query(this, table);
}

class Query {
  filters: ((row: Row) => boolean)[] = [];
  op = "select"; values: Row = {}; conflict = "id"; ignore = false; one = false;
  count = Infinity; ordering: [string, boolean][] = [];
  constructor(public db: MemoryDb, public table: string) {}
  select(_columns = "*") { return this; }
  update(values: Row) { this.op = "update"; this.values = values; return this; }
  insert(values: Row) { this.op = "insert"; this.values = values; return this; }
  upsert(values: Row, options: any = {}) { this.op = "upsert"; this.values = values; this.conflict = options.onConflict || "id"; this.ignore = options.ignoreDuplicates; return this; }
  eq(key: string, value: any) { this.filters.push((row) => key.split(".").reduce((v, k) => v?.[k], row) === value); return this; }
  in(key: string, values: any[]) { this.filters.push((row) => values.includes(row[key])); return this; }
  is(key: string, value: any) { this.filters.push((row) => (row[key] ?? null) === value); return this; }
  not(key: string, _op: string, _value: any) { this.filters.push((row) => row[key] != null); return this; }
  lte(key: string, value: any) { this.filters.push((row) => row[key] <= value); return this; }
  gte(key: string, value: any) { this.filters.push((row) => row[key] >= value); return this; }
  ilike(key: string, value: string) { this.filters.push((row) => String(row[key] || "").toLowerCase() === value.replace(/\\([\\_%])/g, "$1").toLowerCase()); return this; }
  contains(key: string, value: Row) { this.filters.push((row) => Object.entries(value).every(([k, v]) => row[key]?.[k] === v)); return this; }
  order(key: string, options: any = {}) { this.ordering.push([key, options.ascending !== false]); return this; }
  limit(count: number) { this.count = count; return this; }
  maybeSingle() { this.one = true; return this; }
  single() { this.one = true; return this; }
  enriched(row: Row) {
    const value = { ...row };
    if (this.table === "sales_messages" && row.enrollment_id) value.outreach_enrollments = this.db.tables.outreach_enrollments.find((x) => x.id === row.enrollment_id);
    if (value.outreach_enrollments) value.outreach_enrollments = { ...value.outreach_enrollments, outreach_sequences: this.db.tables.outreach_sequences.find((x) => x.id === value.outreach_enrollments.sequence_id) };
    if (this.table === "outreach_enrollments") value.outreach_sequences = this.db.tables.outreach_sequences.find((x) => x.id === row.sequence_id);
    return value;
  }
  async execute() {
    if (this.db.fail?.(this.table, this.op, this.values)) return { data: null, error: new Error("Fixture database failure") };
    const table = this.db.tables[this.table] ||= [];
    let rows = table.filter((row) => this.filters.every((filter) => filter(this.enriched(row))));
    for (const [key, ascending] of [...this.ordering].reverse()) rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (ascending ? 1 : -1));
    rows = rows.slice(0, this.count);
    if (this.op === "update") rows.forEach((row) => Object.assign(row, this.values));
    if (this.op === "insert") { const row = structuredClone(this.values); table.push(row); rows = [row]; }
    if (this.op === "upsert") {
      const existing = table.find((row) => row[this.conflict] === this.values[this.conflict]);
      if (existing) { if (!this.ignore) Object.assign(existing, this.values); rows = [existing]; }
      else { const row = { status: "open", ...structuredClone(this.values) }; table.push(row); rows = [row]; }
    }
    const result = rows.map((row) => structuredClone(this.enriched(row)));
    return { data: this.one ? result[0] || null : result, error: null };
  }
  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

function fixture() {
  return new MemoryDb({
    prospects: [{ id: "p1", name: "Example Clinic", status: "qualified", outreach_status: "queued", contact_email: "clinic@example.com", notes: "Keep this research\nSecond note", marketing_consent: true, consent_timestamp: "2026-08-25T10:00:00.000Z", consent_source: "Newsletter preference form submitted by recipient", consent_email: "clinic@example.com" }],
    outreach_sequences: [{ id: "s1", status: "active", audience_type: "cold" }],
    outreach_enrollments: [{ id: "e1", sequence_id: "s1", prospect_id: "p1", status: "active" }],
    outreach_sequence_steps: [{ id: "step1", sequence_id: "s1", step_order: 1, delay_hours: 0 }, { id: "step2", sequence_id: "s1", step_order: 2, delay_hours: 48 }],
    sales_messages: [{ id: "m1", enrollment_id: "e1", prospect_id: "p1", recipient: "clinic@example.com", status: "approved", direction: "outbound", channel: "email", scheduled_at: "2026-08-28T10:00:00.000Z", body_text: "Approved message", idempotency_key: "send-1", provider_payload: { stepId: "step1", stepOrder: 1, delayHours: 0 } }],
  });
}
const run = (db: MemoryDb, send = async (_message: Row) => ({ id: "provider-1" })) => runSalesDelivery({ db: db as any, send, now: new Date(NOW) });


test("admin direct email sends without adding fabricated consent evidence", async () => {
  const db = new MemoryDb({
    prospects: [{ id: "p1", name: "Example Clinic", status: "qualified", outreach_status: "not_started",
      contact_email: "clinic@example.com", marketing_consent: false, notes: "" }],
  });
  let sendCount = 0;
  const input = {
    prospectId: "p1", channel: "email" as const,
    subject: "Your website", bodyText: "Hello, I have a suggestion about your contact page.",
    observation: "Verified the contact page has no clear enquiry button",
    requestId: "direct-test-1", actorId: "admin-1",
    deliver: async (_message: Row) => { sendCount++; return { id: "provider-direct-1" }; },
  };
  const first = await sendDirectProspectOutreach(db as any, input, NOW);
  assert.equal(first.alreadySent, false);
  assert.equal(sendCount, 1);
  assert.equal(first.message.status, "sent");
  assert.equal(first.prospect.outreach_status, "contacted");
  assert.equal(first.prospect.marketing_consent, false);
  assert.equal(first.prospect.consent_timestamp, undefined);
  const retry = await sendDirectProspectOutreach(db as any, input, NOW);
  assert.equal(retry.alreadySent, true);
  assert.equal(sendCount, 1);
  await assert.rejects(sendDirectProspectOutreach(db as any, { ...input, requestId: "direct-test-2" }, NOW),
    /OUTREACH_TOO_SOON/);
});

test("direct permissioned prospect outreach sends 3/5/7-day preview-first follow-ups and archives after the final stage", async () => {
  const db = new MemoryDb({
    prospects: [{
      id: "p1", name: "Example Clinic", status: "qualified", outreach_status: "not_started",
      contact_email: "clinic@example.com", design_preview_url: "https://app.bennietay.com/preview/prospect/preview_1234567890",
      marketing_consent: true, consent_timestamp: "2026-08-25T10:00:00.000Z",
      consent_source: "Recipient subscribed through a verified email consent form",
      consent_email: "clinic@example.com", notes: "",
    }],
  });
  const sent: string[] = [];
  const start = await sendDirectProspectOutreach(db as any, {
    prospectId: "p1", channel: "email", subject: "Website idea", bodyText: "I noticed a useful improvement",
    observation: "The main contact route is not easy to locate",
    requestId: "sequence-test-1", actorId: "admin",
    deliver: async () => ({ id: "initial-outreach-provider-id" }),
  }, NOW);
  assert.equal(start.message.status, "sent");
  const followups = db.tables.sales_messages.filter((row) => row.provider_payload?.directProspectFollowUp);
  assert.deepEqual(followups.map((row) => row.provider_payload.directStage), [1, 2, 3]);
  assert.deepEqual(followups.map((row) => row.status), ["queued", "draft", "draft"]);
  assert.deepEqual(followups.map((row) => row.provider_payload.followUpStage),
    ["FOLLOW_UP_1_OF_3", "FOLLOW_UP_2_OF_3", "FOLLOW_UP_3_OF_3"]);
  const send = async (message: Row) => {
    sent.push(message.subject);
    return { id: "provider-" + sent.length };
  };
  const first = await runSalesDelivery({ db: db as any, send, now: new Date("2026-09-03T10:00:00Z") });
  assert.equal(first.sent, 1);
  assert.match(sent[0], /website concept/i);
  assert.match(followups[0].body_text, /preview\/prospect\/preview_1234567890/);
  assert.equal(followups[1].status, "queued");
  const premature = await runSalesDelivery({ db: db as any, send, now: new Date("2026-09-07T10:00:00Z") });
  assert.equal(premature.sent, 0);
  const second = await runSalesDelivery({ db: db as any, send, now: new Date("2026-09-08T10:00:00Z") });
  assert.equal(second.sent, 1);
  assert.equal(followups[2].status, "queued");
  const third = await runSalesDelivery({ db: db as any, send, now: new Date("2026-09-15T10:00:00Z") });
  assert.equal(third.sent, 1);
  assert.equal(db.tables.prospects[0].outreach_status, "lost");
  assert.equal(db.tables.prospects[0].outreach_exhausted_at, "2026-09-15T10:00:00.000Z");
  assert.equal(db.tables.prospects[0].next_follow_up_at, null);
  assert.deepEqual(db.tables.sales_tasks.filter((row) => row.status === "open" && row.task_type === "follow_up"), []);
  assert.equal((await runSalesDelivery({ db: db as any, send, now: new Date("2026-09-16T10:00:00Z") })).sent, 0);
  assert.equal(sent.length, 3);
});

test("recipient reply cancels all direct prospect follow-ups before they send", async () => {
  const db = new MemoryDb({
    prospects: [{ id: "p1", name: "Example Clinic", status: "qualified",
      outreach_status: "not_started", contact_email: "clinic@example.com", notes: "" }],
  });
  await sendDirectProspectOutreach(db as any, {
    prospectId: "p1", channel: "email", subject: "Website idea", bodyText: "Hello",
    observation: "The contact button is not prominent on the homepage",
    requestId: "reply-test-1", actorId: "admin",
    deliver: async () => ({ id: "initial-provider-1" }),
  }, NOW);
  const replyEvent = { data: { email_id: "recipient-reply-1", from: "clinic@example.com", in_reply_to: "initial-provider-1" } };
  await recordSalesReply(db as any, replyEvent, async () => "Thanks for sharing", NOW);
  assert.equal(db.tables.prospects[0].outreach_status, "replied");
  assert.deepEqual(db.tables.sales_messages.filter((row) => row.provider_payload?.directProspectFollowUp)
    .map((row) => row.status), ["cancelled", "cancelled", "cancelled"]);
});
test("admin direct email respects suppression and unsubscribed status", async () => {
  const base = { id: "p1", name: "Example Clinic", status: "qualified", outreach_status: "not_started",
    contact_email: "clinic@example.com", marketing_consent: false, notes: "" };
  const input = {
    prospectId: "p1", channel: "email" as const, subject: "Website",
    bodyText: "Hello, I have a relevant observation.",
    observation: "Verified the contact page has no clear enquiry button",
    requestId: "blocked-test", actorId: "admin-1",
    deliver: async (_message: Row) => { throw Error("Should never reach provider"); },
  };
  const suppressed = new MemoryDb({
    prospects: [base], sales_suppressions: [{ id: "s1", email: "clinic@example.com" }],
  });
  await assert.rejects(sendDirectProspectOutreach(suppressed as any, input, NOW), /CONTACT_SUPPRESSED/);
  assert.equal(suppressed.tables.sales_messages.length, 0);
  const unsubscribed = new MemoryDb({ prospects: [{ ...base, outreach_status: "unsubscribed" }] });
  await assert.rejects(sendDirectProspectOutreach(unsubscribed as any, input, NOW), /CONTACT_CLOSED/);
  assert.equal(unsubscribed.tables.sales_messages.length, 0);
});

test("marketing opt-in requires boolean permission, actual timestamp and meaningful source", () => {
  const good = { marketing_consent: true, consent_timestamp: "2026-08-25T10:00:00.000Z", consent_source: "Original subscriber form confirmation", consent_email: "clinic@example.com", contact_email: "clinic@example.com" };
  assert.equal(hasDocumentedMarketingConsent(good, new Date(NOW)), true);
  assert.equal(hasDocumentedMarketingConsent({ ...good, marketing_consent: false }, new Date(NOW)), false);
  assert.equal(hasDocumentedMarketingConsent({ ...good, consent_source: "website" }, new Date(NOW)), false);
  assert.equal(hasDocumentedMarketingConsent({ ...good, contact_email: "new@example.com" }, new Date(NOW)), false);
  assert.equal(hasDocumentedMarketingConsent({ ...good, consent_timestamp: "2027-01-01T00:00:00Z" }, new Date(NOW)), false);
});

test("unconsented standalone prospect marketing is also blocked at delivery", async () => {
  const db = fixture(); let sends = 0;
  db.tables.prospects[0].marketing_consent = false;
  db.tables.sales_messages[0].enrollment_id = null;
  const outcome = await run(db, async () => { sends++; return { id: "unexpected" }; });
  assert.equal(sends, 0);
  assert.equal(outcome.deliveryBlocked, 1);
  assert.equal(db.tables.sales_messages[0].status, "draft");
});

test("unconsented cold marketing cannot enter the provider and is returned to draft", async () => {
  const db = fixture(); let sends = 0;
  db.tables.prospects[0].marketing_consent = false;
  const outcome = await run(db, async () => { sends++; return { id: "unexpected" }; });
  assert.equal(sends, 0);
  assert.equal(outcome.deliveryBlocked, 1);
  assert.equal(db.tables.sales_messages[0].status, "draft");
});

test("two concurrent workers claim and send the message once", async () => {
  const db = fixture(); let sent = 0;
  const send = async () => { sent++; return { id: "receipt" }; };
  await Promise.all([run(db, send), run(db, send)]);
  assert.equal(sent, 1);
  assert.equal(db.tables.sales_messages[0].status, "sent");
  assert.equal(db.tables.outreach_enrollments[0].status, "completed");
});

test("paused sequences do not send or starve standalone booking messages", async () => {
  const db = fixture(); db.tables.outreach_sequences[0].status = "paused";
  db.tables.sales_messages.push({ ...db.tables.sales_messages[0], id: "booking", enrollment_id: null });
  const sent: string[] = [];
  await run(db, async (message) => { sent.push(message.id); return { id: "booking-receipt" }; });
  assert.deepEqual(sent, ["booking"]);
});

test("follow-ups retain a 48h gap after late approval of the first email", async () => {
  const db = fixture();
  db.tables.sales_messages.push({ ...db.tables.sales_messages[0], id: "m2", status: "queued", provider_payload: { stepId: "step2", stepOrder: 2, delayHours: 48 } });
  const result = await run(db);
  assert.equal(result.sent, 1);
  assert.equal(db.tables.sales_messages[1].scheduled_at, "2026-09-02T10:00:00.000Z");
  assert.equal(db.tables.sales_messages[1].status, "queued");
});

test("suppression lookup errors fail closed without leaving an unsent message stuck", async () => {
  const db = fixture(); db.fail = (table) => table === "sales_suppressions";
  let sends = 0; const result = await run(db, async () => { sends++; return { id: "receipt" }; });
  assert.equal(sends, 0); assert.equal(result.deliveryBlocked, 1);
  assert.equal(db.tables.sales_messages[0].status, "approved");
});

test("provider acceptance followed by persistence failure never auto-requeues", async () => {
  const db = fixture(); db.fail = (table, op, values) => table === "sales_messages" && op === "update" && values.status === "sent";
  await run(db);
  assert.equal(db.tables.sales_messages[0].status, "sending");
  assert.equal((await run(db)).sent, 0);
});

test("closed contacts and recorded replies stop all remaining sequence work", async () => {
  for (const status of ["replied", "won", "call_booked"]) {
    const db = fixture(); db.tables.prospects[0].outreach_status = status;
    assert.equal((await run(db)).sent, 0);
    assert.equal(db.tables.outreach_enrollments[0].status, "stopped");
    assert.equal(db.tables.sales_messages[0].status, "cancelled");
  }
});

test("suppression is repeatable with the existing partial email index", async () => {
  const db = fixture();
  await suppressSalesRecipient(db as any, "CLINIC@example.com", "opt_out", "test", NOW);
  await suppressSalesRecipient(db as any, "clinic@example.com", "opt_out", "test", NOW);
  assert.equal(db.tables.sales_suppressions.length, 1);
  assert.equal(db.tables.sales_messages[0].status, "suppressed");
  assert.equal(db.tables.outreach_enrollments[0].status, "stopped");
});

test("delivery callbacks preserve sequence metadata and cannot downgrade clicked to sent", async () => {
  const db = fixture(); Object.assign(db.tables.sales_messages[0], { provider_message_id: "r1", status: "clicked" });
  const metadata = structuredClone(db.tables.sales_messages[0].provider_payload);
  await recordSalesDeliveryEvent(db as any, { type: "email.sent", data: { email_id: "r1" } }, NOW);
  assert.equal(db.tables.sales_messages[0].status, "clicked");
  assert.deepEqual(db.tables.sales_messages[0].provider_payload, metadata);
  assert.equal(deliveryStatus("suppressed", "opened"), "suppressed");
});

const inbound = { type: "email.received", created_at: NOW, data: { email_id: "inbound-1", from: "Example Clinic <CLINIC@example.com>", subject: "Website review" } };
test("duplicate inbound callbacks create one reply and one task without reopening completed work", async () => {
  const db = fixture(); Object.assign(db.tables.sales_messages[0], { status: "sent", sent_at: NOW });
  await recordSalesReply(db as any, inbound, async () => "Yes, send it", NOW);
  db.tables.sales_tasks[0].status = "completed";
  await recordSalesReply(db as any, inbound, async () => { throw new Error("Must reuse stored reply"); }, NOW);
  assert.equal(db.tables.sales_messages.filter((row) => row.direction === "inbound").length, 1);
  assert.equal(db.tables.sales_tasks.length, 1);
  assert.equal(db.tables.sales_tasks[0].status, "completed");
  assert.equal(db.tables.outreach_enrollments[0].status, "stopped");
  assert.equal(db.tables.prospects[0].outreach_status, "replied");
});

test("reply retrieval failure still stops follow-ups and retains a manual-review reply", async () => {
  const db = fixture(); Object.assign(db.tables.sales_messages[0], { status: "sent", sent_at: NOW });
  await recordSalesReply(db as any, inbound, async () => { throw new Error("Sending key cannot read"); }, NOW);
  assert.equal(db.tables.outreach_enrollments[0].status, "stopped");
  assert.equal(db.tables.sales_messages.length, 2);
  const reply = db.tables.sales_messages.find((message) => message.direction === "inbound");
  assert.equal(reply?.status, "replied");
  assert.match(reply?.body_text || "", /body retrieval failed/i);
  assert.doesNotMatch(reply?.body_text || "", /Sending key cannot read/i);
  assert.equal(db.tables.sales_tasks.length, 1);
});

test("opt-outs suppress further sales without creating a reply-sales task", async () => {
  const db = fixture(); Object.assign(db.tables.sales_messages[0], { status: "sent", sent_at: NOW });
  await recordSalesReply(db as any, inbound, async () => "Please stop emailing me", NOW);
  assert.equal(db.tables.sales_suppressions.length, 1);
  assert.equal(db.tables.sales_tasks.length, 0);
});

test("an opt-out also dismisses open manual sales follow-ups, preserving unrelated work", async () => {
  const db = fixture();
  db.tables.sales_tasks.push({ id: "manual", prospect_id: "p1", status: "open", task_type: "follow_up" },
    { id: "unrelated", prospect_id: "p2", status: "open", task_type: "follow_up" },
    { id: "delivery", prospect_id: "p1", status: "open", task_type: "delivery" });
  await suppressSalesRecipient(db as any, "clinic@example.com", "opt_out", "test", NOW);
  assert.equal(db.tables.sales_tasks[0].status, "dismissed");
  assert.equal(db.tables.sales_tasks[1].status, "open");
  assert.equal(db.tables.sales_tasks[2].status, "open");
});

test("classification ignores quoted unsubscribe text and avoids substring matches", () => {
  assert.equal(classifyReply("Yes, send it\nOn Monday Bennie wrote:\nUnsubscribe"), "interested");
  assert.equal(classifyReply("Our showroom looks good"), "unknown");
  assert.equal(normalizeSalesEmail("Company <OWNER@example.com>"), "owner@example.com");
});

test("preparing manual outreach preserves notes and does not claim an email was sent", async () => {
  const db = fixture();
  const input = { prospectId: "p1", action: "prepare" as const, channel: "email" as const, observation: "The contact button is below the fold", bodyText: "Hello", requestId: "manual1", actorId: "admin" };
  await saveManualOutreach(db as any, input, NOW);
  assert.equal(db.tables.prospects[0].outreach_status, "queued");
  assert.equal(db.tables.sales_messages.length, 1);
  assert.match(db.tables.prospects[0].notes, /Keep this research\nSecond note/);
  assert.equal(getOutreachObservation(db.tables.prospects[0].notes), input.observation);
  await saveManualOutreach(db as any, { ...input, action: "contacted" }, NOW);
  await saveManualOutreach(db as any, { ...input, action: "contacted" }, NOW);
  assert.equal(db.tables.sales_tasks.length, 1);
  assert.equal(db.tables.sales_messages.length, 2);
});

test("saving a call twice creates one follow-up and cancelling stops queued reminders", async () => {
  const db = fixture(); db.tables.sales_call_bookings.push({ id: "call1", prospect_id: "p1", status: "booked" });
  db.tables.sales_messages.push({ id: "reminder", status: "queued", provider_payload: { bookingId: "call1" } });
  await saveSalesCallOutcome(db as any, "call1", { nextAction: "Send agreed scope" }, NOW);
  db.tables.sales_tasks[0].status = "completed";
  await saveSalesCallOutcome(db as any, "call1", { nextAction: "Send agreed scope", status: "cancelled" }, NOW);
  assert.equal(db.tables.sales_tasks.length, 1);
  assert.equal(db.tables.sales_tasks[0].status, "completed");
  assert.equal(db.tables.sales_messages[1].status, "cancelled");
});

test("customer users and platform staff without sales permission cannot operate outreach", () => {
  assert.equal(canManageSalesOperations({ role: "super_admin" }), true);
  assert.equal(canManageSalesOperations({ role: "platform_staff", staff_permissions: ["sales"] }), true);
  for (const role of ["business_admin", "staff", "customer_staff", "platform_staff"]) {
    assert.equal(canManageSalesOperations({ role, staff_permissions: ["customer_health"] }), false);
  }
});

test("CSV import accepts BOM, quoted commas, escaped quotes and multiline notes", () => {
  const { prospects, duplicates } = parseProspectCsv('\uFEFFbusiness name,website,email,phone,notes\r\n"Example, Clinic",https://WWW.Example.com/path,OWNER@example.com,+60 (12) 345-6789,"First line\nVerified ""contact"" button"\r\n');
  assert.equal(duplicates, 0);
  assert.equal(prospects.length, 1);
  assert.equal(prospects[0].name, "Example, Clinic");
  assert.equal(prospects[0].domain, "example.com");
  assert.equal(prospects[0].contact_email, "owner@example.com");
  assert.equal(prospects[0].contact_phone, "60123456789");
  assert.equal(prospects[0].notes, 'First line\nVerified "contact" button');
});

test("CSV import validates the entire file and rejects broken or oversized records", () => {
  for (const csv of [
    'name,email\nExample,not-an-email', 'name,notes\nExample,"unclosed',
    'name,notes\nExample,"closed"text', 'name,name\nExample,Other',
    'name,domain\nExample,javascript://alert.com', 'name,domain\nExample,https://user:secret@example.com',
    'name,phone\nExample,123', 'name,email\nValid,valid@example.com\nInvalid,broken',
    'name\n' + Array.from({ length: 501 }, (_, i) => `Company ${i}`).join('\n'),
    'a'.repeat(500001), '', 'name,email\n',
  ]) assert.throws(() => parseProspectCsv(csv));
});

test("CSV import deduplicates normalized domains, emails and names within one batch", () => {
  const { prospects, duplicates } = parseProspectCsv('name,domain,email,location\nExample,example.com,one@example.com,KL\nOther,www.example.com,two@example.com,SG\nThird,third.com,ONE@example.com,GB\nEXAMPLE,another.com,another@example.com,kl');
  assert.equal(prospects.length, 1);
  assert.equal(duplicates, 3);
  const noHeader = parseProspectCsv('Example,example.com,Clinic,KL,owner@example.com');
  assert.equal(noHeader.prospects[0].source, "csv_import");
});

test("follow-up datetime input preserves local wall-clock time, not UTC", () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = "Asia/Kuala_Lumpur";
    assert.equal(toLocalFollowUpInput("2026-08-31T10:30:00.000Z"), "2026-08-31T18:30");
    assert.equal(new Date(toLocalFollowUpInput("2026-08-31T10:30:00.000Z")).toISOString(), "2026-08-31T10:30:00.000Z");
    assert.equal(toLocalFollowUpInput(null), "");
    assert.equal(toLocalFollowUpInput("invalid"), "");
  } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; }
});
