import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, 
  CheckCircle2, 
  ArrowRight, 
  Layout, 
  Check, 
  Briefcase,
  Target,
  ChevronRight
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { NICHE_TEMPLATES } from "../constants/nicheTemplates";
import { PLANS as STATIC_PLANS, activePlans } from "../constants/plans";
import {
  buildNavigationPreview,
  buildPagesFromBlueprint,
  getBlueprintSeo,
  getBlueprintTheme,
  getPlanPageLimit,
  getPlanUpgradeValue,
  WebsitePlanId,
} from "../constants/pageBlueprints";
import { getUpgradeRecommendation } from "../constants/localSeoEngine";
import { assessManualReviewInput, buildReviewWebsiteStrategy } from "../constants/reviewPoweredWaas";

const generatorSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  templateId: z.string().min(1, "Please select a template"),
  planId: z.string().min(1, "Please select a plan"),
  industry: z.string().optional(),
  googleBusinessUrl: z.string().optional(),
  pastedReviews: z.string().optional(),
  websiteUrl: z.string().optional(),
  whatsappNumber: z.string().optional(),
  email: z.string().optional(),
  mainService: z.string().min(2, "Main service is required"),
  targetCustomer: z.string().min(2, "Target customer is required"),
  location: z.string().min(2, "Location is required"),
  country: z.string().optional(),
  state: z.string().optional(),
  nearbyAreas: z.string().optional(),
  localProof: z.string().optional(),
  requestedPages: z.coerce.number().optional(),
  requestedLocationPages: z.coerce.number().optional(),
  ctaPreference: z.string().min(1, "CTA goal is required"),
  tone: z.string().optional(),
  mainGoal: z.string().min(1, "Main goal is required"),
});

type GeneratorFormData = z.infer<typeof generatorSchema>;

interface WebsiteGeneratorProps {
  onSuccess?: (businessId?: string) => void;
  user: any;
  profile: any;
}

export function WebsiteGenerator({ onSuccess, user: propUser, profile: propProfile }: WebsiteGeneratorProps) {
  const { refreshProfile, user, profile } = useAuth();
  const [step, setStep] = React.useState(0);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [generatedBusinessId, setGeneratedBusinessId] = React.useState<string | null>(profile?.businessId || null);
  const [availablePlans, setAvailablePlans] = React.useState<any[]>(activePlans(STATIC_PLANS));

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GeneratorFormData>({
    resolver: zodResolver(generatorSchema) as any,
    defaultValues: {
      businessName: "", 
      templateId: "",
      planId: "business",
      industry: "General",
      googleBusinessUrl: "",
      pastedReviews: "",
      websiteUrl: "",
      whatsappNumber: "",
      email: "",
      mainService: "",
      targetCustomer: "local customers",
      location: "Local Area",
      country: "Malaysia",
      state: "",
      nearbyAreas: "",
      localProof: "",
      requestedPages: 1 as any,
      requestedLocationPages: 0 as any,
      ctaPreference: "Get Leads",
      tone: "Professional",
      mainGoal: "Get Leads",
    },
  });

  // Effect to set default business name when profile loads
  React.useEffect(() => {
    if (profile?.businessId) {
      setGeneratedBusinessId(profile.businessId);
    }
    if (profile?.full_name && !watch("businessName")) {
      setValue("businessName", `${profile.full_name}'s Business`);
    } else if (profile?.email && !watch("businessName")) {
      setValue("businessName", `${profile.email.split('@')[0]}'s Business`);
    }
  }, [profile, setValue]);

  const selectedTemplateId = watch("templateId");
  const selectedPlanId = watch("planId") as WebsitePlanId;
  const businessName = watch("businessName");
  const mainGoal = watch("mainGoal");
  const mainService = watch("mainService");
  const targetCustomer = watch("targetCustomer");
  const location = watch("location");
  const ctaPreference = watch("ctaPreference");
  const googleBusinessUrl = watch("googleBusinessUrl");
  const pastedReviews = watch("pastedReviews");
  const selectedTemplate = Object.values(NICHE_TEMPLATES).find(t => t.id === selectedTemplateId);
  const selectedPlan = availablePlans.find((plan) => plan.id === selectedPlanId) || STATIC_PLANS.find((plan) => plan.id === selectedPlanId);
  const platformPageLimit = 5;
  const selectedPageLimit = Math.min(getPlanPageLimit(selectedPlanId, selectedPlan?.maxPages), platformPageLimit);
  const selectedLocationLimit = Number(selectedPlan?.maxLocationPages ?? 0);
  const pagePreview = buildNavigationPreview({
    nicheId: selectedTemplateId,
    nicheName: selectedTemplate?.category || selectedTemplate?.name,
    plan: selectedPlanId,
    maxPages: selectedPlan?.maxPages,
  });
  const requestedPages = Math.min(platformPageLimit, Math.max(1, Number(watch("requestedPages") || pagePreview.length || 1)));
  const requestedLocationPages = Math.max(0, Number(watch("requestedLocationPages") || 0));
  const effectivePages = Math.min(requestedPages, selectedPageLimit);
  const effectiveLocationPages = Math.min(requestedLocationPages, selectedLocationLimit);
  const hasLockedRequests = requestedPages > selectedPageLimit || requestedLocationPages > selectedLocationLimit;
  const upgradeRecommendation = getUpgradeRecommendation({
    currentPlan: selectedPlanId,
    configuredPlans: availablePlans,
    currentPlanConfig: selectedPlan,
    requestedPages,
    requestedLocationPages,
  });
  const reviewStrategy = buildReviewWebsiteStrategy({
    businessName,
    industry: selectedTemplate?.category || watch("industry"),
    city: location,
    country: watch("country"),
    mainServices: mainService,
    targetCustomer,
    preferredCta: ctaPreference,
    googleBusinessUrl,
    reviews: pastedReviews,
  });
  const manualReviewQuality = assessManualReviewInput(pastedReviews);

  React.useEffect(() => {
    if (selectedPlan?.maxPages) {
      setValue("requestedPages", Math.min(pagePreview.length || selectedPlan.maxPages, selectedPlan.maxPages) as any);
      if (requestedLocationPages > selectedLocationLimit) {
        setValue("requestedLocationPages", selectedLocationLimit as any);
      }
    }
  }, [selectedPlanId]);

  React.useEffect(() => {
    let mounted = true;

    supabase
      .from("settings")
      .select("content")
      .eq("id", "plans")
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        const configuredPlans = data?.content?.pricing;
        if (Array.isArray(configuredPlans) && configuredPlans.length > 0) {
          setAvailablePlans(activePlans(configuredPlans));
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const STEPS = [
    { id: "business_input", title: "Business Input", icon: Layout },
    { id: "plan", title: "Launch Model", icon: Target },
    { id: "identity", title: "Business Details", icon: Briefcase },
    { id: "cta", title: "CTA Goal", icon: Rocket },
    { id: "review", title: "Website Strategy", icon: CheckCircle2 },
  ];

  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const onFormSubmit = async (data: GeneratorFormData) => {
    if (!user?.id) {
      toast.error("Please sign in to continue");
      return;
    }

    setIsGenerating(true);
    setProgress(10);

    try {
      // 1. Ensure business exists
      const isUUID = (id: string | null | undefined): id is string => 
        typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      let businessId = isUUID(profile?.businessId) ? profile.businessId : null;
      const selectedNiche = Object.values(NICHE_TEMPLATES).find(t => t.id === data.templateId);
      if (!selectedNiche) throw new Error("Invalid template selected");
      const selectedPlanForSubmit = availablePlans.find((plan) => plan.id === data.planId) || selectedPlan;
      const pageLimit = getPlanPageLimit(data.planId, selectedPlanForSubmit?.maxPages);
      const locationLimit = Number(selectedPlanForSubmit?.maxLocationPages ?? 0);
      const requestedPageCount = Math.max(1, Number(data.requestedPages || pagePreview.length || 1));
      const requestedLocationCount = Math.max(0, Number(data.requestedLocationPages || 0));
      const effectivePageCount = Math.min(requestedPageCount, pageLimit);
      const effectiveLocationCount = Math.min(requestedLocationCount, locationLimit);
      const submitUpgrade = getUpgradeRecommendation({
        currentPlan: data.planId,
        configuredPlans: availablePlans,
        currentPlanConfig: selectedPlanForSubmit,
        requestedPages: requestedPageCount,
        requestedLocationPages: requestedLocationCount,
      });
      const generationSummary = {
        selectedTemplateId: data.templateId,
        selectedTemplateName: selectedNiche.name,
        selectedPlanId: data.planId,
        selectedPlanName: selectedPlanForSubmit?.name || data.planId,
        pageLimit,
        locationPageLimit: locationLimit,
        requestedPages: requestedPageCount,
        generatedPages: effectivePageCount,
        requestedLocationPages: requestedLocationCount,
        generatedLocationPages: effectiveLocationCount,
        lockedPages: Math.max(0, requestedPageCount - pageLimit),
        lockedLocationPages: Math.max(0, requestedLocationCount - locationLimit),
        upgradeRecommendation: submitUpgrade,
        generatedAt: new Date().toISOString(),
      };
      const reviewPoweredStrategy = buildReviewWebsiteStrategy({
        businessName: data.businessName,
        industry: selectedNiche.category || selectedNiche.name,
        city: data.location,
        country: data.country,
        mainServices: data.mainService,
        targetCustomer: data.targetCustomer,
        preferredCta: data.ctaPreference,
        googleBusinessUrl: data.googleBusinessUrl,
        reviews: data.pastedReviews,
      });
      const manualReviewAssessment = assessManualReviewInput(data.pastedReviews);

      if (!businessId) {
        setProgress(30);
        const { data: newBus, error: busErr } = await supabase
          .from("businesses")
          .insert([{
            owner_id: user.id,
            name: data.businessName,
            industry: data.industry || "General",
            location: data.location,
            phone: data.whatsappNumber,
            email: data.email,
            status: "active",
            plan: data.planId,
            subscription_status: "pending",
            platform_type: "waas"
          }])
          .select()
          .single();
        
        if (busErr) throw busErr;
        businessId = newBus.id;

        await supabase
          .from("profiles")
          .update({ 
            business_id: businessId,
            role: profile?.role === 'super_admin' ? 'super_admin' : 'business_admin',
            onboarding_completed: true
          })
          .eq("id", user.id);
        
        await refreshProfile();
      } else {
        await supabase
          .from("businesses")
          .update({
            name: data.businessName,
            industry: data.industry || selectedNiche?.category || "General",
            location: data.location,
            phone: data.whatsappNumber,
            email: data.email,
            plan: data.planId,
          })
          .eq("id", businessId);
      }

      setGeneratedBusinessId(businessId);
      setProgress(50);

      // 2. Map template to website structure
      const pagesWithIds = buildPagesFromBlueprint({
        businessName: data.businessName,
        nicheId: data.templateId,
        nicheName: selectedNiche.category || selectedNiche.name,
        plan: data.planId,
        maxPages: effectivePageCount,
        mainService: data.mainService,
        targetCustomer: data.targetCustomer,
        location: data.location,
        country: data.country,
        state: data.state,
        nearbyAreas: data.nearbyAreas?.split(",").map((item) => item.trim()).filter(Boolean),
        localProof: data.localProof,
        ctaPreference: data.ctaPreference,
        tone: data.tone,
        services: [data.mainService],
        description: selectedNiche.description,
      });

      const websiteData = {
        business_id: businessId,
        theme: getBlueprintTheme(data.templateId),
        pages: pagesWithIds,
        seo: {
          ...getBlueprintSeo({
          businessName: data.businessName,
          nicheId: data.templateId,
          nicheName: selectedNiche.category || selectedNiche.name,
          plan: data.planId,
          maxPages: effectivePageCount,
          mainService: data.mainService,
          targetCustomer: data.targetCustomer,
          location: data.location,
          country: data.country,
          state: data.state,
          ctaPreference: data.ctaPreference,
          tone: data.tone,
          description: selectedNiche.description,
          }),
          localSeoProfile: {
            country: data.country,
            state: data.state,
            city: data.location,
            nearbyAreas: data.nearbyAreas?.split(",").map((item) => item.trim()).filter(Boolean),
            localProof: data.localProof,
            requestedPages: data.requestedPages,
            requestedLocationPages: data.requestedLocationPages,
            generatedLocationPages: effectiveLocationCount,
            locationPageLimit: locationLimit,
          },
          generationSummary,
          reviewPowered: {
            googleBusinessUrl: data.googleBusinessUrl,
            websiteUrl: data.websiteUrl,
            pastedReviews: data.pastedReviews,
            reviewEvidence: manualReviewAssessment,
            strategy: reviewPoweredStrategy,
            launchModel: data.planId === "growth" ? "managed_scale" : data.planId === "business" ? "managed_growth" : "managed_launch",
            hostingType: "managed",
            siteStatus: "draft",
            publishChecklist: [
              "Review intelligence checked",
              "Contact CTA tested",
              "SEO metadata reviewed",
              "Mobile preview checked",
              "Custom domain ready",
            ],
          },
        },
        status: "draft",
      };

      setProgress(80);

      // 3. Save website
      let { data: existingWeb } = await supabase
        .from("websites")
        .select("id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (existingWeb) {
        await supabase
          .from("websites")
          .update({ 
            ...websiteData,
            updated_at: new Date().toISOString() 
          })
          .eq("id", existingWeb.id);
      } else {
        const { error: webErr } = await supabase
          .from("websites")
          .insert([{ 
            ...websiteData, 
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString() 
          }]);
        if (webErr) throw webErr;
      }

      // 4. Update onboarding progress
      await supabase.from("businesses").update({
        onboarding_steps: {
          "step1": {"completed": true, "label": "Business Registered"},
          "step2": {"completed": true, "label": "Website Generated"},
          "step3": {"completed": true, "label": "Local SEO Details Captured"},
          "step4": {"completed": false, "label": "Content Review"},
          "localSeoProfile": {
            "country": data.country,
            "state": data.state,
            "city": data.location,
            "nearbyAreas": data.nearbyAreas,
            "localProof": data.localProof,
            "requestedPages": requestedPageCount,
            "requestedLocationPages": requestedLocationCount,
            "generatedLocationPages": effectiveLocationCount,
            "locationPageLimit": locationLimit
          },
          "generationSummary": generationSummary,
          "reviewPowered": {
            "googleBusinessUrl": data.googleBusinessUrl,
            "websiteUrl": data.websiteUrl,
            "hostingType": "managed",
            "siteStatus": "draft",
            "recommendedPlan": reviewPoweredStrategy.recommendedPlan,
            "reviewEvidence": manualReviewAssessment
          }
        }
      }).eq("id", businessId);

      setProgress(100);
      if (generationSummary.lockedPages || generationSummary.lockedLocationPages) {
        toast.warning("Website generated within your current plan. Extra page requests were saved as upgrade intent.");
      } else {
        toast.success("Website generated successfully!");
      }
      
      if (onSuccess) {
        onSuccess(businessId);
      }
    } catch (err: any) {
      console.error("Website generation failed:", err);
      toast.error("Generation failed: " + (err.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5">
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Business Input</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">Start from Google reviews or enter details manually.</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Google Business / Maps Link</Label>
                  <Input {...register("googleBusinessUrl")} placeholder="https://maps.google.com/..." className="h-12 rounded-2xl border-2 border-white bg-white font-bold px-5" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Existing Website URL</Label>
                  <Input {...register("websiteUrl")} placeholder="https://yourwebsite.com" className="h-12 rounded-2xl border-2 border-white bg-white font-bold px-5" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Paste Reviews Manually</Label>
                <Textarea {...register("pastedReviews")} placeholder={`Paste 5-20 real reviews here, one review per line if possible.\n\nExample:\nThe team was very patient and explained every step clearly...\nFast response, reasonable price, and easy to contact by WhatsApp...\nThe clinic was clean and the location was convenient...`} className="min-h-36 rounded-2xl border-2 border-white bg-white font-semibold px-5 py-4" />
                <p className="text-[11px] font-semibold leading-5 text-slate-600">
                  Use real reviews only. The system uses this to find customer language, trust signals, objections, FAQs, and local SEO angles.
                </p>
              </div>
              <div className="mt-4 rounded-3xl border border-white bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review evidence provided</p>
                    <p className="mt-2 max-w-xs text-sm font-bold leading-6 text-slate-700">We use the customer language and specific details you provide to shape trust, FAQs, and website copy.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Words", manualReviewQuality.words],
                      ["Reviews", manualReviewQuality.likelyReviewCount],
                      ["Signals", manualReviewQuality.hasSpecificSignals],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {manualReviewQuality.suggestions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {manualReviewQuality.suggestions.map((suggestion) => (
                      <div key={suggestion} className="flex gap-2 text-xs font-semibold leading-5 text-slate-600">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Business Niche</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[430px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.values(NICHE_TEMPLATES).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setValue("templateId", t.id);
                    setValue("industry", t.category);
                    setValue("ctaPreference", t.ctaType);
                    setValue("mainGoal", t.businessGoal);
                    if (!mainService) setValue("mainService", t.bestFor.split(",")[0] || t.category);
                    if (!targetCustomer || targetCustomer === "local customers") setValue("targetCustomer", t.targetMarket || "local customers");
                  }}
                  className={cn(
                    "p-5 border-2 rounded-3xl text-left transition-all relative overflow-hidden group",
                    selectedTemplateId === t.id ? "border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100" : "border-slate-100 bg-white hover:border-slate-200"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-1 bg-slate-100 rounded text-[8px] font-black uppercase text-slate-500">{t.category}</span>
                    {selectedTemplateId === t.id && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                  </div>
                  <div className="font-black uppercase text-sm mb-1">{t.name}</div>
                  <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{t.bestFor}</p>
                </button>
              ))}
            </div>
            {errors.templateId && <p className="text-red-500 text-xs">{errors.templateId.message}</p>}
          </motion.div>
        );
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Website Plan</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setValue("planId", plan.id)}
                  className={cn(
                    "p-6 rounded-3xl border-2 text-left transition-all flex flex-col gap-4",
                    selectedPlanId === plan.id ? "border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100" : "border-slate-100 bg-white hover:border-slate-200",
                  )}
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{plan.name}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{plan.maxPages}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{plan.maxPages === 1 ? "Page" : "Pages"}</p>
                  </div>
                  <p className="text-xs font-bold leading-relaxed text-slate-600">{plan.description}</p>
                </button>
              ))}
            </div>
            <div className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Generated Structure</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {pagePreview.map((page) => (
                  <span key={page.slug || "home"} className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
                    {page.navLabel}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs font-medium text-slate-300">{getPlanUpgradeValue(selectedPlanId, selectedPlan?.maxPages)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold text-slate-300">
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-indigo-300">Location Pages</p>
                  <p className="mt-1 text-white">{selectedLocationLimit} included</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-[8px] uppercase tracking-widest text-indigo-300">Monthly Updates</p>
                  <p className="mt-1 text-white">{selectedPlan?.monthlyUpdates || "Plan allowance"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Need full CMS control?</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">Request a Custom Website instead</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Best for blog publishing, advanced SEO pages, CMS editing, ecommerce, booking, integrations, and full WordPress ownership.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => window.location.assign("/apply-custom")} className="h-12 shrink-0 rounded-2xl font-black uppercase tracking-widest">
                  Website Quote
                </Button>
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Business Name</Label>
              <Input {...register("businessName")} placeholder="Enter Business Name" className="h-14 rounded-2xl border-2 border-slate-200 bg-white font-bold text-lg px-6 focus:border-indigo-600 transition-all" />
              {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName.message}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Main Service</Label>
                <Input {...register("mainService")} placeholder="e.g. Dental implants, Renovation, Strategy coaching" className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
                {errors.mainService && <p className="text-red-500 text-xs mt-1">{errors.mainService.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Customer</Label>
                <Input {...register("targetCustomer")} placeholder="e.g. families, homeowners, founders" className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
                {errors.targetCustomer && <p className="text-red-500 text-xs mt-1">{errors.targetCustomer.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location</Label>
                <Input {...register("location")} placeholder="e.g. Kuala Lumpur, Singapore, London" className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Country</Label>
                <Input {...register("country")} placeholder="Malaysia, Singapore, United Kingdom..." className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">State / Region</Label>
                <Input {...register("state")} placeholder="Kuala Lumpur, Selangor, London..." className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tone</Label>
                <Input {...register("tone")} placeholder="Professional, premium, friendly..." className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">WhatsApp Number</Label>
                <Input {...register("whatsappNumber")} placeholder="+60..." className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</Label>
                <Input {...register("email")} placeholder="hello@business.com" className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pages Needed</Label>
                <Input type="number" min={1} max={platformPageLimit} {...register("requestedPages")} className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
                <p className="text-[11px] font-bold text-slate-400">Managed websites support up to {platformPageLimit} pages. Larger builds are handled as custom quotes.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location Pages Requested</Label>
                <Input type="number" min={0} {...register("requestedLocationPages")} className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nearby Areas Served</Label>
              <Input {...register("nearbyAreas")} placeholder="Petaling Jaya, Shah Alam, Subang Jaya" className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Real Local Proof</Label>
              <Input {...register("localProof")} placeholder="Project areas, Google reviews, screenshots, local testimonials, photos..." className="h-14 rounded-2xl border-2 border-slate-200 font-bold px-5" />
            </div>
            {upgradeRecommendation.recommendedPlan !== selectedPlan?.name && (
              <div className="rounded-3xl bg-amber-50 border border-amber-200 p-5">
                <p className="text-sm font-black text-amber-900">Upgrade recommendation: {upgradeRecommendation.recommendedPlan}</p>
                <p className="mt-1 text-xs font-bold text-amber-800">{upgradeRecommendation.reason}</p>
                <p className="mt-2 text-[11px] font-semibold text-amber-700">
                  Current plan will generate {effectivePages} page{effectivePages === 1 ? "" : "s"} and {effectiveLocationPages} dedicated location page{effectiveLocationPages === 1 ? "" : "s"}. Extra requests are saved for upgrade follow-up.
                </p>
              </div>
            )}
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">CTA Goal</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {["Get Leads", "Book Appointment", "Get Quote", "Reserve Table", "WhatsApp", "Book Call", "View Properties", "Request Consultation"].map(goal => (
                 <button
                  key={goal}
                  type="button"
                  onClick={() => {
                    setValue("mainGoal", goal);
                    setValue("ctaPreference", goal);
                  }}
                  className={cn(
                    "p-4 border-2 rounded-2xl text-left transition-all",
                    ctaPreference === goal || mainGoal === goal ? "border-indigo-600 bg-indigo-50" : "border-slate-100 bg-white"
                  )}
                 >
                   <span className="block text-xs font-black uppercase tracking-widest leading-none mb-1">{goal}</span>
                   <span className="text-[10px] text-slate-600 font-medium">Used across page CTAs and forms.</span>
                 </button>
               ))}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-slate-950 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Rocket className="h-24 w-24" /></div>
              
              <div className="space-y-6 relative z-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Ready to Deploy</span>
                  <h3 className="text-3xl font-black tracking-tight uppercase leading-none mt-1">Generation Check.</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <Check className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300/70">Business</p>
                      <p className="font-bold text-white">{businessName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <Check className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300/70">Template Selected</p>
                      <p className="font-bold text-white">{selectedTemplate?.name} / {selectedPlanId}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300/70 mb-3">Pages Generated</p>
                    <div className="flex flex-wrap gap-2">
                      {pagePreview.map((page) => (
                        <span key={page.slug || "home"} className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
                          {page.navLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300/70">Plan Page Limit</p>
                      <p className="mt-1 text-lg font-black text-white">{selectedPageLimit}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300/70">Requested Pages</p>
                      <p className="mt-1 text-lg font-black text-white">{requestedPages}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300/70 mb-2">Local SEO Setup</p>
                    <p className="text-sm font-bold text-white">{watch("country") || "Country not set"} / {watch("state") || "Region not set"} / {location}</p>
                    <p className="mt-1 text-xs font-medium text-slate-300">{effectiveLocationPages} of {requestedLocationPages} requested location pages included on this plan</p>
                  </div>
                  <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-300/20">
                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mb-2">Review Intelligence Strategy</p>
                    <p className="text-sm font-bold text-white">{reviewStrategy.heroHeadline}</p>
                    <p className="mt-2 text-xs font-medium leading-5 text-indigo-100">{reviewStrategy.positioningAngle}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ["Review excerpts", manualReviewQuality.likelyReviewCount],
                        ["Trust themes", reviewStrategy.trustSignals.length],
                        ["Buyer questions", reviewStrategy.intelligence.faqs.length],
                        ["Suggested pages", reviewStrategy.recommendedPages.length],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-white/10 p-3 text-center">
                          <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200">{label}</p>
                          <p className="mt-1 text-lg font-black text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                    {manualReviewQuality.suggestions.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">More evidence would strengthen the copy</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-amber-100">
                          You can still generate a website, but the copy will be stronger if you paste more real reviews before launching.
                        </p>
                      </div>
                    )}
                  </div>
                  {hasLockedRequests && (
                    <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Upgrade Intent Saved</p>
                      <p className="mt-1 text-xs font-semibold text-amber-100">{upgradeRecommendation.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-12 text-center space-y-8 bg-white rounded-[3rem] border shadow-2xl">
        <div className="relative">
          <div className="h-32 w-32 rounded-full border-4 border-slate-100 animate-pulse" />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Rocket className="h-12 w-12 text-indigo-600" />
          </motion.div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight">Deploying Website</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Building your business ecosystem...</p>
        </div>

        <div className="space-y-4 w-full max-w-xs">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-indigo-600">
             <span>Deployment Progress</span>
             <span>{progress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onFormSubmit)} className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        {/* Progress Header */}
        <div className="px-12 pt-12 pb-8 border-b border-slate-50">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div 
                key={s.id}
                className={cn(
                  "flex items-center gap-3 transition-all",
                  step === i ? "opacity-100" : "opacity-30"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs",
                  step === i ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {i + 1}
                </div>
                <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-12 min-h-[450px]">
          <div className="mb-8">
            <h1 className="text-4xl font-black tracking-tight uppercase leading-none mb-2">
              {step === 0 && "Business Input"}
              {step === 1 && "Choose Website Direction"}
              {step === 2 && "Business Details"}
              {step === 3 && "CTA Goal"}
              {step === 4 && "Review-Powered Strategy"}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              {step === 0 && "Paste a Google Business link, reviews, and choose the closest niche framework."}
              {step === 1 && "Managed plans include secure hosting. Custom websites stay as a quote path."}
              {step === 2 && "Add the details used for niche-specific copy."}
              {step === 3 && "Set the primary action every page should drive."}
              {step === 4 && "Review the strategy, page structure, evidence, and launch checklist."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-12 py-8 bg-slate-50 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={prevStep}
            disabled={step === 0}
            className="h-12 px-8 rounded-2xl font-bold uppercase text-xs tracking-widest"
          >
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={
                (step === 0 && !selectedTemplateId) ||
                (step === 2 && (!businessName || !mainService || !targetCustomer || !location)) ||
                (step === 3 && !ctaPreference)
              }
              className="h-12 px-10 rounded-2xl bg-slate-950 text-white hover:bg-slate-800 font-bold uppercase text-xs tracking-[0.2em] shadow-xl group"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <Button
              type="submit"
              className="h-12 px-10 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black uppercase text-xs tracking-[0.2em] shadow-xl group"
            >
              Generate Website <Rocket className="ml-2 h-4 w-4 group-hover:-translate-y-1 transition-transform" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
