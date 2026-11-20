import type { ProspectSentMessage } from "./prospectFollowUpComposer";
import { PORTFOLIO_URL, renderProspectEmailTemplate } from "./prospectOutreachTemplates";
import type { ProspectEmailOverrides } from "./prospectOutreachTemplates";

export const MAX_MANUAL_BULK_INTRO = 25;

export type ManualBulkIntroPreview = {
  prospectId: string;
  name: string;
  email: string;
  kind: "ready" | "skip" | "permission_review";
  subject?: string;
  bodyText?: string;
  reason?: string;
};

type Prospect = {
  id: string;
  name?: string | null;
  contact_email?: string | null;
  contact_first_name?: string | null;
  contact_name?: string | null;
  outreach_status?: string | null;
  status?: string | null;
  outreach_exhausted_at?: string | null;
  converted_business_id?: string | null;
  marketing_consent?: boolean | null;
  consent_timestamp?: string | null;
  consent_email?: string | null;
  consent_source?: string | null;
  consent_text?: string | null;
  contact_jurisdiction?: string | null;
  country?: string | null;
  market?: string | null;
  contact_recipient_type?: string | null;
  recipient_type?: string | null;
  contact_lawful_basis?: string | null;
  raw_fields?: { marketingConsentEmail?: string; marketingConsentSource?: string; country?: string; market?: string } | null;
};

/**
 * Read-only eligibility and copy preview. The authenticated send endpoint
 * rechecks contact history, active sequences, opt-outs and throttling.
 */
export function prepareManualBulkIntro(
  prospect: Prospect,
  messages: ProspectSentMessage[],
  overrides: ProspectEmailOverrides = {},
): ManualBulkIntroPreview {
  const name = String(prospect.name || "Unknown prospect").trim();
  const email = String(prospect.contact_email || "").trim();
  const base = { prospectId: prospect.id, name, email };
  const skip = (reason: string): ManualBulkIntroPreview => ({ ...base, kind: "skip", reason });

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return skip("No valid email address.");
  if (prospect.converted_business_id) return skip("Converted customer; handle communication personally.");
  if (prospect.outreach_exhausted_at
    || ["won", "lost", "closed", "converted", "paid", "unsubscribed", "replied", "call_booked"]
      .some((value) => [prospect.status, prospect.outreach_status].some((status) => String(status || "").toLowerCase() === value))) {
    return skip("This prospect has replied, opted out, converted, or been closed.");
  }
  // Queued or contacted records may already have work in progress.
  if (prospect.outreach_status !== "not_started") return skip("Not a new, uncontacted prospect.");
  if (!Array.isArray(messages)) return skip("Could not verify contact history.");
  if (messages.some((message) => message.direction === "inbound" || message.status === "replied")) {
    return skip("The prospect already replied.");
  }
  // Even a cancelled, failed or draft outbound email requires manual review:
  // it must not silently become another first-contact send.
  if (messages.some((message) => message.direction === "outbound" && message.channel === "email")) {
    return skip("An email already exists in this prospect's history. Review it individually.");
  }

  const firstName = String(prospect.contact_first_name || prospect.contact_name || "").trim().split(/\s+/)[0] || name + " team";
  const rendered = renderProspectEmailTemplate("intro", {
    first_name: firstName,
    business_name: name,
    portfolio_url: PORTFOLIO_URL,
  }, overrides);
  if (!rendered.subject.trim() || !rendered.body_text.trim()
    || /\{\{[^}]+\}\}|\[[^\]\n]{3,}\]/.test(rendered.subject + "\n" + rendered.body_text)) {
    return skip("Email template contains missing information. Fix the saved template before sending.");
  }
  return { ...base, kind: "ready", subject: rendered.subject, bodyText: rendered.body_text };
}
