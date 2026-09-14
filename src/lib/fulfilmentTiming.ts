export const FULFILMENT_EVENTS = [
  "order_confirmed", "fulfilment_initialized", "onboarding_sent", "onboarding_completed", "generation_started",
  "generation_completed", "qa_started", "qa_completed", "internal_review_completed", "customer_review_sent",
  "customer_feedback_received", "revision_completed", "customer_approved", "domain_ready", "website_published",
] as const;
export type FulfilmentEventType = (typeof FULFILMENT_EVENTS)[number];

export type FulfilmentTimestamps = Partial<Record<FulfilmentEventType, string>>;

export function durationMinutes(from?: string, to?: string) {
  if (!from || !to) return null;
  const value = (Date.parse(to) - Date.parse(from)) / 60000;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function fulfilmentSlaStatus(input: { targetMinutes: number; elapsedMinutes: number; customerBlocked?: boolean; externalBlocked?: boolean }) {
  if (input.customerBlocked) return "customer_blocked" as const;
  if (input.externalBlocked) return "external_blocked" as const;
  if (input.elapsedMinutes > input.targetMinutes) return "breached" as const;
  if (input.elapsedMinutes >= input.targetMinutes * 0.8) return "at_risk" as const;
  return "on_track" as const;
}

export function largestDelayCategory(input: Record<"internal" | "customer" | "domain" | "ai" | "qa" | "asset" | "revision" | "billing" | "technical", number>) {
  return (Object.entries(input).sort((a, b) => b[1] - a[1])[0] || ["unknown", 0]) as [string, number];
}
