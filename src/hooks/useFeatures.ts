import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Business } from "../types";
import { PLANS, normalizePlans } from "../constants/plans";
import {
  getMarketingCapability,
  type MarketingCapabilityId,
} from "../constants/marketingPro";

export type FeatureId =
  | "ai_synthesis"
  | "lead_crm"
  | "booking"
  | "automation"
  | "ecommerce"
  | "analytics"
  | "custom_domain"
  | "priority_support"
  | "ai_chatbot"
  | "review_management"
  | "advanced_seo"
  | "local_seo_geo"
  | "blog"
  | "website_growth_score"
  | "monthly_improvement_engine"
  | "whatsapp_enquiry_kit"
  | "enquiry_path_tracker"
  | "campaign_landing_pages"
  | "website_rescue_audit"
  | "industry_page_packs"
  | "industry_content"
  | "local_growth_pages"
  | "business_offer_builder"
  | "website_growth_autopilot"
  | "enquiry_loss_detector"
  | "competitor_gap_scanner"
  | "offer_strength_score"
  | "whatsapp_follow_up_crm"
  | "local_seo_opportunity_map"
  | "trust_proof_builder"
  | "campaign_calendar"
  | "sales_page_doctor"
  | "done_for_you_request_portal"
  | "review_to_website_import"
  | "local_ranking_readiness_score"
  | "monthly_website_report"
  | "trust_proof_vault"
  | "ai_receptionist_triage"
  | "before_after_rescue_tool"
  | "affiliate_system"
  | "wordpress_sync";

const planTableRowsToSettings = (rows: any[]) =>
  normalizePlans(
    [...rows]
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((plan) => ({
        id: String(plan.slug || plan.id || "").trim().toLowerCase(),
        name: plan.name,
        description: plan.description || "",
        price: `$${Number(plan.price_usd || 0).toFixed(0)}`,
        priceId: plan.stripe_price_id || "",
        productId: plan.stripe_product_id || "",
        features: Array.isArray(plan.features) ? plan.features : [],
        enabled_features: Array.isArray(plan.enabled_features) ? plan.enabled_features : [],
        aiCredits: Number(plan.monthly_credit_limit || 0),
        maxPages: Number(plan.project_limit || 1),
        maxLocationPages: Number(plan.location_page_limit || 0),
        monthlyUpdates: plan.monthly_update_allowance || "Monthly update support",
        monthlyUpdateLimit: Number(plan.monthly_update_limit || 0),
        commitmentMonths: Number(plan.commitment_months || 0),
        setupFee: Number(plan.setup_fee || 0),
        marketPrices: plan.market_prices || {},
        marketPriceIds: plan.market_price_ids || {},
        upgradePrompt: plan.upgrade_prompt || "Upgrade to unlock more managed growth tools.",
        isPopular: Boolean(plan.is_popular),
        isActive: plan.is_active !== false,
      })),
  );

export function useFeatures() {
  const { profile } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [planSettings, setPlanSettings] = useState<any[]>(normalizePlans(PLANS));
  const [hasWordPressIntegration, setHasWordPressIntegration] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!profile?.businessId) {
        setLoading(false);
        return;
      }

      try {
        const { data: bData } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", profile.businessId)
          .single();

        if (bData) {
          setBusiness({
            id: bData.id,
            name: bData.name,
            ownerId: bData.owner_id,
            plan: bData.plan,
            status: bData.status,
            industry: bData.industry,
            businessNature: bData.business_nature,
            location: bData.location,
            subdomain: bData.subdomain,
            customDomain: bData.custom_domain,
            trialEndsAt: bData.trial_ends_at
              ? new Date(bData.trial_ends_at).getTime()
              : undefined,
            stripeCustomerId: bData.stripe_customer_id,
            stripeSubscriptionId: bData.stripe_subscription_id,
            subscriptionStatus: bData.subscription_status,
            aiCredits: bData.ai_credits || 0,
            aiCreditsUsed: bData.ai_credits_used || 0,
            dashboardVisibleFeatures: Array.isArray(bData.dashboard_visible_features)
              ? bData.dashboard_visible_features
              : null,
            dashboardHiddenFeatures: Array.isArray(bData.dashboard_hidden_features)
              ? bData.dashboard_hidden_features
              : [],
            dashboardAdminOnlyFeatures: Array.isArray(bData.dashboard_admin_only_features)
              ? bData.dashboard_admin_only_features
              : [],
            dashboardVisibilityProfile: bData.dashboard_visibility_profile || "simple_website_client",
            dashboardVisibilityNotes: bData.dashboard_visibility_notes || "",
            createdAt: new Date(bData.created_at).getTime(),
          });
        }

        // The plans table is the same source edited by Super Admin. The legacy
        // settings record is kept as a fallback for older deployments.
        const [planTableRes, plansFallbackRes] = await Promise.all([
          supabase
            .from("plans")
            .select(
              "id,slug,name,description,price_usd,stripe_price_id,stripe_product_id,features,enabled_features,monthly_credit_limit,project_limit,location_page_limit,monthly_update_allowance,monthly_update_limit,commitment_months,setup_fee,market_prices,market_price_ids,upgrade_prompt,is_popular,is_active,sort_order",
            )
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("settings")
            .select("content")
            .eq("id", "plans")
            .maybeSingle(),
        ]);

        if (!planTableRes.error && Array.isArray(planTableRes.data) && planTableRes.data.length > 0) {
          setPlanSettings(planTableRowsToSettings(planTableRes.data));
        } else if (plansFallbackRes.data?.content?.pricing) {
          setPlanSettings(normalizePlans(plansFallbackRes.data.content.pricing));
        } else {
          setPlanSettings(normalizePlans(PLANS));
        }

        const { count } = await supabase
          .from("wordpress_integrations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", profile.businessId);

        setHasWordPressIntegration((count || 0) > 0);
      } catch (error) {
        console.error("Error fetching feature data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile?.businessId]);

  const isFeatureEnabled = (featureId: FeatureId): boolean => {
    if (profile?.role === "super_admin") return true;

    if (!business) return false;

    if (featureId === "blog") {
      return ["business_admin", "staff", "client"].includes(String(profile?.role || ""));
    }

    if (!planSettings.length) return false;

    const currentPlan = planSettings.find((plan) => plan.id === business.plan);
    if (!currentPlan) return false;

    return (currentPlan.enabled_features || []).includes(featureId);
  };

  const isMarketingCapabilityEnabled = (capabilityId: MarketingCapabilityId): boolean => {
    const capability = getMarketingCapability(capabilityId);
    if (!capability) return false;
    const featureId = capability.entitlementFeatureId as FeatureId;
    return isFeatureEnabled(featureId) && isFeatureVisible(featureId);
  };

  const getMarketingCapabilityStatus = (capabilityId: MarketingCapabilityId): "enabled" | "disabled" =>
    isMarketingCapabilityEnabled(capabilityId) ? "enabled" : "disabled";

  const isFeatureVisible = (featureId: FeatureId): boolean => {
    if (profile?.role === "super_admin") return true;
    if (!business) return true;

    const hidden = business.dashboardHiddenFeatures || [];
    const adminOnly = business.dashboardAdminOnlyFeatures || [];
    if (hidden.includes(featureId) || adminOnly.includes(featureId)) return false;

    const visible = business.dashboardVisibleFeatures;
    if (Array.isArray(visible) && visible.length > 0) {
      return visible.includes(featureId);
    }

    return true;
  };

  return {
    isFeatureEnabled,
    isFeatureVisible,
    isMarketingCapabilityEnabled,
    getMarketingCapabilityStatus,
    loading,
    business,
    planSettings,
    hasWordPressIntegration,
  };
}
