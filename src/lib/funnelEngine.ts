export type FunnelObjective = "lead" | "appointment" | "quote" | "application" | "sale" | "subscription";
export type FunnelStatus = "draft" | "published" | "archived";
export type FunnelAccessMode = "managed" | "collaborative" | "self_managed";
export type FunnelStepType =
  | "landing" | "sales" | "lead_form" | "survey" | "application" | "appointment"
  | "checkout" | "order_bump" | "upsell" | "downsell" | "confirmation" | "thank_you" | "custom";

export type FunnelEventType =
  | "funnel_view" | "step_view" | "cta_click" | "form_started" | "form_submitted"
  | "survey_completed" | "appointment_started" | "appointment_requested" | "appointment_booked"
  | "checkout_started" | "purchase_completed" | "order_bump_accepted"
  | "upsell_viewed" | "upsell_accepted" | "upsell_declined";

export interface FunnelRecord {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  objective: FunnelObjective;
  status: FunnelStatus;
  access_mode: FunnelAccessMode;
  template_key?: string | null;
  description?: string | null;
  primary_domain?: string | null;
  settings?: Record<string, any>;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FunnelStep {
  id: string;
  funnel_id: string;
  business_id: string;
  step_type: FunnelStepType;
  name: string;
  slug: string;
  position_x: number;
  position_y: number;
  is_entry: boolean;
  status: FunnelStatus;
  page_content: FunnelPageContent;
  settings?: Record<string, any>;
  sort_order: number;
}

export interface FunnelConnection {
  id: string;
  funnel_id: string;
  business_id: string;
  source_step_id: string;
  target_step_id: string;
  label?: string | null;
  condition_type: "always" | "field" | "score" | "event" | "purchased" | "not_purchased";
  condition_config?: Record<string, any>;
  priority: number;
}

export interface FunnelPageField {
  id: string;
  label: string;
  name: string;
  type: "text" | "email" | "tel" | "number" | "textarea" | "select" | "radio" | "checkbox" | "date" | "time";
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FunnelPageContent {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  body?: string;
  ctaLabel?: string;
  ctaSecondary?: string;
  mediaUrl?: string;
  proof?: string[];
  benefits?: string[];
  faq?: Array<{ question: string; answer: string }>;
  fields?: FunnelPageField[];
  successMessage?: string;
  theme?: { primary?: string; background?: string; text?: string };
}

export interface FunnelEvent {
  id?: string;
  funnel_id: string;
  step_id?: string | null;
  variant_id?: string | null;
  session_id?: string | null;
  lead_id?: string | null;
  event_type: FunnelEventType | string;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  device?: string | null;
  revenue?: number | null;
  revenue_verified?: boolean | null;
  currency?: string | null;
  created_at?: string;
  metadata?: Record<string, any>;
}

export interface FunnelStepMetrics {
  stepId: string;
  views: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenueByCurrency: Record<string, number>;
  dropOffRate: number;
}

export interface FunnelSummaryMetrics {
  visitors: number;
  leads: number;
  appointments: number;
  checkoutStarts: number;
  purchases: number;
  revenue: number;
  revenueByCurrency: Record<string, number>;
  conversionRate: number;
  averageOrderValue: number;
  byStep: Record<string, FunnelStepMetrics>;
  bySource: Array<{ key: string; visitors: number; conversions: number; revenue: number; revenueByCurrency: Record<string, number> }>;
  byDevice: Array<{ key: string; visitors: number; conversions: number; revenue: number; revenueByCurrency: Record<string, number> }>;
}

export interface FunnelInsight {
  severity: "info" | "opportunity" | "warning" | "critical";
  confidence: "low" | "medium" | "high";
  title: string;
  observation: string;
  recommendation: string;
  evidence: Record<string, any>;
}

export const FUNNEL_STEP_LABELS: Record<FunnelStepType, string> = {
  landing: "Landing Page",
  sales: "Sales Page",
  lead_form: "Lead Form",
  survey: "Survey / Quiz",
  application: "Application",
  appointment: "Appointment",
  checkout: "Checkout",
  order_bump: "Order Bump",
  upsell: "Upsell",
  downsell: "Downsell",
  confirmation: "Confirmation",
  thank_you: "Thank You",
  custom: "Custom Page",
};

const coreFields: FunnelPageField[] = [
  { id: "name", name: "name", label: "Name", type: "text", required: true, placeholder: "Your name" },
  { id: "email", name: "email", label: "Email", type: "email", required: true, placeholder: "you@company.com" },
  { id: "phone", name: "phone", label: "Phone / WhatsApp", type: "tel", placeholder: "+60..." },
];

export const DEFAULT_FUNNEL_PAGE_CONTENT: Record<FunnelStepType, FunnelPageContent> = {
  landing: { eyebrow: "A better next step", headline: "Turn interest into a clear action.", subheadline: "A focused landing page for one audience, one offer, and one conversion goal.", ctaLabel: "Get Started", benefits: ["Clear offer", "Proof before the ask", "One obvious CTA"], theme: { primary: "#4f46e5", background: "#ffffff", text: "#141821" } },
  sales: { eyebrow: "The offer", headline: "Make the decision easier to understand.", subheadline: "Explain the problem, value, proof, process and next step without making visitors hunt.", ctaLabel: "Continue", benefits: ["Outcome-focused offer", "Objection handling", "Trust and proof"], theme: { primary: "#4f46e5", background: "#ffffff", text: "#141821" } },
  lead_form: { eyebrow: "Tell us about you", headline: "Start the conversation.", subheadline: "Share the essentials and the team can follow up with the right context.", ctaLabel: "Send Enquiry", fields: coreFields, successMessage: "Thanks. Your enquiry has been received." },
  survey: { eyebrow: "Quick assessment", headline: "Help us understand what you need.", subheadline: "Your answers can route you to the most relevant next step.", ctaLabel: "Continue", fields: [{ id: "goal", name: "goal", label: "What are you trying to achieve?", type: "select", required: true, options: ["Get more leads", "Book appointments", "Request a quote", "Buy now"] }, ...coreFields] },
  application: { eyebrow: "Application", headline: "See if this is the right fit.", subheadline: "A short application helps both sides avoid an unproductive sales call.", ctaLabel: "Submit Application", fields: [...coreFields, { id: "budget", name: "budget", label: "Budget", type: "number", required: true }, { id: "timeline", name: "timeline", label: "When do you want to start?", type: "select", options: ["Immediately", "Within 30 days", "1–3 months", "Just researching"] }] },
  appointment: { eyebrow: "Book a time", headline: "Choose the next conversation.", subheadline: "Request a preferred date and time. The business will confirm availability.", ctaLabel: "Request Appointment", fields: [...coreFields, { id: "date", name: "date", label: "Preferred date", type: "date", required: true }, { id: "time", name: "time", label: "Preferred time", type: "time", required: true }] },
  checkout: { eyebrow: "Secure checkout", headline: "Complete your order.", subheadline: "Payment is handled securely through Stripe.", ctaLabel: "Continue to Checkout" },
  order_bump: { eyebrow: "Optional add-on", headline: "Add this to your order?", subheadline: "A relevant complementary offer, not a random checkbox tax.", ctaLabel: "Add to Order" },
  upsell: { eyebrow: "Next best offer", headline: "Would this help you get more value?", subheadline: "A post-purchase offer should be directly relevant to what was just bought.", ctaLabel: "Add This" },
  downsell: { eyebrow: "Alternative", headline: "Prefer a lighter option?", subheadline: "Offer a lower-commitment alternative when the primary upsell is not suitable.", ctaLabel: "Choose This Option" },
  confirmation: { eyebrow: "Confirmed", headline: "Your next step is recorded.", subheadline: "Keep expectations clear and tell the customer what happens next.", ctaLabel: "Continue" },
  thank_you: { eyebrow: "Thank you", headline: "You are all set.", subheadline: "The business has received your information.", ctaLabel: "Return Home" },
  custom: { eyebrow: "Custom step", headline: "Build the step around the actual customer journey.", subheadline: "Use this when the funnel needs something outside the standard step library.", ctaLabel: "Continue" },
};

export const FUNNEL_TEMPLATES = [
  { key: "simple-lead-capture", name: "Lead Capture — Landing + Thank You", objective: "lead" as FunnelObjective, steps: ["lead_form","thank_you"] as FunnelStepType[] },
  { key: "lead-generation", name: "Lead Generation", objective: "lead" as FunnelObjective, steps: ["landing","lead_form","thank_you"] as FunnelStepType[] },
  { key: "appointment-booking", name: "Appointment Booking", objective: "appointment" as FunnelObjective, steps: ["landing","application","appointment","confirmation"] as FunnelStepType[] },
  { key: "quote-request", name: "Quote Request", objective: "quote" as FunnelObjective, steps: ["landing","survey","lead_form","thank_you"] as FunnelStepType[] },
  { key: "high-ticket-application", name: "High-ticket Application", objective: "application" as FunnelObjective, steps: ["sales","application","appointment","confirmation"] as FunnelStepType[] },
  { key: "product-sale", name: "Product Sale", objective: "sale" as FunnelObjective, steps: ["sales","checkout","upsell","thank_you"] as FunnelStepType[] },
  { key: "subscription", name: "Subscription", objective: "subscription" as FunnelObjective, steps: ["landing","sales","checkout","confirmation"] as FunnelStepType[] },
];

export function slugifyFunnel(value: string) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "funnel";
}

export function buildTemplateGraph(templateKey: string, businessId: string, funnelId: string) {
  const template = FUNNEL_TEMPLATES.find((item) => item.key === templateKey) || FUNNEL_TEMPLATES[0];
  const steps = template.steps.map((stepType, index) => ({
    id: crypto.randomUUID(),
    funnel_id: funnelId,
    business_id: businessId,
    step_type: stepType,
    name: FUNNEL_STEP_LABELS[stepType],
    slug: index === 0 ? "start" : slugifyFunnel(FUNNEL_STEP_LABELS[stepType]),
    position_x: 100 + index * 300,
    position_y: 160,
    is_entry: index === 0,
    status: "draft" as FunnelStatus,
    page_content: DEFAULT_FUNNEL_PAGE_CONTENT[stepType],
    settings: {},
    sort_order: index,
  }));
  const connections = steps.slice(0, -1).map((step, index) => ({
    id: crypto.randomUUID(),
    funnel_id: funnelId,
    business_id: businessId,
    source_step_id: step.id,
    target_step_id: steps[index + 1].id,
    condition_type: "always" as const,
    condition_config: {},
    priority: index,
    label: null,
  }));
  return { template, steps, connections };
}

export function summarizeFunnelAnalytics(events: FunnelEvent[], steps: FunnelStep[]): FunnelSummaryMetrics {
  const sessions = new Set<string>();
  const leads = new Set<string>();
  const appointments = new Set<string>();
  const purchases = new Set<string>();
  const checkoutSessions = new Set<string>();
  const conversionSessions = new Set<string>();
  let revenue = 0;
  const revenueByCurrency: Record<string, number> = {};

  const stepViews = new Map<string, Set<string>>();
  const stepConversions = new Map<string, Set<string>>();
  const stepRevenue = new Map<string, number>();
  const stepRevenueByCurrency = new Map<string, Record<string, number>>();
  for (const step of steps) {
    stepViews.set(step.id, new Set());
    stepConversions.set(step.id, new Set());
    stepRevenue.set(step.id, 0);
    stepRevenueByCurrency.set(step.id, {});
  }

  const sourceMap = new Map<string, { visitors: Set<string>; conversions: Set<string>; revenue: number; revenueByCurrency: Record<string, number> }>();
  const deviceMap = new Map<string, { visitors: Set<string>; conversions: Set<string>; revenue: number; revenueByCurrency: Record<string, number> }>();
  const primaryConversionEvents = new Set(["form_submitted","survey_completed","appointment_requested","appointment_booked"]);
  const stepConversionEvents = new Set(["form_submitted","survey_completed","appointment_requested","appointment_booked","checkout_started","purchase_completed","upsell_accepted","order_bump_accepted"]);

  for (const event of events) {
    const sessionKey = String(event.session_id || event.metadata?.sessionKey || event.id || "");
    if (!sessionKey) continue;

    if (event.event_type === "funnel_view" || event.event_type === "step_view") sessions.add(sessionKey);
    if (event.event_type === "form_submitted") {
      if (event.lead_id) leads.add(event.lead_id);
      conversionSessions.add(sessionKey);
    }
    if (event.event_type === "appointment_booked" || event.event_type === "appointment_requested") {
      appointments.add(event.lead_id || sessionKey);
      conversionSessions.add(sessionKey);
    }
    if (event.event_type === "checkout_started") checkoutSessions.add(sessionKey);
    const stripeVerifiedPurchase = event.event_type === "purchase_completed"
      && (event.revenue_verified === true || Boolean(event.metadata?.stripeSessionId));
    if (stripeVerifiedPurchase) {
      purchases.add(String(event.metadata?.stripeSessionId || event.lead_id || sessionKey));
      conversionSessions.add(sessionKey);
      revenue += Math.max(0, Number(event.revenue || 0));
      const currency = String(event.currency || "UNKNOWN").toUpperCase();
      revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + Math.max(0, Number(event.revenue || 0));
    }

    if (event.step_id && stepViews.has(event.step_id)) {
      if (event.event_type === "step_view") stepViews.get(event.step_id)!.add(sessionKey);
      if (stepConversionEvents.has(event.event_type) && (event.event_type !== "purchase_completed" || stripeVerifiedPurchase)) stepConversions.get(event.step_id)!.add(sessionKey);
      if (stripeVerifiedPurchase) {
        const amount = Math.max(0, Number(event.revenue || 0));
        const currency = String(event.currency || "UNKNOWN").toUpperCase();
        stepRevenue.set(event.step_id, (stepRevenue.get(event.step_id) || 0) + amount);
        const amounts = stepRevenueByCurrency.get(event.step_id)!;
        amounts[currency] = (amounts[currency] || 0) + amount;
      }
    }

    const addBreakdown = (
      map: Map<string, { visitors: Set<string>; conversions: Set<string>; revenue: number; revenueByCurrency: Record<string, number> }>,
      key: string,
    ) => {
      const bucket = map.get(key) || { visitors: new Set<string>(), conversions: new Set<string>(), revenue: 0, revenueByCurrency: {} };
      bucket.visitors.add(sessionKey);
      if (primaryConversionEvents.has(event.event_type) || (event.event_type === "purchase_completed" && stripeVerifiedPurchase)) bucket.conversions.add(sessionKey);
      if (stripeVerifiedPurchase) {
        const amount = Math.max(0, Number(event.revenue || 0));
        bucket.revenue += amount;
        const currency = String(event.currency || "UNKNOWN").toUpperCase();
        bucket.revenueByCurrency[currency] = (bucket.revenueByCurrency[currency] || 0) + amount;
      }
      map.set(key, bucket);
    };
    addBreakdown(sourceMap, event.source || "Direct / unknown");
    addBreakdown(deviceMap, event.device || "Unknown");
  }

  const byStep: Record<string, FunnelStepMetrics> = {};
  for (const step of steps) {
    const views = stepViews.get(step.id)?.size || 0;
    const viewSessions = stepViews.get(step.id) || new Set<string>();
    const conversions = Array.from(stepConversions.get(step.id) || []).filter((sessionKey) => viewSessions.has(sessionKey)).length;
    const conversionRate = views ? Math.min(100, (conversions / views) * 100) : 0;
    byStep[step.id] = {
      stepId: step.id,
      views,
      conversions,
      conversionRate,
      revenue: Object.keys(stepRevenueByCurrency.get(step.id) || {}).length <= 1 ? stepRevenue.get(step.id) || 0 : 0,
      revenueByCurrency: stepRevenueByCurrency.get(step.id) || {},
      dropOffRate: views ? Math.max(0, 100 - conversionRate) : 0,
    };
  }

  const toBreakdown = (
    map: Map<string, { visitors: Set<string>; conversions: Set<string>; revenue: number; revenueByCurrency: Record<string, number> }>,
  ) =>
    Array.from(map.entries())
      .map(([key, value]) => ({
        key,
        visitors: value.visitors.size,
        conversions: value.conversions.size,
        revenue: Object.keys(value.revenueByCurrency).length <= 1 ? value.revenue : 0,
        revenueByCurrency: value.revenueByCurrency,
      }))
      .sort((a,b) => b.conversions - a.conversions);

  const attributedConversions = Array.from(conversionSessions).filter((sessionKey) => sessions.has(sessionKey)).length;

  return {
    visitors: sessions.size,
    leads: leads.size,
    appointments: appointments.size,
    checkoutStarts: checkoutSessions.size,
    purchases: purchases.size,
    revenue: Object.keys(revenueByCurrency).length <= 1 ? revenue : 0,
    revenueByCurrency,
    conversionRate: sessions.size ? Math.min(100, (attributedConversions / sessions.size) * 100) : 0,
    averageOrderValue: purchases.size && Object.keys(revenueByCurrency).length <= 1 ? revenue / purchases.size : 0,
    byStep,
    bySource: toBreakdown(sourceMap),
    byDevice: toBreakdown(deviceMap),
  };
}

// Stable per-variant analysis: only compare sessions that actually viewed a step.
export function summarizeFunnelVariants(
  events: FunnelEvent[], variants: Array<{ id: string; step_id: string; name: string }>,
) {
  const testedSteps = new Set(variants.map((v) => v.step_id));
  const rows = new Map<string, { stepId: string; variantId: string | null; name: string; views: Set<string>; conversions: Set<string> }>();
  for (const v of variants) rows.set(v.step_id + ":" + v.id,
    { stepId: v.step_id, variantId: v.id, name: v.name, views: new Set(), conversions: new Set() });
  for (const stepId of testedSteps) rows.set(stepId + ":base",
    { stepId, variantId: null, name: "Original", views: new Set(), conversions: new Set() });
  const conversionEvents = new Set(["form_submitted","survey_completed","appointment_booked","purchase_completed"]);
  for (const event of events) {
    if (!event.step_id || !testedSteps.has(event.step_id) || !event.session_id) continue;
    const key = event.step_id + ":" + (event.variant_id || "base");
    const bucket = rows.get(key);
    if (!bucket) continue;
    if (event.event_type === "step_view") bucket.views.add(event.session_id);
    if (conversionEvents.has(event.event_type) &&
        (event.event_type !== "purchase_completed" || event.revenue_verified === true)) {
      bucket.conversions.add(event.session_id);
    }
  }
  return Array.from(rows.values()).map((row) => {
    const visitors = row.views.size;
    const conversions = Array.from(row.conversions).filter((id) => row.views.has(id)).length;
    return { stepId: row.stepId, variantId: row.variantId, name: row.name,
      visitors, conversions, conversionRate: visitors ? (conversions / visitors) * 100 : 0,
      // A/B tests need meaningful samples before anyone declares a winner.
      sampleStatus: visitors >= 100 ? "Review with statistical testing" : "Collect more data",
    };
  }).sort((a,b) => a.stepId.localeCompare(b.stepId) || a.name.localeCompare(b.name));
}

export function generateFunnelInsights(summary: FunnelSummaryMetrics, steps: FunnelStep[]): FunnelInsight[] {
  const insights: FunnelInsight[] = [];
  const populated = steps.map((step) => ({ step, metrics: summary.byStep[step.id] })).filter((row) => row.metrics?.views >= 20);
  if (populated.length) {
    const worst = [...populated].sort((a,b) => b.metrics.dropOffRate - a.metrics.dropOffRate)[0];
    if (worst.metrics.dropOffRate >= 60) {
      insights.push({
        severity: worst.metrics.dropOffRate >= 80 ? "critical" : "warning",
        confidence: worst.metrics.views >= 100 ? "high" : "medium",
        title: `Largest drop-off: ${worst.step.name}`,
        observation: `${worst.metrics.dropOffRate.toFixed(1)}% of observed visitors did not complete the configured conversion on this step across ${worst.metrics.views} step views.`,
        recommendation: "Review this step's mobile experience, offer clarity, required fields and CTA before increasing traffic.",
        evidence: { stepId: worst.step.id, views: worst.metrics.views, conversionRate: worst.metrics.conversionRate },
      });
    }
  }
  const mobile = summary.byDevice.find((row) => row.key.toLowerCase().includes("mobile"));
  const desktop = summary.byDevice.find((row) => row.key.toLowerCase().includes("desktop"));
  if (mobile && desktop && mobile.visitors >= 30 && desktop.visitors >= 30) {
    const mobileRate = mobile.visitors ? mobile.conversions / mobile.visitors : 0;
    const desktopRate = desktop.visitors ? desktop.conversions / desktop.visitors : 0;
    if (desktopRate > 0 && mobileRate < desktopRate * 0.7) {
      insights.push({
        severity: "opportunity",
        confidence: mobile.visitors + desktop.visitors >= 200 ? "high" : "medium",
        title: "Mobile conversion trails desktop",
        observation: `Mobile converts at ${(mobileRate*100).toFixed(1)}% versus ${(desktopRate*100).toFixed(1)}% on desktop.`,
        recommendation: "Inspect mobile spacing, form friction, sticky CTA behaviour and checkout/booking usability before changing traffic spend.",
        evidence: { mobile, desktop },
      });
    }
  }
  if (summary.visitors >= 100 && summary.conversionRate < 5) {
    insights.push({
      severity: "warning",
      confidence: "high",
      title: "Overall funnel conversion is low",
      observation: `${summary.visitors} visitors produced a ${summary.conversionRate.toFixed(1)}% primary conversion rate.`,
      recommendation: "Create a controlled A/B test on the entry step before making multiple simultaneous changes.",
      evidence: { visitors: summary.visitors, conversionRate: summary.conversionRate },
    });
  }
  if (!insights.length) {
    insights.push({
      severity: "info",
      confidence: summary.visitors >= 50 ? "medium" : "low",
      title: summary.visitors >= 50 ? "No major conversion anomaly detected" : "More data is needed",
      observation: summary.visitors >= 50 ? "Current event data does not show a single dominant drop-off above the alert thresholds." : "The funnel does not yet have enough traffic for strong conversion conclusions.",
      recommendation: summary.visitors >= 50 ? "Continue monitoring source, device and step conversion before changing the funnel." : "Collect at least 50–100 real sessions before treating small percentage differences as meaningful.",
      evidence: { visitors: summary.visitors },
    });
  }
  return insights;
}

export function nextStepForSubmission(connections: FunnelConnection[], sourceStepId: string, data: Record<string, any>, leadScore = 0) {
  const outgoing = connections.filter((edge) => edge.source_step_id === sourceStepId).sort((a,b) => a.priority - b.priority);
  for (const edge of outgoing) {
    if (edge.condition_type === "always") return edge.target_step_id;
    if (edge.condition_type === "score") {
      const min = Number(edge.condition_config?.min ?? 0);
      const max = Number(edge.condition_config?.max ?? Number.POSITIVE_INFINITY);
      if (leadScore >= min && leadScore <= max) return edge.target_step_id;
    }
    if (edge.condition_type === "field") {
      const field = String(edge.condition_config?.field || "");
      const operator = String(edge.condition_config?.operator || "equals");
      const expected = edge.condition_config?.value;
      const actual = data[field];
      if (operator === "equals" && String(actual) === String(expected)) return edge.target_step_id;
      if (operator === "contains" && String(actual || "").toLowerCase().includes(String(expected || "").toLowerCase())) return edge.target_step_id;
      if (operator === "gt" && Number(actual) > Number(expected)) return edge.target_step_id;
      if (operator === "lt" && Number(actual) < Number(expected)) return edge.target_step_id;
    }
  }
  return outgoing.find((edge) => edge.condition_type === "always")?.target_step_id || null;
}
