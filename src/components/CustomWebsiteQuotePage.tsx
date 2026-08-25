import React from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { COMMERCIAL_MARKETS, getStoredMarket, normalizeCommercialMarket, formatCommercialMoney } from "../lib/commercialPricing";

export default function CustomWebsiteQuotePage() {
  const [params] = useSearchParams();
  const [market] = React.useState(() => normalizeCommercialMarket(params.get("market") || getStoredMarket()));
  const [form, setForm] = React.useState({ name: "", email: "", businessName: "", phone: "", requirements: "", consent: false });
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = React.useState("");
  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.consent) { setError("Please agree to be contacted about your enquiry."); return; }
    setState("sending"); setError("");
    try {
      const response = await fetch("/api/platform-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, businessName: form.businessName, message: form.requirements, sourcePage: "/apply-custom", formName: "custom_website_quote", leadType: "custom_website_quote", selectedProduct: "custom-website", market, currency: COMMERCIAL_MARKETS[market].currency, consent: true }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "We could not send your request.");
      setState("sent");
    } catch (submissionError: any) { setState("error"); setError(submissionError?.message || "We could not send your request."); }
  };
  return <><PublicSiteHeader /><main className="mx-auto max-w-6xl px-4 py-12 sm:py-20"><div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"><section><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Custom Website</p><h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">A website built around your exact requirements.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Tell us what your business needs. We will review the scope, recommend the right build path and send a clear proposal.</p><div className="mt-8 space-y-3">{["Ecommerce or advanced integrations", "Multilingual or large content structures", "Bespoke design and functionality", "A clear delivery plan before work begins"].map((item) => <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700"><CheckCircle2 className="h-5 w-5 text-indigo-600" />{item}</div>)}</div><p className="mt-8 text-sm font-bold text-slate-500">{COMMERCIAL_MARKETS[market].label} starting point: {formatCommercialMoney(market === "MY" ? 5000 : market === "SG" ? 2500 : market === "GB" ? 1500 : 1800, COMMERCIAL_MARKETS[market].currency)}</p></section><form onSubmit={submit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8"><h2 className="text-2xl font-black text-slate-950">Request a custom quote</h2><p className="mt-2 text-sm leading-6 text-slate-500">No payment today. We will respond with next steps after reviewing your requirements.</p>{state === "sent" ? <div className="mt-8 rounded-2xl bg-emerald-50 p-6 text-emerald-800"><CheckCircle2 className="h-7 w-7" /><p className="mt-3 font-black">Request received.</p><p className="mt-1 text-sm">We will be in touch shortly.</p></div> : <div className="mt-7 space-y-5"><div><Label htmlFor="custom-name">Name</Label><Input id="custom-name" required minLength={2} maxLength={100} value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-2" /></div><div><Label htmlFor="custom-email">Email</Label><Input id="custom-email" required type="email" maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-2" /></div><div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="custom-business">Business name</Label><Input id="custom-business" required value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="mt-2" /></div><div><Label htmlFor="custom-phone">Phone / WhatsApp</Label><Input id="custom-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="mt-2" /></div></div><div><Label htmlFor="custom-requirements">What do you need?</Label><Textarea id="custom-requirements" required minLength={10} maxLength={5000} value={form.requirements} onChange={(e) => update("requirements", e.target.value)} className="mt-2 min-h-32" placeholder="Tell us about pages, integrations, ecommerce, languages or anything else important." /></div><label className="flex items-start gap-3 text-sm text-slate-600"><input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} className="mt-1" />I agree to be contacted about this request and accept the privacy policy.</label>{error && <p className="text-sm font-bold text-rose-600" role="alert">{error}</p>}<Button type="submit" disabled={state === "sending"} className="h-14 w-full rounded-xl bg-indigo-600 font-black">{state === "sending" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : <>Request Custom Quote <ArrowRight className="ml-2 h-4 w-4" /></>}</Button></div>}</form></div></main><PublicSiteFooter /></>;
}
