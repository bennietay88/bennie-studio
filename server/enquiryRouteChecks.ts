import { auditWebsiteButtons } from "../src/lib/websiteButtons.js";
import type { Website } from "../src/types.js";

export function inspectContactActions(site: Website) {
  if (
    !Array.isArray(site.pages) ||
    !site.pages.length ||
    site.pages.some((page) => !Array.isArray(page?.sections))
  ) {
    return {
      count: 0,
      issues: [{ reason: "Website pages could not be inspected." }],
    };
  }
  const actions = auditWebsiteButtons(site);
  const contactTypes = new Set([
    "phone",
    "whatsapp",
    "email",
    "booking_link",
    "contact_form",
  ]);
  const contact = actions.filter((action) =>
    contactTypes.has(action.actionType),
  );
  const issues: Array<{reason: string; page: string; button: string}> = actions
    .filter(
      (action) =>
        (action.critical || contactTypes.has(action.actionType)) &&
        action.status !== "working",
    )
    .map((action) => ({
      reason: action.status,
      page: action.pageName,
      button: action.buttonLabel,
    }));
  if (!contact.length)
    issues.push({
      reason: "No direct enquiry button could be verified.",
      page: "",
      button: "",
    });
  return { count: contact.length, issues };
}

export async function checkMonthlyEnquiryRoutes(admin: any, now = new Date()) {
  const period = now.toISOString().slice(0, 7);
  const { data, error } = await admin.rpc("due_enquiry_route_checks", {
    p_period: period,
  });
  if (error) throw error;
  for (const site of data || []) {
    const { count, issues } = inspectContactActions(site);
    const { error: saveError } = await admin.rpc("save_enquiry_route_check", {
      p_site: site.id,
      p_period: period,
      p_count: count,
      p_issues: issues,
    });
    if (saveError) throw saveError;
  }
  return data?.length || 0;
}
