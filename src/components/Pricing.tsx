import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { COMMERCIAL_FALLBACK_PRODUCTS, COMMERCIAL_MARKETS, COMMERCIAL_MARKET_CHANGED_EVENT, CommercialMarket, CommercialProduct, formatCommercialMoney, getCommercialPrice, getStoredMarket, persistCommercialMarket } from "../lib/commercialPricing";

interface PricingProps { currentPlan?: string; onSelectPlan?: (plan: any) => void; isDashboard?: boolean; onDark?: boolean; }
const outcomes = ["Professional, mobile-first business website", "WhatsApp, call, booking and quotation enquiry paths", "Trust proof, reviews and local search foundation", "Hosting, maintenance, analytics and managed updates"];

export const Pricing: React.FC<PricingProps> = ({ currentPlan, onSelectPlan, onDark = false }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [market, setMarket] = React.useState<CommercialMarket>(getStoredMarket());
  const [products, setProducts] = React.useState<CommercialProduct[]>(COMMERCIAL_FALLBACK_PRODUCTS);
  const [loading, setLoading] = React.useState(true);
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [pendingProduct, setPendingProduct] = React.useState<CommercialProduct | null>(null);
  const [showAdditionalOptions, setShowAdditionalOptions] = React.useState(false);
  React.useEffect(() => {
    const onMarketChanged = () => setMarket(getStoredMarket());
    window.addEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
    return () => window.removeEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
  }, []);
  React.useEffect(() => {
    persistCommercialMarket(market);
    fetch(`/api/public/pricing?market=${market}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Pricing unavailable");
      const data = await response.json();
      if (Array.isArray(data.products) && data.products.length) setProducts(data.products.map((product: any) => ({ ...product, prices: product.price ? [product.price] : [] })));
    }).catch(() => setProducts(COMMERCIAL_FALLBACK_PRODUCTS)).finally(() => setLoading(false));
  }, [market]);

  const startCheckout = async (product: CommercialProduct) => {
    const price = getCommercialPrice(product, market);
    if (onSelectPlan) return onSelectPlan({ ...product, price });
    if (product.salesMotion !== "self_serve") { navigate(`/book-demo?product=${product.slug}&market=${market}`); return; }
    if (product.slug === "managed-website" && !profile) { navigate(`/generate-preview?market=${market}`); return; }
    localStorage.setItem("bt_checkout_intent", JSON.stringify({ productSlug: product.slug, market, currency: price?.currency, billingCycle, savedAt: new Date().toISOString() }));
    if (!profile) { navigate(`/signup?redirectTo=${encodeURIComponent(`/pricing?product=${product.slug}&market=${market}`)}`); return; }
    if (!profile.businessId) { toast.info("Complete your business setup first. Your product choice has been saved."); navigate("/dashboard/onboarding"); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be logged in to start checkout.");
      const response = await fetch("/api/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ businessId: profile.businessId, customerEmail: profile.email, type: "subscription", productSlug: product.slug, billingCycle, market, upgradeFrom: currentPlan === "managed-website" ? "managed-website" : undefined }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to start checkout.");
      window.location.href = result.url;
    } catch (error: any) { toast.error(error.message || "Payment process failed"); }
  };

  const handleSelect = async (product: CommercialProduct) => {
    if (onSelectPlan || product.salesMotion !== "self_serve" || (product.slug === "managed-website" && !profile)) return startCheckout(product);
    setPendingProduct(product);
  };

  const managed = products.find((product) => product.slug === "managed-website") || COMMERCIAL_FALLBACK_PRODUCTS[0];
  const growth = products.find((product) => product.slug === "website-growth") || COMMERCIAL_FALLBACK_PRODUCTS[1];
  const partner = products.find((product) => product.slug === "growth-partner") || COMMERCIAL_FALLBACK_PRODUCTS[2];
  const managedPrice = getCommercialPrice(managed, market); const growthPrice = getCommercialPrice(growth, market);
  const annualAvailable = Boolean(managedPrice?.annualPrice && managedPrice?.annualConfigured);
  React.useEffect(() => { if (!annualAvailable && billingCycle === "yearly") setBillingCycle("monthly"); }, [annualAvailable, billingCycle]);
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  const pendingPrice = pendingProduct ? getCommercialPrice(pendingProduct, market) : null;
  const pendingMonthly = pendingPrice?.monthlyPrice || 0;
  const dueToday = (pendingPrice?.setupFee || 0) + (billingCycle === "monthly" ? pendingMonthly : (pendingPrice?.annualPrice || 0));
  return <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:py-14">
    <div className="flex flex-col items-center gap-5 text-center"><Badge className="rounded-full bg-indigo-50 px-4 py-1 text-indigo-700 hover:bg-indigo-50">Managed lead-generation websites</Badge><h2 className={cn("max-w-3xl text-4xl font-black tracking-tight sm:text-6xl", onDark ? "text-white" : "text-slate-950")}>One clear offer to get your website working harder.</h2><p className={cn("max-w-2xl text-lg leading-8", onDark ? "text-slate-300" : "text-slate-600")}>We build, host and continuously manage the website and enquiry journey around your business.</p><div className="flex flex-wrap items-center justify-center gap-3"><p className="text-sm font-bold text-slate-500">Prices shown in {COMMERCIAL_MARKETS[market].currency} · {COMMERCIAL_MARKETS[market].label}</p>{annualAvailable && <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-black"><button onClick={() => setBillingCycle("monthly")} className={cn("rounded-lg px-3 py-2", billingCycle === "monthly" ? "bg-slate-950 text-white" : "text-slate-500")}>Monthly</button><button onClick={() => setBillingCycle("yearly")} className={cn("rounded-lg px-3 py-2", billingCycle === "yearly" ? "bg-slate-950 text-white" : "text-slate-500")}>Annual</button></div>}</div></div>
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl sm:p-10"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/30 blur-3xl" /><div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"><div><Badge className="mb-4 bg-indigo-500 text-white hover:bg-indigo-500">Recommended for most businesses</Badge><h3 className="text-3xl font-black text-white sm:text-5xl">Managed Website</h3><p className="mt-4 max-w-xl text-base leading-7 text-slate-300">{managed.description}</p><ul className="mt-6 grid gap-3 sm:grid-cols-2">{outcomes.map((item) => <li key={item} className="flex gap-2 text-sm font-semibold text-slate-200"><Check className="h-4 w-4 shrink-0 text-indigo-300" />{item}</li>)}</ul></div><div className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">From your market</p><p className="mt-2 text-5xl font-black tracking-tight">{formatCommercialMoney(billingCycle === "yearly" ? managedPrice?.annualPrice : managedPrice?.monthlyPrice, managedPrice?.currency || "USD")}<span className="text-sm font-bold text-slate-500"> {billingCycle === "yearly" ? "/ year" : "/ month"}</span></p><p className="mt-2 text-sm font-bold text-slate-500">{formatCommercialMoney(managedPrice?.setupFee, managedPrice?.currency || "USD")} setup · 12-month initial commitment</p><Button onClick={() => handleSelect(managed)} className="mt-6 h-14 w-full rounded-2xl bg-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-500">Generate My Website Preview <ArrowRight className="ml-2 h-4 w-4" /></Button><p className="mt-3 text-center text-xs font-semibold text-slate-400">Due today: setup fee · Then billed {billingCycle === "yearly" ? "annually" : "monthly"}</p></div></div></motion.section>
    <section className="rounded-[2rem] border border-indigo-100 bg-indigo-50/70 p-7 sm:p-10"><div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">When you are ready to grow further</p><h3 className="mt-2 text-3xl font-black text-slate-950">Website Growth</h3><p className="mt-3 max-w-2xl leading-7 text-slate-600">Adds ongoing conversion optimisation, local SEO expansion, landing pages, proof improvements, analytics review and priority support. Includes Managed Website.</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-indigo-900">{["Monthly performance review", "Local SEO expansion", "New service/location pages", "CTA and proof improvements"].map((item) => <span key={item} className="rounded-full bg-white px-3 py-2 shadow-sm">{item}</span>)}</div></div><div className="md:text-right"><p className="text-sm font-bold text-slate-500">A higher-touch monthly service</p><Button onClick={() => handleSelect(growth)} variant="outline" className="mt-5 h-12 rounded-xl border-indigo-200 bg-white font-black text-indigo-700">Explore Website Growth <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div></section>
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8"><button type="button" onClick={() => setShowAdditionalOptions((value) => !value)} className="inline-flex items-center gap-2 text-sm font-black text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-indigo-700">{showAdditionalOptions ? "Hide" : "Need strategic growth support?"}<ArrowRight className={cn("h-4 w-4 transition-transform", showAdditionalOptions ? "rotate-90" : "")} /></button>{showAdditionalOptions && <div className="mt-7 text-left"><section className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><Sparkles className="h-6 w-6 text-indigo-600" /><h3 className="mt-4 text-2xl font-black">Growth Partner</h3><p className="mt-2 text-sm leading-7 text-slate-600">A premium, consultant-led engagement for businesses that want strategic website, conversion and digital growth direction.</p><p className="mt-4 text-sm font-bold text-slate-500">Pricing follows a consultation</p><Button onClick={() => handleSelect(partner)} variant="outline" className="mt-5 h-12 w-full rounded-xl font-black">Book Growth Consultation <ArrowRight className="ml-2 h-4 w-4" /></Button></section></div>}</div>
    {currentPlan && <p className="text-center text-xs font-bold text-slate-500">Current account entitlement: {currentPlan}. Existing subscriptions remain on their original plan.</p>}
    {pendingProduct && pendingPrice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Order summary"><div className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Order summary</p><h3 className="mt-2 text-2xl font-black text-slate-950">{pendingProduct.name}</h3></div><button onClick={() => setPendingProduct(null)} className="text-2xl leading-none text-slate-400" aria-label="Close">×</button></div><div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-700"><div className="flex justify-between"><span>Market / currency</span><span>{COMMERCIAL_MARKETS[market].label} · {pendingPrice.currency}</span></div><div className="flex justify-between"><span>Due today</span><span>{formatCommercialMoney(dueToday, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>Then billed</span><span>{billingCycle === "yearly" ? formatCommercialMoney(pendingPrice.annualPrice, pendingPrice.currency) + " / year" : formatCommercialMoney(pendingMonthly, pendingPrice.currency) + " / month"}</span></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Includes the one-time setup fee and first billing period. The initial service commitment is 12 months.</p><Button onClick={() => { const product = pendingProduct; setPendingProduct(null); void startCheckout(product); }} className="mt-6 h-13 w-full rounded-2xl bg-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-500">Continue to secure checkout <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>}
  </div>;
};
export default Pricing;
