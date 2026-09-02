export type InboundLeadSnapshot = {
  automation_score: number;
  automation_temperature: "Cold" | "Warm" | "Hot";
  automation_next_action: string;
  next_follow_up_at: string;
};

/**
 * Converts observable inbound intent into a small, explainable sales SLA.
 * This is deliberately deterministic: it is a routing aid, not a hidden lead score.
 */
export const buildInboundLeadSnapshot = (input: {
  message?: string | null;
  leadType?: string | null;
  source?: string | null;
  phone?: string | null;
}): InboundLeadSnapshot => {
  const text = `${input.message || ""} ${input.leadType || ""} ${input.source || ""}`.toLowerCase().replace(/[_-]/g, " ");
  const hasDirectContact = Boolean(String(input.phone || "").trim());
  const urgent = /\b(?:urgent|today|asap|now|this week|appointment|booking)\b/.test(text)
    && !/\b(?:not urgent|no rush|not now)\b/.test(text);
  const commercial = /\b(?:quote|quotation|price|pricing|cost|budget|package|checkout|buy|start)\b/.test(text);
  const highIntentSource = /\b(?:preview|audit|quote|book|booking|campaign|portfolio)\b/.test(text);
  const score = Math.min(100, 25 + (urgent ? 30 : 0) + (commercial ? 20 : 0) + (highIntentSource ? 15 : 0) + (hasDirectContact ? 10 : 0));
  const temperature = score >= 72 ? "Hot" : score >= 45 ? "Warm" : "Cold";
  const minutes = temperature === "Hot" ? 15 : temperature === "Warm" ? 240 : 1440;
  const next = new Date(Date.now() + minutes * 60_000).toISOString();
  const action = temperature === "Hot"
    ? "Reply personally within 15 minutes and confirm fit, timing, and the next commercial step."
    : temperature === "Warm"
      ? "Reply today with one useful answer and a clear booking or preview next step."
      : "Qualify the desired outcome and send one helpful next step within 24 hours.";
  return { automation_score: score, automation_temperature: temperature, automation_next_action: action, next_follow_up_at: next };
};
