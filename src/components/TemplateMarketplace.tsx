import React, { useMemo, useState } from "react";
import { ArrowRight, Eye, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CONVERSION_GOALS,
  NICHE_TEMPLATES,
  getTemplateCommercialMetadata,
  getTemplateReadiness,
} from "../constants/nicheTemplates";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
  TEMPLATE_PLAN_ACCESS,
  normalizeTemplatePlanLabel,
} from "../constants/templateTaxonomy";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";

const allOption = "all";

export function TemplateMarketplace() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allOption);
  const [industry, setIndustry] = useState(allOption);
  const [plan, setPlan] = useState(allOption);
  const [goal, setGoal] = useState(allOption);

  const templates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return Object.values(NICHE_TEMPLATES).filter((template) => {
      const templateRecord = template as any;
      const meta = getTemplateCommercialMetadata(template);
      if (!getTemplateReadiness(template).ready) return false;
      const searchable = [
        meta.customerName,
        meta.adminName,
        meta.industry,
        meta.businessCategory,
        meta.conversionGoal,
        meta.recommendedPlan,
        template.category,
        templateRecord.page_type,
        templateRecord.pageType,
        templateRecord.plan_access?.join(" "),
        templateRecord.filter_tags?.join(" "),
        templateRecord.recommended_use_case,
        templateRecord.included_sections?.join(" "),
        meta.ctaStrategy?.join(" "),
        meta.leadCaptureType,
        template.name,
        template.description,
        template.bestFor,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const templateCategory = template.category || templateRecord.config?.commercial?.category;
      const templateIndustry = meta.industry || templateRecord.industry;
      const planAccess = (templateRecord.plan_access || templateRecord.config?.commercial?.planAccess || [meta.recommendedPlan || "Managed Website"]).map(normalizeTemplatePlanLabel);
      const matchesCategory = category === allOption || templateCategory === category;
      const matchesIndustry = industry === allOption || templateIndustry === industry;
      const matchesPlan = plan === allOption || normalizeTemplatePlanLabel(meta.recommendedPlan) === plan || planAccess.includes(plan);
      const matchesGoal = goal === allOption || meta.conversionGoal === goal;
      return (
        matchesQuery &&
        matchesCategory &&
        matchesIndustry &&
        matchesPlan &&
        matchesGoal
      );
    });
  }, [category, goal, industry, plan, query]);

  const openPreview = (templateId: string) => {
    window.open(`/preview/template/${templateId}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
            Template Library
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
            Choose one approved website blueprint by goal, category, and industry. Each design includes editable sections,
            CTA logic, preview support, and SEO-ready structure.
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/website/regenerate")} className="gap-2 rounded-xl bg-indigo-600 text-white">
          <Sparkles className="h-4 w-4" />
          Generate Website
        </Button>
      </div>

      <Card className="rounded-3xl border-slate-100 bg-white/90">
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative md:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search website templates"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search niche, CTA, service, or template..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold outline-none focus:border-indigo-500"
            />
          </label>
          <select aria-label="Filter templates by category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold">
            <option value={allOption}>Category</option>
            {TEMPLATE_CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select aria-label="Filter templates by industry" value={industry} onChange={(event) => setIndustry(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold">
            <option value={allOption}>Industry</option>
            {TEMPLATE_INDUSTRIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select aria-label="Filter templates by service" value={plan} onChange={(event) => setPlan(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold">
            <option value={allOption}>Plan</option>
            {TEMPLATE_PLAN_ACCESS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select aria-label="Filter templates by conversion goal" value={goal} onChange={(event) => setGoal(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold">
            <option value={allOption}>Goal</option>
            {CONVERSION_GOALS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {templates.map((template) => {
          const templateRecord = template as any;
          const meta = getTemplateCommercialMetadata(template);
          return (
            <Card key={template.id} className="overflow-hidden rounded-3xl border-slate-100 shadow-sm">
              <div className="grid min-h-full md:grid-cols-[280px_1fr]">
              <div className="relative min-h-56 overflow-hidden bg-slate-100 md:min-h-full">
                <TemplatePreviewThumbnail
                  templateId={template.id}
                  templateName={meta.customerName || template.name}
                  className="h-full min-h-56 md:aspect-auto md:min-h-full"
                />
                <div className="absolute left-4 top-4 flex gap-2">
                  {(templateRecord.premium_status === "premium" || template.isPremium || meta.isPremium) && <Badge className="border-none bg-amber-400 text-amber-950">Premium</Badge>}
                  {meta.localSeoReadiness && <Badge className="border-none bg-emerald-500 text-white">SEO Ready</Badge>}
                </div>
              </div>
              <CardContent className="flex min-w-0 flex-col p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className="border-none bg-indigo-50 text-indigo-700">{meta.industry || template.category}</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-600">{meta.conversionGoal}</Badge>
                </div>
                <h3 className="text-xl font-black leading-tight text-slate-900">{meta.customerName || template.name}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{template.description}</p>
                <div className="mt-auto flex gap-2 pt-6">
                  <Button variant="outline" className="flex-1 gap-2 rounded-xl" onClick={() => openPreview(template.id)}>
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button className="flex-1 gap-2 rounded-xl bg-slate-950 text-white" onClick={() => navigate("/dashboard/website/regenerate")}>
                    Use
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              </div>
            </Card>
          );
        })}
      </div>

      {templates.length === 0 && (
        <Card className="rounded-3xl border-dashed p-10 text-center">
          <p className="text-sm font-bold text-slate-500">No templates match these filters.</p>
        </Card>
      )}
    </div>
  );
}
