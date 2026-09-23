export type MarketingCapabilityId =
  | "seoAudit"
  | "adGenerator"
  | "reviews"
  | "localSeo"
  | "leadFollowUp"
  | "blog";

export type MarketingPlanCapabilityId = MarketingCapabilityId;

export interface MarketingCapabilityDefinition {
  id: MarketingCapabilityId;
  title: string;
  description: string;
  entitlementFeatureId:
    | "advanced_seo"
    | "ai_synthesis"
    | "review_management"
    | "local_seo_geo"
    | "lead_crm"
    | "blog";
  route?: string;
  accessModel?: "plan" | "business";
}

export const MARKETING_PRO_CAPABILITIES: MarketingCapabilityDefinition[] = [
  {
    id: "seoAudit",
    title: "SEO Audit",
    description: "Review observable SEO and content gaps in the current website and turn them into prioritized improvements.",
    entitlementFeatureId: "advanced_seo",
    route: "/dashboard/seo",
  },
  {
    id: "adGenerator",
    title: "Campaign Copy",
    description: "Draft search and social campaign copy from the business profile. Ad buying and campaign management are not included.",
    entitlementFeatureId: "ai_synthesis",
  },
  {
    id: "reviews",
    title: "Reviews & Reputation",
    description: "Manage review proof and prepare reusable review-request campaigns for customer follow-up.",
    entitlementFeatureId: "review_management",
    route: "/dashboard/reviews",
  },
  {
    id: "localSeo",
    title: "Local SEO",
    description: "Prepare location-page drafts with local proof, schema-ready details and publishing quality checks.",
    entitlementFeatureId: "local_seo_geo",
    route: "/dashboard/local-seo",
  },
  {
    id: "leadFollowUp",
    title: "Leads & Follow-up",
    description: "Work captured leads, score enquiry priority and prepare follow-up actions without pretending queued work was already sent.",
    entitlementFeatureId: "lead_crm",
    route: "/dashboard/leads",
  },
  {
    id: "blog",
    title: "Blog & Content",
    description: "Draft, edit and publish website articles, including AI-assisted first drafts where the plan includes content tools.",
    entitlementFeatureId: "blog",
    route: "/dashboard/blog",
    accessModel: "business",
  },
];

export const MARKETING_PRO_PLAN_CONTROLS = MARKETING_PRO_CAPABILITIES.filter(
  (capability) => capability.accessModel !== "business",
);

export function getMarketingCapability(id: MarketingCapabilityId) {
  return MARKETING_PRO_CAPABILITIES.find((capability) => capability.id === id);
}
