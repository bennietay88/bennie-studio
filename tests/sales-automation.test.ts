import assert from "node:assert/strict";
import test from "node:test";

import { classifyReply, getObservablePriority, renderSalesTemplate } from "../src/lib/salesAutomation";
import { buildInboundLeadSnapshot } from "../server/leadGeneration.ts";

test("replies outrank other observable sales signals", () => {
  assert.deepEqual(
    getObservablePriority({ replied: true, callBooked: true, overdue: true }),
    { priority: "high", reason: "The prospect replied and needs a human response." },
  );
});

test("reply classification keeps opt-outs and buying intent distinct", () => {
  assert.equal(classifyReply("Please unsubscribe me"), "unsubscribe");
  assert.equal(classifyReply("Yes, send it and let us book a call"), "interested");
  assert.equal(classifyReply("The price is beyond our budget"), "objection");
});

test("outreach templates render only supplied values", () => {
  assert.equal(
    renderSalesTemplate("Hi {{ first_name }}, I noticed {{ observation }}.", {
      first_name: "Maya",
      observation: "the quotation button is not visible on mobile",
    }),
    "Hi Maya, I noticed the quotation button is not visible on mobile.",
  );
});

test("inbound intent gets an explainable response SLA", () => {
  const snapshot = buildInboundLeadSnapshot({
    message: "We need a quote this week and want to book a call",
    leadType: "website_preview",
    phone: "+60123456789",
  });
  assert.equal(snapshot.automation_temperature, "Hot");
  assert.match(snapshot.automation_next_action, /15 minutes/);
  assert.ok(new Date(snapshot.next_follow_up_at).getTime() > Date.now());
});

test("lead routing does not infer urgency from words like unknown or snow", () => {
  const snapshot = buildInboundLeadSnapshot({ message: "Our budget is unknown for the snow resort." });
  assert.equal(snapshot.automation_score, 45);
  const noRush = buildInboundLeadSnapshot({ message: "Not urgent, just looking for information." });
  assert.equal(noRush.automation_temperature, "Cold");
  assert.match(noRush.automation_next_action, /24 hours/);
});
