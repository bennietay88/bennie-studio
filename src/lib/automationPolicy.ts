export type AutomationMode = "off" | "assisted" | "full";
export type AutomationAction = "outbound_email" | "publish" | "dns_change" | "refund" | "custom_pricing" | "internal_task";

const ALWAYS_GATED = new Set<AutomationAction>(["publish", "dns_change", "refund", "custom_pricing"]);

export function canAutomationExecute(action: AutomationAction, mode: AutomationMode = "assisted") {
  if (mode === "off") return false;
  if (ALWAYS_GATED.has(action)) return false;
  return mode === "full" || action === "internal_task";
}

export type HealthInput = { onboardingComplete?: boolean; websiteLive?: boolean; paymentHealthy?: boolean; recentEngagement?: boolean; openIssues?: number; overdueApproval?: boolean; renewalDays?: number | null };

export function renewalDaysRemaining(input: {
  status?: string | null;
  renewalState?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  renewalDate?: string | null;
}, now = new Date()) {
  if (!input.renewalDate || input.cancelAtPeriodEnd || ["cancelled", "canceled", "cancellation_requested", "cancellation_scheduled"].includes(String(input.renewalState || "").toLowerCase())) return null;
  if (!["active", "trialing", "past_due"].includes(String(input.status || "").toLowerCase())) return null;
  const renewalAt = Date.parse(input.renewalDate);
  if (!Number.isFinite(renewalAt)) return null;
  const days = Math.ceil((renewalAt - now.getTime()) / 86400000);
  return days >= 0 && days <= 60 ? days : null;
}

export function isOnboardingStalled(input: {
  lifecycleStage?: string | null;
  onboardingComplete?: boolean;
  createdAt?: string | null;
  now?: Date;
  thresholdDays?: number;
}) {
  const activeOnboardingStage = ["onboarding", "content_collection"].includes(String(input.lifecycleStage || "").toLowerCase());
  if (!activeOnboardingStage || input.onboardingComplete || !input.createdAt) return false;
  const createdAt = Date.parse(input.createdAt);
  if (!Number.isFinite(createdAt)) return false;
  const ageDays = ((input.now?.getTime() ?? Date.now()) - createdAt) / 86400000;
  return ageDays >= (input.thresholdDays ?? 7);
}

export function calculateCustomerHealth(input: HealthInput) {
  let score = 50; const reasons: string[] = [];
  if (input.onboardingComplete) { score += 15; reasons.push("Onboarding complete"); } else { score -= 20; reasons.push("Onboarding incomplete"); }
  if (input.websiteLive) { score += 15; reasons.push("Website live"); } else { score -= 10; reasons.push("Website not live"); }
  if (input.paymentHealthy) { score += 15; reasons.push("Payment healthy"); } else { score -= 25; reasons.push("Payment needs attention"); }
  if (input.recentEngagement) score += 5; else reasons.push("No recent engagement");
  if ((input.openIssues || 0) > 0) { score -= Math.min(20, (input.openIssues || 0) * 5); reasons.push(`${input.openIssues} open issue(s)`); }
  if (input.overdueApproval) { score -= 15; reasons.push("Approval overdue"); }
  if (input.renewalDays != null && input.renewalDays <= 30) { score -= 10; reasons.push("Renewal approaching"); }
  score = Math.max(0, Math.min(100, score));
  const status = score >= 70 ? "healthy" : score >= 45 ? "watch" : score >= 25 ? "at_risk" : "critical";
  return { score, status, reasons, recommendedAction: status === "critical" ? "Contact customer today" : status === "at_risk" ? "Review risks and schedule a success check-in" : status === "watch" ? "Monitor engagement and resolve open items" : "Continue standard monthly service" };
}
