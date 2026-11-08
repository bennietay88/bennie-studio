/** Select follow-ups from confirmed outbound email history, not a CRM badge. */
export const FOLLOW_UP_SENT = new Set(["sent", "delivered", "opened", "clicked"]);
export const FOLLOW_UP_STOP = new Set(["replied", "call_booked", "won", "lost", "unsubscribed", "converted", "paid"]);
export const FOLLOW_UP_TEMPLATE_STAGES: Record<string, 1 | 2 | 3> = {
  day3_design: 1, day3_audit: 1, day3_portfolio_existing: 1, day3_portfolio_no_site: 1,
  day8_existing: 2, day8_no_site: 2, day15_existing: 3, day15_no_site: 3,
};
export function isStagedFollowUpTemplate(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(FOLLOW_UP_TEMPLATE_STAGES, id);
}
export type ProspectSentMessage = {
  direction?: string | null; channel?: string | null; status?: string | null;
  sent_at?: string | null; created_at?: string | null; reply_to_message_id?: string | null;
  provider_payload?: { directStage?: number; templateId?: string } | null;
};
export type NextOutreachAction = {
  kind: "intro" | "follow_up" | "wait" | "stop";
  stage?: 1 | 2 | 3;
  dueAt?: string;
  reason?: string;
};
export function chooseProspectFollowUp(
  prospect: { outreach_status?: string | null; status?: string | null; outreach_exhausted_at?: string | null },
  messages: ProspectSentMessage[],
  now = new Date(),
): NextOutreachAction {
  if (prospect.outreach_exhausted_at || [prospect.status, prospect.outreach_status]
    .some((status) => FOLLOW_UP_STOP.has(String(status || "").toLowerCase()))) {
    return { kind: "stop", reason: "This prospect has replied, opted out, converted, or been closed." };
  }
  if (messages.some((message) => message.direction === "inbound" || message.status === "replied")) {
    return { kind: "stop", reason: "The prospect replied. Use Reply instead of a cold follow-up." };
  }
  const sent = messages.filter((message) => message.direction === "outbound" && message.channel === "email"
    && !message.reply_to_message_id && FOLLOW_UP_SENT.has(String(message.status || "").toLowerCase()))
    .sort((a, b) => new Date(a.sent_at || a.created_at || "").getTime() - new Date(b.sent_at || b.created_at || "").getTime());
  if (!sent.length) return { kind: "intro" };
  if (sent.length >= 4) return { kind: "stop", reason: "The introduction and three follow-ups have already been sent." };
  const stage = sent.length as 1 | 2 | 3;
  const lastSentTime = new Date(sent[sent.length - 1].sent_at || sent[sent.length - 1].created_at || "").getTime();
  if (!Number.isFinite(lastSentTime)) return { kind: "stop", reason: "The latest sent email date could not be verified." };
  const nextTime = lastSentTime + [3, 5, 7][stage - 1] * 86_400_000;
  const dueAt = new Date(nextTime).toISOString();
  if (nextTime > now.getTime()) return { kind: "wait", stage, dueAt, reason: "The next follow-up is not due yet." };
  const pending = messages.some((message) => message.direction === "outbound"
    && ["sending", "queued", "approved"].includes(String(message.status || ""))
    && (Number(message.provider_payload?.directStage) === stage
      || FOLLOW_UP_TEMPLATE_STAGES[String(message.provider_payload?.templateId || "")] === stage));
  if (pending) return { kind: "stop", reason: "This follow-up is already scheduled or sending. Check Sales Inbox." };
  return { kind: "follow_up", stage, dueAt };
}
export function chooseProspectFollowUpTemplate(
  stage: 1 | 2 | 3, hasExistingWebsite: boolean, asset?: "design" | "audit" | null,
): keyof typeof FOLLOW_UP_TEMPLATE_STAGES {
  if (stage === 1) {
    if (asset === "design") return "day3_design";
    if (asset === "audit") return "day3_audit";
    return hasExistingWebsite ? "day3_portfolio_existing" : "day3_portfolio_no_site";
  }
  if (stage === 2) return hasExistingWebsite ? "day8_existing" : "day8_no_site";
  return hasExistingWebsite ? "day15_existing" : "day15_no_site";
}
