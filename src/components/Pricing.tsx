import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { COMMERCIAL_FALLBACK_PRODUCTS, COMMERCIAL_MARKETS, COMMERCIAL_MARKET_CHANGED_EVENT, CommercialMarket, CommercialProduct, formatCommercialMoney, getCommercialPrice, getStoredMarket, persistCommercialMarket } from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";

interface PricingProps { currentPlan?: string; onSelectPlan?: (plan: any) => void; isDashboard?: boolean; onDark?: boolean; hideIntro?: boolean; }
const outcomes = ["Premium conversion-focused website strategy and build", "WhatsApp, call, booking and quotation enquiry paths", "Trust proof, local SEO foundation and analytics", "Managed hosting, maintenance and continuous improvements"];

export const Pricing: React.FC<PricingProps> = ({ currentPlan, onSelectPlan, onDark = false, hideIntro = false }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [market, setMarket] = React.useState<CommercialMarket>(getStoredMarket());
  const { products, loading } = usePublicCommercialPricing(market);
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [pendingProduct, setPendingProduct] = React.useState<CommercialProduct | null>(null);
  React.useEffect(() => {
    const onMarketChanged = () => setMarket(getStoredMarket());
    window.addEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
    return () => window.removeEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
  }, []);
  React.useEffect(() => {
    persistCommercialMarket(market);
  }, [market]);

  const startCheckout = async (product: CommercialProduct) => {
    const price = getCommercialPrice(product, market);
    if (onSelectPlan) return onSelectPlan({ ...product, price });
    if (product.slug === "custom-website") { navigate(`/apply-custom?product=${product.slug}&market=${market}`); return; }
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
  const managedPrice = getCommercialPrice(managed, market); const growthPrice = getCommercialPrice(growth, market);
  const annualAvailable = Boolean(managedPrice?.annualPrice && managedPrice?.annualConfigured);
  React.useEffect(() => { if (!annualAvailable && billingCycle === "yearly") setBillingCycle("monthly"); }, [annualAvailable, billingCycle]);
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  const pendingPrice = pendingProduct ? getCommercialPrice(pendingProduct, market) : null;
  const pendingMonthly = pendingPrice?.monthlyPrice || 0;
  const dueToday = (pendingPrice?.setupFee || 0) + (billingCycle === "monthly" ? pendingMonthly : (pendingPrice?.annualPrice || 0));
  return <div className={cn("mx-auto max-w-6xl space-y-10 px-4", hideIntro ? "pb-10 pt-2 sm:pb-14" : "py-10 sm:py-14")}>
    {!hideIntro && <div className="flex flex-col items-center gap-5 text-center"><Badge className="rounded-full bg-indigo-50 px-4 py-1 text-indigo-700 hover:bg-indigo-50">Premium managed website growth</Badge><h2 className={cn("max-w-3xl text-4xl font-black tracking-tight sm:text-6xl", onDark ? "text-white" : "text-slate-950")}>A managed website built to generate more enquiries.</h2><p className={cn("max-w-2xl text-lg leading-8", onDark ? "text-slate-300" : "text-slate-600")}>We plan, build, manage and continuously improve your website around conversion, trust, local visibility and lead generation.</p><div className="flex flex-wrap items-center justify-center gap-3"><p className="text-sm font-bold text-slate-500">Prices shown in {COMMERCIAL_MARKETS[market].currency} · {COMMERCIAL_MARKETS[market].label}</p>{annualAvailable && <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-black"><button onClick={() => setBillingCycle("monthly")} className={cn("rounded-lg px-3 py-2", billingCycle === "monthly" ? "bg-slate-950 text-white" : "text-slate-500")}>Monthly</button><button onClick={() => setBillingCycle("yearly")} className={cn("rounded-lg px-3 py-2", billingCycle === "yearly" ? "bg-slate-950 text-white" : "text-slate-500")}>Annual</button></div>}</div></div>}
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative min-w-0 overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-2xl sm:p-10"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/30 blur-3xl" /><div className="relative grid min-w-0 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"><div className="min-w-0"><Badge className="mb-4 bg-indigo-500 text-white hover:bg-indigo-500">Primary premium offer</Badge><h3 className="text-3xl font-black text-white sm:text-5xl">{managed.name}</h3><p className="mt-4 max-w-xl text-base leading-7 text-slate-300">{managed.description}</p><ul className="mt-6 grid gap-3 sm:grid-cols-2">{outcomes.map((item) => <li key={item} className="flex gap-2 text-sm font-semibold text-slate-200"><Check className="h-4 w-4 shrink-0 text-indigo-300" />{item}</li>)}</ul></div><div className="min-w-0 rounded-3xl bg-white p-6 text-slate-950 shadow-xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">From your market</p><p className="mt-2 break-words text-4xl font-black tracking-tight sm:text-5xl">{formatCommercialMoney(billingCycle === "yearly" ? managedPrice?.annualPrice : managedPrice?.monthlyPrice, managedPrice?.currency || "USD")}<span className="text-sm font-bold text-slate-500"> {billingCycle === "yearly" ? "/ year" : "/ month"}</span></p><p className="mt-2 text-sm font-bold text-slate-500">{formatCommercialMoney(managedPrice?.setupFee, managedPrice?.currency || "USD")} onboarding · 6-month initial commitment</p><Button onClick={() => handleSelect(managed)} className="mt-6 h-auto min-h-14 w-full whitespace-normal rounded-2xl bg-indigo-600 py-3 text-center text-xs font-black uppercase tracking-widest hover:bg-indigo-500">Get My Website Growth Plan <ArrowRight className="ml-2 h-4 w-4" /></Button><p className="mt-3 text-center text-xs font-semibold text-slate-400">Onboarding is paid with the first billing period · Then billed monthly</p></div></div></motion.section>
    <section className="min-w-0 rounded-[2rem] border border-indigo-100 bg-indigo-50/70 p-7 sm:p-10"><div className="grid min-w-0 gap-7 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">For businesses investing seriously in growth</p><h3 className="mt-2 text-3xl font-black text-slate-950">{growth.name}</h3><p className="mt-3 max-w-2xl leading-7 text-slate-600">{growth.description} Includes the Website Growth System plus strategy sessions, landing pages, experiments and priority implementation.</p><div className="mt-4 flex min-w-0 flex-wrap gap-2 text-xs font-bold text-indigo-900">{["Monthly strategy session", "Landing pages and experiments", "Expanded local SEO", "Quarterly growth roadmap"].map((item) => <span key={item} className="max-w-full rounded-full bg-white px-3 py-2 shadow-sm">{item}</span>)}</div></div><div className="min-w-0 rounded-3xl bg-white p-6 shadow-sm md:min-w-56 md:text-right"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">From your market</p><p className="mt-2 break-words text-4xl font-black tracking-tight text-slate-950">{formatCommercialMoney(growthPrice?.monthlyPrice, growthPrice?.currency || "USD")}<span className="text-sm font-bold text-slate-500"> / month</span></p><p className="mt-1 text-xs font-semibold text-slate-500">Custom scope · Consultation required</p><Button onClick={() => handleSelect(growth)} variant="outline" className="mt-5 h-auto min-h-12 w-full whitespace-normal rounded-xl border-indigo-200 bg-white py-3 text-center font-black text-indigo-700">Book Growth Consultation <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-7 text-slate-700" aria-label="Before you choose">
      <h3 className="text-2xl font-bold text-slate-950">Know what you are buying</h3>
      <p className="mt-3 leading-7">The website helps existing visitors understand your services and contact you. Paid advertising, ad spend and guaranteed traffic, rankings or sales are not included.</p>
      <p className="mt-3 leading-7">Before payment, we confirm your page scope, content responsibilities, revision and update allowance, launch schedule, billing start, cancellation and export arrangements in writing. Custom features require a separate quote.</p>
      <p className="mt-3 leading-7">Website Growth is most useful when you already attract visitors or have an agreed plan to reach them. We review the traffic source and enquiry baseline before recommending it.</p>
      <Button variant="outline" className="mt-5" onClick={() => navigate(`/book-demo?market=${market}`)}>Discuss my scope first</Button>
    </section>
    {currentPlan && <p className="text-center text-xs font-bold text-slate-500">Current account entitlement: {currentPlan}. Existing subscriptions remain on their original plan.</p>}
    {pendingProduct && pendingPrice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Order summary"><div className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Order summary</p><h3 className="mt-2 text-2xl font-black text-slate-950">{pendingProduct.name}</h3></div><button onClick={() => setPendingProduct(null)} className="text-2xl leading-none text-slate-400" aria-label="Close">×</button></div><div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-700"><div className="flex justify-between"><span>Market / currency</span><span>{COMMERCIAL_MARKETS[market].label} · {pendingPrice.currency}</span></div><div className="flex justify-between"><span>Due today</span><span>{formatCommercialMoney(dueToday, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>Then billed</span><span>{billingCycle === "yearly" ? formatCommercialMoney(pendingPrice.annualPrice, pendingPrice.currency) + " / year" : formatCommercialMoney(pendingMonthly, pendingPrice.currency) + " / month"}</span></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Includes the one-time setup fee and first billing period. The initial service commitment is 12 months.</p><Button onClick={() => { const product = pendingProduct; setPendingProduct(null); void startCheckout(product); }} className="mt-6 h-13 w-full rounded-2xl bg-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-500">Continue to secure checkout <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>}
  </div>;
};
export default Pricing;
