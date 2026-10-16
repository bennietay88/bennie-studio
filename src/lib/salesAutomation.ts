export type SalesPriority = "high" | "medium" | "low";
export type ReplyClassification =
  | "interested"
  | "question"
  | "objection"
  | "not_now"
  | "not_interested"
  | "unsubscribe"
  | "unknown";

export type OutreachSequence = {
  id: string;
  name: string;
  audience_type: "cold" | "inbound" | "audit" | "preview" | "proposal" | "reactivation" | "referral";
  market?: string | null;
  channel: "email" | "whatsapp" | "manual";
  status: "draft" | "active" | "paused" | "archived";
  requires_first_step_approval: boolean;
  settings?: Record<string, unknown>;
};

export type SalesMessage = {
  id: string;
  direction?: "outbound" | "inbound";
  recipient?: string | null;
  subject?: string | null;
  body_text: string;
  status: string;
  channel: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  classification?: ReplyClassification | null;
  prospect_id?: string | null;
  lead_id?: string | null;
  reply_to_message_id?: string | null;
  provider_payload?: Record<string, any> | null;
};

export type SalesCallBooking = {
  id: string;
  lead_id?: string | null;
  name: string;
  email: string;
  business_name: string;
  market?: string | null;
  industry?: string | null;
  website_url?: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  status: "booked" | "completed" | "no_show" | "cancelled" | "rescheduled";
  goals?: string | null;
  outcome?: string | null;
  next_action?: string | null;
};

export const getObservablePriority = (input: {
  replied?: boolean;
  proposalViewed?: boolean;
  callBooked?: boolean;
  overdue?: boolean;
}): { priority: SalesPriority; reason: string } => {
  if (input.replied) return { priority: "high", reason: "The prospect replied and needs a human response." };
  if (input.callBooked) return { priority: "high", reason: "A confirmed call needs preparation." };
  if (input.proposalViewed) return { priority: "high", reason: "The proposal was viewed; answer questions while the context is current." };
  if (input.overdue) return { priority: "medium", reason: "A promised follow-up is due." };
  return { priority: "low", reason: "No recent buying signal has been recorded yet." };
};

export const classifyReply = (value: string): ReplyClassification => {
  // Classify the new reply, not the original sales email quoted underneath it.
  const text = value.split(/\n\s*(?:On .+wrote:|From:|>)/i)[0].toLowerCase();
  if (/^(?:stop|unsubscribe|remove me|opt[ -]?out)[!.\s]*$/.test(text) ||
    /\b(?:unsubscribe|remove me|opt out|stop (?:email(?:ing)?|contacting|sending)|do not contact|don't contact|no (?:more|further) emails)\b/.test(text)) return "unsubscribe";
  if (/\b(?:not interested|no thanks|no thank you)\b/.test(text)) return "not_interested";
  if (/\b(?:later|next month|not now|circle back)\b/.test(text)) return "not_now";
  if (/\b(?:price|cost|expensive|budget|already have|need to think)\b/.test(text)) return "objection";
  if (/\b(?:how|what|when|where|which)\b|\?/.test(text)) return "question";
  if (/\b(?:interested|yes|sure|book|call|show me|send it|send over|please send|go ahead|preview|homepage concept)\b/.test(text) || /\bplease do\b/.test(text)) return "interested";
  return "unknown";
};

/** Resend accepts permission-based marketing; an address in a prospect list is not consent. */
export const hasDocumentedMarketingConsent = (contact: {
  marketing_consent?: boolean | null;
  consent_timestamp?: string | null;
  consent_source?: string | null;
  consent_text?: string | null;
  consent_email?: string | null;
  contact_email?: string | null;
  email?: string | null;
} | null | undefined, now = new Date()): boolean => {
  if (contact?.marketing_consent !== true) return false;
  const permittedRecipient = String(contact.consent_email || "").trim().toLowerCase();
  const actualRecipient = String(contact.contact_email || contact.email || "").trim().toLowerCase();
  if (!permittedRecipient || permittedRecipient !== actualRecipient) return false;
  const recordedAt = new Date(String(contact.consent_timestamp || "")).getTime();
  const source = String(contact.consent_source || contact.consent_text || "").trim();
  return Number.isFinite(recordedAt) && recordedAt <= now.getTime() && source.length >= 10;
};

export const renderSalesTemplate = (template: string, values: Record<string, string | null | undefined>) =>
  template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => values[key] || "");

const OBSERVATION_PREFIX = "Verified website observation: ";
export const getOutreachObservation = (notes?: string | null) =>
  String(notes || "").split("\n").find((line) => line.startsWith(OBSERVATION_PREFIX))?.slice(OBSERVATION_PREFIX.length) || "";

export const saveOutreachObservation = (notes: string | null | undefined, observation: string) =>
  [OBSERVATION_PREFIX + observation.replace(/\s+/g, " ").trim(),
    ...String(notes || "").split("\n").filter((line) => !line.startsWith(OBSERVATION_PREFIX))]
    .join("\n").trim();

export const toLocalFollowUpInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};


/**
 * Use confirmed audit evidence and the corresponding specific recommendation.
 * Low-confidence or placeholder findings are never inserted into outreach.
 */
export const getConfirmedReviewInsight = (report?: {
  findings?: Array<{ observation?: string; whatWeFound?: string; recommendation?: string; priority?: string }>;
} | null): { observation: string; recommendation: string } | null => {
  const findings = report?.findings || [];
  const valid = (value: unknown) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length >= 10 && text.length <= 500 &&
      !/\[[^\]\n]{3,}\]|\{\{[^}]+\}\}|https?:\/\//i.test(text);
  };
  const priorities: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const match = findings
    .filter((finding) => finding.observation === "confirmed" &&
      valid(finding.whatWeFound) && valid(finding.recommendation))
    .sort((a, b) => (priorities[a.priority || ""] ?? 3) - (priorities[b.priority || ""] ?? 3))[0];
  if (!match) return null;
  return {
    observation: String(match.whatWeFound).replace(/\s+/g, " ").trim().replace(/[.!?]$/, ""),
    recommendation: String(match.recommendation).replace(/\s+/g, " ").trim().replace(/[.!?]$/, ""),
  };
};

export const getConfirmedReviewObservation = (report?: {
  findings?: Array<{ observation?: string; whatWeFound?: string; recommendation?: string; priority?: string }>;
} | null) => {
  const confirmed = (report?.findings || []).find((finding) =>
    finding.observation === "confirmed" &&
    String(finding.whatWeFound || "").trim().length >= 10 &&
    !/\[[^\]\n]{3,}\]|\{\{[^}]+\}\}/.test(String(finding.whatWeFound || "")),
  );
  return String(confirmed?.whatWeFound || "").trim().replace(/[.!?]$/, "");
};

/** Optional explicit review sharing after the prospect requests a link; never auto-attach it. */
export const appendRecipientReviewLink = (body: string, reportUrl?: string | null) => {
  const raw = String(reportUrl || "").trim();
  if (!raw || body.includes(raw)) return body;
  try {
    const link = new URL(raw);
    if (!["https:", "http:"].includes(link.protocol) ||
        link.pathname !== "/website-audit" ||
        !link.searchParams.get("report") || !link.searchParams.get("key")) return body;
  } catch {
    return body;
  }
  const attachment = `\n\nI prepared a short website review with the findings and a suggested direction: ${raw}`;
  const signature = "\n\nBest,\n";
  const offset = body.lastIndexOf(signature);
  return offset >= 0
    ? body.slice(0, offset) + attachment + body.slice(offset)
    : body + attachment;
};
