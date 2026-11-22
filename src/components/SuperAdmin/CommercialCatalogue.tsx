import React from "react";
import OtcWaiverPanel from "./OtcWaiverPanel";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { supabase } from "../../lib/supabase";

const authHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
};

export const CommercialCatalogue: React.FC = () => {
  const [catalogue, setCatalogue] = React.useState<any>(null);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState<string | null>(null);
  const [promotionName, setPromotionName] = React.useState("");
  const [promotionCode, setPromotionCode] = React.useState("");
  const [flags, setFlags] = React.useState<any>({ otc_mrc_catalogue: false, internal_ai_content_engine: false, analytics_v2: false, customer_ai_controls: false, ai_credit_topups_enabled: false, monthly_reporting_workflow: false });

  const load = React.useCallback(async () => {
    try {
      const response = await fetch("/api/admin/commercial-catalogue", { headers: await authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load catalogue");
      setCatalogue(data);
      const flagsResponse = await fetch("/api/admin/launch-flags", { headers: await authHeaders() });
      if (flagsResponse.ok) setFlags((await flagsResponse.json()).flags || flags);
    } catch (reason: any) { setError(reason.message); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const savePrice = async (price: any) => {
    setSaving(price.id);
    try {
      const response = await fetch(`/api/admin/commercial-catalogue/prices/${price.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ monthlyPrice: price.monthly_price === "" ? null : Number(price.monthly_price), setupFee: Number(price.setup_fee || 0), annualPrice: price.annual_price === "" ? null : Number(price.annual_price), stripeMonthlyPriceId: price.stripe_monthly_price_id || null, stripeAnnualPriceId: price.stripe_annual_price_id || null, stripeSetupPriceId: price.stripe_setup_price_id || null, recurringMonthlyPrice: price.recurring_monthly_price === "" ? null : Number(price.recurring_monthly_price), recurringSetupFee: price.recurring_setup_fee === "" ? null : Number(price.recurring_setup_fee), recurringAnnualPrice: price.recurring_annual_price === "" ? null : Number(price.recurring_annual_price), minimumTermMonths: Number(price.minimum_term_months ?? 0), recurringStripeMonthlyPriceId: price.recurring_stripe_monthly_price_id || null, recurringStripeAnnualPriceId: price.recurring_stripe_annual_price_id || null, recurringStripeSetupPriceId: price.recurring_stripe_setup_price_id || null, recurringConfigStatus: price.recurring_config_status || "draft", active: price.active }) });
      if (!response.ok) throw new Error((await response.json()).error || "Price could not be saved");
    } catch (reason: any) { setError(reason.message); } finally { setSaving(null); }
  };

  const saveFlags = async () => {
    setSaving("flags");
    try {
      const response = await fetch("/api/admin/launch-flags", { method: "PATCH", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ otcMrcCatalogue: flags.otc_mrc_catalogue, internalAiContentEngine: flags.internal_ai_content_engine, analyticsV2: flags.analytics_v2, customerAiControls: false, aiCreditTopupsEnabled: flags.ai_credit_topups_enabled, monthlyReportingWorkflow: flags.monthly_reporting_workflow }) });
      if (!response.ok) throw new Error((await response.json()).error || "Release flags could not be saved");
      setFlags((await response.json()).flags);
    } catch (reason: any) { setError(reason.message); } finally { setSaving(null); }
  };

  const createPromotion = async () => {
    if (!promotionName.trim()) return;
    setSaving("promotion");
    try {
      const response = await fetch("/api/admin/commercial-catalogue/promotions", { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ name: promotionName.trim(), code: promotionCode.trim() || null, active: false }) });
      if (!response.ok) throw new Error((await response.json()).error || "Promotion could not be created");
      setPromotionName(""); setPromotionCode(""); await load();
    } catch (reason: any) { setError(reason.message); } finally { setSaving(null); }
  };

  const togglePromotion = async (promotion: any) => {
    setSaving(`promotion:${promotion.id}`);
    setError("");
    try {
      const response = await fetch(`/api/admin/commercial-catalogue/promotions/${promotion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ active: !promotion.active }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Promotion could not be updated");
      await load();
    } catch (reason: any) {
      setError(reason instanceof Error ? reason.message : "Promotion could not be updated");
    } finally {
      setSaving(null);
    }
  };

  const toggleProductAvailability = async (product: any) => {
    if (!["personal-profile", "managed-website", "website-growth", "growth-partner"].includes(product.slug)) return;
    const action = product.active ? "Pause new sales for" : "Resume new sales for";
    if (!window.confirm(`${action} ${product.name}? Existing customer subscriptions are not changed.`)) return;
    setSaving(`product:${product.id}`);
    setError("");
    try {
      const response = await fetch(`/api/admin/commercial-catalogue/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ active: !product.active }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Product availability could not be updated");
      await load();
    } catch (reason: any) {
      setError(reason instanceof Error ? reason.message : "Product availability could not be updated");
    } finally {
      setSaving(null);
    }
  };

  if (error && !catalogue) return <Card><CardContent className="p-6 text-sm font-bold text-rose-600">{error}</CardContent></Card>;
  if (!catalogue) return <Card><CardContent className="p-6 text-sm font-bold text-slate-500">Loading current commercial catalogue…</CardContent></Card>;
  return <Card className="mb-8 rounded-3xl border-indigo-100 shadow-sm"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-2xl font-black">Products &amp; Pricing</CardTitle><p className="mt-1 text-sm font-semibold text-slate-500">Manage USD prices, release flags and whether each managed website plan accepts new sales. Pausing a plan does not modify existing subscriptions.</p></div><Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Current sales architecture</Badge></div></CardHeader><CardContent className="space-y-6">
    {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
    <OtcWaiverPanel />
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-slate-950">Release controls</p><p className="text-xs font-semibold text-slate-500">Recurring prices remain hidden until marked live and the catalogue flag is enabled.</p></div><Button size="sm" onClick={() => void saveFlags()} disabled={saving === "flags"} className="bg-indigo-600 font-black">{saving === "flags" ? "Saving…" : "Save flags"}</Button></div><div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-slate-700">{([["otc_mrc_catalogue", "OTC + MRC catalogue"], ["internal_ai_content_engine", "Internal AI content drafts"], ["analytics_v2", "Analytics v2"], ["ai_credit_topups_enabled", "AI credit top-ups (off by default)"], ["monthly_reporting_workflow", "Monthly report drafts (off by default; no email sending)"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(flags[key])} onChange={(event) => setFlags((current: any) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div></div>
    {catalogue.products.map((product: any) => <div key={product.slug} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-slate-950">{product.name}</p><p className="text-xs font-semibold text-slate-500">{product.slug} · {product.sales_motion} · {product.active ? "active" : "inactive"}</p></div>{["personal-profile", "managed-website", "website-growth", "growth-partner"].includes(product.slug) && <Button size="sm" variant="outline" disabled={saving === `product:${product.id}`} onClick={() => void toggleProductAvailability(product)}>{saving === `product:${product.id}` ? "Saving…" : product.active ? "Pause new sales" : "Resume new sales"}</Button>}</div><div className="mt-4 space-y-3">{catalogue.prices.filter((price: any) => price.product_id === product.id && price.market === "INTL" && price.currency === "USD").map((price: any) => <div key={price.id} className="rounded-xl bg-white p-3 shadow-sm"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest text-slate-500">{price.market} · {price.currency}</span><Button size="sm" onClick={() => void savePrice(price)} disabled={saving === price.id} className="h-8 rounded-lg bg-indigo-600 text-xs font-black">{saving === price.id ? "Saving…" : "Save"}</Button></div><div className="grid gap-2 md:grid-cols-3"><Input aria-label={`${price.market} monthly price`} value={price.monthly_price ?? ""} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, monthly_price: event.target.value } : item) }))} placeholder="Current package price" /><Input aria-label={`${price.market} setup fee`} value={price.setup_fee ?? ""} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, setup_fee: event.target.value } : item) }))} placeholder="Current setup fee" /><Input aria-label={`${price.market} annual price`} value={price.annual_price ?? ""} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, annual_price: event.target.value } : item) }))} placeholder="Current annual price" /></div><div className="mt-3"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Recurring commercial terms</p><p className="mt-1 text-xs font-semibold text-slate-500">The minimum term saved here is the source of truth used by public pricing, checkout, new proposals and the live Terms page for this product and market.</p></div><div className="grid gap-2 md:grid-cols-4"><Input aria-label={`${price.market} recurring monthly price`} value={price.recurring_monthly_price ?? ""} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, recurring_monthly_price: event.target.value } : item) }))} placeholder="MRC" /><Input aria-label={`${price.market} recurring setup fee`} value={price.recurring_setup_fee ?? ""} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, recurring_setup_fee: event.target.value } : item) }))} placeholder="OTC setup" /><Input aria-label={`${price.market} minimum term`} value={price.minimum_term_months ?? 0} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, minimum_term_months: event.target.value } : item) }))} placeholder="Months" /><select aria-label={`${price.market} recurring status`} value={price.recurring_config_status || "draft"} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, recurring_config_status: event.target.value } : item) }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="draft">Draft</option><option value="preview">Preview</option><option value="live">Live</option><option value="disabled">Disabled</option></select></div><div className="mt-2 grid gap-2 md:grid-cols-3"><Input aria-label={`${price.market} monthly Stripe price ID`} value={price.stripe_monthly_price_id || ""} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, stripe_monthly_price_id: event.target.value } : item) }))} placeholder="Current price_ ID" /><Input aria-label={`${price.market} recurring Stripe MRC price ID`} value={price.recurring_stripe_monthly_price_id || ""} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, recurring_stripe_monthly_price_id: event.target.value } : item) }))} placeholder="Recurring MRC price_ ID" /><Input aria-label={`${price.market} recurring Stripe setup price ID`} value={price.recurring_stripe_setup_price_id || ""} onChange={(event) => setCatalogue((current: any) => ({ ...current, prices: current.prices.map((item: any) => item.id === price.id ? { ...item, recurring_stripe_setup_price_id: event.target.value } : item) }))} placeholder="Recurring OTC price_ ID" /></div></div>)}</div></div>)}
    <div className="border-t border-slate-100 pt-5"><p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Promotion framework</p><div className="flex flex-col gap-2 sm:flex-row"><Input value={promotionName} onChange={(event) => setPromotionName(event.target.value)} placeholder="Promotion name" /><Input value={promotionCode} onChange={(event) => setPromotionCode(event.target.value)} placeholder="Optional code" /><Button onClick={() => void createPromotion()} disabled={saving === "promotion" || !promotionName.trim()} className="font-black">Create inactive promotion</Button></div><div className="mt-3 flex flex-wrap gap-2">{catalogue.promotions.map((promotion: any) => <Button key={promotion.id} onClick={() => void togglePromotion(promotion)} variant="outline" className="h-9 rounded-xl text-xs font-bold">{promotion.name} · {promotion.active ? "active" : "inactive"}</Button>)}</div></div>
    <div className="border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Legacy plans · existing customers</p><div className="flex flex-wrap gap-2">{catalogue.legacyPlans.map((plan: any) => <Badge key={plan.id} variant="outline" className="font-bold">{plan.name} · {plan.slug} · {plan.is_active ? "active" : "inactive"}</Badge>)}</div></div>
  </CardContent></Card>;
};
export default CommercialCatalogue;
