/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Plus,
  Search,
  Layout,
  Edit2,
  Trash2,
  Loader2,
  Star,
  Globe,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Eye,
  ImageIcon,
  Settings as SettingsIcon,
  Copy,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { toast } from "sonner";
import { motion } from "motion/react";
import { WebsiteRenderer } from "../WebsiteRenderer";
import { generateId } from "../../lib/utils";
import {
  CONVERSION_GOALS,
  PLAN_PAGE_STRUCTURES,
  WAAS_TEMPLATE_PACKS,
  getTemplateCommercialMetadata,
  getTemplatePlanStructure,
} from "../../constants/nicheTemplates";
import {
  FONT_PAIRINGS,
  SECTION_LIBRARY,
  TEMPLATE_CATEGORIES,
  TEMPLATE_FILTER_TAGS,
  TEMPLATE_INDUSTRIES,
  TEMPLATE_PAGE_TYPES,
  TEMPLATE_PLAN_ACCESS,
} from "../../constants/templateTaxonomy";

interface TemplateManagerProps {
  onEdit: (templateId: string) => void;
}

export const TemplateManager = ({ onEdit }: TemplateManagerProps) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<any | null>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [assignmentPlan, setAssignmentPlan] = useState<"Starter" | "Business" | "Growth">("Business");
  const [assigning, setAssigning] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [packFilter, setPackFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [seoFilter, setSeoFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [pageTypeFilter, setPageTypeFilter] = useState("all");
  const [premiumFilter, setPremiumFilter] = useState("all");
  const supportsVisibilityColumn = templates.some((template) =>
    Object.prototype.hasOwnProperty.call(template, "is_visible"),
  );

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
      const { data: businessData } = await supabase
        .from("businesses")
        .select("id,name,plan,industry,location")
        .order("created_at", { ascending: false });
      setBusinesses(businessData || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this template?"))
      return;

    setDeleting(id);
    try {
      const { error } = await supabase.from("templates").delete().eq("id", id);

      if (error) throw error;
      setTemplates(templates.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete template");
    } finally {
      setDeleting(null);
    }
  };

  const getDbTemplateMetadata = (template: any) => {
    const configCommercial = template.config?.commercial || template.config?.metadata || {};
    const base = getTemplateCommercialMetadata({
      id: template.id,
      name: template.name,
      premiumName: template.name,
      category: template.category,
      ctaType: configCommercial.cta_type || configCommercial.ctaType,
      leadCapture: configCommercial.lead_capture_type || configCommercial.leadCaptureType,
      description: template.description,
      bestFor: configCommercial.best_fit_customer_profile || template.description,
      businessGoal: "Generate Leads" as any,
      visualStyle: configCommercial.style_preset || template.config?.theme?.style || "Premium Corporate",
      premiumLevel: template.is_premium ? "Business" : "Launch",
      theme: template.config?.theme || {},
      pages: template.config?.pages || [],
      conversionFeatures: [],
      seoFocus: "",
      trustElements: [],
      automation: "",
      ...configCommercial,
    });
    return {
      ...base,
      customerName: template.customer_name || configCommercial.customerName || base.customerName || template.name,
      adminName: template.admin_name || configCommercial.adminName || base.adminName || template.name,
      industry: template.industry || configCommercial.industry || base.industry || template.category,
      businessCategory: template.business_category || configCommercial.businessCategory || base.businessCategory || template.category,
      templatePack: template.template_pack || configCommercial.templatePack || base.templatePack,
      conversionGoal: template.conversion_goal || configCommercial.conversionGoal || base.conversionGoal,
      recommendedPlan: template.recommended_plan || configCommercial.recommendedPlan || base.recommendedPlan,
      supportedPageCounts: template.supported_page_counts || configCommercial.supportedPageCounts || base.supportedPageCounts || [1, 3, 5],
      ctaStrategy: template.cta_strategy || configCommercial.ctaStrategy || base.ctaStrategy || [],
      leadCaptureType: template.lead_capture_type || configCommercial.leadCaptureType || base.leadCaptureType,
      localSeoReadiness: template.local_seo_readiness ?? configCommercial.localSeoReadiness ?? base.localSeoReadiness ?? false,
      urgencyLevel: template.urgency_level || configCommercial.urgencyLevel || base.urgencyLevel || "Normal",
      stylePreset: template.style_preset || configCommercial.stylePreset || base.stylePreset || template.config?.theme?.style || "modern",
      bestFitCustomerProfile: template.best_fit_customer_profile || configCommercial.bestFitCustomerProfile || base.bestFitCustomerProfile,
      sectionPreset: template.section_preset || configCommercial.sectionPreset || base.sectionPreset || [],
      seoPreset: template.seo_preset || configCommercial.seoPreset || base.seoPreset,
      templateCategory: template.template_category || configCommercial.templateCategory || configCommercial.category || template.category || "Single Page Website",
      pageType: template.page_type || configCommercial.pageType || "Single Page",
      planAccess: template.plan_access || configCommercial.planAccess || [template.recommended_plan || configCommercial.recommendedPlan || base.recommendedPlan || "Business"],
      premiumStatus: template.premium_status || configCommercial.premiumStatus || (template.is_premium ? "premium" : "free"),
      previewImage: template.preview_image || configCommercial.previewImage || template.thumbnail,
      recommendedUseCase: template.recommended_use_case || configCommercial.recommendedUseCase || template.description,
      includedSections: template.included_sections || configCommercial.includedSections || configCommercial.sectionPreset || base.sectionPreset || [],
      seoReadiness: template.seo_readiness || configCommercial.seoReadiness || (template.local_seo_readiness ? "Local SEO ready" : "Basic SEO"),
      filterTags: template.filter_tags || configCommercial.filterTags || [],
      fontPairing: template.font_pairing || configCommercial.fontPairing || "Geist Sans / Geist Mono",
      layoutVariants: template.layout_variants || configCommercial.layoutVariants || {},
    };
  };

  const filteredTemplates = templates.filter((t) => {
    const meta = getDbTemplateMetadata(t);
    const query = searchQuery.toLowerCase();
    const searchable = [
      t.name,
      t.category,
      t.description,
      meta.customerName,
      meta.adminName,
      meta.industry,
      meta.conversionGoal,
      meta.ctaStrategy?.join(" "),
      meta.leadCaptureType,
      meta.bestFitCustomerProfile,
      meta.templateCategory,
      meta.pageType,
      meta.planAccess?.join(" "),
      meta.filterTags?.join(" "),
      meta.includedSections?.join(" "),
      meta.recommendedUseCase,
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesPack = packFilter === "all" || meta.templatePack === packFilter;
    const matchesGoal = goalFilter === "all" || meta.conversionGoal === goalFilter;
    const matchesPlan = planFilter === "all" || meta.recommendedPlan === planFilter || meta.planAccess?.includes(planFilter);
    const matchesPages = pageFilter === "all" || meta.supportedPageCounts?.includes(Number(pageFilter));
    const matchesSeo = seoFilter === "all" || (seoFilter === "yes" ? meta.localSeoReadiness : !meta.localSeoReadiness);
    const matchesCategory = categoryFilter === "all" || meta.templateCategory === categoryFilter || t.category === categoryFilter;
    const matchesIndustry = industryFilter === "all" || meta.industry === industryFilter;
    const matchesPageType = pageTypeFilter === "all" || meta.pageType === pageTypeFilter;
    const matchesPremium =
      premiumFilter === "all" ||
      (premiumFilter === "premium" ? meta.premiumStatus === "premium" || t.is_premium : meta.premiumStatus !== "premium" && !t.is_premium);
    return matchesQuery && matchesPack && matchesGoal && matchesPlan && matchesPages && matchesSeo && matchesCategory && matchesIndustry && matchesPageType && matchesPremium;
  });

  const duplicateTemplate = async (template: any) => {
    const newId = generateId();
    const basePayload = {
      id: newId,
      name: `${template.name} Copy`,
      category: template.category,
      description: template.description,
      thumbnail: template.thumbnail,
      config: template.config || {},
      is_premium: template.is_premium,
    };
    const fallbackPayloads = [
      {
        ...basePayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      basePayload,
      {
        id: newId,
        name: `${template.name} Copy`,
        category: template.category,
        description: template.description,
        config: template.config || {},
      },
    ];
    let lastError: any = null;
    for (const payload of fallbackPayloads) {
      const { error } = await supabase.from("templates").insert(payload);
      if (!error) {
        toast.success("Template duplicated");
        fetchTemplates();
        return;
      }
      lastError = error;
      const isMissingColumn =
        error.code === "42703" ||
        String(error.message || "").includes("schema cache") ||
        String(error.message || "").includes("column");
      if (!isMissingColumn) break;
    }
    toast.error("Failed to duplicate template: " + (lastError?.message || "Unknown error"));
  };

  const openTemplateSettings = (template: any) => {
    const meta = getDbTemplateMetadata(template);
    setEditingTemplate({
      ...template,
      customer_name: template.customer_name || meta.customerName,
      admin_name: template.admin_name || meta.adminName,
      industry: template.industry || meta.industry,
      business_category: template.business_category || meta.businessCategory,
      template_pack: template.template_pack || meta.templatePack,
      conversion_goal: template.conversion_goal || meta.conversionGoal,
      recommended_plan: template.recommended_plan || meta.recommendedPlan,
      supported_page_counts: template.supported_page_counts || meta.supportedPageCounts || [1, 3, 5],
      cta_strategy: template.cta_strategy || meta.ctaStrategy || [],
      lead_capture_type: template.lead_capture_type || meta.leadCaptureType,
      local_seo_readiness: template.local_seo_readiness ?? meta.localSeoReadiness ?? false,
      urgency_level: template.urgency_level || meta.urgencyLevel || "Normal",
      style_preset: template.style_preset || meta.stylePreset || template.config?.theme?.style || "modern",
      best_fit_customer_profile: template.best_fit_customer_profile || meta.bestFitCustomerProfile,
      template_category: template.template_category || meta.templateCategory,
      page_type: template.page_type || meta.pageType,
      plan_access: template.plan_access || meta.planAccess || [],
      premium_status: template.premium_status || meta.premiumStatus,
      preview_image: template.preview_image || meta.previewImage || template.thumbnail,
      recommended_use_case: template.recommended_use_case || meta.recommendedUseCase,
      included_sections: template.included_sections || meta.includedSections || [],
      seo_readiness: template.seo_readiness || meta.seoReadiness,
      filter_tags: template.filter_tags || meta.filterTags || [],
      font_pairing: template.font_pairing || meta.fontPairing,
    });
  };

  const assignTemplateToBusiness = async () => {
    if (!assigningTemplate || !selectedBusinessId) return;
    setAssigning(true);
    try {
      const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
      const structure = getTemplatePlanStructure(assigningTemplate.id, assignmentPlan);
      const pages = (assigningTemplate.config?.pages || []).slice(0, structure.pageCount).map((page: any, index: number) => ({
        ...page,
        id: page.id || generateId(),
        title: structure.pages[index] || page.title || `Page ${index + 1}`,
        sections: (page.sections || []).map((section: any) => ({
          ...section,
          id: section.id || generateId(),
        })),
      }));

      const payload = {
        id: generateId(),
        business_id: selectedBusinessId,
        title: `${selectedBusiness?.name || "Business"} Website Draft`,
        status: "draft",
        theme: assigningTemplate.config?.theme || {},
        pages: pages.length ? pages : assigningTemplate.config?.pages || [],
        seo: {
          ...(assigningTemplate.config?.seo || {}),
          commercialTemplate: getDbTemplateMetadata(assigningTemplate),
          planStructure: structure,
        },
        updated_at: new Date().toISOString(),
      };

      const fallbackPayloads = [
        payload,
        {
          business_id: payload.business_id,
          status: payload.status,
          theme: payload.theme,
          pages: payload.pages,
          seo: payload.seo,
        },
      ];
      let lastError: any = null;
      for (const draftPayload of fallbackPayloads) {
        const { error } = await supabase.from("websites").insert(draftPayload);
        if (!error) {
          toast.success("Editable website draft created");
          setAssigningTemplate(null);
          setSelectedBusinessId("");
          return;
        }
        lastError = error;
        const isMissingColumn =
          error.code === "42703" ||
          String(error.message || "").includes("schema cache") ||
          String(error.message || "").includes("column");
        if (!isMissingColumn) break;
      }
      throw lastError;
    } catch (error: any) {
      toast.error("Failed to assign template: " + (error?.message || "Unknown error"));
    } finally {
      setAssigning(false);
    }
  };

  const saveTemplateSettings = async () => {
    if (!editingTemplate?.id) return;
    setSavingSettings(true);
    try {
      const commercial = {
        ...(editingTemplate.config?.commercial || {}),
        customerName: editingTemplate.customer_name || editingTemplate.name,
        adminName: editingTemplate.admin_name || editingTemplate.name,
        industry: editingTemplate.industry || editingTemplate.category,
        businessCategory: editingTemplate.business_category || editingTemplate.category,
        templatePack: editingTemplate.template_pack,
        conversionGoal: editingTemplate.conversion_goal,
        recommendedPlan: editingTemplate.recommended_plan,
        supportedPageCounts: editingTemplate.supported_page_counts || [1, 3, 5],
        ctaStrategy: editingTemplate.cta_strategy || [],
        leadCaptureType: editingTemplate.lead_capture_type,
        localSeoReadiness: editingTemplate.local_seo_readiness,
        urgencyLevel: editingTemplate.urgency_level,
        stylePreset: editingTemplate.style_preset,
        bestFitCustomerProfile: editingTemplate.best_fit_customer_profile,
        templateCategory: editingTemplate.template_category || editingTemplate.category,
        pageType: editingTemplate.page_type,
        planAccess: editingTemplate.plan_access || [],
        premiumStatus: editingTemplate.premium_status || (editingTemplate.is_premium ? "premium" : "free"),
        previewImage: editingTemplate.preview_image || editingTemplate.thumbnail,
        recommendedUseCase: editingTemplate.recommended_use_case,
        includedSections: editingTemplate.included_sections || [],
        seoReadiness: editingTemplate.seo_readiness,
        filterTags: editingTemplate.filter_tags || [],
        fontPairing: editingTemplate.font_pairing,
      };
      const basePayload: any = {
        name: editingTemplate.name,
        category: editingTemplate.category,
        description: editingTemplate.description,
        thumbnail: editingTemplate.thumbnail,
        config: {
          ...(editingTemplate.config || {}),
          commercial,
        },
      };
      const preferredPayload = {
        ...basePayload,
        is_premium: editingTemplate.is_premium,
        customer_name: commercial.customerName,
        admin_name: commercial.adminName,
        industry: commercial.industry,
        business_category: commercial.businessCategory,
        template_pack: commercial.templatePack,
        conversion_goal: commercial.conversionGoal,
        recommended_plan: commercial.recommendedPlan,
        supported_page_counts: commercial.supportedPageCounts,
        cta_strategy: commercial.ctaStrategy,
        lead_capture_type: commercial.leadCaptureType,
        local_seo_readiness: commercial.localSeoReadiness,
        urgency_level: commercial.urgencyLevel,
        style_preset: commercial.stylePreset,
        best_fit_customer_profile: commercial.bestFitCustomerProfile,
        template_category: commercial.templateCategory,
        page_type: commercial.pageType,
        plan_access: commercial.planAccess,
        premium_status: commercial.premiumStatus,
        preview_image: commercial.previewImage,
        recommended_use_case: commercial.recommendedUseCase,
        included_sections: commercial.includedSections,
        seo_readiness: commercial.seoReadiness,
        filter_tags: commercial.filterTags,
        font_pairing: commercial.fontPairing,
        updated_at: new Date().toISOString(),
        ...(supportsVisibilityColumn ? { is_visible: editingTemplate.is_visible !== false } : {}),
      };
      const fallbackPayloads = [
        preferredPayload,
        { ...basePayload, is_premium: editingTemplate.is_premium },
        basePayload,
        {
          name: editingTemplate.name,
          category: editingTemplate.category,
          description: editingTemplate.description,
          config: editingTemplate.config || {},
        },
      ];

      let lastError: any = null;
      for (const payload of fallbackPayloads) {
        const { error } = await supabase
          .from("templates")
          .update(payload)
          .eq("id", editingTemplate.id);

        if (!error) {
          setTemplates(
            templates.map((template) =>
              template.id === editingTemplate.id
                ? { ...template, ...payload, ...editingTemplate }
                : template,
            ),
          );
          setEditingTemplate(null);
          toast.success("Template settings saved successfully");
          return;
        }

        lastError = error;
        const isMissingColumn =
          error.code === "42703" ||
          String(error.message || "").includes("schema cache") ||
          String(error.message || "").includes("column");
        if (!isMissingColumn) break;
      }

      throw lastError;
    } catch (err: any) {
      toast.error("Failed to save settings: " + (err?.message || "Unknown error"));
    } finally {
      setSavingSettings(false);
    }
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
            Website Templates
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage niche-led website blueprints, CTA strategy, page limits, and local SEO readiness.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              className="pl-9 rounded-xl w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => onEdit("new")} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Create Template
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-100">
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {categoryFilter === "all" ? "All Categories" : categoryFilter}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Categories</SelectItem>
              {TEMPLATE_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {industryFilter === "all" ? "All Industries" : industryFilter}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Industries</SelectItem>
              {TEMPLATE_INDUSTRIES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pageTypeFilter} onValueChange={setPageTypeFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {pageTypeFilter === "all" ? "All Page Types" : pageTypeFilter}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Page Types</SelectItem>
              {TEMPLATE_PAGE_TYPES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={packFilter} onValueChange={setPackFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {packFilter === "all"
                  ? "All Packs"
                  : WAAS_TEMPLATE_PACKS.find((pack) => pack.id === packFilter)?.name || packFilter}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Packs</SelectItem>
              {WAAS_TEMPLATE_PACKS.map((pack) => (
                <SelectItem key={pack.id} value={pack.id}>{pack.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={goalFilter} onValueChange={setGoalFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {goalFilter === "all" ? "All Conversion Goals" : goalFilter}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Goals</SelectItem>
              {CONVERSION_GOALS.map((goal) => (
                <SelectItem key={goal} value={goal}>{goal}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {planFilter === "all" ? "All Plan Access" : planFilter}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Plans</SelectItem>
              {TEMPLATE_PLAN_ACCESS.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pageFilter} onValueChange={setPageFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {pageFilter === "all" ? "Any Page Count" : `${pageFilter}-page`}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Any Page Count</SelectItem>
              <SelectItem value="1">1-page</SelectItem>
              <SelectItem value="3">3-page</SelectItem>
              <SelectItem value="5">5-page</SelectItem>
            </SelectContent>
          </Select>
          <Select value={seoFilter} onValueChange={setSeoFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {seoFilter === "all" ? "SEO Any" : seoFilter === "yes" ? "Local SEO Ready" : "No Local SEO"}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">SEO Any</SelectItem>
              <SelectItem value="yes">Local SEO Ready</SelectItem>
              <SelectItem value="no">No Local SEO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={premiumFilter} onValueChange={setPremiumFilter}>
            <SelectTrigger className="w-full rounded-xl bg-white text-slate-900">
              <span className="truncate text-sm font-semibold">
                {premiumFilter === "all" ? "Free + Premium" : premiumFilter === "free" ? "Free" : "Premium"}
              </span>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Free + Premium</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="rounded-xl bg-white font-semibold text-slate-900"
            onClick={() => {
              setCategoryFilter("all");
              setIndustryFilter("all");
              setPageTypeFilter("all");
              setPackFilter("all");
              setGoalFilter("all");
              setPlanFilter("all");
              setPageFilter("all");
              setSeoFilter("all");
              setPremiumFilter("all");
              setSearchQuery("");
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTemplates.map((template) => {
          const meta = getDbTemplateMetadata(template);
          return (
          <Card key={template.id} className="rounded-3xl overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm relative group">
            <div className="aspect-video relative overflow-hidden bg-slate-100">
              {template.thumbnail ? (
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Layout className="h-12 w-12" />
                </div>
              )}
              {template.is_premium && (
                <Badge className="absolute top-4 right-4 bg-amber-400 text-amber-950 border-none">
                  PREMIUM
                </Badge>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => onEdit(template.id)}
                >
                  <Edit2 className="h-4 w-4 mr-2" /> Edit Design
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl bg-white/20 backdrop-blur-md border-white/20 text-white hover:bg-white/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplate(template);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" /> Preview
                </Button>
              </div>
            </div>
            <CardHeader className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">{meta.industry || template.category}</p>
                  <h3 className="font-bold text-lg leading-tight">{meta.customerName || template.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{meta.adminName}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {meta.templateCategory} · {meta.pageType}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge
                      variant="outline"
                      className="rounded-md text-[10px] uppercase font-bold tracking-widest bg-slate-50 border-slate-200"
                    >
                      {meta.conversionGoal || template.category}
                    </Badge>
                    {meta.localSeoReadiness && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] uppercase font-bold tracking-widest">
                        Local SEO Ready
                      </Badge>
                    )}
                    {meta.leadCaptureType && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] uppercase font-bold tracking-widest">
                        Lead Form
                      </Badge>
                    )}
                    {supportsVisibilityColumn && template.is_visible === false && (
                      <Badge className="bg-slate-500 text-white border-none text-[10px] uppercase font-bold tracking-widest">
                        HIDDEN
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="rounded-md text-[10px] uppercase font-bold tracking-widest bg-indigo-50 border-indigo-200 text-indigo-600"
                    >
                      {meta.stylePreset || template.config?.theme?.style || "modern"}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(props) => (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        {...props}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  />
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem
                      onClick={() => openTemplateSettings(template)}
                      className="gap-2"
                    >
                      <SettingsIcon className="h-4 w-4" /> Template Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEdit(template.id)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" /> Edit Design & Pages
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => duplicateTemplate(template)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setAssigningTemplate(template);
                        setAssignmentPlan((meta.recommendedPlan as any) || "Business");
                      }}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" /> Assign to Customer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-red-600 focus:text-red-600"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-slate-500 mt-2 line-clamp-2 h-10">
                {template.description || "No description provided."}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Best Plan</p>
                  <p className="text-sm font-black text-slate-900">{meta.recommendedPlan || "Business"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Access</p>
                  <p className="truncate text-sm font-black text-slate-900">{meta.planAccess?.join(" / ") || "Starter / Business"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">CTA</p>
                  <p className="text-sm font-black text-slate-900">{meta.ctaStrategy?.[0] || "Contact"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sections</p>
                  <p className="text-sm font-black text-slate-900">{meta.includedSections?.length || meta.sectionPreset?.length || "Core"}</p>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="px-6 py-4 border-t bg-slate-50/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Created {new Date(template.created_at).toLocaleDateString()}
              </span>
              <a
                href={`/preview/template/${template.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 font-bold text-xs p-0 h-auto gap-1 flex items-center hover:opacity-80 transition-opacity"
              >
                Preview <Eye className="h-3 w-3" />
              </a>
            </CardFooter>
          </Card>
        )})}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="rounded-3xl border-dashed border-2 p-12 text-center text-slate-400">
          <Layout className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No templates found matching your search.</p>
        </Card>
      )}

      <Dialog
        open={!!editingTemplate}
        onOpenChange={() => setEditingTemplate(null)}
      >
        <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Settings</DialogTitle>
            <DialogDescription>
              Configure global settings and design style for this template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Template Name
              </label>
              <Input
                value={editingTemplate?.name || ""}
                onChange={(e) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    name: e.target.value,
                  })
                }
                placeholder="e.g., Luxury Real Estate"
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Customer-Facing Name
                </label>
                <Input
                  value={editingTemplate?.customer_name || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, customer_name: e.target.value })}
                  placeholder="Dental Clinic Website"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Industry / Niche
                </label>
                <Select
                  value={editingTemplate?.industry || "Consultant"}
                  onValueChange={(v) => setEditingTemplate({ ...editingTemplate, industry: v })}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TEMPLATE_INDUSTRIES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Category
                </label>
                <Select
                  value={editingTemplate?.template_category || editingTemplate?.category || "Single Page Website"}
                  onValueChange={(v) =>
                    setEditingTemplate({ ...editingTemplate, template_category: v, category: v })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TEMPLATE_CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Page Type
                </label>
                <Select
                  value={editingTemplate?.page_type || "Single Page"}
                  onValueChange={(v) => setEditingTemplate({ ...editingTemplate, page_type: v })}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TEMPLATE_PAGE_TYPES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Template Status
                  </label>
                  <div className="space-y-2">
                    {supportsVisibilityColumn && (
                      <div className="flex items-center gap-2 h-10 px-3 border rounded-xl bg-slate-50/50">
                        <Switch
                          id="visibility-toggle-mgr"
                          checked={editingTemplate?.is_visible !== false}
                          onCheckedChange={(v) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              is_visible: v,
                            })
                          }
                        />
                        <label
                          htmlFor="visibility-toggle-mgr"
                          className="text-sm font-medium"
                        >
                          Visible to Clients
                        </label>
                      </div>
                    )}
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-xl bg-slate-50/50">
                      <Switch
                        id="premium-toggle-mgr"
                        checked={!!editingTemplate?.is_premium}
                        onCheckedChange={(v) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            is_premium: v,
                          })
                        }
                      />
                      <label
                        htmlFor="premium-toggle-mgr"
                        className="text-sm font-medium"
                      >
                        Premium Template
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Core Design Style
              </label>
              <Select
                value={
                  editingTemplate?.config?.theme?.style ||
                  editingTemplate?.config?.theme?.defaultStyle ||
                  "modern"
                }
                onValueChange={(v) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    config: {
                      ...editingTemplate.config,
                      theme: {
                        ...editingTemplate.config.theme,
                        style: v,
                        defaultStyle: v,
                      },
                    },
                  })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="authority">
                    Authority Master (Professional)
                  </SelectItem>
                  <SelectItem value="action">
                    Lead Multiplier (Lead Gen)
                  </SelectItem>
                  <SelectItem value="immersive">
                    Visual Narrative (High-Visual)
                  </SelectItem>
                  <SelectItem value="editorial">
                    Minimalist Clean (Typography)
                  </SelectItem>
                  <SelectItem value="modern">Modern Standard</SelectItem>
                  <SelectItem value="corporate">Corporate Identity</SelectItem>
                  <SelectItem value="glassmorphic">
                    Glassmorphic Trend
                  </SelectItem>
                  <SelectItem value="brutalist">Brutalist Bold</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 italic">
                Changing this will update the default layout logic for all users
                of this template.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="mb-4">
                <p className="text-sm font-black text-slate-900">Commercial Template Logic</p>
                <p className="text-xs font-medium text-slate-500">
                  Used for filtering, onboarding recommendation, CTA setup, SEO readiness, and assignment workflow.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Template Pack
                  </label>
                  <Select
                    value={editingTemplate?.template_pack || "professional_services"}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, template_pack: v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {WAAS_TEMPLATE_PACKS.map((pack) => (
                        <SelectItem key={pack.id} value={pack.id}>{pack.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Conversion Goal
                  </label>
                  <Select
                    value={editingTemplate?.conversion_goal || "WhatsApp Enquiry"}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, conversion_goal: v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {CONVERSION_GOALS.map((goal) => (
                        <SelectItem key={goal} value={goal}>{goal}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Recommended Plan
                  </label>
                  <Select
                    value={editingTemplate?.recommended_plan || "Business"}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, recommended_plan: v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Starter">Starter</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Growth">Growth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    SEO Readiness
                  </label>
                  <Select
                    value={editingTemplate?.seo_readiness || "Basic SEO"}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, seo_readiness: v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Basic SEO">Basic SEO</SelectItem>
                      <SelectItem value="SEO-ready">SEO-ready</SelectItem>
                      <SelectItem value="Local SEO ready">Local SEO ready</SelectItem>
                      <SelectItem value="Advanced SEO">Advanced SEO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Primary CTA
                  </label>
                  <Input
                    value={editingTemplate?.cta_strategy?.[0] || ""}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, cta_strategy: [e.target.value, ...(editingTemplate?.cta_strategy || []).slice(1)] })}
                    placeholder="Book Appointment"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Lead Capture Type
                  </label>
                  <Input
                    value={editingTemplate?.lead_capture_type || ""}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, lead_capture_type: e.target.value })}
                    placeholder="Appointment form"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Font Pairing
                  </label>
                  <Select
                    value={editingTemplate?.font_pairing || "Geist Sans / Geist Mono"}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, font_pairing: v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {FONT_PAIRINGS.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Urgency Level
                  </label>
                  <Select
                    value={editingTemplate?.urgency_level || "Normal"}
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, urgency_level: v })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Best-Fit Customer Profile
                  </label>
                  <Input
                    value={editingTemplate?.best_fit_customer_profile || ""}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, best_fit_customer_profile: e.target.value })}
                    placeholder="For dentists that need appointment bookings, treatment pages, local visibility, and WhatsApp enquiries."
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Recommended Use Case
                  </label>
                  <Input
                    value={editingTemplate?.recommended_use_case || ""}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, recommended_use_case: e.target.value })}
                    placeholder="Lead-generation website for small local service businesses."
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Plan Access
                  </label>
                  <div className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TEMPLATE_PLAN_ACCESS.map((item) => {
                      const selected = (editingTemplate?.plan_access || []).includes(item);
                      return (
                        <label key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              const current = editingTemplate?.plan_access || [];
                              setEditingTemplate({
                                ...editingTemplate,
                                plan_access: event.target.checked
                                  ? Array.from(new Set([...current, item]))
                                  : current.filter((value: string) => value !== item),
                              });
                            }}
                          />
                          {item}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Template Focus Tags
                  </label>
                  <div className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TEMPLATE_FILTER_TAGS.map((item) => {
                      const selected = (editingTemplate?.filter_tags || []).includes(item);
                      return (
                        <label key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              const current = editingTemplate?.filter_tags || [];
                              setEditingTemplate({
                                ...editingTemplate,
                                filter_tags: event.target.checked
                                  ? Array.from(new Set([...current, item]))
                                  : current.filter((value: string) => value !== item),
                              });
                            }}
                          />
                          {item}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Included Section Library
                  </label>
                  <div className="grid max-h-56 gap-2 overflow-auto rounded-2xl border border-slate-100 bg-white p-3 sm:grid-cols-2">
                    {SECTION_LIBRARY.map((section) => {
                      const selected = (editingTemplate?.included_sections || []).includes(section.name);
                      return (
                        <label key={section.id} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selected}
                            onChange={(event) => {
                              const current = editingTemplate?.included_sections || [];
                              setEditingTemplate({
                                ...editingTemplate,
                                included_sections: event.target.checked
                                  ? Array.from(new Set([...current, section.name]))
                                  : current.filter((value: string) => value !== section.name),
                              });
                            }}
                          />
                          <span>
                            {section.name}
                            <span className="mt-1 block font-medium text-slate-400">
                              {section.variants.join(", ")}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border bg-white p-3 md:col-span-2">
                  <Switch
                    id="local-seo-ready"
                    checked={!!editingTemplate?.local_seo_readiness}
                    onCheckedChange={(v) => setEditingTemplate({ ...editingTemplate, local_seo_readiness: v })}
                  />
                  <label htmlFor="local-seo-ready" className="text-sm font-bold text-slate-700">
                    Local SEO Ready
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Description
              </label>
              <textarea
                value={editingTemplate?.description || ""}
                onChange={(e) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    description: e.target.value,
                  })
                }
                className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                placeholder="Describe the target audience or niche..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Thumbnail Preview URL
              </label>
              <Input
                value={editingTemplate?.thumbnail || ""}
                onChange={(e) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    thumbnail: e.target.value,
                  })
                }
                placeholder="/brand-template-preview.svg"
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setEditingTemplate(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-indigo-600 px-8"
              disabled={savingSettings}
              onClick={saveTemplateSettings}
            >
              {savingSettings && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewTemplate}
        onOpenChange={() => setPreviewTemplate(null)}
      >
        <DialogContent className="sm:max-w-[80vw] max-w-[95vw] w-full sm:w-[80vw] h-[90vh] p-0 overflow-hidden flex flex-col rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-6 border-b flex flex-row items-center justify-between shrink-0 bg-white">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold">
                {previewTemplate ? getDbTemplateMetadata(previewTemplate).customerName : "Template Preview"}
              </DialogTitle>
              <p className="text-sm text-slate-500">
                {previewTemplate ? getDbTemplateMetadata(previewTemplate).adminName : "Template Preview"}
              </p>
            </div>
          </DialogHeader>
          {previewTemplate && (
            <div className="grid gap-3 border-b bg-white px-6 py-4 text-xs font-bold md:grid-cols-5">
              {(() => {
                const meta = getDbTemplateMetadata(previewTemplate);
                const structure = getTemplatePlanStructure(previewTemplate.id, (meta.recommendedPlan as any) || "Business");
                return (
                  <>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400">CTA Preview</p>
                      <p className="text-slate-900">{meta.ctaStrategy?.[0] || "Contact"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400">Plans</p>
                      <p className="text-slate-900">{meta.supportedPageCounts?.join(" / ")} pages</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400">Default Pages</p>
                      <p className="truncate text-slate-900">{structure.pages.join(", ")}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400">SEO</p>
                      <p className="text-slate-900">{meta.localSeoReadiness ? "Local SEO ready" : "Standard SEO"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[9px] uppercase tracking-widest text-slate-400">Best For</p>
                      <p className="truncate text-slate-900">{meta.industry}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <div className="flex-1 overflow-auto bg-slate-50 relative group">
            {previewTemplate && (
              <div className="h-full w-full pointer-events-auto">
                <WebsiteRenderer
                  initialData={{
                    id: "preview",
                    businessId: "preview",
                    theme: previewTemplate.config.theme,
                    pages: (previewTemplate.config.pages || []).map(
                      (p: any) => ({
                        ...p,
                        id: p.id || generateId(),
                        sections: (p.sections || []).map((s: any) => ({
                          ...s,
                          id: s.id || generateId(),
                        })),
                      }),
                    ),
                    seo: previewTemplate.config.seo,
                    status: "published",
                    updatedAt: Date.now(),
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!assigningTemplate}
        onOpenChange={() => setAssigningTemplate(null)}
      >
        <DialogContent className="rounded-3xl max-w-xl">
          <DialogHeader>
            <DialogTitle>Assign Template to Customer</DialogTitle>
            <DialogDescription>
              Create an editable website draft using the selected niche blueprint and plan limit.
            </DialogDescription>
          </DialogHeader>
          {assigningTemplate && (
            <div className="space-y-5 py-4">
              <div className="rounded-3xl bg-indigo-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                  Selected Blueprint
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-900">
                  {getDbTemplateMetadata(assigningTemplate).customerName || assigningTemplate.name}
                </h3>
                <p className="text-sm font-medium text-slate-600">
                  {getDbTemplateMetadata(assigningTemplate).conversionGoal} · {getDbTemplateMetadata(assigningTemplate).ctaStrategy?.[0] || "Contact"} · {getDbTemplateMetadata(assigningTemplate).localSeoReadiness ? "Local SEO ready" : "Standard SEO"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Customer / Business
                </label>
                <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select customer business" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name} {business.plan ? `· ${business.plan}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Plan Version
                </label>
                <Select value={assignmentPlan} onValueChange={(value) => setAssignmentPlan(value as any)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Starter">Starter · 1-page</SelectItem>
                    <SelectItem value="Business">Business · 3-page</SelectItem>
                    <SelectItem value="Growth">Growth · 5-page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Draft will include</p>
                <div className="mt-3 space-y-2">
                  {getTemplatePlanStructure(assigningTemplate.id, assignmentPlan).pages.map((page) => (
                    <div key={page} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {page}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="ghost" className="rounded-xl" onClick={() => setAssigningTemplate(null)}>
                  Cancel
                </Button>
                <Button
                  className="rounded-xl bg-indigo-600 px-6"
                  disabled={!selectedBusinessId || assigning}
                  onClick={assignTemplateToBusiness}
                >
                  {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Website Draft
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
