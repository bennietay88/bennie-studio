export type ProspectScoreInput = {
  industry?: string | null;
  domain?: string | null;
  website_status?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  audit_score?: number | null;
  outreach_status?: string | null;
  status?: string | null;
  next_follow_up_at?: string | null;
  last_audit_at?: string | null;
  notes?: string | null;
};

export type ProspectScore = {
  score: number;
  category: "high_intent" | "qualified" | "nurture";
  factors: Array<{ key: string; points: number; label: string }>;
  recommendedNextAction: string;
  version: "v1";
  calculatedAt: string;
};

const TARGET_INDUSTRIES = ["clinic", "dental", "wellness", "beauty", "aesthetic", "renovation", "contractor", "plumb", "roof", "legal", "consult", "home service"];
const add = (factors: ProspectScore["factors"], key: string, points: number, label: string) => factors.push({ key, points, label });

export function scoreProspect(input: ProspectScoreInput, now = new Date()): ProspectScore {
  const factors: ProspectScore["factors"] = [];
  const industry = String(input.industry || "").toLowerCase();
  const website = String(input.website_status || "unknown").toLowerCase();
  const outreach = String(input.outreach_status || "not_started").toLowerCase();
  const status = String(input.status || "new").toLowerCase();
  if (TARGET_INDUSTRIES.some((value) => industry.includes(value))) add(factors, "industry_fit", 20, "Target service-business niche");
  if (!input.domain || website === "no_website") add(factors, "website_gap", 18, "No established website");
  else if (website === "weak") add(factors, "website_quality", 15, "Website has clear quality gaps");
  else if (website === "average") add(factors, "website_quality", 8, "Website has room for improvement");
  if (input.audit_score != null) {
    if (input.audit_score < 50) add(factors, "audit_gap", 18, "Audit shows significant growth opportunities");
    else if (input.audit_score < 70) add(factors, "audit_gap", 10, "Audit shows measurable improvement opportunities");
  }
  if (input.contact_email) add(factors, "verified_email", 10, "Email contact available");
  if (input.contact_phone || input.contact_whatsapp) add(factors, "direct_contact", 8, "Direct phone or WhatsApp contact available");
  if (["replied", "call_booked"].includes(outreach)) add(factors, "engagement", 20, "Prospect has engaged with outreach");
  else if (["contacted", "queued"].includes(outreach)) add(factors, "engagement", 8, "Outreach has started");
  if (["qualified", "appointment_booked"].includes(status)) add(factors, "qualification", 15, "Prospect is qualified or has a booked call");
  if (input.next_follow_up_at && new Date(input.next_follow_up_at).getTime() <= now.getTime() && !["won", "lost"].includes(outreach)) add(factors, "follow_up_due", 6, "A follow-up is due now");
  const score = Math.min(100, Math.max(0, factors.reduce((sum, factor) => sum + factor.points, 0)));
  const category = score >= 65 ? "high_intent" : score >= 35 ? "qualified" : "nurture";
  const recommendedNextAction = outreach === "replied" || outreach === "call_booked" ? "REPLY" : input.audit_score == null && input.domain ? "AUDIT" : outreach === "not_started" ? "SEND_OUTREACH" : input.next_follow_up_at ? "FOLLOW_UP" : "REVIEW_OUTREACH";
  return { score, category, factors, recommendedNextAction, version: "v1", calculatedAt: now.toISOString() };
}
