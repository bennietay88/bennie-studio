export type Evidence = {
  verified?: boolean;
  value?: string | number | boolean | null;
  sourceUrl?: string | null;
  verifiedAt?: string | null;
  method?: string | null;
  confidence?: "low" | "medium" | "high" | null;
  reviewer?: string | null;
};

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
  qualification_evidence?: Record<string, Evidence> | null;
  website_evidence_source_url?: string | null;
  website_verified_at?: string | null;
  website_verification_method?: string | null;
  website_finding?: string | null;
  website_evidence_confidence?: "low" | "medium" | "high" | null;
  website_verified_by?: string | null;
  consent_email?: string | null;
};

export type ProspectScore = {
  score: number;
  category: "tier_a" | "tier_b" | "tier_c" | "reject";
  factors: Array<{ key: string; points: number; label: string; evidence: Evidence | null }>;
  componentScores: Record<string, number>;
  recommendedNextAction: string;
  version: "v2";
  calculatedAt: string;
};

const TARGET_INDUSTRIES = ["clinic", "dental", "wellness", "beauty", "aesthetic", "renovation", "contractor", "plumb", "roof", "legal", "consult", "home service"];
const MAX: Record<string, number> = {
  service_product_fit: 15, operating_activity: 10, specific_need: 20, ability_to_pay: 15,
  buying_intent: 15, decision_maker: 10, contact_quality: 10, timing_urgency: 5,
};

function verified(evidence: Evidence | undefined, now: Date): evidence is Evidence {
  if (!evidence?.verified || !evidence.sourceUrl || !evidence.verifiedAt || !evidence.method) return false;
  const at = new Date(evidence.verifiedAt).getTime();
  return Number.isFinite(at) && at <= now.getTime();
}

function cap(value: unknown, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.round(number))) : 0;
}

function verifiedWebsiteRecord(input: ProspectScoreInput, now: Date): boolean {
  const url = String(input.website_evidence_source_url || "");
  const timestamp = new Date(String(input.website_verified_at || "")).getTime();
  return /^https?:\/\//i.test(url) && Number.isFinite(timestamp) && timestamp <= now.getTime()
    && Boolean(input.website_verification_method?.trim() && input.website_finding?.trim()
      && input.website_verified_by && input.website_evidence_confidence);
}

export function scoreProspect(input: ProspectScoreInput, now = new Date()): ProspectScore {
  const evidence = input.qualification_evidence || {};
  const factors: ProspectScore["factors"] = [];
  const componentScores: Record<string, number> = Object.fromEntries(Object.keys(MAX).map((key) => [key, 0]));
  const add = (key: string, points: number, label: string, source: Evidence | null) => {
    const score = cap(points, MAX[key] || 0);
    componentScores[key] = Math.max(componentScores[key] || 0, score);
    if (score > 0) factors.push({ key, points: score, label, evidence: source });
  };

  const fit = evidence.service_product_fit;
  if (verified(fit, now) && [true, "strong", "moderate"].includes(fit.value as any)
    && TARGET_INDUSTRIES.some((value) => String(input.industry || "").toLowerCase().includes(value))) {
    add("service_product_fit", fit.value === "strong" ? 15 : 8, "Verified fit for a served service-business niche", fit);
  }
  const activity = evidence.operating_activity;
  if (verified(activity, now) && activity.value === true) add("operating_activity", 10, "Verified recent operating activity", activity);

  const need = evidence.specific_website_need;
  const hasVerifiedWebsiteRecord = verifiedWebsiteRecord(input, now);
  if (verified(need, now) && need.value === true) add("specific_need", 20, "Verified website, enquiry, or booking need", need);
  else if (hasVerifiedWebsiteRecord && ["weak", "average"].includes(String(input.website_status || "").toLowerCase())) {
    add("specific_need", input.website_status === "weak" ? 15 : 8, "Verified website improvement opportunity", {
      verified: true, value: input.website_finding, sourceUrl: input.website_evidence_source_url,
      verifiedAt: input.website_verified_at, method: input.website_verification_method,
      confidence: input.website_evidence_confidence, reviewer: input.website_verified_by,
    });
  } else if (input.website_status === "no_website" && hasVerifiedWebsiteRecord
    && input.website_evidence_confidence === "high") {
    add("specific_need", 12, "High-confidence investigation confirmed no independent website", {
      verified: true, value: input.website_finding, sourceUrl: input.website_evidence_source_url,
      verifiedAt: input.website_verified_at, method: input.website_verification_method,
      confidence: input.website_evidence_confidence, reviewer: input.website_verified_by,
    });
  }

  const ability = evidence.ability_to_pay;
  if (verified(ability, now)) add("ability_to_pay", cap(ability.value, 15), "Verified ability-to-pay signal", ability);
  const intent = evidence.buying_intent_or_trigger;
  if (verified(intent, now)) add("buying_intent", cap(intent.value, 15), "Verified buying signal or trigger", intent);
  const decisionMaker = evidence.decision_maker;
  if (verified(decisionMaker, now) && decisionMaker.value === true) add("decision_maker", 10, "Verified relevant decision-maker", decisionMaker);

  const contact = evidence.contact_quality;
  if (verified(contact, now)) add("contact_quality", cap(contact.value, 10), "Verified contact quality", contact);
  else if (input.contact_email && input.consent_email?.trim().toLowerCase() === input.contact_email.trim().toLowerCase()
    && input.consent_email.includes("@")) {
    // Email syntax alone is not a qualification signal. Verified, recipient-bound
    // permission evidence is the minimum contact-quality credit.
    add("contact_quality", 4, "Contact address matches a recorded permission record", null);
  }
  const timing = evidence.timing_urgency;
  if (verified(timing, now)) add("timing_urgency", cap(timing.value, 5), "Verified timing or urgency", timing);

  const score = Object.values(componentScores).reduce((sum, points) => sum + points, 0);
  const rejected = ["unsubscribed", "invalid", "duplicate", "irrelevant", "suppressed", "noncompliant"]
    .includes(String(input.status || "").toLowerCase());
  const essentialGate = componentScores.service_product_fit >= 8 && componentScores.specific_need >= 8
    && componentScores.contact_quality >= 4;
  const category = rejected ? "reject" : score >= 75 && essentialGate ? "tier_a" : score >= 55 ? "tier_b" : "tier_c";
  const replied = ["replied", "call_booked"].includes(String(input.outreach_status || "").toLowerCase());
  const recommendedNextAction = rejected ? "DO_NOT_CONTACT"
    : replied ? "RESPOND_TO_HUMAN"
      : !input.website_evidence_source_url && !input.domain ? "RESEARCH_WEBSITE"
        : score < 55 ? "QUALIFY_EVIDENCE"
          : "OPERATOR_REVIEW";
  return { score, category, factors, componentScores, recommendedNextAction, version: "v2", calculatedAt: now.toISOString() };
}
