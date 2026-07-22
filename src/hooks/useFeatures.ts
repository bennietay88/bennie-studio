import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Business } from "../types";
import { PLANS, normalizePlans } from "../constants/plans";

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

export function useFeatures() {
  const { profile, user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [planSettings, setPlanSettings] = useState<any[]>(normalizePlans(PLANS));
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [hasWordPressIntegration, setHasWordPressIntegration] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!profile?.businessId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch business to get current plan
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

        // Fetch plan settings and platform settings
        const [plansRes, platformRes] = await Promise.all([
          supabase
            .from("settings")
            .select("content")
            .eq("id", "plans")
            .single(),
          supabase
            .from("settings")
            .select("content")
            .eq("id", "marketing_hub_config")
            .single()
        ]);

        if (plansRes.data) {
          setPlanSettings(normalizePlans(plansRes.data.content.pricing || PLANS));
        }
        
        if (platformRes.data) {
          setPlatformSettings(platformRes.data.content);
        }

        // Check for wordpress integrations
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

    // Check platform-wide override for WordPress
    if (featureId === "wordpress_sync") {
      const globalStatus = platformSettings?.marketingFeatures?.wordpressIntegration;
      if (globalStatus !== "enabled") return false;
    }

    if (!business || !planSettings.length) return false;

    const currentPlan = planSettings.find((p) => p.id === business.plan);
    if (!currentPlan) return false;

    return (currentPlan.enabled_features || []).includes(featureId);
  };

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

  return { isFeatureEnabled, isFeatureVisible, loading, business, planSettings, platformSettings, hasWordPressIntegration };
}
