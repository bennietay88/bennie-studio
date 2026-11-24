import { chooseProspectFollowUp, chooseProspectFollowUpTemplate } from "./prospectFollowUpComposer";
import { describeSalesEmailPermissionBlockReason, getOutreachObservation, salesEmailPermissionBlockReason } from "./salesAutomation";
import type { ProspectSentMessage } from "./prospectFollowUpComposer";
import { PORTFOLIO_URL, renderProspectEmailTemplate } from "./prospectOutreachTemplates";
import type { ProspectEmailOverrides, ProspectEmailTemplateKey } from "./prospectOutreachTemplates";

export const MAX_MANUAL_BULK_FOLLOW_UP = 25;

export type ManualBulkFollowUpPreview = {
  prospectId: string;
  name: string;
  email: string;
  kind: "ready" | "skip";
  stage?: 1 | 2 | 3;
  templateId?: ProspectEmailTemplateKey;
  subject?: string;
  bodyText?: string;
  reason?: string;
};

type Prospect = NonNullable<Parameters<typeof salesEmailPermissionBlockReason>[0]> & {
  id: string;
  name?: string | null;
  contact_email?: string | null;
  contact_first_name?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  domain?: string | null;
  website_status?: string | null;
  website_evidence_source_url?: string | null;
  website_verified_at?: string | null;
  website_verification_method?: string | null;
  website_finding?: string | null;
  website_verified_by?: string | null;
  design_preview_url?: string | null;
  audit_report_url?: string | null;
  preview_url?: string | null;
  outreach_status?: string | null;
  status?: string | null;
  outreach_exhausted_at?: string | null;
  converted_business_id?: string | null;
};

const APP_ORIGIN = "https://app.bennietay.com";

export function safeProspectFollowUpAsset(prospect: Prospect): { kind: "design" | "audit"; url: string } | null {
  for (const [kind, value] of [
    ["design", prospect.design_preview_url],
    ["audit", prospect.audit_report_url],
    ["audit", prospect.preview_url],
  ] as const) {
    if (!value) continue;
    try {
      const url = new URL(value, APP_ORIGIN);
      if (url.origin !== APP_ORIGIN || url.hash) continue;
      if (kind === "design" && (/^\/preview\/prospect\/[A-Za-z0-9_-]{8,160}$/.test(url.pathname)
        || /^\/p\/s_[A-Za-z0-9_-]{20}$/.test(url.pathname))) {
        return { kind, url: url.href };
      }
      if (kind === "audit" && (/^\/review\/[A-Za-z0-9_-]{22}$/.test(url.pathname)
        || (url.pathname === "/website-audit" && url.searchParams.has("report") && url.searchParams.has("key")))) {
        return { kind, url: url.href };
      }
    } catch { /* Unverified or third-party URLs cannot be used as prospect-specific proof. */ }
  }
  return null;
}

/** Read-only preview. Never infer permission or send based on a CRM badge alone. */
export function prepareManualBulkFollowUp(
  prospect: Prospect,
  messages: ProspectSentMessage[],
  overrides: ProspectEmailOverrides = {},
  now = new Date(),
): ManualBulkFollowUpPreview {
  const name = String(prospect.name || "Unknown prospect");
  const email = String(prospect.contact_email || "").trim();
  const base = { prospectId: prospect.id, name, email };
  const skip = (reason: string): ManualBulkFollowUpPreview => ({ ...base, kind: "skip", reason });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return skip("No valid email address.");
  if (prospect.converted_business_id) return skip("Converted customer; handle communication personally.");
  const next = chooseProspectFollowUp(prospect, messages, now);
  if (next.kind === "intro") return skip("No confirmed opening email. This action sends follow-ups only.");
  if (next.kind === "wait") return skip("Not due until " + new Date(String(next.dueAt)).toLocaleString() + ".");
  if (next.kind === "stop" || !next.stage) return skip(next.reason || "Follow-up not available.");
  const permissionReason = salesEmailPermissionBlockReason(prospect, now);
  if (permissionReason) return skip(describeSalesEmailPermissionBlockReason(permissionReason));
  const verifiedWebsite = Boolean(prospect.website_evidence_source_url && prospect.website_verified_at
    && prospect.website_verification_method && prospect.website_finding && prospect.website_verified_by);
  const status = String(prospect.website_status || "").toLowerCase().trim();
  const websiteStatus = !verifiedWebsite ? "unknown" as const
    : status === "no_website" ? false : ["weak", "average", "strong"].includes(status) ? true : "unknown" as const;
  const asset = safeProspectFollowUpAsset(prospect);
  const observation = getOutreachObservation(prospect.notes).replace(/\s+/g, " ").trim().slice(0, 240);
  const templateId = chooseProspectFollowUpTemplate(next.stage, websiteStatus, asset?.kind === "audit" && !observation ? null : asset?.kind) as ProspectEmailTemplateKey;
  const contact = String(prospect.contact_first_name || prospect.contact_name || "").trim().split(/\s+/)[0]
    || name + " team";
  const rendered = renderProspectEmailTemplate(templateId, {
    first_name: contact,
    business_name: name,
    asset_url: asset?.url || "",
    portfolio_url: PORTFOLIO_URL,
    specific_observation: observation,
  }, overrides);
  if (!rendered.subject.trim() || !rendered.body_text.trim()
    || /\{\{[^}]+\}\}|\[[^\]\n]{3,}\]/.test(rendered.subject + "\n" + rendered.body_text)) {
    return skip("Email template contains missing information. Fix the saved template before sending.");
  }
  return { ...base, kind: "ready", stage: next.stage, templateId, subject: rendered.subject, bodyText: rendered.body_text };
}
