import React from "react";
import { Activity, AlertTriangle, Building2, Gauge, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, WalletCards } from "lucide-react";
import { toast } from "sonner";
import {
  activateSeoCustomer,
  getSeoAdmin,
  updateSeoCustomerAccess,
  updateSeoModule,
  updateSeoPlanEntitlement,
  updateSeoProductConfig,
} from "../api";
import type { SeoAdminData, SeoModuleDefinition } from "../types";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";

const PLAN_KEYS = [
  { key: "starter", label: "Launch $49" },
  { key: "business", label: "Business $99" },
  { key: "growth", label: "Scale $199" },
  { key: "website_growth_partner", label: "Growth Partner $799" },
] as const;

const accessTone = (status?: string) => {
  if (["active", "completed", "included"].includes(status || "")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["failed", "disabled", "expired"].includes(status || "")) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["running", "processing", "queued", "trial"].includes(status || "")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

export default function SeoAdmin() {
  const [data, setData] = React.useState<SeoAdminData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [addonPrice, setAddonPrice] = React.useState("299");
  const [auditLimit, setAuditLimit] = React.useState("4");
  const [pageLimit, setPageLimit] = React.useState("100");
  const [aiCostLimit, setAiCostLimit] = React.useState("25");
  const [customerModes, setCustomerModes] = React.useState<Record<string, "included" | "addon" | "trial" | "custom">>({});

  const refresh = React.useCallback(async () => {
    try {
      const result = await getSeoAdmin();
      setData(result);
      setAddonPrice(String(result.productConfig?.addon_prices?.US?.amount ?? 299));
      setAuditLimit(String(result.productConfig?.default_limits?.auditsPerMonth ?? 4));
      setPageLimit(String(result.productConfig?.default_limits?.pagesPerAudit ?? 100));
      setAiCostLimit(String(result.productConfig?.default_limits?.aiCostUsd ?? 25));
    } catch (error: any) {
      toast.error(error.message || "Could not load SEO Management.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const runAction = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(message);
      await refresh();
    } catch (error: any) {
      toast.error(error.message || "The SEO setting could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="flex min-h-[500px] items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-indigo-600" /><span className="ml-3 text-sm font-bold text-slate-600">Loading SEO Management…</span></div>;
  if (!data) return <Card className="rounded-3xl border-rose-200 bg-rose-50"><CardContent className="p-8 font-bold text-rose-900">SEO Management is unavailable. Confirm the SEO foundation migration has been applied.</CardContent></Card>;

  const activeCustomers = data.customers.filter((customer) => customer.seoEntitlement?.status === "active").length;
  const runningJobs = data.jobs.filter((job) => ["queued", "processing", "running"].includes(job.status)).length;
  const failedJobs = data.jobs.filter((job) => job.status === "failed").length;
  const pagesCrawled = data.usage.filter((item) => item.metric_key === "pages_crawled").reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="space-y-7">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200"><Search className="h-5 w-5" /></div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Superadmin</p></div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">SEO Management</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">Control modules, plan access, customer activation, limits, jobs, and cost safeguards without changing the main application architecture.</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className={`rounded-full px-4 py-2 ${data.productConfig.emergency_stop ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {data.productConfig.emergency_stop ? "Emergency stop active" : "Processing available"}
            </Badge>
            <Button variant="outline" onClick={() => void refresh()} className="min-h-11 rounded-full px-5 font-bold"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "SEO customers", value: activeCustomers, icon: Building2, note: "Active managed entitlement" },
          { label: "Jobs in progress", value: runningJobs, icon: Activity, note: "Queued or processing" },
          { label: "Failed jobs", value: failedJobs, icon: AlertTriangle, note: "Needs operational review" },
          { label: "Pages crawled", value: pagesCrawled, icon: Gauge, note: "Recorded usage" },
        ].map(({ label, value, icon: Icon, note }) => (
          <Card key={label} className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-6"><Icon className="h-5 w-5 text-indigo-600" /><p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs font-semibold text-slate-500">{note}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start rounded-2xl bg-white p-2 shadow-sm">
          <TabsTrigger value="dashboard" className="rounded-xl px-5 py-3 font-bold">Dashboard</TabsTrigger>
          <TabsTrigger value="modules" className="rounded-xl px-5 py-3 font-bold">Modules</TabsTrigger>
          <TabsTrigger value="plans" className="rounded-xl px-5 py-3 font-bold">Plan access</TabsTrigger>
          <TabsTrigger value="customers" className="rounded-xl px-5 py-3 font-bold">Customers</TabsTrigger>
          <TabsTrigger value="jobs" className="rounded-xl px-5 py-3 font-bold">Jobs & usage</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-[2rem] border-slate-200 shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-3 text-xl font-black"><Settings2 className="h-5 w-5 text-indigo-600" />Product controls</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-5 rounded-2xl border border-slate-100 p-5">
                  <div><p className="font-bold text-slate-900">SEO Growth globally enabled</p><p className="mt-1 text-xs font-medium text-slate-500">Turns customer access and processing on or off.</p></div>
                  <Switch checked={data.productConfig.is_enabled !== false} disabled={busy === "product-enabled"} onCheckedChange={(checked) => void runAction("product-enabled", () => updateSeoProductConfig({ is_enabled: checked }), checked ? "SEO Growth enabled." : "SEO Growth disabled.")} />
                </div>
                <div className="flex items-center justify-between gap-5 rounded-2xl border border-rose-100 bg-rose-50/50 p-5">
                  <div><p className="font-bold text-slate-900">Emergency processing stop</p><p className="mt-1 text-xs font-medium text-slate-500">Stops new audits and automation while preserving all data.</p></div>
                  <Switch checked={data.productConfig.emergency_stop === true} disabled={busy === "emergency-stop"} onCheckedChange={(checked) => void runAction("emergency-stop", () => updateSeoProductConfig({ emergency_stop: checked }), checked ? "Emergency stop activated." : "SEO processing resumed.")} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-3 text-xl font-black"><WalletCards className="h-5 w-5 text-indigo-600" />Commercial configuration</CardTitle></CardHeader>
              <CardContent>
                <Label htmlFor="seo-addon-usd" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">SEO add-on monthly price (USD)</Label>
                <div className="mt-3 flex gap-3"><Input id="seo-addon-usd" type="number" min="0" value={addonPrice} onChange={(event) => setAddonPrice(event.target.value)} className="h-12 rounded-xl" /><Button disabled={busy === "addon-price"} onClick={() => {
                  const next = Number(addonPrice);
                  if (!Number.isFinite(next) || next < 0) return toast.error("Enter a valid non-negative price.");
                  void runAction("addon-price", () => updateSeoProductConfig({ addon_prices: { ...data.productConfig.addon_prices, US: { amount: next, currency: "USD" } } }), "SEO add-on price updated.");
                }} className="h-12 rounded-full bg-slate-950 px-6 font-bold text-white">Save</Button></div>
                <p className="mt-4 rounded-2xl bg-indigo-50 p-4 text-xs font-semibold leading-5 text-indigo-800">The $799 Website Growth Partner remains the included managed tier. Launch, Business, and Scale can receive SEO through an explicit add-on or customer override.</p>
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <Label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Default usage safeguards</Label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div><Label htmlFor="seo-audit-limit" className="text-xs font-semibold text-slate-500">Audits / month</Label><Input id="seo-audit-limit" type="number" min="1" value={auditLimit} onChange={(event) => setAuditLimit(event.target.value)} className="mt-2 h-11 rounded-xl" /></div>
                    <div><Label htmlFor="seo-page-limit" className="text-xs font-semibold text-slate-500">Pages / audit</Label><Input id="seo-page-limit" type="number" min="1" value={pageLimit} onChange={(event) => setPageLimit(event.target.value)} className="mt-2 h-11 rounded-xl" /></div>
                    <div><Label htmlFor="seo-ai-cost-limit" className="text-xs font-semibold text-slate-500">AI cost cap (USD)</Label><Input id="seo-ai-cost-limit" type="number" min="0" step="0.01" value={aiCostLimit} onChange={(event) => setAiCostLimit(event.target.value)} className="mt-2 h-11 rounded-xl" /></div>
                  </div>
                  <Button variant="outline" disabled={busy === "usage-limits"} onClick={() => {
                    const values = [Number(auditLimit), Number(pageLimit), Number(aiCostLimit)];
                    if (values.some((value) => !Number.isFinite(value) || value < 0) || values[0] < 1 || values[1] < 1) return toast.error("Enter valid positive audit and page limits.");
                    void runAction("usage-limits", () => updateSeoProductConfig({ default_limits: { ...(data.productConfig.default_limits || {}), auditsPerMonth: values[0], pagesPerAudit: values[1], aiCostUsd: values[2] } }), "SEO usage safeguards updated.");
                  }} className="mt-4 min-h-11 rounded-full px-6 font-bold">Save safeguards</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-3 text-xl font-black"><SlidersHorizontal className="h-5 w-5 text-indigo-600" />Module controls</CardTitle></CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {data.modules.map((module: SeoModuleDefinition) => (
                <div key={module.module_key} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{module.label}</p><Badge variant="outline" className="rounded-full capitalize">{module.category}</Badge>{module.customer_visible && <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">Customer navigation</Badge>}</div><p className="mt-2 text-sm font-medium leading-6 text-slate-500">{module.description}</p></div>
                  <div className="flex shrink-0 items-center gap-5"><label className="flex items-center gap-2 text-xs font-bold text-slate-500"><Switch checked={module.customer_visible} disabled={busy === `visible-${module.module_key}`} onCheckedChange={(checked) => void runAction(`visible-${module.module_key}`, () => updateSeoModule(module.module_key, { customer_visible: checked }), `${module.label} visibility updated.`)} />Customer</label><label className="flex items-center gap-2 text-xs font-bold text-slate-500"><Switch checked={module.is_enabled} disabled={busy === `module-${module.module_key}`} onCheckedChange={(checked) => void runAction(`module-${module.module_key}`, () => updateSeoModule(module.module_key, { is_enabled: checked }), `${module.label} ${checked ? "enabled" : "disabled"}.`)} />Enabled</label></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-3 text-xl font-black"><ShieldCheck className="h-5 w-5 text-indigo-600" />Plan entitlements</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead><tr className="border-y border-slate-100 bg-slate-50"><th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Module</th>{PLAN_KEYS.map((plan) => <th key={plan.key} className="px-4 py-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{plan.label}</th>)}</tr></thead>
                <tbody>{data.modules.map((module) => (
                  <tr key={module.module_key} className="border-b border-slate-100"><td className="px-6 py-4 text-sm font-bold text-slate-900">{module.label}</td>{PLAN_KEYS.map((plan) => {
                    const entitlement = data.entitlements.find((item) => item.plan_key === plan.key && item.module_key === module.module_key);
                    const key = `plan-${plan.key}-${module.module_key}`;
                    return <td key={plan.key} className="px-4 py-3"><Select value={entitlement?.access_mode || "unavailable"} disabled={busy === key} onValueChange={(value) => void runAction(key, () => updateSeoPlanEntitlement(plan.key, module.module_key, { access_mode: value, limits: entitlement?.limits || {} }), `${module.label} access updated for ${plan.label}.`)}><SelectTrigger className="h-10 min-w-32 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="included">Included</SelectItem><SelectItem value="addon">Add-on</SelectItem><SelectItem value="unavailable">Unavailable</SelectItem></SelectContent></Select></td>;
                  })}</tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-3 text-xl font-black"><Building2 className="h-5 w-5 text-indigo-600" />Customer SEO access</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px] text-left"><thead><tr className="border-y border-slate-100 bg-slate-50"><th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Customer</th><th className="px-4 py-4 text-xs font-bold uppercase text-slate-500">Website</th><th className="px-4 py-4 text-xs font-bold uppercase text-slate-500">Plan</th><th className="px-4 py-4 text-xs font-bold uppercase text-slate-500">SEO access</th><th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500">Action</th></tr></thead><tbody>{data.customers.map((customer) => {
                const status = customer.seoEntitlement?.status || "not activated";
                const isActive = status === "active" || status === "trial";
                const activationMode = customerModes[customer.id] || customer.seoEntitlement?.access_mode || (customer.plan === "website_growth_partner" ? "included" : "addon");
                return <tr key={customer.id} className="border-b border-slate-100"><td className="px-6 py-5"><p className="font-bold text-slate-900">{customer.name}</p><p className="mt-1 text-xs font-medium text-slate-500">{customer.subscription_status || customer.status}</p></td><td className="px-4 py-5"><Badge variant="outline" className={`rounded-full ${customer.website ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}`}>{customer.website ? customer.website.status : "No website"}</Badge></td><td className="px-4 py-5 text-sm font-semibold capitalize text-slate-600">{String(customer.plan || "starter").replaceAll("_", " ")}</td><td className="px-4 py-5"><div className="flex min-w-44 flex-col gap-2"><Badge variant="outline" className={`w-fit rounded-full capitalize ${accessTone(status)}`}>{status.replaceAll("_", " ")}</Badge><Select value={activationMode} disabled={busy === `mode-${customer.id}`} onValueChange={(value: "included" | "addon" | "trial" | "custom") => {
                  setCustomerModes((current) => ({ ...current, [customer.id]: value }));
                  if (customer.seoEntitlement) void runAction(`mode-${customer.id}`, () => updateSeoCustomerAccess(customer.id, { access_mode: value }), "Customer SEO access mode updated.");
                }}><SelectTrigger className="h-9 rounded-xl text-xs font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="included">Included</SelectItem><SelectItem value="addon">Add-on</SelectItem><SelectItem value="trial">Trial</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div></td><td className="px-6 py-5 text-right">{customer.seoProject ? <Button variant="outline" disabled={busy === `customer-${customer.id}`} onClick={() => void runAction(`customer-${customer.id}`, () => updateSeoCustomerAccess(customer.id, { status: isActive ? "disabled" : "active" }), isActive ? "Customer SEO access disabled." : "Customer SEO access enabled.")} className="rounded-full font-bold">{isActive ? "Disable" : "Enable"}</Button> : <Button disabled={!customer.website || busy === `activate-${customer.id}`} onClick={() => customer.website && void runAction(`activate-${customer.id}`, () => activateSeoCustomer({ businessId: customer.id, websiteId: customer.website.id, accessMode: activationMode }), "SEO Growth activated for customer.")} className="rounded-full bg-slate-950 font-bold text-white">Activate {activationMode}</Button>}</td></tr>;
              })}</tbody></table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-xl font-black">Recent SEO jobs</CardTitle></CardHeader><CardContent className="space-y-3">{data.jobs.length ? data.jobs.map((job) => <div key={job.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4"><div><p className="text-sm font-bold text-slate-900">{String(job.job_type).replaceAll("_", " ")}</p><p className="mt-1 text-xs font-medium text-slate-500">Attempt {job.attempts}/{job.max_attempts} · {new Date(job.created_at).toLocaleString()}</p>{job.last_error && <p className="mt-2 text-xs font-semibold text-rose-600">{job.last_error}</p>}</div><Badge variant="outline" className={`rounded-full capitalize ${accessTone(job.status)}`}>{job.status}</Badge></div>) : <p className="rounded-2xl bg-slate-50 p-6 text-sm font-medium text-slate-500">No SEO jobs have run yet.</p>}</CardContent></Card>
          <Card className="rounded-[2rem] border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-xl font-black">Recorded usage</CardTitle></CardHeader><CardContent className="space-y-3">{data.usage.length ? data.usage.slice(0, 20).map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4"><div><p className="text-sm font-bold text-slate-900">{String(item.metric_key).replaceAll("_", " ")}</p><p className="mt-1 text-xs font-medium text-slate-500">{item.usage_date}</p></div><div className="text-right"><p className="text-lg font-black text-slate-950">{item.quantity}</p><p className="text-xs font-semibold text-slate-400">US${Number(item.cost_usd || 0).toFixed(2)}</p></div></div>) : <p className="rounded-2xl bg-slate-50 p-6 text-sm font-medium text-slate-500">No SEO usage has been recorded yet.</p>}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
