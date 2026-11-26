import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlyGrowthReportDraft, getClosedReportPeriod, shouldRunMonthlyReportSchedule } from "../src/lib/monthlyGrowthReportWorkflow.ts";
import { generateMonthlyGrowthReportDrafts } from "../server/monthlyGrowthReports.ts";

test("monthly report period is the previous completed UTC month", () => {
  assert.deepEqual(getClosedReportPeriod(undefined, new Date("2026-11-07T10:00:00+08:00")), {
    month: "2026-10",
    from: "2026-10-01T00:00:00.000Z",
    to: "2026-11-01T00:00:00.000Z",
  });
  assert.throws(() => getClosedReportPeriod("2026-11", new Date("2026-11-07T00:00:00Z")), /completed month/);
  assert.throws(() => getClosedReportPeriod("2026-13", new Date("2026-11-07T00:00:00Z")), /YYYY-MM/);
});

test("daily cron only aggregates monthly reports during the first two UTC days", () => {
  assert.equal(shouldRunMonthlyReportSchedule(new Date("2026-11-01T02:20:00.000Z")), true);
  assert.equal(shouldRunMonthlyReportSchedule(new Date("2026-11-02T02:20:00.000Z")), true);
  assert.equal(shouldRunMonthlyReportSchedule(new Date("2026-11-03T02:20:00.000Z")), false);
});

test("report draft labels missing activity and unmeasured metrics instead of inventing results", () => {
  const period = getClosedReportPeriod("2026-10", new Date("2026-11-07T00:00:00Z"));
  const report = buildMonthlyGrowthReportDraft({
    businessId: "business-1", websiteId: "website-1", pageViews: 0, viewSessions: 0,
    enquiries: 0, whatsappClicks: 0, callClicks: 0, bookings: 0,
    topEnquiryPage: null, mostUsedEnquiryPath: null, completedWork: [],
  }, period);
  assert.equal(report.source_kind, "scheduled");
  assert.equal(report.status, "draft");
  assert.match(report.summary, /Not enough verified/);
  assert.equal(report.payload.coverage, "not_enough_verified_data");
  assert.deepEqual(report.recommendations, []);
  assert.equal(report.evidence_provenance.metrics.hotLeads, "not_measured");
});

test("measured monthly report keeps event counts and completed work with provenance", () => {
  const period = getClosedReportPeriod("2026-10", new Date("2026-11-07T00:00:00Z"));
  const report = buildMonthlyGrowthReportDraft({
    businessId: "business-1", websiteId: "website-1", pageViews: 121, viewSessions: 80,
    enquiries: 4, whatsappClicks: 7, callClicks: 2, bookings: 1,
    topEnquiryPage: "/contact", mostUsedEnquiryPath: "whatsapp_click",
    completedWork: [{ title: "  Contact page updated ", details: "Validated form destination", completedAt: "2026-10-14T09:00:00Z" }],
  }, period);
  assert.match(report.summary, /121 measured page views, 4 recorded enquiries/);
  assert.equal(report.payload.measured.viewSessions, 80);
  assert.equal(report.payload.measured.topEnquiryPage, "/contact");
  assert.equal(report.payload.completedWork[0].title, "Contact page updated");
  assert.deepEqual(report.recommendations, []);
  assert.equal(report.evidence_provenance.period.to, "2026-11-01T00:00:00.000Z");
});

test("monthly draft generator does not overwrite an existing business-month report", async () => {
  const created = new Set<string>();
  const admin = {
    async rpc(name: string, args: Record<string, any>) {
      if (name === "get_monthly_growth_report_source_data") return { data: [{
        business_id: "business-1", website_id: "website-1", page_views: 12, view_sessions: 8,
        enquiries: 1, whatsapp_clicks: 2, call_clicks: 0, bookings: 0,
        top_enquiry_page: "/contact", most_used_enquiry_path: "whatsapp_click", completed_work: [],
      }], error: null };
      if (name === "report_owner_evidence") return { data: [{
        business_id: "business-1", confirmed: { won: 2 }, checkin: { offline_qualified: 0 }, plan: "website-growth",
      }], error: null };
      assert.equal(name, "create_monthly_growth_report_draft");
      assert.match(args.p_report.summary, /2 won/);
      assert.match(args.p_report.summary, /outside the CRM: 0/);
      assert.ok(args.p_report.payload.suggestedAction);
      assert.deepEqual(args.p_report.recommendations, []);
      const row = args.p_report;
      const key = `${row.business_id}:${row.report_month}`;
      if (created.has(key)) return { data: [{ created: false }], error: null };
      created.add(key);
      return { data: [{ created: true }], error: null };
    },
  };
  const now = new Date("2026-11-07T00:00:00Z");
  const first = await generateMonthlyGrowthReportDrafts(admin, undefined, now);
  const retry = await generateMonthlyGrowthReportDrafts(admin, undefined, now);
  assert.deepEqual(first, { month: "2026-10", eligible: 1, created: 1, alreadyExists: 0 });
  assert.deepEqual(retry, { month: "2026-10", eligible: 1, created: 0, alreadyExists: 1 });
});
