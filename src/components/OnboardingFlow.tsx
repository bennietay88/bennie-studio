/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import {
  Globe,
  Zap,
  Shield,
  Check,
  ChevronDown,
  ArrowRight,
  Loader2,
  Rocket,
  Sparkles,
  Scale,
  Palette,
  Dumbbell,
  TrendingUp,
  Building,
  Briefcase,
  Key,
  Cpu,
  Layout,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Badge } from "./ui/badge";
import { generateId } from "../lib/utils";
import { SECTION_TEMPLATES } from "../constants/sectionTemplates";
import { toast } from "sonner";
import { PACKAGES } from "../constants/packages";
import { activePlans } from "../constants/plans";
import {
  buildNavigationPreview,
  buildPagesFromBlueprint,
  getBlueprintSeo,
  getBlueprintTheme,
  getPlanPageLimit,
  WebsitePlanId,
} from "../constants/pageBlueprints";
import {
  getRecommendedNicheTemplate,
  getTemplateCommercialMetadata,
  getTemplatePlanStructure,
} from "../constants/nicheTemplates";
import {
  auditWebsiteButtons,
  normalizeWebsiteForPreview,
  validateWebsiteCreation,
} from "../lib/websiteButtons";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const sanitizeSubdomain = (value: string) => {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return cleaned || "business";
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const checkoutIntent = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("bt_checkout_intent") || "{}"); } catch { return {}; }
  }, []);
  const [selectedPackage, setSelectedPackage] = useState<string>(checkoutIntent.planId || "starter");
  const [availablePackages, setAvailablePackages] = useState<any[]>(activePlans(PACKAGES as any));
  const [trialDays, setTrialDays] = useState(14);
  const [businessData, setBusinessData] = useState({
    name: "",
    subdomain: "",
    customDomain: "",
    businessType: "creative",
    industry: "",
    businessNature: "",
    description: "",
    location: "",
    market: "",
    mainOffer: "",
    serviceArea: "",
    contactEmail: "",
    contactPhone: "",
    whatsappNumber: "",
    targetAudience: "",
    service1: "",
    service2: "",
    service3: "",
    style: "modern",
    brandColor: "#4f46e5",
    ctaPreference: "Book Call",
    websiteGoal: "Get more leads",
    pagesNeeded: ["Home", "Services", "Contact"],
    nearbyAreas: "",
    localSeoCities: "",
    tonePreference: "professional",
    hasLocalProof: "no",
    testimonials: "",
    faq: "",
    existingUrl: "",
    platform_type: "waas" as "waas",
  });
  const [agreed, setAgreed] = useState(false);
  const selectedPackageConfig =
    availablePackages.find((pkg) => pkg.id === selectedPackage) ||
    activePlans(PACKAGES as any).find((pkg) => pkg.id === selectedPackage);
  const recommendedNicheTemplate = getRecommendedNicheTemplate({
    industry: businessData.industry || businessData.businessType || businessData.businessNature,
    goal: businessData.websiteGoal,
    cta: businessData.ctaPreference,
    style: businessData.style,
  });
  const recommendedTemplateMeta = getTemplateCommercialMetadata(recommendedNicheTemplate);
  const recommendedPlanLabel =
    selectedPackage === "growth" || selectedPackage === "premium"
      ? "Growth"
      : selectedPackage === "starter"
        ? "Starter"
        : "Business";
  const recommendedStructure = getTemplatePlanStructure(recommendedNicheTemplate.id, recommendedPlanLabel as any);
  const formatPackagePrice = (price: string | number) =>
    typeof price === "number" ? `$${price}` : price;

  React.useEffect(() => {
    const fetchData = async () => {
      const { data: tData } = await supabase.from("templates").select("*");
      if (tData) setTemplates(tData);

      const [{ data: sData }, { data: plansData }] = await Promise.all([
        supabase
          .from("settings")
          .select("*")
          .eq("id", "platform")
          .single(),
        supabase
          .from("settings")
          .select("content")
          .eq("id", "plans")
          .maybeSingle(),
      ]);

      if (sData?.content?.defaultTrialDays) {
        setTrialDays(sData.content.defaultTrialDays);
      }
      if (Array.isArray(plansData?.content?.pricing) && plansData.content.pricing.length > 0) {
        setAvailablePackages(activePlans(plansData.content.pricing));
      }
    };
    fetchData();
  }, []);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("bt_onboarding_draft");
      if (saved) setBusinessData((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch {
      localStorage.removeItem("bt_onboarding_draft");
    }
  }, []);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem("bt_onboarding_draft", JSON.stringify(businessData));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [businessData]);

  const BUSINESS_TYPES = [
    {
      id: "restaurant",
      title: "Restaurant / Cafe",
      description: "Restaurants, cafes, bars, and reservation-based dining",
      icon: Globe,
    },
    {
      id: "clinic",
      title: "Clinic / Wellness",
      description: "Dental, medical, aesthetic, wellness, and therapy clinics",
      icon: Shield,
    },
    {
      id: "contractor",
      title: "Contractor / Renovation",
      description: "Renovation, repair, cleaning, and local service businesses",
      icon: Briefcase,
    },
    {
      id: "consultant",
      title: "Consultant / Coach",
      description: "Coaches, advisors, consultants, and professional services",
      icon: TrendingUp,
    },
    {
      id: "aesthetic",
      title: "Aesthetic Clinic",
      description: "Medical spas, skin clinics, and beauty studios",
      icon: Sparkles,
    },
    {
      id: "law",
      title: "Law Firm",
      description: "Legal practices and professional services",
      icon: Scale,
    },
    {
      id: "creative",
      title: "Creative Agency",
      description: "Design, marketing, and branding agencies",
      icon: Palette,
    },
    {
      id: "fitness",
      title: "Fitness Studio",
      description: "Boutique gyms, yoga, and pilates studios",
      icon: Dumbbell,
    },
    {
      id: "wealth",
      title: "Wealth Management",
      description: "Financial advisors and wealth management",
      icon: TrendingUp,
    },
    {
      id: "architecture",
      title: "Architecture Firm",
      description: "Architects and interior design studios",
      icon: Building,
    },
    {
      id: "realestate",
      title: "Luxury Real Estate",
      description: "High-end property management and sales",
      icon: Key,
    },
    {
      id: "tech",
      title: "Tech Startup",
      description: "Software companies and technology ventures",
      icon: Cpu,
    },
  ];

  const totalSteps = 6;
  const MAX_ONBOARDING_PAGES = 5;
  const recommendedPlanId = React.useMemo(() => {
    const requestedPages = businessData.pagesNeeded.length;
    const requestedLocations = businessData.localSeoCities.split(/,|\n/).map((item) => item.trim()).filter(Boolean).length;
    if (businessData.websiteGoal === "Sell products" || requestedPages > MAX_ONBOARDING_PAGES || requestedLocations > 25) return "premium";
    if (requestedPages > 3 || requestedLocations > 5 || businessData.websiteGoal === "Rank in local searches") return "growth";
    if (requestedPages > 1 || requestedLocations > 0) return "business";
    return "starter";
  }, [businessData.pagesNeeded, businessData.localSeoCities, businessData.websiteGoal]);

  const togglePageNeeded = (page: string) => {
    setBusinessData((prev) => {
      const exists = prev.pagesNeeded.includes(page);
      if (!exists && prev.pagesNeeded.length >= MAX_ONBOARDING_PAGES) {
        toast.warning("Managed website plans support up to 5 pages. Extra pages require a custom quote.");
        return prev;
      }
      return {
        ...prev,
        pagesNeeded: exists ? prev.pagesNeeded.filter((item) => item !== page) : [...prev.pagesNeeded, page],
      };
    });
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const getAvailableSubdomain = async (preferredValue: string) => {
    const base = sanitizeSubdomain(preferredValue);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate =
        attempt === 0
          ? base
          : `${base.slice(0, Math.max(12, 48 - 7))}-${Math.random().toString(36).slice(2, 7)}`;

      const { data, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("subdomain", candidate)
        .maybeSingle();

      if (error) {
        console.warn("Subdomain availability check skipped:", error.message);
        return candidate;
      }

      if (!data) return candidate;
    }

    return `${base.slice(0, 40)}-${Date.now().toString(36).slice(-6)}`;
  };

  const startTrial = async () => {
    if (!user || !profile) return;
    setLoading(true);
    setProgress(5);
    setProgressMessage("Initializing infrastructure...");
    setError(null);

    try {
      if (!agreed) {
        toast.error("Please agree to the Service Protocols to continue.");
        return;
      }
      // Check if user already owns a business (defensive check)
      const { data: existingBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      let businessId: string;

      if (existingBusiness) {
        businessId = existingBusiness.id;
        setProgress(15);
        setProgressMessage("Connecting existing business profile...");
        await supabase.from("businesses").update({
          name: businessData.name,
          industry: businessData.industry || businessData.businessType,
          business_nature: businessData.businessNature,
          location: businessData.location,
          plan: selectedPackage,
          onboarding_steps: {
            websiteGoal: businessData.websiteGoal, pagesNeeded: businessData.pagesNeeded, ctaPreference: businessData.ctaPreference,
            tonePreference: businessData.tonePreference, primaryLocation: businessData.location, serviceArea: businessData.serviceArea,
            nearbyAreas: businessData.nearbyAreas.split(/,|\n/).map((item) => item.trim()).filter(Boolean),
            localSeoCities: businessData.localSeoCities.split(/,|\n/).map((item) => item.trim()).filter(Boolean), recommendedPlanId,
          },
        }).eq("id", businessId);
      } else {
        businessId = generateId();
        let referredAffiliateId: string | null = null;
        const storedAffiliateRef =
          typeof window !== "undefined"
            ? localStorage.getItem("bt_platform_affiliate_ref")
            : null;

        if (storedAffiliateRef) {
          const { data: referredAffiliate } = await supabase
            .from("affiliates")
            .select("id, uid, status")
            .eq("referral_code", storedAffiliateRef)
            .eq("status", "active")
            .maybeSingle();

          if (referredAffiliate && referredAffiliate.uid !== user.id) {
            referredAffiliateId = referredAffiliate.id;
          }
        }

        const subdomain = await getAvailableSubdomain(
          businessData.subdomain || businessData.name,
        );

        // 1. Create Business
        setProgress(20);
        setProgressMessage("Configuring business core...");
        const businessPayload: any = {
          id: businessId,
          name: businessData.name,
          subdomain: subdomain,
          custom_domain: businessData.customDomain || null,
          industry: businessData.industry || businessData.businessType,
          business_nature: businessData.businessNature,
          platform_type: businessData.platform_type || "waas",
          onboarding_steps: {
            websiteGoal: businessData.websiteGoal,
            pagesNeeded: businessData.pagesNeeded,
            ctaPreference: businessData.ctaPreference,
            tonePreference: businessData.tonePreference,
            primaryLocation: businessData.location,
            serviceArea: businessData.serviceArea,
            nearbyAreas: businessData.nearbyAreas.split(/,|\n/).map((item) => item.trim()).filter(Boolean),
            localSeoCities: businessData.localSeoCities.split(/,|\n/).map((item) => item.trim()).filter(Boolean),
            hasLocalProof: businessData.hasLocalProof,
            recommendedPlanId,
          },
          owner_id: user.id,
          status: "active",
          plan: selectedPackage,
          subscription_status: "trialing",
          marketing_status: "none",
          marketing_plan: "none",
          trial_ends_at: new Date(
            Date.now() + trialDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        };

        if (referredAffiliateId) {
          businessPayload.referred_by_affiliate_id = referredAffiliateId;
        }

        const insertBusiness = async (payload: any, retryCount = 0): Promise<void> => {
          const { error: businessError } = await supabase
            .from("businesses")
            .insert([payload]);

          if (!businessError) return;

          if (
            (businessError.code === "23505" ||
              /businesses_subdomain_key|duplicate key/i.test(businessError.message || "")) &&
            retryCount < 3
          ) {
            const nextSubdomain = await getAvailableSubdomain(
              `${businessData.subdomain || businessData.name}-${Math.random().toString(36).slice(2, 7)}`,
            );
            setProgressMessage(`Subdomain already exists. Trying ${nextSubdomain}...`);
            return insertBusiness({ ...payload, subdomain: nextSubdomain }, retryCount + 1);
          }

          if (businessError.code === "42501") {
            throw new Error(
              "Permission denied: Database security policies restricted business creation.",
            );
          }
          throw businessError;
        };

        await insertBusiness(businessPayload);

        if (referredAffiliateId) {
          await supabase.from("affiliate_referrals").insert({
            affiliate_id: referredAffiliateId,
            referred_user_id: user.id,
            status: "pending",
            event_type: "signup",
            plan_slug: selectedPackage,
            visitor_id:
              typeof window !== "undefined"
                ? localStorage.getItem("bt_affiliate_visitor_id")
                : null,
            metadata: { businessId, source: "onboarding" },
          });
        }
      }

      // 2. Update User Profile (Linking business but NOT completing onboarding yet)
      setProgress(40);
      setProgressMessage("Configuring security protocols...");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          business_id: businessId,
          role:
            profile.role === "super_admin" ? "super_admin" : "business_admin",
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 3. Create Default Website or Use Selected Template
      const { data: existingWebsite } = await supabase.from("websites").select("id").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      const websiteId = existingWebsite?.id || generateId();
      let websiteData: any;

      if (selectedTemplate) {
        setProgress(60);
        setProgressMessage("Deploying blueprint architecture...");
        const template = (templates || []).find(
          (t) => t.id === selectedTemplate,
        );
        if (template && template.config) {
          const config = template.config;
          const pageLimit = getPlanPageLimit(selectedPackage, selectedPackageConfig?.maxPages);
          const formattedPages = (config.pages || []).slice(0, pageLimit).map((page: any) => ({
            ...page,
            id: page.id || generateId(),
            slug: page.slug ?? (page.title?.toLowerCase() === "home" ? "" : page.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
            sections: (page.sections || []).map((section: any) => {
              let content = { ...section.content };
              if (section.type === "hero" || section.type === "header" || section.type === "cta") {
                if (content.title) content.title = content.title.replace(/\{businessName\}|\[Business Name\]/g, businessData.name);
                if (content.headline) content.headline = content.headline.replace(/\{businessName\}|\[Business Name\]/g, businessData.name);
                
                if (section.type === "hero") {
                    if (!content.headline || content.headline.includes("Strategic Growth")) content.headline = businessData.name;
                    if (businessData.businessNature) content.subheadline = businessData.businessNature;
                }

                if (!content.title || content.title.includes("Template")) content.title = businessData.name;
              }
              
              if (section.type === "services" && (businessData.service1 || businessData.service2 || businessData.service3)) {
                  const userServices = [businessData.service1, businessData.service2, businessData.service3].filter(Boolean);
                  if (userServices.length > 0) {
                      content.items = userServices.map(s => ({
                          title: s,
                          description: `Professional ${s} tailored for ${businessData.targetAudience || "your needs"}.`,
                          price: "Custom Quote"
                      }));
                  }
              }

              if (section.type === "footer" && content.companyName) {
                content.companyName = businessData.name;
              }

              if (section.type === "contact") {
                  content.email = businessData.contactEmail || content.email;
                  content.phone = businessData.contactPhone || content.phone;
                  content.whatsapp = businessData.whatsappNumber || content.whatsapp;
                  content.title = `Connect with ${businessData.name}`;
              }

              if (section.type === "faq" && businessData.faq) {
                  const lines = businessData.faq.split('\n').filter(l => l.trim().length > 3);
                  if (lines.length > 0) {
                      content.items = lines.map((l, i) => ({
                          question: l.includes('?') ? l : `Question ${i+1}: ${l}`,
                          answer: "Contact us for more details."
                      }));
                  }
              }

              if (section.type === "testimonials" && businessData.testimonials) {
                  const lines = businessData.testimonials.split('\n').filter(l => l.trim().length > 3);
                  if (lines.length > 0) {
                      content.items = lines.map((l, i) => ({
                          text: l,
                          author: "Verified Client",
                          role: "Business Owner"
                      }));
                  }
              }

              return {
                ...section,
                id: section.id || generateId(),
                content,
                isVisible: true,
              };
            }),
          }));

          websiteData = {
            id: websiteId,
            business_id: businessId,
            theme: config.theme || {
              primaryColor: "#4f46e5",
              secondaryColor: "#1e293b",
              fontFamily: "Inter",
              style: "modern",
            },
            pages: formattedPages,
            seo: {
              ...(config.seo || {
              title: `${businessData.name} | ${businessData.industry || 'Professional Services'}`,
              description:
                businessData.businessNature ||
                `Welcome to ${businessData.name}. Professional ${businessData.industry} services.`,
              keywords: [
                businessData.industry,
                businessData.targetAudience,
                businessData.service1,
                businessData.name,
              ].filter(Boolean),
              }),
              generationSummary: {
                selectedTemplateId: selectedTemplate,
                selectedPlanId: selectedPackage,
                selectedPlanName: selectedPackageConfig?.name || selectedPackage,
                pageLimit,
                requestedPages: (config.pages || []).length || pageLimit,
                generatedPages: formattedPages.length,
                lockedPages: Math.max(0, ((config.pages || []).length || 0) - pageLimit),
                generatedAt: new Date().toISOString(),
              },
            },
            status: "draft",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }

      if (!websiteData) {
        // Plan-based niche blueprint generation. This is the default WAAS path.
        setProgress(70);
        setProgressMessage("Generating plan-based page structure...");
        const blueprintInput = {
          businessName: businessData.name,
          nicheName: businessData.industry || businessData.businessType,
          plan: selectedPackage as WebsitePlanId,
          maxPages: selectedPackageConfig?.maxPages,
          mainService: businessData.mainOffer || businessData.service1 || businessData.businessNature || businessData.industry,
          targetCustomer: businessData.targetAudience || businessData.market || "local customers",
          location: businessData.location || businessData.serviceArea || "Local Area",
          ctaPreference: businessData.ctaPreference,
          tone: businessData.style || "Professional",
          services: [businessData.service1, businessData.service2, businessData.service3].filter(Boolean),
          description: businessData.businessNature || businessData.description,
          contactEmail: businessData.contactEmail,
          contactPhone: businessData.contactPhone,
          whatsappNumber: businessData.whatsappNumber,
          faqs: businessData.faq.split("\n").map((item) => item.trim()).filter(Boolean),
          testimonials: businessData.testimonials.split("\n").map((item) => item.trim()).filter(Boolean),
        };

        websiteData = {
          id: websiteId,
          business_id: businessId,
          theme: getBlueprintTheme(undefined),
          pages: buildPagesFromBlueprint(blueprintInput),
          seo: getBlueprintSeo(blueprintInput),
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      setProgress(90);
      setProgressMessage("Finalizing framework infrastructure...");
      websiteData = normalizeWebsiteForPreview(
        {
          ...websiteData,
          businessId,
          updatedAt: Date.now(),
          status: websiteData.status || "draft",
        },
        {
          businessName: businessData.name,
          email: businessData.contactEmail,
          phone: businessData.contactPhone,
          whatsapp: businessData.whatsappNumber,
          defaultMessage: `Hi, I found ${businessData.name} and I'm interested in ${businessData.mainOffer || businessData.service1 || "your services"}. Can I get more details?`,
        },
      );

      const validation = validateWebsiteCreation(websiteData);
      if (!validation.valid) {
        await supabase.from("sync_logs").insert({
          business_id: businessId,
          direction: "website_generation",
          event_type: "website_creation_validation_failed",
          status: "failed",
          message: validation.issues.join("; "),
          payload: { websiteId, issues: validation.issues },
        }).then(({ error }) => {
          if (error) console.warn("Website validation log failed:", error.message);
        });
        throw new Error(`Website preview could not be generated: ${validation.issues.join(", ")}`);
      }

      const buttonAudit = auditWebsiteButtons(websiteData);
      websiteData.seo = {
        ...websiteData.seo,
        buttonHealth: {
          total: buttonAudit.length,
          working: buttonAudit.filter((button) => button.status === "working").length,
          broken: buttonAudit.filter((button) => button.status !== "working").length,
          criticalBroken: buttonAudit.filter((button) => button.critical && button.status !== "working").length,
          checkedAt: new Date().toISOString(),
        },
      };

      const dbWebsiteData = {
        id: websiteData.id,
        business_id: websiteData.businessId,
        theme: websiteData.theme,
        pages: websiteData.pages,
        seo: websiteData.seo,
        status: websiteData.status || "draft",
        created_at: websiteData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: websiteError } = await supabase
        .from("websites")
        .upsert([dbWebsiteData], { onConflict: "id" });

      if (websiteError) throw websiteError;

      const { data: { session } } = await supabase.auth.getSession();
      const handoffResponse = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ businessId, websiteId, planId: selectedPackage }),
      });
      if (!handoffResponse.ok) {
        const payload = await handoffResponse.json().catch(() => ({}));
        throw new Error(payload.error || "Delivery handoff failed. Please retry.");
      }

      // 4. MARK ONBOARDING COMPLETED ONLY NOW
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      setProgress(100);
      setProgressMessage("Deployment successful!");
      toast.success("Your ecosystem is ready!");

      // Ensure state is updated before navigating out
      await refreshProfile();
      localStorage.removeItem("bt_onboarding_draft");

      // Use a small delay to let the toast show and profile state propagate
      setTimeout(() => {
        localStorage.setItem("bt_last_created_website_id", websiteId);
        localStorage.setItem("bt_last_created_business_id", businessId);
        navigate(`/w/${businessId}?draft=1&created=${websiteId}`);
        onComplete();
      }, 500);
    } catch (err: any) {
      console.error("Deployment failed:", err);
      setError(
        err.message || "The deployment engine encountered a critical error.",
      );
      toast.error(err.message || "Deployment failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" data-testid="onboarding-flow">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 shrink-0">
          <motion.div
            className="h-full bg-indigo-600"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 sm:p-14">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                        <Rocket className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                       <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100 mb-2">
                        <Sparkles className="h-3 w-3" /> Free Website Preview
                      </div>
                      <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none px-4">
                        Start Your <span className="text-indigo-600">Lead Website</span>
                      </h2>
                      <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto px-4">
                        Start with a managed lead-generation website preview. No credit card required. Your 14-day trial begins after setup.
                      </p>
                    </div>
                  </div>

                  <div className="max-w-xl mx-auto space-y-8 pt-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                        Enter Your Brand Identity
                      </label>
                      <Input
                        className="h-20 text-2xl px-8 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] focus:bg-white focus:border-indigo-600 transition-all font-black placeholder:font-normal shadow-xl shadow-slate-100/50"
                        placeholder="e.g. Bennie Studio"
                        value={businessData.name}
                        data-testid="onboarding-business-name"
                        onChange={(e) =>
                          setBusinessData({
                            ...businessData,
                            name: e.target.value,
                          })
                        }
                      />
                      <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                         Your 14-day trial begins after your website preview is prepared.
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 flex justify-center">
                    <Button
                      onClick={handleNext}
                      disabled={!businessData.name}
                      className="h-20 px-16 text-xl font-black uppercase tracking-[0.2em] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 rounded-[2.5rem] group transition-all"
                    >
                      Initialize Trial{" "}
                      <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                        <Building className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase">
                        Infrastructure
                      </h2>
                      <p className="text-slate-500 text-base sm:text-lg font-medium">
                        Configure your professional ecosystem headquarters.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Global Address (Subdomain)
                        </label>
                        <div className="relative">
                          <Input
                            className="h-18 text-xl px-6 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white transition-all pr-40 font-bold text-slate-900"
                            placeholder="bennietay"
                            value={businessData.subdomain}
                            data-testid="onboarding-subdomain"
                            onChange={(e) =>
                              setBusinessData({
                                ...businessData,
                                subdomain: e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]/g, ""),
                              })
                            }
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                            .bennietay.com
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Industry Model / Business Type
                        </label>
                        <div className="relative group">
                          <select
                            className="h-18 w-full px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-600 transition-all font-black uppercase text-sm outline-none appearance-none cursor-pointer"
                            value={selectedTemplate || ""}
                            data-testid="onboarding-template"
                            onChange={(e) => {
                              const templateId = e.target.value;
                              setSelectedTemplate(templateId);
                              const tmpl = templates.find(t => t.id === templateId);
                              if (tmpl) {
                                setBusinessData({
                                  ...businessData,
                                  businessType: tmpl.name.toLowerCase().replace(/\s+/g, '-'),
                                  industry: tmpl.name
                                });
                              }
                            }}
                          >
                            <option value="" disabled>Select industry blueprint...</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-indigo-600">
                             <Layout className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[2rem] border-2 border-indigo-100 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">
                              Recommended Website Blueprint
                            </p>
                            <h4 className="text-lg font-black text-slate-900">
                              {recommendedTemplateMeta.customerName || recommendedNicheTemplate.name}
                            </h4>
                            <p className="text-xs font-bold leading-relaxed text-slate-500">
                              {recommendedTemplateMeta.conversionGoal} · {recommendedTemplateMeta.ctaStrategy?.[0] || recommendedNicheTemplate.ctaType} · {recommendedStructure.pageCount}-page {recommendedPlanLabel} structure
                            </p>
                          </div>
                          <Badge className="w-fit border-none bg-emerald-50 text-emerald-700">
                            {recommendedTemplateMeta.localSeoReadiness ? "Local SEO Ready" : "SEO Ready"}
                          </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pages</p>
                            <p className="text-xs font-black text-slate-900">{recommendedStructure.pages.join(", ")}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sections</p>
                            <p className="text-xs font-black text-slate-900">{recommendedTemplateMeta.sectionPreset?.slice(0, 3).join(", ") || "Hero, Services, CTA"}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Lead Capture</p>
                            <p className="text-xs font-black text-slate-900">{recommendedTemplateMeta.leadCaptureType || "Contact form"}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 h-11 rounded-2xl text-xs font-black uppercase tracking-widest"
                          onClick={() => {
                            const matchingDbTemplate = templates.find((template) => {
                              const templateText = `${template.name} ${template.category} ${template.description || ""}`.toLowerCase();
                              return (
                                templateText.includes((recommendedTemplateMeta.industry || "").toLowerCase()) ||
                                templateText.includes(recommendedNicheTemplate.name.toLowerCase())
                              );
                            });
                            if (matchingDbTemplate) {
                              setSelectedTemplate(matchingDbTemplate.id);
                              setBusinessData({
                                ...businessData,
                                businessType: (recommendedTemplateMeta.industry || recommendedNicheTemplate.name).toLowerCase().replace(/\s+/g, "-"),
                                industry: recommendedTemplateMeta.industry || recommendedNicheTemplate.name,
                                ctaPreference: recommendedTemplateMeta.ctaStrategy?.[0] || businessData.ctaPreference,
                              });
                              toast.success("Recommended blueprint selected");
                            } else {
                              toast.info("Use this recommendation when generating from the template marketplace.");
                            }
                          }}
                        >
                          Use Recommended Match
                        </Button>
                      </div>

                      {selectedTemplate && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-[2rem] flex items-center gap-6"
                        >
                          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-200 shrink-0 shadow-lg border-2 border-white">
                            <img
                              src={templates.find(t => t.id === selectedTemplate)?.thumbnail}
                              className="w-full h-full object-cover"
                              alt="Blueprint"
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Active Blueprint</p>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-1">
                              {templates.find(t => t.id === selectedTemplate)?.name}
                            </h4>
                            <p className="text-[10px] text-indigo-900/40 font-bold leading-tight line-clamp-2">
                              {templates.find(t => t.id === selectedTemplate)?.description || "High-conversion architecture selected."}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex gap-6">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="h-18 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900"
                    >
                      Previous Step
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="flex-1 h-18 text-lg font-black uppercase tracking-[0.2em] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 rounded-2xl group transition-all"
                      disabled={!businessData.subdomain || !selectedTemplate}
                    >
                      Continue to Strategic Intel{" "}
                      <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        Strategic Intel
                      </h2>
                      <p className="text-slate-500 text-base sm:text-lg font-medium">
                        Define your market positioning and target audience.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Country / Market
                        </label>
                        <Input
                          className="h-14 text-sm px-6 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white transition-all font-bold placeholder:font-normal"
                          placeholder="e.g. Malaysia, Singapore, Global"
                          value={businessData.market}
                          onChange={(e) => setBusinessData({...businessData, market: e.target.value})}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Main Offer / Value Proposition
                        </label>
                        <Input
                          className="h-14 text-sm px-6 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white transition-all font-bold placeholder:font-normal"
                          placeholder="e.g. Free Strategy Session, 20% Off Design"
                          value={businessData.mainOffer}
                          onChange={(e) => setBusinessData({...businessData, mainOffer: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Service Area
                        </label>
                        <Input
                          className="h-14 text-sm px-6 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white transition-all font-bold placeholder:font-normal"
                          placeholder="e.g. Klang Valley, Nationwide"
                          value={businessData.serviceArea}
                          onChange={(e) => setBusinessData({...businessData, serviceArea: e.target.value})}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          CTA Preference
                        </label>
                        <select
                          className="h-14 w-full px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white transition-all font-bold text-sm outline-none"
                          value={businessData.ctaPreference}
                          onChange={(e) => setBusinessData({...businessData, ctaPreference: e.target.value})}
                        >
                          <option value="Book Call">Book Call</option>
                          <option value="Get Quote">Get Quote</option>
                          <option value="WhatsApp Us">WhatsApp Us</option>
                          <option value="Contact Us">Contact Us</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Website Goal
                        </label>
                        <select
                          className="h-14 w-full px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white transition-all font-bold text-sm outline-none"
                          value={businessData.websiteGoal}
                          onChange={(e) => setBusinessData({...businessData, websiteGoal: e.target.value})}
                        >
                          {["Get more leads", "Show services", "Build credibility", "Book appointments", "Capture WhatsApp enquiries", "Rank in local searches", "Sell products"].map((goal) => (
                            <option key={goal} value={goal}>{goal}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex gap-6">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="h-18 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900"
                    >
                      Previous Step
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="flex-1 h-18 text-lg font-black uppercase tracking-[0.2em] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 rounded-2xl transition-all"
                    >
                      Continue to Services <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                        <Briefcase className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        Core Services
                      </h2>
                      <p className="text-slate-500 text-base sm:text-lg font-medium">
                        What exactly do you provide to your clients?
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Services Provided
                        </label>
                        <div className="space-y-3">
                          <Input
                            className="h-12 text-sm px-6 bg-slate-50 border-slate-100 rounded-xl focus:bg-white transition-all font-bold"
                            placeholder="Service 1"
                            value={businessData.service1}
                            onChange={(e) => setBusinessData({...businessData, service1: e.target.value})}
                          />
                          <Input
                            className="h-12 text-sm px-6 bg-slate-50 border-slate-100 rounded-xl focus:bg-white transition-all font-bold"
                            placeholder="Service 2"
                            value={businessData.service2}
                            onChange={(e) => setBusinessData({...businessData, service2: e.target.value})}
                          />
                          <Input
                            className="h-12 text-sm px-6 bg-slate-50 border-slate-100 rounded-xl focus:bg-white transition-all font-bold"
                            placeholder="Service 3"
                            value={businessData.service3}
                            onChange={(e) => setBusinessData({...businessData, service3: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Pages Needed
                        </label>
                        <p className="text-xs font-medium text-slate-500 px-1">
                          Select up to 5 pages for managed plans. More pages can be handled as a custom website quote.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {["Home", "About", "Services", "Pricing", "Contact", "FAQ", "Testimonials", "Portfolio", "Blog", "Areas We Serve"].map((page) => (
                            <button
                              type="button"
                              key={page}
                              onClick={() => togglePageNeeded(page)}
                              disabled={!businessData.pagesNeeded.includes(page) && businessData.pagesNeeded.length >= MAX_ONBOARDING_PAGES}
                              className={`rounded-xl border px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest ${
                                businessData.pagesNeeded.includes(page)
                                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                  : !businessData.pagesNeeded.includes(page) && businessData.pagesNeeded.length >= MAX_ONBOARDING_PAGES
                                  ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                  : "border-slate-100 bg-white text-slate-500"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 px-1">
                          {businessData.pagesNeeded.length}/{MAX_ONBOARDING_PAGES} pages selected
                        </p>
                      </div>
                    </div>
                    <div className="space-y-6">
                       <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Contact Infrastructure
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                           <Input
                              className="h-12 text-sm px-6 bg-slate-50 border-slate-100 rounded-xl transition-all font-bold"
                              placeholder="WhatsApp Number (e.g. +601...)"
                              value={businessData.whatsappNumber}
                              onChange={(e) => setBusinessData({...businessData, whatsappNumber: e.target.value})}
                           />
                           <Input
                              className="h-12 text-sm px-6 bg-slate-50 border-slate-100 rounded-xl transition-all font-bold"
                              placeholder="Contact Email"
                              value={businessData.contactEmail}
                              onChange={(e) => setBusinessData({...businessData, contactEmail: e.target.value})}
                           />
                           <Input
                              className="h-12 text-sm px-6 bg-slate-50 border-slate-100 rounded-xl transition-all font-bold"
                              placeholder="Contact Phone"
                              value={businessData.contactPhone}
                              onChange={(e) => setBusinessData({...businessData, contactPhone: e.target.value})}
                           />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Local SEO Targets
                        </label>
                        <Textarea
                          className="min-h-[92px] text-sm px-6 py-4 bg-slate-50 border-slate-100 rounded-2xl font-medium"
                          placeholder="Cities or areas to target, one per line or comma separated"
                          value={businessData.localSeoCities}
                          onChange={(e) => setBusinessData({...businessData, localSeoCities: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex gap-6">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="h-18 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900"
                    >
                      Previous Step
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="flex-1 h-18 text-lg font-black uppercase tracking-[0.2em] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 rounded-2xl transition-all"
                    >
                      Style & Content <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                         <Palette className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        Style & Content
                      </h2>
                      <p className="text-slate-500 text-base sm:text-lg font-medium">
                        Set the aesthetic and social proof elements of your site.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
                    <div className="space-y-8">
                       <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Brand Colors
                        </label>
                        <input 
                          type="color"
                          className="h-14 w-full bg-transparent border-none cursor-pointer"
                          value={businessData.brandColor}
                          onChange={(e) => setBusinessData({...businessData, brandColor: e.target.value})}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Preferred Style
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                           {['Modern', 'Professional', 'Minimalist', 'Bold'].map(style => (
                             <button
                               key={style}
                               onClick={() => setBusinessData({...businessData, style: style.toLowerCase()})}
                               className={`p-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest ${businessData.style === style.toLowerCase() ? "border-indigo-600 bg-indigo-50" : "border-slate-50"}`}
                             >
                               {style}
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-8">
                       <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Testimonials / Reviews
                        </label>
                        <Textarea
                          className="min-h-[100px] text-sm px-6 py-4 bg-slate-50 border-slate-100 rounded-2xl font-medium"
                          placeholder="Paste a few client reviews here..."
                          value={businessData.testimonials}
                          onChange={(e) => setBusinessData({...businessData, testimonials: e.target.value})}
                        />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                          Frequently Asked Questions
                        </label>
                        <Textarea
                          className="min-h-[100px] text-sm px-6 py-4 bg-slate-50 border-slate-100 rounded-2xl font-medium"
                          placeholder="Common questions you get from customers..."
                          value={businessData.faq}
                          onChange={(e) => setBusinessData({...businessData, faq: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                            Tone Preference
                          </label>
                          <select
                            className="h-12 w-full px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none"
                            value={businessData.tonePreference}
                            onChange={(e) => setBusinessData({...businessData, tonePreference: e.target.value})}
                          >
                            {["professional", "friendly", "premium", "simple", "bold"].map((tone) => (
                              <option key={tone} value={tone}>{tone}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                            Real Local Proof?
                          </label>
                          <select
                            className="h-12 w-full px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none"
                            value={businessData.hasLocalProof}
                            onChange={(e) => setBusinessData({...businessData, hasLocalProof: e.target.value})}
                          >
                            <option value="no">Not yet</option>
                            <option value="reviews">Reviews</option>
                            <option value="projects">Project examples</option>
                            <option value="photos">Location photos</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex gap-6">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="h-18 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900"
                    >
                      Previous Step
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="flex-1 h-18 text-lg font-black uppercase tracking-[0.2em] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 rounded-2xl transition-all"
                    >
                      Proceed to Activation <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-12"
                >
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-950 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-indigo-500/20 shadow-2xl shadow-indigo-900/10 mb-2">
                        <Sparkles className="h-3 w-3" /> Select Trial Package
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        Choose Your Plan
                      </h2>
                      <p className="text-slate-500 text-base sm:text-lg font-medium">
                        Select which tier you&apos;d like to experience during your 14-day trial.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {availablePackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg.id)}
                        className={`p-8 rounded-[3rem] border-4 transition-all text-left flex flex-col gap-6 relative overflow-hidden ${
                          selectedPackage === pkg.id 
                            ? "border-indigo-600 bg-white shadow-2xl shadow-indigo-100" 
                            : "border-slate-50 bg-white hover:border-slate-100"
                        }`}
                      >
                        {selectedPackage === pkg.id && (
                          <div className="absolute top-6 right-6 h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
                            <Check className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">{pkg.name}</p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-950">{formatPackagePrice(pkg.price)}</span>
                            <span className="text-slate-400 font-bold text-xs">/mo</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">After trial period</p>
                        </div>
                        <div className="space-y-3">
                           <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Capabilities</p>
                           <ul className="space-y-3">
                              {pkg.features.map((f, i) => (
                                <li key={i} className="text-[11px] font-bold text-slate-600 flex items-center gap-3">
                                  <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full shrink-0" />
                                  {f}
                                </li>
                              ))}
                           </ul>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">Recommended from your answers</p>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">
                          {(availablePackages.find((pkg) => pkg.id === recommendedPlanId) || availablePackages.find((pkg) => pkg.id === "growth") || selectedPackageConfig)?.name || "Scale"}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          Based on {businessData.pagesNeeded.length} requested page(s), {businessData.localSeoCities.split(/,|\n/).filter(Boolean).length} location target(s), and your goal: {businessData.websiteGoal}.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => setSelectedPackage((availablePackages.some((pkg) => pkg.id === recommendedPlanId) ? recommendedPlanId : "growth"))}
                        className="rounded-2xl bg-indigo-600 font-black uppercase tracking-widest"
                      >
                        Use Recommendation
                      </Button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-8" />


                  {loading ? (
                    <div className="py-20 bg-slate-950 rounded-[4rem] relative overflow-hidden transition-all duration-700">
                      <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-indigo-500/10 to-transparent" />
                      <div className="flex flex-col items-center justify-center space-y-8 relative z-10">
                        <div className="relative">
                          <div className="h-32 w-32 rounded-full border-4 border-white/5 border-t-indigo-500 animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Rocket className="h-10 w-10 text-indigo-500 animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center space-y-4 px-12 max-w-md">
                          <h3 className="text-3xl font-black text-white tracking-widest uppercase leading-none">
                            {progressMessage}
                          </h3>
                          <div className="space-y-3">
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner p-0.5">
                              <motion.div
                                className="h-full bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                                initial={{ width: "0%" }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                Infrastructure Active
                              </span>
                              <span className="text-[10px] text-indigo-400 font-black tracking-widest">
                                {progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="p-12 bg-red-50 border-4 border-red-100 rounded-[3rem] space-y-6 text-center relative overflow-hidden">
                      <div className="absolute -top-12 -right-12 h-40 w-40 bg-red-100/50 blur-3xl" />
                      <div className="h-20 w-20 bg-white text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-red-100 relative z-10">
                        <AlertCircle className="h-10 w-10" />
                      </div>
                      <div className="space-y-3 relative z-10 px-4">
                        <h3 className="text-3xl font-black text-red-950 uppercase tracking-tighter">
                          Deployment Failed
                        </h3>
                        <p className="text-red-700 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                          {error}
                        </p>
                      </div>
                      <div className="pt-4 flex flex-col gap-4 relative z-10">
                        <Button
                          onClick={startTrial}
                          className="w-full h-18 bg-red-600 hover:bg-red-700 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-red-200"
                        >
                          Retry Deployment
                        </Button>
                        <button
                          onClick={() => setError(null)}
                          className="text-[10px] text-red-400 uppercase font-black tracking-widest hover:text-red-600 transition-colors"
                        >
                          Abort & Return
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                      <Card className="bg-slate-950 border-none rounded-[3rem] overflow-hidden relative group">
                        <div className="absolute top-0 right-0 h-64 w-64 bg-indigo-500/10 blur-[100px] group-hover:bg-indigo-500/20 transition-all duration-700" />
                        <CardContent className="p-12 space-y-10 relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">
                                {selectedPackageConfig?.name} Tier
                              </h3>
                              <p className="text-indigo-200/40 text-[10px] font-black uppercase tracking-widest">
                                14-Day Free Access
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-black text-white">
                                $0.00
                              </div>
                              <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
                                Free Trial Active
                              </div>
                            </div>
                          </div>

                          <div className="h-px bg-white/10" />

                          <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300/70">
                              Pages Generated
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {buildNavigationPreview({
                                nicheName: businessData.industry || businessData.businessType,
                                plan: selectedPackage as WebsitePlanId,
                                maxPages: selectedPackageConfig?.maxPages,
                              }).map((page) => (
                                <span
                                  key={page.slug || "home"}
                                  className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white"
                                >
                                  {page.navLabel}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-2xl bg-white/5 p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300/70">
                              Review Before Generate
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-bold text-indigo-100/70">
                              <span>Goal: {businessData.websiteGoal}</span>
                              <span>CTA: {businessData.ctaPreference}</span>
                              <span>Location: {businessData.location || businessData.serviceArea || "Not provided"}</span>
                              <span>Pages requested: {businessData.pagesNeeded.join(", ") || "Home"}</span>
                              <span>Local targets: {businessData.localSeoCities || "None yet"}</span>
                              <span>Tone: {businessData.tonePreference}</span>
                            </div>
                          </div>

                          <ul className="grid grid-cols-1 gap-5">
                            {[
                              "Generation Engine (Unlimited)",
                              "Global CDN Deployment",
                              "Lead Acquisition Nexus",
                              "Business Insights Core",
                              "Custom Identity Protocol",
                              "24/7 Strategic Support",
                            ].map((f, i) => (
                              <li
                                key={i}
                                className="flex items-center gap-4 text-xs font-black text-indigo-100/60 uppercase tracking-widest"
                              >
                                <div className="h-6 w-6 bg-indigo-500 text-white rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                                  <Check className="h-4 w-4" />
                                </div>
                                {f}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <div className="flex flex-col justify-between py-4 space-y-8">
                        <div className="space-y-6 px-4">
                          <div className="flex gap-4 items-start">
                            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100">
                              <Globe className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">
                                Live Subdomain
                              </p>
                              <p className="text-xs font-medium text-slate-500 line-clamp-1">
                                {businessData.subdomain}.bennietay.com
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4 items-start">
                            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100">
                              <Shield className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">
                                Data Sovereignty
                              </p>
                              <p className="text-xs font-medium text-slate-500">
                                Encrypted business intelligence hosted on
                                tier-IV infrastructure.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-start gap-3 px-4">
                            <input
                              type="checkbox"
                              id="agree-protocols"
                              checked={agreed}
                              onChange={(e) => setAgreed(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                            />
                            <label
                              htmlFor="agree-protocols"
                              className="text-[10px] font-bold text-slate-500 leading-relaxed cursor-pointer"
                            >
                              I agree to the{" "}
                              <button
                                type="button"
                                onClick={() => window.open("/terms", "_blank", "noopener,noreferrer")}
                                className="text-slate-900 underline hover:text-indigo-600"
                              >
                                Service Protocols
                              </button>{" "}
                              and understand the{" "}
                              <button
                                type="button"
                                onClick={() => window.open("/privacy", "_blank", "noopener,noreferrer")}
                                className="text-slate-900 underline hover:text-indigo-600"
                              >
                                Privacy Encryptors
                              </button>
                            </label>
                          </div>
                        <Button
                          onClick={startTrial}
                          data-testid="onboarding-launch"
                          disabled={!agreed || loading}
                          className={`w-full h-20 text-xl font-black uppercase tracking-[0.3em] shadow-2xl rounded-[2rem] group transition-all ${
                              agreed 
                                ? "bg-slate-950 hover:bg-black text-white shadow-slate-200" 
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            Launch Website{" "}
                            <Zap className={`ml-4 h-6 w-6 group-hover:scale-125 transition-transform ${agreed ? "text-indigo-500" : "text-slate-400"}`} />
                          </Button>
                          <button
                            onClick={handleBack}
                            className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                          >
                            Return to Content Studio
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                    <p className="text-left text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed max-w-sm">
                      By engaging the deployment engine, you acknowledge the{" "}
                      <span className="text-slate-900 underline cursor-pointer">
                        Service Protocols
                      </span>{" "}
                      and{" "}
                      <span className="text-slate-900 underline cursor-pointer">
                        Privacy Encryptors
                      </span>
                      .
                    </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
