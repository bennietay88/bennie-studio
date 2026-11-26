import {
  buildMonthlyGrowthReportDraft,
  getClosedReportPeriod,
  type MonthlyReportSource,
} from "../src/lib/monthlyGrowthReportWorkflow.js";

const integer = (value: unknown) =>
  Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;

export async function generateMonthlyGrowthReportDrafts(
  admin: any,
  requestedMonth?: string,
  now = new Date(),
) {
  const period = getClosedReportPeriod(requestedMonth, now);
  const { data: rows, error: sourceError } = await admin.rpc(
    "get_monthly_growth_report_source_data",
    {
      p_from: period.from,
      p_to: period.to,
    },
  );
  if (sourceError) throw sourceError;

  const { data: evidence, error: evidenceError } = await admin.rpc(
    "report_owner_evidence",
    { p_from: period.from, p_to: period.to },
  );
  if (evidenceError) throw evidenceError;
  const evidenceByBusiness = new Map<string, any>(
    (evidence || []).map((record: any) => [record.business_id, record]),
  );
  const result = {
    month: period.month,
    eligible: 0,
    created: 0,
    alreadyExists: 0,
  };
  for (const row of rows || []) {
    result.eligible += 1;
    const work = Array.isArray(row.completed_work) ? row.completed_work : [];
    const source: MonthlyReportSource = {
      businessId: String(row.business_id),
      websiteId: String(row.website_id),
      pageViews: integer(row.page_views),
      viewSessions: integer(row.view_sessions),
      enquiries: integer(row.enquiries),
      whatsappClicks: integer(row.whatsapp_clicks),
      callClicks: integer(row.call_clicks),
      bookings: integer(row.bookings),
      topEnquiryPage:
        typeof row.top_enquiry_page === "string" ? row.top_enquiry_page : null,
      mostUsedEnquiryPath:
        typeof row.most_used_enquiry_path === "string"
          ? row.most_used_enquiry_path
          : null,
      completedWork: work
        .map((item: any) => ({
          title: String(item?.title || "Website update completed"),
          details: typeof item?.details === "string" ? item.details : null,
          completedAt: String(item?.completedAt || ""),
        }))
        .filter((item: any) => item.completedAt),
    };
    const report = buildMonthlyGrowthReportDraft(source, period);
    const owner = evidenceByBusiness.get(source.businessId);
    if (owner) {
      const counts = owner.confirmed || {};
      const lines = Object.entries(counts).map(
        ([status, n]) => `${n} ${status}`,
      );
      if (lines.length)
        report.summary += ` Owner-confirmed CRM outcomes: ${lines.join(", ")}.`;
      if (owner.checkin?.offline_qualified != null)
        report.summary += ` Owner-reported qualified enquiries outside the CRM: ${owner.checkin.offline_qualified}.`;
      if (owner.checkin?.route_verified)
        report.summary += " Owner confirmed receipt of a test enquiry.";
      if (owner.checkin?.routeCheck) {
        const check = owner.checkin.routeCheck;
        report.summary += ` Website contact configuration: ${check.checked} direct actions checked, ${check.status === "healthy" ? "checks passed" : "staff review needed"}.`;
      }
      if (owner.checkin?.priority) report.summary += ` Owner priority: ${owner.checkin.priority}.`;
      if (owner.checkin?.baseline) report.summary += ` Owner baseline: ${owner.checkin.baseline}.`;
      const lastYear = owner.checkin?.previousYear;
      if (lastYear?.enquiries != null) report.summary += ` Same month last year: ${lastYear.enquiries} recorded enquiries; this month: ${source.enquiries}.`;
      const growth = [
        "growth",
        "premium",
        "website_growth",
        "growth_partner",
        "website-growth",
        "growth-partner",
      ].includes(owner.plan);
      const suggestedAction = growth
        ? source.viewSessions && !source.enquiries
          ? "Check the highest-traffic page and test its enquiry route."
          : "Review enquiry quality with the owner and choose one page to improve."
        : "Check contact details and offer the included content edit.";
      Object.assign(report.payload, {
        ownerEvidence: owner,
        suggestedAction,
        interpretation:
          "Owner confirmations are separate from platform activity. The suggested action is pending staff review.",
      });
      report.evidence_provenance.sources.push(
        "enquiry_outcomes",
        "owner_monthly_checkins",
        "website_health_checks",
      );
    }
    const { data, error } = await admin.rpc(
      "create_monthly_growth_report_draft",
      { p_report: report },
    );
    if (error) throw error;
    const rowResult = Array.isArray(data) ? data[0] : data;
    if (rowResult?.created) result.created += 1;
    else result.alreadyExists += 1;
  }
  return result;
}
