import test from "node:test";
import assert from "node:assert/strict";
import { summarizePlatformTraffic } from "../src/lib/trafficAnalytics.ts";

test("traffic reporting deduplicates records and only attributes visitor-linked lead submissions", () => {
  const summary = summarizePlatformTraffic({
    pageViews: [
      { visitor_id: "visitor-1", session_id: "session-1", page_path: "/" },
      { visitor_id: "visitor-1", session_id: "session-1", page_path: "/services" },
      { visitor_id: "visitor-2", session_id: "session-2", page_path: "/pricing" },
    ],
    trackingEvents: [
      { event_type: "lead_form_submit", metadata: { visitorId: "visitor-1", leadId: "lead-1" } },
      { event_type: "platform_lead_submitted", metadata: { visitorId: "visitor-2", leadId: "forged-event" } },
      { event_type: "checkout_started", metadata: { visitorId: "visitor-2" } },
    ],
    profiles: [{ id: "profile-1" }, { id: "profile-1" }],
    businesses: [{ id: "business-1" }],
    leads: [
      { id: "lead-1", status: "qualified", visitor_id: "visitor-1" },
      { id: "lead-1", status: "qualified", visitor_id: "visitor-1" },
      { id: "lead-2", status: "new" },
    ],
  });

  assert.equal(summary.totalViews, 3);
  assert.equal(summary.uniqueVisitors, 2);
  assert.equal(summary.registrations, 1);
  assert.equal(summary.businessAccounts, 1);
  assert.equal(summary.totalLeads, 2);
  assert.equal(summary.qualifiedLeads, 1);
  assert.equal(summary.attributedLeadVisitors, 1);
  assert.equal(summary.conversionRate, 50);
});
