export const LIFECYCLE_STAGES = [
  "prospect", "qualified", "proposal", "checkout", "onboarding", "content_collection",
  "design_build", "internal_review", "customer_review", "launch_ready", "live",
  "managed_service", "renewal", "cancellation_requested", "cancelled", "paused",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

const TRANSITIONS: Record<LifecycleStage, readonly LifecycleStage[]> = {
  prospect: ["qualified", "proposal", "cancelled"], qualified: ["proposal", "checkout", "cancelled"],
  proposal: ["checkout", "qualified", "cancelled"], checkout: ["onboarding", "proposal", "cancelled"],
  onboarding: ["content_collection", "cancelled", "paused"], content_collection: ["design_build", "onboarding", "paused"],
  design_build: ["internal_review", "content_collection", "paused"], internal_review: ["customer_review", "design_build", "paused"],
  customer_review: ["launch_ready", "design_build", "paused"], launch_ready: ["live", "customer_review", "paused"],
  live: ["managed_service", "renewal", "cancellation_requested", "paused"], managed_service: ["renewal", "cancellation_requested", "paused"],
  renewal: ["managed_service", "cancellation_requested", "cancelled"], cancellation_requested: ["cancelled", "managed_service", "paused"],
  cancelled: ["proposal", "checkout"], paused: ["onboarding", "managed_service", "cancelled"],
};

export function canTransitionLifecycle(from: LifecycleStage | null | undefined, to: LifecycleStage, override = false) {
  if (!from) return to === "prospect" || to === "qualified" || override;
  return from === to || override || TRANSITIONS[from].includes(to);
}

export type ReadinessInput = {
  domainConfigured: boolean; sslValid?: boolean; hasContact: boolean; hasPrimaryCta: boolean;
  hasRequiredPages: boolean; hasPlaceholderText: boolean; hasUnverifiedClaims: boolean;
  responsiveQaPassed: boolean; designQaPassed: boolean; formsConfigured: boolean;
  seoComplete: boolean; analyticsConfigured?: boolean; highSeverityErrors: number;
  internalApproved: boolean; customerApproved: boolean;
};

export function evaluateLaunchReadiness(input: ReadinessInput) {
  const blocking: string[] = []; const warnings: string[] = []; const passed: string[] = [];
  const required: Array<[string, boolean]> = [
    ["domain", input.domainConfigured], ["contact", input.hasContact], ["required_pages", input.hasRequiredPages],
    ["no_placeholders", !input.hasPlaceholderText], ["verified_claims", !input.hasUnverifiedClaims],
    ["responsive_qa", input.responsiveQaPassed], ["design_qa", input.designQaPassed], ["primary_cta", input.hasPrimaryCta],
    ["forms", input.formsConfigured], ["seo", input.seoComplete], ["internal_approval", input.internalApproved], ["customer_approval", input.customerApproved],
  ];
  for (const [name, ok] of required) ok ? passed.push(name) : blocking.push(name);
  if (input.sslValid === false) blocking.push("ssl"); else if (input.sslValid === undefined) warnings.push("ssl_unverified");
  if (input.analyticsConfigured === false || input.analyticsConfigured === undefined) warnings.push("analytics_unavailable");
  if (input.highSeverityErrors > 0) blocking.push("high_severity_errors"); else passed.push("technical_errors");
  const total = required.length + 3;
  const score = Math.max(0, Math.round(((total - blocking.length - warnings.length * 0.25) / total) * 100));
  return { score, blockingIssues: [...new Set(blocking)], warnings: [...new Set(warnings)], passedChecks: passed, status: blocking.length ? "blocked" as const : "ready" as const };
}

export function calculateAccountEconomics(input: { revenue: number; costs: Array<{ amount: number; source: "actual" | "estimated" | "manual" }>; hours: number }) {
  const cost = input.costs.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
  const grossProfit = input.revenue - cost;
  return { revenue: input.revenue, estimatedCost: cost, grossProfit, grossMargin: input.revenue > 0 ? grossProfit / input.revenue : null, hours: input.hours, effectiveHourlyMargin: input.hours > 0 ? grossProfit / input.hours : null, confidence: input.costs.some((item) => item.source !== "actual") ? "estimated" as const : "actual" as const };
}

export function buildTaskIdempotencyKey(businessId: string, taskType: string, source: string, period?: string) {
  return [businessId, taskType, source, period || "once"].join(":");
}

export function publishedReportMetrics(metrics: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, value === null || value === undefined ? "Data unavailable" : value]));
}
