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
  classification?: ReplyClassification | null;
  prospect_id?: string | null;
  lead_id?: string | null;
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
  const text = value.toLowerCase();
  if (/unsubscribe|remove me|stop email|do not contact/.test(text)) return "unsubscribe";
  if (/not interested|no thanks|no thank you/.test(text)) return "not_interested";
  if (/later|next month|not now|circle back/.test(text)) return "not_now";
  if (/price|cost|expensive|budget|already have|need to think/.test(text)) return "objection";
  if (/how|what|when|where|which|\?/.test(text)) return "question";
  if (/interested|yes|book|call|show me|send it/.test(text)) return "interested";
  return "unknown";
};

export const renderSalesTemplate = (template: string, values: Record<string, string | null | undefined>) =>
  template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => values[key] || "");
