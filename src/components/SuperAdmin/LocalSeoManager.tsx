import React from "react";
import { AlertTriangle, CheckCircle2, Globe, MapPin, Plus, Save, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { supabase } from "../../lib/supabase";
import {
  SUPPORTED_LOCATION_MARKETS,
  buildLocalSeoPageDraft,
  getUpgradeRecommendation,
} from "../../constants/localSeoEngine";
import { PLANS as STATIC_PLANS, Plan, normalizePlans } from "../../constants/plans";

const isPageChecklistComplete = (page: any) =>
  page?.duplicate_risk !== "high" && (
    Array.isArray(page?.suggestions)
      ? page.suggestions.length === 0
      : ["ready_for_review", "published"].includes(page?.status)
  );

const mapPlanRows = (rows: any[]): Plan[] =>
  normalizePlans(
    [...rows]
      .sort((a: any, b: any) => {
        const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
        const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return Number(a.price_usd || 0) - Number(b.price_usd || 0);
      })
      .map((plan: any) => ({
        id: plan.slug || plan.name?.toLowerCase()?.replace(/[^a-z0-9]+/g, "_"),
        name: plan.name,
        price: `$${Number(plan.price_usd || 0).toFixed(0)}`,
        priceId: plan.stripe_price_id || "",
        productId: plan.stripe_product_id || "",
        description: plan.description || `${plan.name} website subscription plan`,
        features: Array.isArray(plan.features) ? plan.features : [],
        enabled_features: Array.isArray(plan.enabled_features) ? plan.enabled_features : [],
        isPopular: !!plan.is_popular,
        aiCredits: plan.monthly_credit_limit ?? 0,
        maxPages: plan.project_limit ?? 1,
        maxLocationPages: plan.location_page_limit ?? 0,
        monthlyUpdates: plan.monthly_update_allowance || plan.monthly_updates || "Monthly update support",
        upgradePrompt: plan.upgrade_prompt || "Upgrade to unlock more pages and growth tools.",
        isActive: plan.is_active !== false,
      })),
  );

export function LocalSeoManager() {
  const navigate = useNavigate();
  const [plans, setPlans] = React.useState<Plan[]>(normalizePlans(STATIC_PLANS));
  const [newCountry, setNewCountry] = React.useState("");
  const [localPages, setLocalPages] = React.useState<any[]>([]);
  const [upgradeMessages, setUpgradeMessages] = React.useState({
    starterToBusiness: "Add dedicated service/contact pages and up to 5 local pages.",
    businessToGrowth: "Add up to 10 website pages, up to 25 local pages, content scoring, and stronger SEO structure.",
    custom: "Use custom quote for ecommerce, booking systems, bespoke design, bulk import, or multi-country SEO architecture.",
  });

  const demoDraft = buildLocalSeoPageDraft({
    businessName: "Bennie Studio",
    industry: "Website Design",
    mainService: "Pay Monthly Websites",
    country: "Malaysia",
    state: "Kuala Lumpur",
    city: "Kuala Lumpur",
    nearbyAreas: ["Petaling Jaya", "Shah Alam", "Subang Jaya"],
    targetCustomer: "small businesses",
    ctaGoal: "Build my local website",
    localProof: ["Malaysia-focused WhatsApp enquiry flow", "Klang Valley service-area examples", "Managed monthly support"],
  });

  const recommendation = getUpgradeRecommendation({
    currentPlan: "business",
    requestedPages: 8,
    requestedLocationPages: 12,
  });

  const businessPlan = plans.find((plan) => plan.id === "business") || plans[1] || plans[0];
  const growthPlan = plans.find((plan) => plan.id === "growth") || plans[2] || plans[plans.length - 1];

  React.useEffect(() => {
    const loadAdminData = async () => {
      const [{ data: pageData }, { data: planRows, error: planRowsError }, { data: planData }] = await Promise.all([
        supabase
        .from("local_seo_pages")
        .select("id,business_id,status,slug,city,main_service,duplicate_risk,suggestions,created_at,businesses(name)")
        .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("plans")
          .select("id,slug,name,price_usd,description,monthly_credit_limit,project_limit,location_page_limit,monthly_update_allowance,monthly_updates,upgrade_prompt,enabled_features,features,is_active,is_popular,stripe_price_id,stripe_product_id,sort_order")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("price_usd", { ascending: true }),
        supabase
          .from("settings")
          .select("content")
          .eq("id", "plans")
          .maybeSingle(),
      ]);
      if (Array.isArray(pageData)) setLocalPages(pageData);
      if (!planRowsError && Array.isArray(planRows) && planRows.length) {
        setPlans(mapPlanRows(planRows));
      } else if (Array.isArray(planData?.content?.pricing)) {
        setPlans(normalizePlans(planData.content.pricing));
      }
    };
    loadAdminData();

    const channel = supabase
      .channel(`local-seo-plan-summary-${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plans",
        },
        (payload) => {
          void loadAdminData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveConfig = async () => {
    const { error } = await supabase
      .from("settings")
      .upsert({
        id: "local_seo_engine",
        content: {
          upgradeMessages,
          supportedMarkets: SUPPORTED_LOCATION_MARKETS,
          planLimitsSource: "public.plans",
          updatedAt: new Date().toISOString(),
        },
      });

    if (error) {
      toast.warning("Saved locally. Supabase settings save failed, likely because the settings policy/table is not available for this account.");
      return;
    }

    toast.success("Local SEO configuration saved.");
  };

  const updateLocalPageStatus = async (page: any, status: string) => {
    if (status === "published" && !isPageChecklistComplete(page)) {
      toast.error("Publishing blocked. Complete the content checklist and resolve high duplicate risk first.");
      return;
    }

    const { error } = await supabase
      .from("local_seo_pages")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", page.id);

    if (error) {
      toast.error("Failed to update local page status: " + error.message);
      return;
    }

    setLocalPages((prev) => prev.map((item) => item.id === page.id ? { ...item, status } : item));
    toast.success(`Local page moved to ${status.replace(/_/g, " ")}.`);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-10">
      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-indigo-50 text-indigo-700">Operations</Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Publishing controls live</Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Local SEO operations</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
            Review location-page quality, manage supported markets, and keep customer SEO delivery within the plan limits.
          </p>
        </div>
        <Button onClick={saveConfig} className="h-11 shrink-0 rounded-xl bg-white px-5 font-black text-slate-950 hover:bg-slate-100">
          <Save className="mr-2 h-4 w-4" /> Save configuration
        </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Countries", value: SUPPORTED_LOCATION_MARKETS.length, icon: Globe },
          { label: "Business Limit", value: businessPlan?.maxLocationPages || 0, icon: MapPin },
          { label: "Growth Limit", value: growthPlan?.maxLocationPages || 0, icon: Search },
          { label: "Quality Gate", value: "70+", icon: CheckCircle2 },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-3xl border-slate-100">
            <CardContent className="p-6">
              <stat.icon className="mb-5 h-6 w-6 text-indigo-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
      <Tabs defaultValue="limits" className="w-full space-y-5">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="limits" className="min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold sm:text-sm">Limits</TabsTrigger>
          <TabsTrigger value="markets" className="min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold sm:text-sm">Markets</TabsTrigger>
          <TabsTrigger value="quality" className="min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold sm:text-sm">Quality rules</TabsTrigger>
          <TabsTrigger value="review" className="min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold sm:text-sm">Review queue</TabsTrigger>
          <TabsTrigger value="upgrades" className="min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold sm:text-sm">Upgrade logic</TabsTrigger>
        </TabsList>

        <TabsContent value="limits">
          <div className="space-y-5">
            <Card className="rounded-3xl border-indigo-100 bg-indigo-50/60">
              <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Badge className="mb-2 bg-white text-indigo-700">Single source of truth</Badge>
                  <h3 className="text-xl font-black text-slate-950">Limits are inherited from Plans &amp; Pricing</h3>
                  <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-600">
                    Standard pages, location pages, and monthly update allowance are managed centrally. This screen only reads them and applies publishing checks.
                  </p>
                </div>
                <Button onClick={() => navigate("/admin/plans")} className="rounded-xl bg-indigo-600 font-black">
                  Edit Plan Limits
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
            {[
              { ...businessPlan, displayName: "Managed Website" },
              { ...growthPlan, displayName: "Website Growth" },
            ].filter((plan, index, list) => plan?.id && list.findIndex((item) => item.id === plan.id) === index).map((plan: any) => (
              <Card key={plan.id} className="rounded-3xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{plan.displayName}</CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Inherited</Badge>
                  </div>
                  <CardDescription>Read from the central plan configuration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standard website pages</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{plan.maxPages}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dedicated location pages</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{plan.maxLocationPages}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly update allowance</p>
                    <p className="mt-1 text-sm font-black text-slate-700">{plan.monthlyUpdates}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="markets">
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Add Custom Country</CardTitle>
                <CardDescription>Custom country support is stored in config for admin planning.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input value={newCountry} onChange={(event) => setNewCountry(event.target.value)} placeholder="Country name" />
                <Button
                  className="w-full rounded-xl bg-slate-950 font-black"
                  onClick={() => {
                    if (!newCountry.trim()) return;
                    toast.success(`${newCountry} added to your planning list. Add full regions in the next schema phase.`);
                    setNewCountry("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Country
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {SUPPORTED_LOCATION_MARKETS.map((market) => (
                <Card key={market.country} className="rounded-3xl">
                  <CardHeader>
                    <CardTitle>{market.country}</CardTitle>
                    <CardDescription>{market.pricingCurrency} pricing display support</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {market.buyerExpectations.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                    </div>
                    <div className="text-sm font-semibold text-slate-600">
                      {market.regions.map((region) => `${region.name}: ${region.cities.slice(0, 4).join(", ")}`).join(" | ")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quality">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Publishing Checklist Preview</CardTitle>
                <CardDescription>Pages remain drafts until required evidence, local relevance, contact details, and duplicate-content checks are complete.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-slate-950 p-6 text-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Demo Local Page</p>
                  <p className="mt-2 text-3xl font-black">{demoDraft.quality.readyForReview ? "Ready for review" : "Needs attention"}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-300">{demoDraft.h1}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(demoDraft.quality.checks).map(([key, complete]) => (
                    <div key={key} className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p>
                      <p className="mt-1 text-sm font-black">{complete ? "Complete" : "Needs attention"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-950">
                  <AlertTriangle className="h-5 w-5" /> Thin Content Protection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm font-semibold text-amber-900">
                  <li>Require at least 3 unique local inputs.</li>
                  <li>Flag repeated hero copy, FAQs, and meta descriptions.</li>
                  <li>Keep pages with incomplete checklist items as drafts.</li>
                  <li>Require real local proof for high-value locations.</li>
                  <li>Never create fake testimonials, addresses, reviews, or local claims.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="review">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Local Page Review Queue</CardTitle>
              <CardDescription>Recent customer location page drafts and quality status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {localPages.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-10 text-center">
                  <p className="font-black text-slate-950">No local page drafts found</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Apply the migration and create customer drafts to populate this queue.</p>
                </div>
              ) : (
                localPages.map((page) => (
                  <div key={page.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-slate-950">{page.h1 || page.slug}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {page.businesses?.name || page.business_id} / {page.main_service} / {page.city}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={isPageChecklistComplete(page) ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {isPageChecklistComplete(page) ? "Checklist complete" : "Needs attention"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{page.status?.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="capitalize">Risk: {page.duplicate_risk}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg text-[10px] font-black uppercase"
                        onClick={() => updateLocalPageStatus(page, "needs_improvement")}
                      >
                        Needs Work
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg text-[10px] font-black uppercase"
                        onClick={() => updateLocalPageStatus(page, "ready_for_review")}
                        disabled={!isPageChecklistComplete(page)}
                      >
                        Review
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 rounded-lg bg-slate-950 text-[10px] font-black uppercase"
                        onClick={() => updateLocalPageStatus(page, "published")}
                        disabled={!isPageChecklistComplete(page)}
                      >
                        Publish
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upgrades">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Upgrade Message Presets</CardTitle>
                <CardDescription>Shown when users exceed page or local SEO limits.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MessageField label="Starter to Business" value={upgradeMessages.starterToBusiness} onChange={(value) => setUpgradeMessages((prev) => ({ ...prev, starterToBusiness: value }))} />
                <MessageField label="Business to Growth" value={upgradeMessages.businessToGrowth} onChange={(value) => setUpgradeMessages((prev) => ({ ...prev, businessToGrowth: value }))} />
                <MessageField label="Website Growth" value={upgradeMessages.custom} onChange={(value) => setUpgradeMessages((prev) => ({ ...prev, custom: value }))} />
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-indigo-600" /> Recommendation Test</CardTitle>
                <CardDescription>Example: Business user asks for 8 pages and 12 location pages.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-3xl bg-indigo-50 p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Recommended</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{recommendation.recommendedPlan}</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{recommendation.reason}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Configuration at a glance</CardTitle>
            <CardDescription>Operational limits currently used by local-page checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-600">Supported markets</span><span className="font-black text-slate-950">{SUPPORTED_LOCATION_MARKETS.length}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span className="text-sm font-semibold text-slate-600">Managed Website locations</span><span className="font-black text-slate-950">{businessPlan?.maxLocationPages || 0}</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-indigo-50 px-4 py-3"><span className="text-sm font-semibold text-indigo-800">Website Growth locations</span><span className="font-black text-indigo-950">{growthPlan?.maxLocationPages || 0}</span></div>
            <Button variant="outline" onClick={() => navigate("/admin/plans")} className="mt-2 w-full rounded-xl font-black">Edit plan limits</Button>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-indigo-100 bg-indigo-50/60">
          <CardContent className="p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">Delivery guardrail</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-800">Only pages that pass the content and duplicate-risk checklist can move to review or publish.</p>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

function MessageField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-[90px] rounded-2xl font-semibold" />
    </div>
  );
}
