import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import {
  FileText,
  MessageSquare,
  Star,
  ArrowRight,
  Target,
  Search,
  Megaphone,
  Loader2,
  Lock,
  MapPin,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { useFeatures } from "../hooks/useFeatures";
import type { MarketingCapabilityId } from "../constants/marketingPro";
import { generateMarketingContent } from "../lib/gemini";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function MarketingHub() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const {
    business,
    loading,
    planSettings,
    isMarketingCapabilityEnabled,
    getMarketingCapabilityStatus,
  } = useFeatures();

  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [adResult, setAdResult] = useState<any>(null);

  const checkAccess = (capabilityId: MarketingCapabilityId) => {
    const status = getMarketingCapabilityStatus(capabilityId);
    if (status === "disabled") return false;
    if (status === "coming_soon") return "coming_soon";
    if (!isMarketingCapabilityEnabled(capabilityId)) return "upsell";
    return true;
  };

  const handleToolAction = (tool: { id: MarketingCapabilityId; action: () => void }) => {
    const access = checkAccess(tool.id);

    if (access === "upsell") {
      navigate("/dashboard/billing");
      return;
    }
    if (access === "coming_soon") {
      toast.info("This Marketing Pro capability is not live yet.");
      return;
    }
    if (!access) {
      toast.error("This Marketing Pro capability is disabled by Bennie Studio.");
      return;
    }

    if (tool.id === "adGenerator") {
      setIsAdModalOpen(true);
    } else {
      tool.action();
    }
  };

  const handleGenerateAd = async () => {
    if (!business) {
      toast.error("Business context is not available yet.");
      return;
    }
    setIsGenerating(true);
    try {
      // Fetch website info for better prompt
      const { data: website } = await supabase
        .from("websites")
        .select("*")
        .eq("business_id", business.id)
        .single();

      const result = await generateMarketingContent("ad_copy", {
        id: business.id, // Add ID for credit tracking
        name: business.name,
        industry: business.industry,
        description:
          business.businessNature || website?.seo?.description || "",
        location: business.location,
      });

      setAdResult(result);
    } catch (err: any) {
      toast.error("Failed to generate ads: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const tools: Array<{
    id: MarketingCapabilityId;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    action: () => void;
  }> = [
    {
      id: "seoAudit",
      title: "SEO Audit",
      desc: "Review your current website metadata and content context for concrete search and content improvements.",
      icon: Search,
      color: "text-purple-600",
      bg: "bg-purple-50",
      action: () => navigate("/dashboard/seo"),
    },
    {
      id: "adGenerator",
      title: "Campaign Copy",
      desc: "Draft search and social campaign copy from your real business profile. Media buying and ad management are not included.",
      icon: Megaphone,
      color: "text-rose-600",
      bg: "bg-rose-50",
      action: () => {},
    },
    {
      id: "leadFollowUp",
      title: "Leads & Follow-up",
      desc: "Work captured enquiries, prioritize follow-up and prepare reusable WhatsApp or email responses.",
      icon: MessageSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
      action: () => navigate("/dashboard/leads"),
    },
    {
      id: "reviews",
      title: "Reviews & Reputation",
      desc: "Manage customer review proof and prepare review-request campaigns you can copy into your normal follow-up workflow.",
      icon: Star,
      color: "text-amber-600",
      bg: "bg-amber-50",
      action: () => navigate("/dashboard/reviews"),
    },
    {
      id: "localSeo",
      title: "Local SEO",
      desc: "Prepare location-page drafts with local proof, schema-ready details and publishing quality checks.",
      icon: MapPin,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      action: () => navigate("/dashboard/local-seo"),
    },
    {
      id: "blog",
      title: "Blog & Content",
      desc: "Draft, edit and publish website articles with AI-assisted first drafts where your main plan includes content tools.",
      icon: FileText,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      action: () => navigate("/dashboard/blog"),
    },
  ];

  const currentPlan = planSettings.find((plan) => plan.id === business?.plan);
  const unlockedCount = tools.filter(
    (tool) => getMarketingCapabilityStatus(tool.id) === "enabled" && isMarketingCapabilityEnabled(tool.id),
  ).length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100">
          <Megaphone className="h-9 w-9 text-slate-400" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Marketing Pro needs a business account</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
          Marketing Pro uses your Bennie Studio business profile and website context. Complete business setup before using these tools.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? false : "initial"}
      animate="animate"
      variants={staggerContainer}
      className="space-y-8 pt-8"
    >
      <motion.div variants={fadeInUp} className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-4 border-0 bg-indigo-50 text-indigo-700">Included capability module</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Marketing Pro</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            Growth tools inside Bennie Studio. Access comes from your main plan and Bennie Studio can pause individual capabilities globally when needed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full px-4 py-2 text-xs font-bold">
            {currentPlan?.name || business.plan || "Current plan"}
          </Badge>
          <Badge className="rounded-full border-0 bg-slate-900 px-4 py-2 text-xs font-bold text-white">
            {unlockedCount}/{tools.length} available
          </Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const access = checkAccess(tool.id);
          const status = getMarketingCapabilityStatus(tool.id);
          const locked = access === "upsell";
          const unavailable = status === "disabled" || status === "coming_soon";

          return (
            <motion.div
              key={tool.id}
              variants={fadeInUp}
              whileHover={reduceMotion ? undefined : { y: -4 }}
              className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {locked && (
                <div className="absolute right-5 top-5">
                  <Lock className="h-5 w-5 text-slate-300" />
                </div>
              )}

              <div>
                <div className={`${tool.bg} ${tool.color} mb-6 flex h-14 w-14 items-center justify-center rounded-2xl dark:bg-slate-800`}>
                  <tool.icon className="h-7 w-7" />
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{tool.title}</h3>
                  {status === "coming_soon" && <Badge variant="outline">Coming soon</Badge>}
                  {status === "disabled" && <Badge variant="outline">Paused</Badge>}
                </div>
                <p className="mb-8 text-sm leading-6 text-slate-500 dark:text-slate-400">{tool.desc}</p>
              </div>

              <Button
                onClick={() => handleToolAction(tool)}
                disabled={unavailable}
                variant={unavailable ? "outline" : "default"}
                className={`h-12 w-full rounded-2xl font-bold ${
                  unavailable
                    ? "bg-slate-100 text-slate-400"
                    : locked
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {status === "coming_soon"
                  ? "Coming soon"
                  : status === "disabled"
                    ? "Temporarily paused"
                    : locked
                      ? "View plan access"
                      : "Open tool"}
                {!unavailable && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={fadeInUp} className="rounded-[2rem] border border-indigo-100 bg-indigo-50/60 p-8 dark:border-indigo-900/30 dark:bg-indigo-950/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Entitlement model</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">One Bennie Studio plan. Feature-level access.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Marketing Pro is not a second subscription. Your main plan decides which capabilities are included; global controls let Bennie Studio pause a feature without changing billing or customer plan records.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/billing")} className="h-12 rounded-2xl bg-white px-6 font-bold">
            Review plan access
          </Button>
        </div>
      </motion.div>

      {/* Ad Generator Modal */}
      <Dialog open={isAdModalOpen} onOpenChange={setIsAdModalOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none">
          <DialogHeader className="p-8 bg-red-600 text-white shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <Megaphone className="h-7 w-7" /> AI Ad Generator
                </DialogTitle>
                <DialogDescription className="text-red-100/80 font-medium">
                  Draft search and social campaign copy from your current business context.
                </DialogDescription>
              </div>
              {!adResult && !isGenerating && (
                <Button
                  onClick={handleGenerateAd}
                  className="rounded-xl bg-white text-red-600 hover:bg-red-50 font-bold"
                >
                  Generate Ads
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white dark:bg-slate-950">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                <div className="relative mb-8">
                  <div className="h-24 w-24 rounded-full border-4 border-red-100 dark:border-red-900 border-t-red-600 animate-spin" />
                  <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-red-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Drafting Ad Variations...
                </h3>
                <p className="text-slate-500 mt-2">
                  Creating several editable campaign-copy directions.
                </p>
              </div>
            ) : adResult ? (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {adResult.variations.map((ad: any, i: number) => (
                    <Card
                      key={i}
                      className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <Badge className="bg-red-50 text-red-600 border-red-100 rounded-lg">
                          {ad.platform}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Variation {i + 1}
                        </span>
                      </div>
                      <CardContent className="p-6 space-y-4 flex-1">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Headline
                          </Label>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {ad.headline}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Primary Text
                          </Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed h-[120px] overflow-y-auto scrollbar-hide">
                            {ad.primaryText}
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 mt-auto">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Headline: ${ad.headline}\nText: ${ad.primaryText}`,
                            );
                            toast.success("Ad copied to clipboard!");
                          }}
                          className="w-full rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                        >
                          Copy Content
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <Button
                    onClick={handleGenerateAd}
                    variant="outline"
                    className="rounded-2xl h-14 px-8 border-red-200 text-red-600 hover:bg-red-50 font-bold"
                  >
                    Regenerate New Variations
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="h-24 w-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-200">
                  <Megaphone className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">
                    Multi-Channel Ad Generator
                  </h3>
                  <p className="text-slate-500 max-w-sm">
                    We'll create tailored ad copy for Facebook, Instagram, and
                    Google Ads using your brand voice.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateAd}
                  className="rounded-2xl h-14 px-10 bg-red-600 hover:bg-red-700 font-bold"
                >
                  Generate Ad Sets
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
