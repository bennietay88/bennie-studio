import {
  buildMonthlyGrowthReportDraft,
  getClosedReportPeriod,
  type MonthlyReportSource,
} from "../src/lib/monthlyGrowthReportWorkflow.js";

const integer = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;

export async function generateMonthlyGrowthReportDrafts(admin: any, requestedMonth?: string, now = new Date()) {
  const period = getClosedReportPeriod(requestedMonth, now);
  const { data: rows, error: sourceError } = await admin.rpc("get_monthly_growth_report_source_data", {
    p_from: period.from,
    p_to: period.to,
  });
  if (sourceError) throw sourceError;

  const result = { month: period.month, eligible: 0, created: 0, alreadyExists: 0 };
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
      topEnquiryPage: typeof row.top_enquiry_page === "string" ? row.top_enquiry_page : null,
      mostUsedEnquiryPath: typeof row.most_used_enquiry_path === "string" ? row.most_used_enquiry_path : null,
      completedWork: work.map((item: any) => ({
        title: String(item?.title || "Website update completed"),
        details: typeof item?.details === "string" ? item.details : null,
        completedAt: String(item?.completedAt || ""),
      })).filter((item: any) => item.completedAt),
    };
    const report = buildMonthlyGrowthReportDraft(source, period);
    const { data, error } = await admin.rpc("create_monthly_growth_report_draft", { p_report: report });
    if (error) throw error;
    const rowResult = Array.isArray(data) ? data[0] : data;
    if (rowResult?.created) result.created += 1;
    else result.alreadyExists += 1;
  }
  return result;
}
