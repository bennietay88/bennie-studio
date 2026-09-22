import React from "react";
import {
  AlertTriangle,
  Check,
  FileText,
  Globe,
  Link as LinkIcon,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Checkbox } from "./ui/checkbox";
import {
  buildLocalSeoPageDraft,
  createBulkLocationDrafts,
  generateLocalBlogIdeas,
  generateLocalKeywords,
  getLocalSeoLimits,
  getUpgradeRecommendation,
  LocalSeoInput,
  LocalSeoPageDraft,
  parseLocalSeoCsv,
  SUPPORTED_LOCATION_MARKETS,
} from "../constants/localSeoEngine";
import { PLANS, findPlan, normalizePlans } from "../constants/plans";

const LOCAL_STORAGE_KEY = "bts_local_seo_drafts";

const isDraftReady = (draft: LocalSeoPageDraft) =>
  Boolean(draft.quality.readyForReview ?? (draft.quality.suggestions.length === 0 && draft.quality.duplicateRisk !== "high"));

const readStoredDrafts = (businessId?: string | null): LocalSeoPageDraft[] => {
  if (typeof window === "undefined" || !businessId) return [];
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_KEY}:${businessId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeStoredDrafts = (businessId: string | undefined | null, drafts: LocalSeoPageDraft[]) => {
  if (typeof window === "undefined" || !businessId) return;
  window.localStorage.setItem(`${LOCAL_STORAGE_KEY}:${businessId}`, JSON.stringify(drafts));
};

const rowToDraft = (row: any): LocalSeoPageDraft | null => {
  const savedDraft = row?.local_inputs?.draft;
  if (savedDraft) return savedDraft;
  if (!row) return null;
  return {
    id: row.id,
    type: row.page_type || "service_location",
    status: row.status || "draft",
    slug: row.slug,
    seoTitle: row.seo_title || "",
    metaDescription: row.meta_description || "",
    h1: row.h1 || "",
    focusKeyword: row.focus_keyword || "",
    supportingKeywords: row.supporting_keywords || [],
    sections: row.sections || [],
    faqs: row.faqs || [],
    internalLinks: row.internal_links || [],
    schema: row.schema_json || {},
    quality: {
      readyForReview: (row.suggestions || []).length === 0 && row.duplicate_risk !== "high",
      status: row.status || "draft",
      duplicateRisk: row.duplicate_risk || "low",
      checks: row.local_inputs?.qualityChecks || {
        uniqueLocalInputs: false,
        keywordRelevance: false,
        pageDepth: false,
        internalLinks: false,
        localProof: false,
        faqQuality: false,
        metadata: false,
        ctaClarity: false,
        duplicateProtection: row.duplicate_risk !== "high",
      },
      suggestions: row.suggestions || [],
    },
  };
};

const draftToRow = (draft: LocalSeoPageDraft, input: LocalSeoInput, businessId: string, userId?: string) => ({
  business_id: businessId,
  page_type: draft.type,
  status: draft.status,
  slug: draft.slug,
  country: input.country,
  state_region: input.state,
  city: input.city,
  main_service: input.mainService,
  industry: input.industry,
  seo_title: draft.seoTitle,
  meta_description: draft.metaDescription,
  h1: draft.h1,
  focus_keyword: draft.focusKeyword,
  supporting_keywords: draft.supportingKeywords,
  local_inputs: {
    businessName: input.businessName,
    nearbyAreas: input.nearbyAreas || [],
    localProof: input.localProof || [],
    testimonials: input.testimonials || [],
    photos: input.photos || [],
    qualityChecks: draft.quality.checks,
    draft,
  },
  sections: draft.sections,
  faqs: draft.faqs,
  internal_links: draft.internalLinks,
  schema_json: draft.schema,
  quality_score: null,
  duplicate_risk: draft.quality.duplicateRisk,
  suggestions: draft.quality.suggestions,
  created_by: userId,
});

interface LocalSeoDashboardProps {
  businessIdOverride?: string | null;
}

export default function LocalSeoDashboard({ businessIdOverride }: LocalSeoDashboardProps = {}) {
  const { profile } = useAuth();
  const effectiveBusinessId = businessIdOverride || profile?.businessId || null;
  const [business, setBusiness] = React.useState<any>(null);
  const [planSettings, setPlanSettings] = React.useState<any[]>(normalizePlans(PLANS));
  const [drafts, setDrafts] = React.useState<LocalSeoPageDraft[]>([]);
  const [bulkCities, setBulkCities] = React.useState("Kuala Lumpur\nPetaling Jaya\nShah Alam");
  const [csvImport, setCsvImport] = React.useState("city,state,country,local_proof,nearby_areas\nKuala Lumpur,Kuala Lumpur,Malaysia,KL customer review|WhatsApp enquiry proof,Petaling Jaya|Shah Alam");
  const [input, setInput] = React.useState<LocalSeoInput>({
    businessName: "Your Business",
    industry: "Local Services",
    mainService: "Website Design",
    secondaryServices: ["Landing Page Design", "Local SEO Setup"],
    country: "Malaysia",
    state: "Kuala Lumpur",
    city: "Kuala Lumpur",
    nearbyAreas: ["Petaling Jaya", "Shah Alam", "Subang Jaya"],
    targetCustomer: "small businesses",
    physicalLocation: false,
    showAddress: false,
    localProof: [],
    testimonials: [],
    photos: [],
    websiteUrl: typeof window !== "undefined" ? window.location.origin : "",
    openingHours: ["Monday-Friday 09:00-18:00"],
    sameAs: [],
    priceRange: "$$",
    ctaGoal: "Request a quote",
  });

  React.useEffect(() => {
    const loadBusiness = async () => {
      if (!effectiveBusinessId) {
        setDrafts(readStoredDrafts("demo"));
        return;
      }

      const [{ data }, { data: planData }] = await Promise.all([
        supabase
          .from("businesses")
          .select("*")
          .eq("id", effectiveBusinessId)
          .maybeSingle(),
        supabase
          .from("settings")
          .select("content")
          .eq("id", "plans")
          .maybeSingle(),
      ]);

      const configuredPlans = planData?.content?.pricing;
      if (Array.isArray(configuredPlans) && configuredPlans.length > 0) {
        setPlanSettings(normalizePlans(configuredPlans));
      }

      if (data) {
        setBusiness(data);
        const locationParts = String(data.location || "").split(",").map((part) => part.trim()).filter(Boolean);
        setInput((prev) => ({
          ...prev,
          businessName: data.name || prev.businessName,
          industry: data.industry || prev.industry,
          country: locationParts[1] || data.country || prev.country,
          city: locationParts[0] || data.city || prev.city,
          phone: data.phone || prev.phone,
          email: data.email || prev.email,
          whatsappNumber: data.whatsapp_number || prev.whatsappNumber,
          websiteUrl: data.website_url || prev.websiteUrl,
        }));
        const { data: localPages, error: localPagesError } = await supabase
          .from("local_seo_pages")
          .select("*")
          .eq("business_id", data.id)
          .order("created_at", { ascending: false });

        if (localPagesError) {
          setDrafts(readStoredDrafts(data.id));
        } else {
          const dbDrafts = (localPages || []).map(rowToDraft).filter(Boolean) as LocalSeoPageDraft[];
          setDrafts(dbDrafts);
          writeStoredDrafts(data.id, dbDrafts);
        }
      }
    };

    loadBusiness();
  }, [effectiveBusinessId]);

  const plan = business?.plan || "starter";
  const currentPlanConfig = findPlan(planSettings, plan);
  const limits = getLocalSeoLimits(plan, currentPlanConfig.maxPages, currentPlanConfig);
  const keywords = generateLocalKeywords(input);
  const previewDraft = buildLocalSeoPageDraft(input, "service_location", drafts);
  const upgrade = getUpgradeRecommendation({
    currentPlan: plan,
    configuredPlans: planSettings,
    currentPlanConfig,
    requestedLocationPages: drafts.length + 1,
    requestedPages: 1,
  });
  const blogIdeas = generateLocalBlogIdeas(input);
  const market = SUPPORTED_LOCATION_MARKETS.find((item) => item.country === input.country);
  const businessId = business?.id || effectiveBusinessId || "demo";
  const schemaChecks = [
    { label: "Business name", complete: Boolean(input.businessName) },
    { label: "Main service", complete: Boolean(input.mainService) },
    { label: "Country / city", complete: Boolean(input.country && input.city) },
    { label: "Phone, WhatsApp, or email", complete: Boolean(input.phone || input.whatsappNumber || input.email) },
    { label: "Website URL", complete: Boolean(input.websiteUrl) },
    { label: "Opening hours", complete: Boolean(input.openingHours?.length) },
    { label: "Address only if real and public", complete: !input.showAddress || Boolean(input.physicalLocation && input.address) },
    { label: "Social profile URLs", complete: Boolean(input.sameAs?.length) },
  ];

  const updateInput = (key: keyof LocalSeoInput, value: any) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const saveDrafts = (nextDrafts: LocalSeoPageDraft[]) => {
    setDrafts(nextDrafts);
    writeStoredDrafts(businessId, nextDrafts);
  };

  const persistDraft = async (draft: LocalSeoPageDraft) => {
    if (!effectiveBusinessId) return false;

    const { error } = await supabase
      .from("local_seo_pages")
      .insert([draftToRow(draft, input, effectiveBusinessId, profile.uid)]);

    return !error;
  };

  const handleCreateDraft = async () => {
    if (limits.locationPages <= drafts.length) {
      toast.error("You've reached your location page limit. Upgrade to unlock more local pages.");
      return;
    }
    saveDrafts([previewDraft, ...drafts]);
    const persisted = await persistDraft(previewDraft);
    toast.success(persisted ? "Local page draft saved for review." : "Local page draft saved locally. Apply the migration to store it in Supabase.");
  };

  const handleBulkDrafts = async () => {
    const cities = bulkCities.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
    if (!cities.length) {
      toast.error("Add at least one city.");
      return;
    }
    if (limits.locationPages && drafts.length + cities.length > limits.locationPages) {
      toast.error("Bulk draft count exceeds your location page limit. Upgrade or reduce the city list.");
      return;
    }
    const newDrafts = createBulkLocationDrafts(input, cities, drafts);
    saveDrafts([...newDrafts, ...drafts]);
    if (effectiveBusinessId) {
      const rows = newDrafts.map((draft) => draftToRow(draft, { ...input, city: draft.h1.replace(`${input.mainService} in `, "") }, effectiveBusinessId!, profile.uid));
      const { error } = await supabase.from("local_seo_pages").insert(rows);
      toast.success(error ? `${newDrafts.length} drafts saved locally. Apply the migration to store them in Supabase.` : `${newDrafts.length} local page drafts saved.`);
      return;
    }
    toast.success(`${newDrafts.length} local page drafts created.`);
  };

  const handleCsvImport = async () => {
    const rows = parseLocalSeoCsv(csvImport);
    if (!rows.length) {
      toast.error("No valid CSV rows found. Include at least a city column.");
      return;
    }
    if (limits.locationPages && drafts.length + rows.length > limits.locationPages) {
      toast.error("CSV import exceeds your location page limit. Upgrade or import fewer rows.");
      return;
    }

    const importedDrafts = rows.map((row) =>
      buildLocalSeoPageDraft(
        {
          ...input,
          ...row,
          city: row.city,
          mainService: row.mainService || input.mainService,
          country: row.country || input.country,
          state: row.state || input.state,
        },
        "service_location",
        drafts,
      ),
    );
    saveDrafts([...importedDrafts, ...drafts]);

    if (effectiveBusinessId) {
      const rowsToInsert = importedDrafts.map((draft) =>
        draftToRow(draft, { ...input, city: draft.h1.replace(`${input.mainService} in `, "") }, effectiveBusinessId!, profile.uid),
      );
      const { error } = await supabase.from("local_seo_pages").insert(rowsToInsert);
      toast.success(error ? `${importedDrafts.length} CSV drafts saved locally. Apply the migration to store them in Supabase.` : `${importedDrafts.length} CSV drafts saved for review.`);
      return;
    }
    toast.success(`${importedDrafts.length} CSV drafts created.`);
  };

  const updateDraftStatus = async (draft: LocalSeoPageDraft, status: LocalSeoPageDraft["status"]) => {
    if (status === "published" && !isDraftReady(draft)) {
      toast.error("Publishing blocked. Complete the content checklist and resolve high duplicate risk first.");
      return;
    }
    const nextDrafts = drafts.map((item) => item.id === draft.id ? { ...item, status } : item);
    saveDrafts(nextDrafts);
    if (effectiveBusinessId) {
      await supabase
        .from("local_seo_pages")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", draft.id);
    }
    toast.success(status === "published" ? "Local page marked as published." : `Local page moved to ${status.replace(/_/g, " ")}.`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-4 bg-indigo-50 text-indigo-700 border-indigo-100">Local SEO Engine</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">Local Search Growth</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
            Build location pages, local FAQs, keywords, schema-ready business details, and draft pages that stay behind quality checks before publishing.
          </p>
        </div>
        <Button className="rounded-xl bg-indigo-600 font-black" onClick={handleCreateDraft}>
          <Plus className="mr-2 h-4 w-4" /> Create Local Page Draft
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Current Plan", value: limits.planName, icon: Sparkles },
          { label: "Location Pages", value: `${drafts.length}/${limits.locationPages}`, icon: MapPin },
          { label: "Publishing Checklist", value: isDraftReady(previewDraft) ? "Ready for review" : "Needs attention", icon: Search },
          { label: "Duplicate Risk", value: previewDraft.quality.duplicateRisk, icon: AlertTriangle },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-3xl border-slate-100">
            <CardContent className="p-6">
              <stat.icon className="mb-5 h-6 w-6 text-indigo-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
              <p className="mt-2 text-2xl font-black capitalize text-slate-950">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {upgrade.recommendedPlan !== limits.planName && (
        <Card className="rounded-3xl border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-amber-900">Upgrade recommendation: {upgrade.recommendedPlan}</p>
              <p className="mt-1 text-sm font-semibold text-amber-800">{upgrade.reason}</p>
            </div>
            <Button className="rounded-xl bg-slate-950 font-black" onClick={() => (window.location.href = "/dashboard/billing")}>
              View Plans
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="builder" className="rounded-xl font-bold">Page Builder</TabsTrigger>
          <TabsTrigger value="keywords" className="rounded-xl font-bold">Keywords</TabsTrigger>
          <TabsTrigger value="bulk" className="rounded-xl font-bold">Bulk Drafts</TabsTrigger>
          <TabsTrigger value="schema" className="rounded-xl font-bold">Schema</TabsTrigger>
          <TabsTrigger value="ideas" className="rounded-xl font-bold">Blog Ideas</TabsTrigger>
          <TabsTrigger value="queue" className="rounded-xl font-bold">Review Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Local Page Inputs</CardTitle>
                <CardDescription>Use only real service areas, proof, reviews, and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Business name" value={input.businessName} onChange={(value) => updateInput("businessName", value)} />
                  <Field label="Industry" value={input.industry} onChange={(value) => updateInput("industry", value)} />
                  <Field label="Main service" value={input.mainService} onChange={(value) => updateInput("mainService", value)} />
                  <Field label="Target customer" value={input.targetCustomer || ""} onChange={(value) => updateInput("targetCustomer", value)} />
                  <Field label="Country" value={input.country} onChange={(value) => updateInput("country", value)} />
                  <Field label="State / region" value={input.state || ""} onChange={(value) => updateInput("state", value)} />
                  <Field label="City" value={input.city} onChange={(value) => updateInput("city", value)} />
                  <Field label="CTA goal" value={input.ctaGoal || ""} onChange={(value) => updateInput("ctaGoal", value)} />
                </div>
                <TextAreaField
                  label="Nearby areas served"
                  value={(input.nearbyAreas || []).join(", ")}
                  placeholder="Petaling Jaya, Shah Alam, Subang Jaya"
                  onChange={(value) => updateInput("nearbyAreas", value.split(",").map((item) => item.trim()).filter(Boolean))}
                />
                <TextAreaField
                  label="Real local proof"
                  value={(input.localProof || []).join("\n")}
                  placeholder="Real project areas, screenshots, reviews, photos, local case studies"
                  onChange={(value) => updateInput("localProof", value.split("\n").map((item) => item.trim()).filter(Boolean))}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Phone" value={input.phone || ""} onChange={(value) => updateInput("phone", value)} />
                  <Field label="WhatsApp number" value={input.whatsappNumber || ""} onChange={(value) => updateInput("whatsappNumber", value)} />
                  <Field label="Email" value={input.email || ""} onChange={(value) => updateInput("email", value)} />
                  <Field label="Website URL" value={input.websiteUrl || ""} onChange={(value) => updateInput("websiteUrl", value)} />
                  <Field label="Price range" value={input.priceRange || ""} onChange={(value) => updateInput("priceRange", value)} />
                  <Field label="Business type for schema" value={input.businessType || "LocalBusiness"} onChange={(value) => updateInput("businessType", value)} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Latitude" value={input.latitude || ""} onChange={(value) => updateInput("latitude", value)} />
                  <Field label="Longitude" value={input.longitude || ""} onChange={(value) => updateInput("longitude", value)} />
                </div>
                <TextAreaField
                  label="Opening hours"
                  value={(input.openingHours || []).join("\n")}
                  placeholder="Monday-Friday 09:00-18:00"
                  onChange={(value) => updateInput("openingHours", value.split("\n").map((item) => item.trim()).filter(Boolean))}
                />
                <TextAreaField
                  label="Social profile URLs"
                  value={(input.sameAs || []).join("\n")}
                  placeholder="https://facebook.com/yourbusiness"
                  onChange={(value) => updateInput("sameAs", value.split("\n").map((item) => item.trim()).filter(Boolean))}
                />
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <Checkbox
                      checked={Boolean(input.physicalLocation)}
                      onCheckedChange={(checked) => updateInput("physicalLocation", Boolean(checked))}
                    />
                    This business has a physical location
                  </label>
                  <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <Checkbox
                      checked={Boolean(input.showAddress)}
                      onCheckedChange={(checked) => updateInput("showAddress", Boolean(checked))}
                    />
                    Show the public address in schema
                  </label>
                  {input.physicalLocation && input.showAddress && (
                    <TextAreaField
                      label="Public address"
                      value={input.address || ""}
                      placeholder="Only add a real public business address"
                      onChange={(value) => updateInput("address", value)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <LocalDraftPreview draft={previewDraft} />
          </div>
        </TabsContent>

        <TabsContent value="keywords">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(keywords).map(([group, values]) => (
              <Card key={group} className="rounded-3xl">
                <CardHeader>
                  <CardTitle className="capitalize">{group}</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(values) ? (
                    <div className="space-y-2">
                      {values.map((keyword) => (
                        <Badge key={keyword} variant="outline" className="mr-2 rounded-full px-3 py-1">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-2xl font-black text-indigo-600">{values}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bulk">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Bulk Location Page Draft Generator</CardTitle>
              <CardDescription>Growth and Custom users can prepare drafts in bulk. Drafts are never published automatically.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cities</Label>
                <Textarea
                  value={bulkCities}
                  onChange={(event) => setBulkCities(event.target.value)}
                  className="min-h-[220px] rounded-2xl font-semibold"
                />
                <Button onClick={handleBulkDrafts} className="w-full rounded-xl bg-indigo-600 font-black">
                  <Upload className="mr-2 h-4 w-4" /> Generate Drafts
                </Button>
                <div className="space-y-3 pt-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CSV Import</Label>
                  <Textarea
                    value={csvImport}
                    onChange={(event) => setCsvImport(event.target.value)}
                    className="min-h-[160px] rounded-2xl font-mono text-xs"
                  />
                  <Button variant="outline" onClick={handleCsvImport} className="w-full rounded-xl font-black">
                    Import CSV as Drafts
                  </Button>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-950 p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Rules</p>
                <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-300">
                  <li>Draft only. Never publish automatically.</li>
                  <li>Each page must pass the local content publishing checklist.</li>
                  <li>Important cities should include real local proof.</li>
                  <li>Repeated hero copy, FAQs, or meta descriptions should be rewritten before launch.</li>
                  <li>Current plan allows {limits.locationPages} dedicated location pages.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema">
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Schema Checklist</CardTitle>
                <CardDescription>Complete real business details. Leave fields blank when they are not available.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {schemaChecks.map((check) => (
                  <div key={check.label} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                    <span className="text-sm font-bold text-slate-700">{check.label}</span>
                    <Badge className={check.complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                      {check.complete ? "Ready" : "Missing"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Schema-Ready Business Details</CardTitle>
                <CardDescription>Use service-area logic when no public address is provided. Do not create fake addresses.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[520px] overflow-auto rounded-2xl bg-slate-950 p-6 text-xs font-semibold text-slate-100">
                  {JSON.stringify(previewDraft.schema, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ideas">
          <div className="grid gap-4 lg:grid-cols-3">
            {blogIdeas.map((idea) => (
              <Card key={idea.title} className="rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl">{idea.title}</CardTitle>
                  <CardDescription>{idea.searchIntent}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge className="bg-indigo-50 text-indigo-700">{idea.targetKeyword}</Badge>
                  <ul className="space-y-2 text-sm font-semibold text-slate-600">
                    {idea.outline.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">{idea.cta}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <div className="space-y-4">
            {drafts.length === 0 ? (
              <Card className="rounded-3xl">
                <CardContent className="flex flex-col items-center justify-center p-16 text-center">
                  <FileText className="mb-4 h-10 w-10 text-slate-300" />
                  <p className="text-lg font-black text-slate-950">No local page drafts yet</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Create a draft from the page builder or bulk generator.</p>
                </CardContent>
              </Card>
            ) : (
              drafts.map((draft) => (
                <LocalDraftPreview
                  key={draft.id}
                  draft={draft}
                  compact
                  onMoveToReview={() => updateDraftStatus(draft, "ready_for_review")}
                  onPublish={() => updateDraftStatus(draft, "published")}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {market && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{market.country} Market Guidance</CardTitle>
            <CardDescription>Country-specific wording and buyer expectations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Currency</p>
              <p className="mt-2 text-2xl font-black">{market.pricingCurrency}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">CTA Language</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {market.ctaLanguage.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buyer Expectations</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {market.buyerExpectations.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl font-bold" />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</Label>
      <Textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="min-h-[96px] rounded-2xl font-semibold" />
    </div>
  );
}

function LocalDraftPreview({
  draft,
  compact,
  onMoveToReview,
  onPublish,
}: {
  draft: LocalSeoPageDraft;
  compact?: boolean;
  onMoveToReview?: () => void;
  onPublish?: () => void;
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{draft.h1}</CardTitle>
            <CardDescription>{draft.slug}</CardDescription>
          </div>
          <Badge className={cn("w-fit", isDraftReady(draft) ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
            {isDraftReady(draft) ? "Checklist complete" : "Needs attention"} · {draft.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">SEO</p>
          <p className="mt-2 text-sm font-black text-slate-950">{draft.seoTitle}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{draft.metaDescription}</p>
        </div>
        {!compact && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {draft.sections.slice(0, 6).map((section) => (
                <div key={section.type} className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{section.type.replace(/_/g, " ")}</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{section.heading}</p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{section.content}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <LinkIcon className="h-3 w-3" /> Internal Links
              </p>
              <div className="flex flex-wrap gap-2">
                {draft.internalLinks.map((link) => (
                  <Badge key={link.href} variant="outline">{link.label}</Badge>
                ))}
              </div>
            </div>
          </>
        )}
        {draft.quality.suggestions.length > 0 && (
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-700">Improve before publishing</p>
            <ul className="space-y-1 text-sm font-semibold text-amber-800">
              {draft.quality.suggestions.map((suggestion) => <li key={suggestion}>- {suggestion}</li>)}
            </ul>
          </div>
        )}
        {(onMoveToReview || onPublish) && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              className="rounded-xl font-black"
              onClick={onMoveToReview}
              disabled={!isDraftReady(draft)}
            >
              Move to Review
            </Button>
            <Button
              className="rounded-xl bg-slate-950 font-black"
              onClick={onPublish}
              disabled={!isDraftReady(draft)}
            >
              Mark Published
            </Button>
            {!isDraftReady(draft) && (
              <p className="text-xs font-semibold text-amber-700">
                Publishing requires the content checklist to be complete and no high duplicate risk.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
