export type TrafficPageView = { visitor_id?: string | null; session_id?: string | null; page_path?: string | null };
export type TrafficTrackedEvent = { event_type?: string | null; metadata?: Record<string, unknown> | null };
export type TrafficLead = { id: string; status?: string | null; source?: string | null; visitor_id?: string | null };

export function summarizePlatformTraffic(input: {
  pageViews: TrafficPageView[];
  trackingEvents: TrafficTrackedEvent[];
  profiles: Array<{ id: string }>;
  businesses: Array<{ id: string }>;
  leads: TrafficLead[];
}) {
  const visitorIds = new Set(input.pageViews.map((view) => String(view.visitor_id || "")).filter(Boolean));
  const attributedLeadVisitors = new Set<string>();
  for (const lead of input.leads) {
    const visitorId = String(lead.visitor_id || "");
    if (visitorId && visitorIds.has(visitorId)) attributedLeadVisitors.add(visitorId);
  }
  const ids = <T extends { id: string }>(rows: T[]) => new Set(rows.map((row) => row.id).filter(Boolean)).size;
  const totalViews = input.pageViews.filter((view) => !String(view.page_path || "").includes(":" )).length;
  const qualifiedStatuses = new Set(["qualified", "meeting", "proposal", "won"]);
  const qualifiedLeads = new Set(input.leads.filter((lead) => qualifiedStatuses.has(String(lead.status || ""))).map((lead) => lead.id)).size;

  return {
    totalViews,
    uniqueVisitors: visitorIds.size,
    avgViewsPerVisitor: visitorIds.size ? totalViews / visitorIds.size : 0,
    totalClicks: input.trackingEvents.filter((event) => /(click|cta|whatsapp|call|email|booking|quote|checkout|form_submit|appointment)/i.test(String(event.event_type || ""))).length,
    registrations: ids(input.profiles),
    businessAccounts: ids(input.businesses),
    totalLeads: ids(input.leads),
    qualifiedLeads,
    totalEvents: input.trackingEvents.length,
    attributedLeadVisitors: attributedLeadVisitors.size,
    conversionRate: visitorIds.size ? (attributedLeadVisitors.size / visitorIds.size) * 100 : 0,
  };
}
