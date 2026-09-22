/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { PLANS as STATIC_PLANS, normalizePlans } from "../constants/plans";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { toast } from "sonner";

const PlanEditor = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planSource, setPlanSource] = useState<"plans_table" | "settings">("settings");

  const FEATURE_GROUPS = [
    {
      name: "Core Infrastructure",
      features: [
        { id: "ai_synthesis", label: "AI Website Generator" },
        { id: "custom_domain", label: "Custom Domain Connection" },
        { id: "lead_crm", label: "Lead Capture & CRM" },
        { id: "analytics", label: "Performance Analytics" },
        { id: "advanced_seo", label: "SEO Optimization Suite" },
      ]
    },
    {
      name: "Operations & Sales",
      features: [
        { id: "booking", label: "Appointment Calendar" },
        { id: "review_management", label: "Reputation & Review Manager" },
        { id: "blog", label: "Blog & Content Hub" },
        { id: "wordpress_sync", label: "WordPress Integration" },
      ]
    },
    {
      name: "Managed Growth Platform",
      features: [
        { id: "website_growth_score", label: "Website Growth Opportunities" },
        { id: "monthly_improvement_engine", label: "Monthly Improvement Engine" },
        { id: "whatsapp_enquiry_kit", label: "WhatsApp Enquiry Kit" },
        { id: "enquiry_path_tracker", label: "Enquiry Path Tracker" },
        { id: "campaign_landing_pages", label: "One-Click Campaign Landing Pages" },
        { id: "website_rescue_audit", label: "Website Rescue Audit" },
        { id: "industry_page_packs", label: "Industry Page Packs" },
        { id: "local_growth_pages", label: "Local Growth Pages" },
        { id: "business_offer_builder", label: "Business Offer Builder" },
        { id: "website_growth_autopilot", label: "Monthly Website Improvement Plan" },
        { id: "enquiry_loss_detector", label: "Missed Enquiry Path Checks" },
        { id: "competitor_gap_scanner", label: "Competitor Gap Scanner" },
        { id: "offer_strength_score", label: "Service Offer Clarity" },
        { id: "whatsapp_follow_up_crm", label: "WhatsApp Follow-Up CRM" },
        { id: "local_seo_opportunity_map", label: "Local SEO Opportunity Map" },
        { id: "trust_proof_builder", label: "Trust Proof Builder" },
        { id: "campaign_calendar", label: "Campaign Calendar" },
        { id: "sales_page_doctor", label: "AI Sales Page Doctor" },
        { id: "done_for_you_request_portal", label: "Done-For-You Request Portal" },
        { id: "review_to_website_import", label: "Review-to-Website Import" },
        { id: "local_ranking_readiness_score", label: "Local Search Checklist" },
        { id: "monthly_website_report", label: "Monthly Website Report" },
        { id: "trust_proof_vault", label: "Trust Proof Vault" },
        { id: "ai_receptionist_triage", label: "Enquiry Qualification Prompts" },
        { id: "before_after_rescue_tool", label: "Before/After Rescue Tool" },
      ]
    },
    {
      name: "Growth & Automation",
      features: [
        { id: "automation", label: "Marketing Workflows (Email/SMS)" },
        { id: "ai_chatbot", label: "Sales AI Copilot (Chatbot)" },
        { id: "ecommerce", label: "E-commerce Storefront" },
        { id: "affiliate_system", label: "Affiliate & Partner Ecosystem" },
        { id: "local_seo_geo", label: "Local SEO & Location Pages" },
        { id: "priority_support", label: "Priority Human Support" },
      ]
    }
  ];

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: tablePlans, error: tableError } = await supabase
          .from("plans")
          .select("*")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("price_usd", { ascending: true });

        if (!tableError && Array.isArray(tablePlans) && tablePlans.length > 0) {
          setPlans(
            [...tablePlans]
              .sort((a: any, b: any) => {
                const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
                const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return Number(a.price_usd || 0) - Number(b.price_usd || 0);
              })
              .map((plan: any, index: number) => {
              const normalized = normalizePlans([
                {
                  id: plan.slug || plan.name?.toLowerCase()?.replace(/[^a-z0-9]+/g, "_"),
                  name: plan.name,
                  price: `$${Number(plan.price_usd || 0).toFixed(0)}`,
                  description: plan.description || `${plan.name} website subscription plan`,
                  aiCredits: plan.monthly_credit_limit ?? 0,
                  maxPages: plan.project_limit ?? 1,
                  maxLocationPages: plan.location_page_limit ?? 0,
                  monthlyUpdates: plan.monthly_update_allowance || plan.monthly_updates || "Monthly update support",
                  monthlyUpdateLimit: plan.monthly_update_limit ?? 1,
                  commitmentMonths: plan.commitment_months ?? 12,
                  setupFee: plan.setup_fee ?? 0,
                  marketPrices: plan.market_prices || {},
                  marketPriceIds: plan.market_price_ids || {},
                  upgradePrompt: plan.upgrade_prompt || "Upgrade to unlock more pages and growth tools.",
                  enabled_features: Array.isArray(plan.enabled_features) ? plan.enabled_features : [],
                  features: Array.isArray(plan.features) ? plan.features : [],
                  isPopular: !!plan.is_popular,
                  isActive: plan.is_active !== false,
                  priceId: plan.stripe_price_id || "",
                  productId: plan.stripe_product_id || "",
                },
              ])[0];
              return { ...normalized, dbId: plan.id, dbSlug: plan.slug, sortIndex: Number(plan.sort_order ?? index) };
            }),
          );
          setPlanSource("plans_table");
          return;
        }

        const { data } = await supabase
          .from("settings")
          .select("content")
          .eq("id", "plans")
          .single();

        if (data?.content?.pricing) {
          setPlans(normalizePlans(data.content.pricing));
        } else {
          setPlans(normalizePlans(STATIC_PLANS));
        }
        setPlanSource("settings");
      } catch (err) {
        console.error("Error fetching plans:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();

    const channel = supabase
      .channel(`plan-editor-${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settings",
          filter: "id=eq.plans",
        },
        (payload) => {
          if (payload.new) setPlans(normalizePlans((payload.new as any).content.pricing || []));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async () => {
    const invalidPlans = plans.filter(
      (p) => p.priceId && !p.priceId.startsWith("price_"),
    );
    if (invalidPlans.length > 0) {
      toast.warning(
        `Warning: ${invalidPlans.length} plan(s) have Price IDs that don't start with "price_". These may fail during checkout.`,
      );
    }

    setSaving(true);
    try {
      const normalized = normalizePlans(plans);

      if (planSource === "plans_table") {
        for (const [index, plan] of plans.entries()) {
          const priceNumber = Number(String(plan.price || "").replace(/[^0-9.]/g, "")) || 0;
          const payload: any = {
            name: plan.name,
            slug: String(plan.id || plan.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            monthly_credit_limit: Number(plan.aiCredits || 0),
            project_limit: Number(plan.maxPages || 1),
            price_usd: priceNumber,
            chatgpt_enabled: (plan.enabled_features || []).includes("ai_chatbot") || (plan.enabled_features || []).includes("ai_synthesis"),
            monthly_chatgpt_action_limit: Number(plan.aiCredits || 0),
            description: plan.description || null,
            features: plan.features || [],
            enabled_features: plan.enabled_features || [],
            location_page_limit: Number(plan.maxLocationPages || 0),
            monthly_update_allowance: plan.monthlyUpdates || null,
            monthly_update_limit: Number(plan.monthlyUpdateLimit || 0),
            commitment_months: Number(plan.commitmentMonths || 0),
            setup_fee: Number(plan.setupFee || 0),
            market_prices: plan.marketPrices || {},
            market_price_ids: plan.marketPriceIds || {},
            upgrade_prompt: plan.upgradePrompt || null,
            is_popular: !!plan.isPopular,
            stripe_product_id: plan.productId || null,
            stripe_price_id: plan.priceId || null,
            sort_order: index,
            is_active: plan.isActive !== false,
            updated_at: new Date().toISOString(),
          };

          if (plan.dbId) {
            let { error: planError } = await supabase
              .from("plans")
              .update(payload)
              .eq("id", plan.dbId);
            if (planError && String(planError.message || "").includes("column")) {
              const retry = await supabase
                .from("plans")
                .update(stripUnsupportedPlanColumns(payload))
                .eq("id", plan.dbId);
              planError = retry.error;
            }
            if (planError) throw planError;
          } else {
            let { error: planError } = await supabase
              .from("plans")
              .insert(payload);
            if (planError && String(planError.message || "").includes("column")) {
              const retry = await supabase
                .from("plans")
                .insert(stripUnsupportedPlanColumns(payload));
              planError = retry.error;
            }
            if (planError) throw planError;
          }
        }
      }

      const { error } = await supabase.from("settings").upsert({
        id: "plans",
        content: { pricing: normalized },
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Plans updated successfully");
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update plans");
    } finally {
      setSaving(false);
    }
  };

  const addPlan = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    const newPlan = {
      id: newId,
      name: "New Plan",
      price: "$0/mo",
      description: "New subscription tier description",
      productId: "",
      priceId: "",
      aiCredits: 10,
      maxPages: 3,
      maxLocationPages: 0,
      monthlyUpdates: "Monthly update support",
      upgradePrompt: "Upgrade to unlock more pages, local pages, and growth tools.",
      features: ["Basic feature"],
      enabled_features: ["ai_synthesis"],
      isPopular: false,
      isActive: true,
    };
    setPlans([...plans, newPlan]);
  };

  const removePlan = (index: number) => {
    if (
      !confirm(
        "Are you sure you want to remove this plan? This will NOT affect existing subscribers but new users won't be able to select it.",
      )
    )
      return;
    const plan = plans[index];
    const newPlans = plans.filter((_, i) => i !== index);
    setPlans(newPlans);
    if (planSource === "plans_table" && plan?.dbId) {
      void supabase.from("plans").delete().eq("id", plan.dbId);
    }
  };

  const updatePlan = (index: number, field: string, value: any) => {
    const newPlans = [...plans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setPlans(newPlans);
  };

  const toggleFeature = (planIndex: number, featureId: string) => {
    const newPlans = [...plans];
    const enabled = newPlans[planIndex].enabled_features || [];
    if (enabled.includes(featureId)) {
      newPlans[planIndex].enabled_features = enabled.filter(
        (id: string) => id !== featureId,
      );
    } else {
      newPlans[planIndex].enabled_features = [...enabled, featureId];
    }
    setPlans(newPlans);
  };

  const stripUnsupportedPlanColumns = (payload: any) => ({
    name: payload.name,
    slug: payload.slug,
    monthly_credit_limit: payload.monthly_credit_limit,
    project_limit: payload.project_limit,
    price_usd: payload.price_usd,
    chatgpt_enabled: payload.chatgpt_enabled,
    monthly_chatgpt_action_limit: payload.monthly_chatgpt_action_limit,
  });

  const movePlan = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= plans.length) return;
    const nextPlans = [...plans];
    const [movedPlan] = nextPlans.splice(index, 1);
    nextPlans.splice(targetIndex, 0, movedPlan);
    setPlans(nextPlans.map((plan, sortIndex) => ({ ...plan, sortIndex })));
  };

  const updateFeature = (
    planIndex: number,
    featureIndex: number,
    value: string,
  ) => {
    const newPlans = [...plans];
    const newFeatures = [...newPlans[planIndex].features];
    newFeatures[featureIndex] = value;
    newPlans[planIndex] = { ...newPlans[planIndex], features: newFeatures };
    setPlans(newPlans);
  };

  const addFeature = (planIndex: number) => {
    const newPlans = [...plans];
    newPlans[planIndex] = {
      ...newPlans[planIndex],
      features: [...newPlans[planIndex].features, ""],
    };
    setPlans(newPlans);
  };

  const removeFeature = (planIndex: number, featureIndex: number) => {
    const newPlans = [...plans];
    newPlans[planIndex].features = newPlans[planIndex].features.filter(
      (_: any, i: number) => i !== featureIndex,
    );
    setPlans(newPlans);
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Subscription Plans
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure global pricing tiers and feature access.
          </p>
          <p className="mt-1 text-xs font-bold text-indigo-600">
            Source: {planSource === "plans_table" ? "Supabase plans table" : "settings fallback"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={addPlan}
            className="rounded-xl gap-2 border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add New Plan
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Plans
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan, planIndex) => (
          <Card
            key={plan.id}
            className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative group h-full"
          >
            <Button
              variant="outline"
              size="icon"
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md border-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-50 hover:text-red-600"
              onClick={() => removePlan(planIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <CardHeader className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Plan ID (Internal)
                  </Label>
                  <Input
                    value={plan.id}
                    onChange={(e) =>
                      updatePlan(planIndex, "id", e.target.value)
                    }
                    className="rounded-xl h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                    Status
                  </Label>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {plan.isActive !== false ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-400" />
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          plan.isActive !== false
                            ? "text-emerald-600"
                            : "text-slate-500"
                        }`}
                      >
                        {plan.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <Switch
                      checked={plan.isActive !== false}
                      onCheckedChange={(checked) =>
                        updatePlan(planIndex, "isActive", checked)
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Update limit</Label>
                  <Input type="number" min="0" value={plan.monthlyUpdateLimit ?? 1} onChange={(e) => updatePlan(planIndex, "monthlyUpdateLimit", parseInt(e.target.value) || 0)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Commitment (months)</Label>
                  <Input type="number" min="0" value={plan.commitmentMonths ?? 12} onChange={(e) => updatePlan(planIndex, "commitmentMonths", parseInt(e.target.value) || 0)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>USD setup fee</Label>
                  <Input type="number" min="0" value={plan.setupFee ?? 0} onChange={(e) => updatePlan(planIndex, "setupFee", Number(e.target.value) || 0)} className="rounded-xl" />
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Malaysia checkout</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>MYR monthly price ID</Label>
                    <Input value={plan.marketPriceIds?.MY?.monthly || ""} onChange={(e) => updatePlan(planIndex, "marketPriceIds", { ...(plan.marketPriceIds || {}), MY: { ...(plan.marketPriceIds?.MY || {}), monthly: e.target.value } })} placeholder="price_..." className="rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>MYR setup price ID</Label>
                    <Input value={plan.marketPriceIds?.MY?.setup || ""} onChange={(e) => updatePlan(planIndex, "marketPriceIds", { ...(plan.marketPriceIds || {}), MY: { ...(plan.marketPriceIds?.MY || {}), setup: e.target.value } })} placeholder="price_..." className="rounded-xl text-xs" />
                  </div>
                </div>
                <p className="mt-2 text-[10px] font-semibold text-slate-500">Create both prices in Stripe, then paste their IDs here. The setup fee is charged once with the first subscription payment.</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div>
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Sales Page Sequence
                  </Label>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Position {planIndex + 1} from left to right
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-xl bg-white"
                    disabled={planIndex === 0}
                    onClick={() => movePlan(planIndex, -1)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-xl bg-white"
                    disabled={planIndex === plans.length - 1}
                    onClick={() => movePlan(planIndex, 1)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Plan Name</Label>
                <Input
                  value={plan.name}
                  onChange={(e) =>
                    updatePlan(planIndex, "name", e.target.value)
                  }
                  className="rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price Display</Label>
                <Input
                  value={plan.price}
                  onChange={(e) =>
                    updatePlan(planIndex, "price", e.target.value)
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={plan.description}
                  onChange={(e) =>
                    updatePlan(planIndex, "description", e.target.value)
                  }
                  className="rounded-xl min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Stripe Product ID
                  </Label>
                  <Input
                    value={plan.productId || ""}
                    onChange={(e) =>
                      updatePlan(planIndex, "productId", e.target.value)
                    }
                    placeholder="prod_..."
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Stripe Price ID
                  </Label>
                  <Input
                    value={plan.priceId || ""}
                    onChange={(e) =>
                      updatePlan(planIndex, "priceId", e.target.value)
                    }
                    placeholder="price_..."
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Max Pages</Label>
                  <Input
                    type="number"
                    value={plan.maxPages || 1}
                    onChange={(e) =>
                      updatePlan(
                        planIndex,
                        "maxPages",
                        parseInt(e.target.value),
                      )
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Location Pages</Label>
                  <Input
                    type="number"
                    value={plan.maxLocationPages || 0}
                    onChange={(e) =>
                      updatePlan(
                        planIndex,
                        "maxLocationPages",
                        parseInt(e.target.value),
                      )
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly Updates</Label>
                  <Input
                    value={plan.monthlyUpdates || ""}
                    onChange={(e) =>
                      updatePlan(planIndex, "monthlyUpdates", e.target.value)
                    }
                    placeholder="e.g. 2 update requests/month"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Upgrade Prompt</Label>
                <Textarea
                  value={plan.upgradePrompt || ""}
                  onChange={(e) =>
                    updatePlan(planIndex, "upgradePrompt", e.target.value)
                  }
                  placeholder="Shown when this plan reaches its page or location limit."
                  className="rounded-xl min-h-[70px]"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                These limits are used by the generator, page manager, Local SEO dashboard, and upgrade prompts.
              </p>
              <div className="space-y-1.5 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-indigo-600">
                    Most Popular Plan
                  </Label>
                  <Switch
                    checked={!!plan.isPopular}
                    onCheckedChange={(checked) =>
                      updatePlan(planIndex, "isPopular", checked)
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <div className="space-y-6">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">
                  Feature Gating (System Access)
                </Label>
                {FEATURE_GROUPS.map((group) => (
                  <div key={group.name} className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2">
                      {group.name}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {group.features.map((feature) => (
                        <div
                          key={feature.id}
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors hover:border-indigo-100"
                        >
                          <span className="text-xs font-medium">
                            {feature.label}
                          </span>
                          <Switch
                            checked={(plan.enabled_features || []).includes(
                              feature.id,
                            )}
                            onCheckedChange={() =>
                              toggleFeature(planIndex, feature.id)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Sales Page Included List
                </Label>
                <p className="text-xs font-semibold leading-5 text-slate-500">
                  These items appear under Included on the public pricing card. Keep this separate from internal feature gating.
                </p>
                <div className="space-y-2">
                  {(plan.features || []).map(
                    (feature: string, featureIndex: number) => (
                      <div
                        key={featureIndex}
                        className="flex items-center gap-2"
                      >
                        <Input
                          value={feature}
                          onChange={(e) =>
                            updateFeature(
                              planIndex,
                              featureIndex,
                              e.target.value,
                            )
                          }
                          className="rounded-xl text-xs h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => removeFeature(planIndex, featureIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ),
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-dashed h-8 text-xs"
                    onClick={() => addFeature(planIndex)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Included Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlanEditor;
