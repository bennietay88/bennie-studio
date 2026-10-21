import { COMMERCIAL_DEFAULT_COMMITMENT_MONTHS, COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice, type CommercialMarket } from "../lib/commercialPricing";

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
  monthlyUpdateLimit: number;
  commitmentMonths: number;
  setupFee: number;
  marketPrices: Record<string, { monthly: number; setupFee: number; currency: string; locale: string }>;
  marketPriceIds: Record<string, { monthly?: string; yearly?: string; setup?: string }>;
  upgradePrompt: string;
  isActive?: boolean;
}

const marketPricesFor = (slug: "personal-profile" | "managed-website" | "website-growth" | "growth-partner") =>
  Object.fromEntries((['INTL'] as CommercialMarket[]).map((market) => {
    const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === slug)!;
    const price = getCommercialPrice(product, "INTL")!;
    const key = market === "INTL" ? "US" : market;
    return [key, {
      monthly: Number(price.monthlyPrice || 0),
      setupFee: Number(price.setupFee || 0),
      currency: price.currency,
      locale: price.currency === "MYR" ? "en-MY" : price.currency === "SGD" ? "en-SG" : price.currency === "GBP" ? "en-GB" : "en-US",
    }];
  }));

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Managed Website",
    price: "US$2,490",
    priceId: "price_launch_id",
    productId: "prod_launch_id",
    yearlyDiscountPercent: 0,
    description: "Entry plan for businesses that only need a focused one-page website with managed hosting.",
    aiCredits: 0,
    maxPages: 1,
    maxLocationPages: 0,
    monthlyUpdates: "Limited monthly update request",
    monthlyUpdateLimit: 1,
    commitmentMonths: COMMERCIAL_DEFAULT_COMMITMENT_MONTHS,
    setupFee: 2500,
    marketPrices: marketPricesFor("managed-website"),
    marketPriceIds: {},
    upgradePrompt: "Upgrade to Website Growth for ongoing conversion optimisation, local SEO expansion, and landing-page development.",
    features: [
      "1-page website",
      "Managed hosting",
      "Mobile responsive design",
      "Basic SEO setup",
      "SEO title and meta description",
      "Contact form",
      "WhatsApp button",
      "Custom domain support",
      "One consolidated update request each month",
      "Guided content setup",
      "Basic website improvement checklist",
      "Clear service offer structure",
      "Managed update request portal",
      "Review-powered website copy input",
    ],
    enabled_features: [
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
    name: "Website Growth Partner",
    price: "US$4,500",
    isPopular: true,
    priceId: "price_business_id",
    productId: "prod_business_id",
    yearlyDiscountPercent: 0,
    description: "Recommended managed website plan for service businesses that need clearer enquiries.",
    aiCredits: 0,
    // Managed Website is advertised and contracted as up to five core pages.
    maxPages: 5,
    maxLocationPages: 1,
    monthlyUpdates: "1 consolidated update request each month",
    monthlyUpdateLimit: 1,
    commitmentMonths: COMMERCIAL_DEFAULT_COMMITMENT_MONTHS,
    setupFee: 0,
    marketPrices: marketPricesFor("website-growth"),
    marketPriceIds: {},
    upgradePrompt: "Upgrade to Growth Partner for consultant-led positioning, conversion strategy, SEO direction, and funnel strategy.",
    features: [
      "Default managed website plan",
      "Up to 5 core pages",
      "Homepage",
      "Services page",
      "Contact page",
      "Service sections",
      "Local SEO structure",
      "FAQ section",
      "Lead capture form",
      "SEO title and meta description setup",
      "1 consolidated update request each month",
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
      "lead_crm",
      "analytics",
      "advanced_seo",
      "booking",
      "review_management",
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
    ],
    isActive: true,
  },
  {
    id: "growth",
    name: "Growth Partner",
    price: "US$799",
    priceId: "price_growth_os_id",
    productId: "prod_growth_os_id",
    yearlyDiscountPercent: 0,
    description: "Consultant-led engagement for companies needing positioning, conversion strategy, SEO direction, and funnel strategy.",
    aiCredits: 0,
    maxPages: 5,
    maxLocationPages: 3,
    monthlyUpdates: "2 managed update requests each month",
    monthlyUpdateLimit: 2,
    commitmentMonths: COMMERCIAL_DEFAULT_COMMITMENT_MONTHS,
    setupFee: 0,
    marketPrices: marketPricesFor("growth-partner"),
    marketPriceIds: {},
    upgradePrompt: "Request a Custom Website quote for full CMS control, blog publishing, advanced SEO, ownership, ecommerce, or integrations.",
    features: [
      "Everything in Website Growth",
      "Up to 5 managed pages",
      "Homepage, Services, About, Contact, Landing Page",
      "Landing page support",
      "Local SEO recommendations",
      "Campaign landing page",
      "Conversion recommendations",
      "Analytics-ready structure",
      "Priority support",
      "2 managed update requests each month",
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
      "lead_crm",
      "analytics",
      "advanced_seo",
      "booking",
      "review_management",
      "custom_domain",
      "priority_support",
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
      "before_after_rescue_tool",
    ],
    isActive: true,
  },
  { id:"profile", name:"Personal Profile",price:"US$29/mo",priceId:"",productId:"",
    description:"Standardized 3–5 page website for independent professionals.",
    aiCredits:0,maxPages:5,maxLocationPages:0,monthlyUpdates:"1 small update, up to 15 minutes",monthlyUpdateLimit:1,
    commitmentMonths:COMMERCIAL_DEFAULT_COMMITMENT_MONTHS,setupFee:99,
    marketPrices:marketPricesFor("personal-profile"),marketPriceIds:{},
    upgradePrompt:"Upgrade to Managed Website when you need custom business website services.",
    features:["3–5 professional profile pages","Fixed responsive layouts","Professional bio and credentials","Expertise and portfolio","Contact form and social links","Basic SEO and SSL","Managed hosting","One prelaunch revision","One small monthly content update"],
    enabled_features:["custom_domain","done_for_you_request_portal"],isActive:true,
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
    trialDays: Number((plan as any).trialDays ?? (plan as any).trial_days ?? fallback.trialDays ?? 0),
    description: String(plan.description || fallback.description || ""),
    features: Array.isArray(plan.features) ? plan.features : fallback.features,
    enabled_features: Array.isArray(plan.enabled_features) ? plan.enabled_features : fallback.enabled_features,
    aiCredits: Number(plan.aiCredits ?? fallback.aiCredits ?? 0),
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : 1,
    maxLocationPages: Number.isFinite(Number(inferredLocationPages)) && Number(inferredLocationPages) >= 0
      ? Math.floor(Number(inferredLocationPages))
      : 0,
    monthlyUpdates: String(plan.monthlyUpdates || fallback.monthlyUpdates || "Monthly update support"),
    monthlyUpdateLimit: Number((plan as any).monthlyUpdateLimit ?? (plan as any).monthly_update_limit ?? fallback.monthlyUpdateLimit ?? 1),
    commitmentMonths: Number((plan as any).commitmentMonths ?? (plan as any).commitment_months ?? fallback.commitmentMonths ?? COMMERCIAL_DEFAULT_COMMITMENT_MONTHS),
    setupFee: Number((plan as any).setupFee ?? (plan as any).setup_fee ?? fallback.setupFee ?? 0),
    marketPrices: ((plan as any).marketPrices || (plan as any).market_prices || fallback.marketPrices || {}) as Plan["marketPrices"],
    marketPriceIds: ((plan as any).marketPriceIds || (plan as any).market_price_ids || fallback.marketPriceIds || {}) as Plan["marketPriceIds"],
    upgradePrompt: String(plan.upgradePrompt || fallback.upgradePrompt || "Upgrade to unlock more pages and grow your website."),
    isActive: (plan as any).isActive ?? (plan as any).is_active ?? fallback.isActive ?? true,
  };
};

export const getPlanMarketPrice = (plan: Plan, market = "US") =>
  plan.marketPrices?.[String(market).toUpperCase()] || plan.marketPrices?.US || {
    monthly: Number(String(plan.price).replace(/[^0-9.]/g, "")) || 0,
    setupFee: plan.setupFee || 0,
    currency: "USD",
    locale: "en-US",
  };

export const formatPlanMoney = (plan: Plan, market = "US", value: "monthly" | "setupFee" = "monthly") => {
  const pricing = getPlanMarketPrice(plan, market);
  return new Intl.NumberFormat(pricing.locale, {
    style: "currency",
    currency: pricing.currency,
    maximumFractionDigits: 0,
  }).format(pricing[value]);
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
