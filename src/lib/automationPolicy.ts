export type AutomationMode = "off" | "assisted" | "full";
export type AutomationAction = "outbound_email" | "publish" | "dns_change" | "refund" | "custom_pricing" | "internal_task";

const ALWAYS_GATED = new Set<AutomationAction>(["publish", "dns_change", "refund", "custom_pricing"]);

export function canAutomationExecute(action: AutomationAction, mode: AutomationMode = "assisted") {
  if (mode === "off") return false;
  if (ALWAYS_GATED.has(action)) return false;
  return mode === "full" || action === "internal_task";
}

export type HealthInput = { onboardingComplete?: boolean; websiteLive?: boolean; paymentHealthy?: boolean; recentEngagement?: boolean; openIssues?: number; overdueApproval?: boolean; renewalDays?: number | null };
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
