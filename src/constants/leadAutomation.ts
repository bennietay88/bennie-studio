import type { Lead } from "../types";

export type LeadTemperature = "Cold" | "Warm" | "Hot";

export interface LeadAutomationPlan {
  score: number;
  temperature: LeadTemperature;
  nextAction: string;
  recommendedStatus: Lead["status"];
  urgencyReason: string;
  whatsappOpen: string;
  followUpOneHour: string;
  followUpNextDay: string;
  quotePrompt: string;
  reviewRequest: string;
  monthlyNurture: string;
  automationChecklist: string[];
}

const lower = (value?: string) => (value || "").toLowerCase();

const hasAny = (value: string, words: string[]) => words.some((word) => value.includes(word));

export const normalizeLeadStatus = (status?: string): Lead["status"] => {
  const value = lower(status);
  if (["contacted", "qualified", "engaged", "meeting", "closed"].includes(value)) return value as Lead["status"];
  if (["won", "converted", "paid"].includes(value)) return "closed";
  return "new";
};

export const getLeadAutomationPlan = (lead: Pick<Lead, "name" | "email" | "phone" | "message" | "source" | "status" | "score">, pageViews: any[] = []): LeadAutomationPlan => {
  const message = lower(lead.message);
  const source = lower(lead.source);
  const hasPhone = Boolean(lead.phone);
  const hasEmail = Boolean(lead.email);
  const urgentIntent = hasAny(message, ["urgent", "today", "asap", "now", "this week", "appointment", "booking"]);
  const quoteIntent = hasAny(message, ["price", "quote", "cost", "package", "budget", "how much"]);
  const serviceIntent = hasAny(message, ["service", "repair", "consult", "treatment", "design", "website", "renovation", "tuition"]);
  const warmSource = hasAny(source, ["preview", "audit", "quote", "whatsapp", "campaign", "landing", "google"]);
  const visitorScore = Math.min(20, pageViews.length * 4);
  const score = Math.min(
    100,
    Math.round(
      15 +
      (hasPhone ? 20 : 0) +
      (hasEmail ? 10 : 0) +
      (urgentIntent ? 18 : 0) +
      (quoteIntent ? 15 : 0) +
      (serviceIntent ? 12 : 0) +
      (warmSource ? 10 : 0) +
      visitorScore +
      Math.min(10, lead.score || 0),
    ),
  );
  const temperature: LeadTemperature = score >= 72 ? "Hot" : score >= 45 ? "Warm" : "Cold";
  const firstName = (lead.name || "there").split(/\s+/)[0];
  const serviceMatch = (lead.message || "").match(/(?:service interested:|interested in|need|looking for)\s*([^\n.]+)/i);
  const service = serviceMatch?.[1]?.trim() || "your enquiry";
  const recommendedStatus: Lead["status"] = temperature === "Hot" ? "qualified" : temperature === "Warm" ? "contacted" : "new";
  const nextAction =
    temperature === "Hot"
      ? "Reply on WhatsApp or phone within 15 minutes and qualify timing, budget, and service fit."
      : temperature === "Warm"
        ? "Send a helpful follow-up with one clear question and a quote/booking path."
        : "Send a light nurture message and ask what outcome they are trying to get.";
  const urgencyReason =
    urgentIntent ? "The message suggests time-sensitive intent." :
    quoteIntent ? "The lead is comparing price or quote options." :
    warmSource ? "The source suggests campaign or audit intent." :
    hasPhone ? "A direct phone number makes chat follow-up practical." :
    "The lead needs more qualification before sales effort.";

  return {
    score,
    temperature,
    nextAction,
    recommendedStatus,
    urgencyReason,
    whatsappOpen: `Hi ${firstName}, thanks for your enquiry about ${service}. What result are you hoping to get, and when would you like to start?`,
    followUpOneHour: `Hi ${firstName}, just checking that you received my message. I can help faster if you share your preferred service, location, and rough timeline.`,
    followUpNextDay: `Hi ${firstName}, do you still need help with ${service}? I can send the next step or a simple quote path if it is still relevant.`,
    quotePrompt: `To prepare a useful quote, can you share the service needed, location, preferred date, and any budget range or photos/details?`,
    reviewRequest: `Thanks again for choosing us. If the service was helpful, could you leave a short Google review? It helps local customers decide with more confidence.`,
    monthlyNurture: `Hi ${firstName}, we are checking in with past enquiries this month. Do you still need help, or should we update your details for a future follow-up?`,
    automationChecklist: [
      "Create or update the CRM lead score",
      "Send WhatsApp opener if phone is available",
      "Follow up after 1 hour if no reply",
      "Follow up next day with quote or booking path",
      "Request review after the job is completed",
    ],
  };
};

export const buildMonthlyLeadEngineReport = (leads: Lead[]) => {
  const plans = leads.map((lead) => getLeadAutomationPlan(lead));
  const hot = plans.filter((plan) => plan.temperature === "Hot").length;
  const warm = plans.filter((plan) => plan.temperature === "Warm").length;
  const normalizedStatuses = leads.map((lead) => normalizeLeadStatus(lead.status));
  const closed = normalizedStatuses.filter((status) => status === "closed").length;
  const followUps = normalizedStatuses.filter((status) => ["new", "contacted"].includes(status)).length;
  return {
    totalLeads: leads.length,
    hot,
    warm,
    closed,
    followUps,
    conversionRate: leads.length ? Math.round((closed / leads.length) * 100) : 0,
    nextRecurringRevenueAction:
      hot > 0 ? "Prioritize fast human follow-up for hot leads." :
      followUps > 0 ? "Run the WhatsApp follow-up queue." :
      "Create a review request and local SEO campaign to generate more leads.",
  };
};
