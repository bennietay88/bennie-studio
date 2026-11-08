export type ClosedReportPeriod = {
  month: string;
  from: string;
  to: string;
};

export type MonthlyReportSource = {
  businessId: string;
  websiteId: string;
  pageViews: number;
  viewSessions: number;
  enquiries: number;
  whatsappClicks: number;
  callClicks: number;
  bookings: number;
  topEnquiryPage: string | null;
  mostUsedEnquiryPath: string | null;
  completedWork: Array<{ title: string; details: string | null; completedAt: string }>;
};

const utcMonthStart = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex, 1));

export function shouldRunMonthlyReportSchedule(now = new Date()) {
  // The existing Vercel cron is daily; bound report source aggregation to the
  // first two UTC days so a transient failure gets one idempotent retry.
  return now.getUTCDate() <= 2;
}

export function getClosedReportPeriod(month: string | undefined, now = new Date()): ClosedReportPeriod {
  const currentMonth = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth());
  const selected = month ?? (() => {
    const previous = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth() - 1);
    return previous.toISOString().slice(0, 7);
  })();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selected)) throw new Error("Report month must use YYYY-MM format");
  const [year, monthNumber] = selected.split("-").map(Number);
  const start = utcMonthStart(year, monthNumber - 1);
  if (start >= currentMonth) throw new Error("Reports can only be generated for a completed month");
  return {
    month: selected,
    from: start.toISOString(),
    to: utcMonthStart(year, monthNumber).toISOString(),
  };
}

const count = (value: number) => Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

export function buildMonthlyGrowthReportDraft(source: MonthlyReportSource, period: ClosedReportPeriod) {
  const measured = {
    pageViews: count(source.pageViews),
    viewSessions: count(source.viewSessions),
    enquiries: count(source.enquiries),
    whatsappClicks: count(source.whatsappClicks),
    callClicks: count(source.callClicks),
    bookings: count(source.bookings),
    topEnquiryPage: source.topEnquiryPage || null,
    mostUsedEnquiryPath: source.mostUsedEnquiryPath || null,
  };
  const hasMeasuredActivity = Object.values(measured)
    .some((value) => typeof value === "number" && value > 0);
  const completedWork = source.completedWork.map((item) => ({
    title: item.title.trim().slice(0, 180) || "Website update completed",
    details: item.details?.trim().slice(0, 500) || null,
    completedAt: item.completedAt,
  }));
  const summary = hasMeasuredActivity
    ? `${measured.pageViews} measured page views, ${measured.enquiries} recorded enquiries, and ${measured.bookings} recorded bookings in ${period.month}.`
    : `Not enough verified website activity was recorded for ${period.month}.`;

  return {
    business_id: source.businessId,
    website_id: source.websiteId,
    report_month: period.month,
    status: "draft" as const,
    source_kind: "scheduled" as const,
    source_period_start: period.from,
    source_period_end: period.to,
    lead_count: measured.enquiries,
    hot_lead_count: 0,
    review_count: 0,
    local_seo_page_count: 0,
    summary,
    recommendations: [] as string[],
    evidence_provenance: {
      generatedBy: "monthly_growth_reporting_v1",
      period: { from: period.from, to: period.to },
      sources: ["page_views", "tracking_events", "monthly_update_requests"],
      metrics: {
        pageViews: "measured",
        viewSessions: "measured",
        enquiries: "measured",
        whatsappClicks: "measured",
        callClicks: "measured",
        bookings: "measured",
        reviews: "not_measured",
        hotLeads: "not_measured",
        localSeoPages: "not_measured",
      },
    },
    payload: {
      period: { month: period.month, from: period.from, to: period.to },
      measured,
      completedWork,
      coverage: hasMeasuredActivity ? "measured_activity" : "not_enough_verified_data",
      interpretation: "No recommendations were generated. Add recommendations only after human review.",
    },
  };
}
