export interface Plan {
  id: string;
  name: string;
  price: string;
  priceId: string; // Stripe Price ID
  productId: string; // Stripe Product ID
  yearlyPriceId?: string;
  yearlyDiscountPercent?: number;
  trialDays?: number;
  description: string;
  features: string[]; // For UI Display
  enabled_features: string[]; // For system gating
  isPopular?: boolean;
  aiCredits: number;
  maxPages: number;
  maxLocationPages: number;
  monthlyUpdates: string;
  upgradePrompt: string;
  isActive?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Launch",
    price: "$49",
    priceId: "price_launch_id",
    productId: "prod_launch_id",
    yearlyDiscountPercent: 20,
    trialDays: 14,
    description: "Entry plan for businesses that only need a focused one-page website with managed hosting.",
    aiCredits: 50,
    maxPages: 1,
    maxLocationPages: 0,
    monthlyUpdates: "Limited monthly update request",
    upgradePrompt: "Most businesses should use Business to add separate Services and Contact pages, stronger trust sections, and more update allowance.",
    features: [
      "1-page website",
      "Managed hosting",
      "Mobile responsive design",
      "Basic SEO setup",
      "SEO title and meta description",
      "Contact form",
      "WhatsApp button",
      "Custom domain support",
      "Limited monthly update request",
      "Guided content setup",
      "Basic website improvement checklist",
      "Clear service offer structure",
      "Managed update request portal",
      "Review-powered website copy input",
    ],
    enabled_features: [
      "ai_synthesis",
      "analytics",
      "lead_crm",
      "advanced_seo",
      "industry_page_packs",
      "industry_content",
      "business_offer_builder",
      "done_for_you_request_portal",
      "review_to_website_import",
    ],
    isActive: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$99",
    isPopular: true,
    priceId: "price_business_id",
    productId: "prod_business_id",
    yearlyDiscountPercent: 20,
    trialDays: 14,
    description: "Recommended managed website plan for service businesses that need clearer enquiries.",
    aiCredits: 200,
    maxPages: 3,
    maxLocationPages: 3,
    monthlyUpdates: "3 monthly managed update requests",
    upgradePrompt: "Upgrade to Scale when you need campaign landing pages, more local pages, and priority conversion support.",
    features: [
      "Default managed website plan",
      "Up to 3 managed pages",
      "Homepage",
      "Services page",
      "Contact page",
      "Service sections",
      "Local SEO structure",
      "FAQ section",
      "Lead capture form",
      "SEO title and meta description setup",
      "3 monthly managed update requests",
      "Expanded content support",
      "WhatsApp enquiry message setup",
      "Contact and quote path tracking",
      "Monthly website improvement suggestions",
      "Missed enquiry path checks",
      "Service offer clarity review",
      "Simple WhatsApp follow-up tracking",
      "Review and proof section builder",
      "Local search readiness checklist",
      "Basic enquiry qualification prompts",
    ],
    enabled_features: [
      "ai_synthesis",
      "lead_crm",
      "analytics",
      "advanced_seo",
      "booking",
      "review_management",
      "blog",
      "custom_domain",
      "monthly_improvement_engine",
      "whatsapp_enquiry_kit",
      "enquiry_path_tracker",
      "industry_page_packs",
      "industry_content",
      "business_offer_builder",
      "enquiry_loss_detector",
      "whatsapp_follow_up_crm",
      "trust_proof_builder",
      "done_for_you_request_portal",
      "review_to_website_import",
      "trust_proof_vault",
      "ai_receptionist_triage",
    ],
    isActive: true,
  },
  {
    id: "growth",
    name: "Scale",
    price: "$199",
    priceId: "price_growth_os_id",
    productId: "prod_growth_os_id",
    yearlyDiscountPercent: 20,
    trialDays: 14,
    description: "Upgrade plan for businesses that need landing pages, local expansion, and priority improvement support.",
    aiCredits: 1000,
    maxPages: 5,
    maxLocationPages: 5,
    monthlyUpdates: "6 monthly managed update requests",
    upgradePrompt: "Request a Custom Website quote for full CMS control, blog publishing, advanced SEO, ownership, ecommerce, or integrations.",
    features: [
      "Everything in Business",
      "Up to 5 managed pages",
      "Homepage, Services, About, Contact, Landing Page",
      "Landing page support",
      "Local SEO recommendations",
      "Campaign landing page",
      "Conversion recommendations",
      "Analytics-ready structure",
      "Priority support",
      "6 monthly managed update requests",
      "Advanced website improvement review",
      "Campaign landing page support",
      "Local service-area pages",
      "Monthly performance report",
      "Monthly website improvement plan",
      "Competitor website comparison",
      "Local SEO opportunity review",
      "Campaign content calendar",
      "Sales page copy review",
      "Monthly website results report",
      "Before/after website rescue review",
    ],
    enabled_features: [
      "ai_synthesis",
      "lead_crm",
      "analytics",
      "advanced_seo",
      "booking",
      "review_management",
      "blog",
      "custom_domain",
      "automation",
      "ecommerce",
      "ai_chatbot",
      "affiliate_system",
      "priority_support",
      "wordpress_sync",
      "local_seo_geo",
      "monthly_improvement_engine",
      "whatsapp_enquiry_kit",
      "enquiry_path_tracker",
      "campaign_landing_pages",
      "website_rescue_audit",
      "industry_page_packs",
      "industry_content",
      "local_growth_pages",
      "business_offer_builder",
      "website_growth_autopilot",
      "enquiry_loss_detector",
      "competitor_gap_scanner",
      "whatsapp_follow_up_crm",
      "local_seo_opportunity_map",
      "trust_proof_builder",
      "campaign_calendar",
      "sales_page_doctor",
      "done_for_you_request_portal",
      "review_to_website_import",
      "monthly_website_report",
      "trust_proof_vault",
      "ai_receptionist_triage",
      "before_after_rescue_tool",
    ],
    isActive: true,
  },
];

export const normalizePlan = (plan: Partial<Plan> & { id?: string }, index = 0): Plan => {
  const fallback = PLANS[index] || PLANS[0];
  const id = String(plan.id || fallback.id || `plan_${index + 1}`).trim().toLowerCase();
  const maxPages = Number(plan.maxPages ?? fallback.maxPages ?? 1);
  const inferredLocationPages =
    plan.maxLocationPages ??
    (maxPages >= 10 ? 25 : maxPages >= 5 ? 5 : 0);

  return {
    ...fallback,
    ...plan,
    id,
    name: String(plan.name || fallback.name || id),
    price: String(plan.price || fallback.price || "$0"),
    priceId: String(plan.priceId || ""),
    productId: String(plan.productId || ""),
    yearlyPriceId: String((plan as any).yearlyPriceId || (plan as any).yearly_price_id || ""),
    yearlyDiscountPercent: Number((plan as any).yearlyDiscountPercent ?? (plan as any).yearly_discount_percent ?? fallback.yearlyDiscountPercent ?? 0),
    trialDays: Number((plan as any).trialDays ?? (plan as any).trial_days ?? fallback.trialDays ?? 14),
    description: String(plan.description || fallback.description || ""),
    features: Array.isArray(plan.features) ? plan.features : fallback.features,
    enabled_features: Array.isArray(plan.enabled_features) ? plan.enabled_features : fallback.enabled_features,
    aiCredits: Number(plan.aiCredits ?? fallback.aiCredits ?? 0),
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : 1,
    maxLocationPages: Number.isFinite(Number(inferredLocationPages)) && Number(inferredLocationPages) >= 0
      ? Math.floor(Number(inferredLocationPages))
      : 0,
    monthlyUpdates: String(plan.monthlyUpdates || fallback.monthlyUpdates || "Monthly update support"),
    upgradePrompt: String(plan.upgradePrompt || fallback.upgradePrompt || "Upgrade to unlock more pages and grow your website."),
    isActive: (plan as any).isActive ?? (plan as any).is_active ?? fallback.isActive ?? true,
  };
};

export const normalizePlans = (plans?: Array<Partial<Plan> & { id?: string }>): Plan[] => {
  if (!Array.isArray(plans) || plans.length === 0) return PLANS.map((plan, index) => normalizePlan(plan, index));
  return plans.map((plan, index) => normalizePlan(plan, index));
};

export const activePlans = (plans?: Array<Partial<Plan> & { id?: string }>): Plan[] =>
  normalizePlans(plans).filter((plan) => plan.isActive !== false);

export const findPlan = (plans: Array<Partial<Plan> & { id?: string }> | undefined, planId?: string): Plan => {
  const normalized = normalizePlans(plans);
  const id = String(planId || "starter").toLowerCase();
  return normalized.find((plan) => plan.id === id) || normalized[0];
};
