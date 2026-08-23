import { PLANS } from "./plans";

export interface Package {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  maxPages: number;
  maxSections: number;
  maxLocationPages: number;
  monthlyUpdates: string;
  monthlyUpdateLimit: number;
  commitmentMonths: number;
  setupFee: number;
  marketPrices: Record<string, { monthly: number; setupFee: number; currency: string; locale: string }>;
  marketPriceIds: Record<string, { monthly?: string; yearly?: string; setup?: string }>;
  enabled_features: string[];
  isActive: boolean;
  templateAccess: "basic" | "premium" | "all";
  aiCredits: number;
  blogSupport: boolean;
  seoSetup: boolean;
  revisionLimits: number;
  adminReview: boolean;
}

const onboardingRules: Record<string, Pick<Package, "maxSections" | "templateAccess" | "blogSupport" | "seoSetup">> = {
  starter: { maxSections: 10, templateAccess: "basic", blogSupport: false, seoSetup: false },
  business: { maxSections: 35, templateAccess: "premium", blogSupport: true, seoSetup: true },
  growth: { maxSections: 60, templateAccess: "all", blogSupport: true, seoSetup: true },
};

/** Onboarding package data is derived from the canonical plan catalogue. */
export const PACKAGES: Package[] = PLANS.map((plan) => ({
  ...plan,
  price: Number(String(plan.price).replace(/[^0-9.]/g, "")),
  isActive: plan.isActive !== false,
  ...onboardingRules[plan.id],
  revisionLimits: 0,
  adminReview: false,
}));
