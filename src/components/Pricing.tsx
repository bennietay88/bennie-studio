import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { COMMERCIAL_FALLBACK_PRODUCTS, COMMERCIAL_MARKETS, COMMERCIAL_MARKET_CHANGED_EVENT, COMMERCIAL_RECURRING_COMMITMENT_MONTHS, CommercialMarket, CommercialProduct, formatCommercialMoney, getCommercialPrice, getStoredMarket, normalizeCommercialMarket, persistCommercialMarket } from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import { trackPublicEvent } from "../lib/publicTracking";

interface PricingProps { currentPlan?: string; onSelectPlan?: (plan: any) => void; isDashboard?: boolean; onDark?: boolean; hideIntro?: boolean; marketOverride?: CommercialMarket; }
const outcomes = ["Website planned and built around your offer", "Managed hosting, updates and launch support", "WhatsApp, call, booking and quotation enquiry paths", "Trust proof, local SEO foundation and analytics"];

export const Pricing: React.FC<PricingProps> = ({ currentPlan, onSelectPlan, onDark = false, hideIntro = false, marketOverride }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [market, setMarket] = React.useState<CommercialMarket>(getStoredMarket());
  // The marketing route can be opened directly with ?market=INTL (or another
  // explicit market). Use the browser URL as the final source of truth so a
  // previously persisted local market cannot override a shared campaign link.
  const urlMarket = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("market") : null;
  const activeMarket = marketOverride || (urlMarket ? normalizeCommercialMarket(urlMarket) : market);
  const { products, loading } = usePublicCommercialPricing(activeMarket);
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [pendingProduct, setPendingProduct] = React.useState<CommercialProduct | null>(null);
  React.useEffect(() => {
    const requestedMarket = new URLSearchParams(location.search).get("market");
    if (requestedMarket) setMarket(normalizeCommercialMarket(requestedMarket));
  }, [location.search]);
  React.useEffect(() => {
    const onMarketChanged = () => setMarket(getStoredMarket());
    window.addEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
    return () => window.removeEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
  }, []);
  React.useEffect(() => {
    persistCommercialMarket(market);
  }, [market]);

  const startCheckout = async (product: CommercialProduct) => {
    let previewId: string | null = null;
    try { previewId = JSON.parse(localStorage.getItem("bt_preview_intent") || "{}").previewId || null; } catch { /* ignore malformed preview state */ }
    trackPublicEvent({ eventType: "checkout_started", label: product.name, target: "/pricing", metadata: { product: product.slug, market: activeMarket, billingCycle, previewId } });
    const price = getCommercialPrice(product, activeMarket);
    if (onSelectPlan) return onSelectPlan({ ...product, price });
    if (product.slug === "custom-website") { navigate(`/apply-custom?product=${product.slug}&market=${activeMarket}`); return; }
    if (product.salesMotion !== "self_serve") { navigate(`/book-demo?product=${product.slug}&market=${activeMarket}`); return; }
    if (product.slug === "managed-website" && !profile) { navigate(`/generate-preview?market=${activeMarket}`); return; }
    localStorage.setItem("bt_checkout_intent", JSON.stringify({ productSlug: product.slug, market: activeMarket, currency: price?.currency, billingCycle, savedAt: new Date().toISOString() }));
    if (!profile) { navigate(`/signup?redirectTo=${encodeURIComponent(`/pricing?product=${product.slug}&market=${activeMarket}`)}`); return; }
    if (!profile.businessId) { toast.info("Complete your business setup first. Your product choice has been saved."); navigate("/dashboard/onboarding"); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be logged in to start checkout.");
      const response = await fetch("/api/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ businessId: profile.businessId, customerEmail: profile.email, type: "subscription", productSlug: product.slug, billingCycle, market: activeMarket, upgradeFrom: currentPlan === "managed-website" ? "managed-website" : undefined }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to start checkout.");
      window.location.href = result.url;
    } catch (error: any) { toast.error(error.message || "Payment process failed"); }
  };

  const handleSelect = async (product: CommercialProduct) => {
    const price = getCommercialPrice(product, activeMarket);
    // Markets without live recurring Stripe IDs stay consultation-led. This
    // prevents a public button from sending a customer into a checkout that
    // the selected market cannot complete yet.
    if (product.salesMotion === "self_serve" && !price?.monthlyConfigured) {
      navigate(`/book-demo?product=${product.slug}&market=${activeMarket}`);
      return;
    }
    if (onSelectPlan || product.salesMotion !== "self_serve" || (product.slug === "managed-website" && !profile)) return startCheckout(product);
    setPendingProduct(product);
  };

  const managed = products.find((product) => product.slug === "managed-website") || COMMERCIAL_FALLBACK_PRODUCTS[0];
  const growth = products.find((product) => product.slug === "website-growth") || COMMERCIAL_FALLBACK_PRODUCTS[1];
  const premium = products.find((product) => product.slug === "growth-partner") || COMMERCIAL_FALLBACK_PRODUCTS[2];
  const managedPrice = getCommercialPrice(managed, activeMarket); const growthPrice = getCommercialPrice(growth, activeMarket); const premiumPrice = getCommercialPrice(premium, activeMarket);
  React.useEffect(() => {
    if (!loading) {
      trackPublicEvent({ eventType: "plan_viewed", label: "Managed website plan comparison", target: "/pricing", metadata: { market: activeMarket, products: products.map((product) => product.slug) } });
    }
  }, [loading, activeMarket, products]);
  React.useEffect(() => {
    if (loading || !profile?.businessId || pendingProduct) return;
    const requested = new URLSearchParams(location.search).get("product");
    const product = products.find((item) => item.slug === requested);
    if (product && product.salesMotion === "self_serve") setPendingProduct(product);
  }, [loading, location.search, pendingProduct, products, profile?.businessId]);
  const annualAvailable = false;
  React.useEffect(() => { if (!annualAvailable && billingCycle === "yearly") setBillingCycle("monthly"); }, [annualAvailable, billingCycle]);
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  const pendingPrice = pendingProduct ? getCommercialPrice(pendingProduct, activeMarket) : null;
  const pendingMonthly = pendingPrice?.monthlyPrice || 0;
  const dueToday = pendingPrice?.billingInterval === "one_time" ? (pendingPrice?.monthlyPrice || 0) : ((pendingPrice?.setupFee || 0) + (billingCycle === "monthly" ? pendingMonthly : (pendingPrice?.annualPrice || 0)));
  return <div className={cn("mx-auto max-w-6xl space-y-10 px-4", hideIntro ? "pb-10 pt-2 sm:pb-14" : "py-10 sm:py-14")}>
    {!hideIntro && <div className="flex flex-col items-center gap-5 text-center"><Badge className="rounded-full bg-indigo-50 px-4 py-1 text-indigo-700 hover:bg-indigo-50">Managed website growth</Badge><h2 className={cn("max-w-3xl text-4xl font-black tracking-tight sm:text-6xl", onDark ? "text-white" : "text-slate-950")}>Your managed website team, without hiring one.</h2><p className={cn("max-w-2xl text-lg leading-8", onDark ? "text-slate-300" : "text-slate-600")}>We plan, build, host, manage and improve a conversion-focused website so your team can focus on serving customers.</p><div className="flex flex-wrap items-center justify-center gap-3"><p className="text-sm font-bold text-slate-500">Setup + monthly recurring service in {COMMERCIAL_MARKETS[activeMarket].currency} · {COMMERCIAL_MARKETS[activeMarket].label} · 12-month minimum term</p>{annualAvailable && <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-black"><button onClick={() => setBillingCycle("monthly")} className={cn("rounded-lg px-3 py-2", billingCycle === "monthly" ? "bg-slate-950 text-white" : "text-slate-500")}>Monthly</button><button onClick={() => setBillingCycle("yearly")} className={cn("rounded-lg px-3 py-2", billingCycle === "yearly" ? "bg-slate-950 text-white" : "text-slate-500")}>Annual</button></div>}</div></div>}
    <div className="grid min-w-0 gap-6 lg:grid-cols-3 lg:items-stretch">
      {[[managed, managedPrice, "Best starting point"], [growth, growthPrice, "Most popular"], [premium, premiumPrice, "For larger teams"]].map(([product, price, label]: any, index) => <motion.section key={product.slug} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={cn("relative flex min-w-0 flex-col overflow-hidden rounded-[2rem] p-7 shadow-xl sm:p-8", index === 1 ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-950")}><Badge className={cn("mb-5 w-fit", index === 1 ? "bg-white text-indigo-700 hover:bg-white" : "bg-slate-100 text-slate-700 hover:bg-slate-100")}>{label}</Badge><h3 className={cn("text-3xl font-black", index === 1 ? "text-white" : "text-slate-950")}>{product.name}</h3><p className={cn("mt-4 min-h-24 text-sm leading-6", index === 1 ? "text-indigo-100" : "text-slate-600")}>{product.description}</p><ul className="mt-5 space-y-3">{outcomes.slice(0, index === 0 ? 3 : 4).map((item) => <li key={item} className={cn("flex gap-2 text-sm font-semibold", index === 1 ? "text-white" : "text-slate-700")}><Check className={cn("h-4 w-4 shrink-0", index === 1 ? "text-indigo-200" : "text-indigo-600")} />{item}</li>)}</ul><div className={cn("mt-8 rounded-2xl p-5", index === 1 ? "bg-indigo-700" : "bg-slate-50")}><p className={cn("text-xs font-black uppercase tracking-[0.16em]", index === 1 ? "text-indigo-200" : "text-slate-400")}>Setup fee</p><p className={cn("mt-2 text-2xl font-black", index === 1 ? "text-white" : "text-slate-950")}>{formatCommercialMoney(price?.setupFee, price?.currency || "MYR")} <span className="text-sm font-semibold opacity-70">setup</span></p><p className={cn("mt-1 text-4xl font-black", index === 1 ? "text-white" : "text-slate-950")}>{formatCommercialMoney(price?.monthlyPrice, price?.currency || "MYR")}<span className="text-sm font-semibold opacity-70">/month</span></p><p className={cn("mt-2 text-xs font-semibold", index === 1 ? "text-indigo-100" : "text-slate-500")}>12-month initial commitment</p><p className={cn("mt-3 text-xs leading-5", index === 1 ? "text-indigo-100" : "text-slate-600")}><strong>Free preview:</strong> no card required. <strong>Billing:</strong> setup fee + first month due at checkout. <strong>Cancel:</strong> follow the written service terms.</p><Button onClick={() => handleSelect(product)} variant={index === 1 ? "secondary" : "default"} className={cn("mt-5 h-auto min-h-12 w-full rounded-xl py-3 text-xs font-black uppercase tracking-wide", index === 1 ? "bg-white text-indigo-700 hover:bg-indigo-50" : "bg-slate-950 text-white hover:bg-slate-800")}>{price?.monthlyConfigured ? "Get my growth plan" : "Request a growth plan"}<ArrowRight className="ml-2 h-4 w-4" /></Button></div></motion.section>)}
    </div>
    <section className="rounded-3xl border border-slate-200 bg-white p-7 text-slate-700" aria-label="Before you choose">
      <h3 className="text-2xl font-bold text-slate-950">Know exactly what you are buying</h3>
      <p className="mt-3 leading-7">The website is designed to help existing and future visitors understand your services and contact you. Paid advertising, ad spend, guaranteed traffic, rankings, leads or sales are not included unless they are separately scoped.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5"><p className="font-black text-slate-950">Domain ownership</p><p className="mt-2 text-sm leading-6">If you already own your domain, it remains yours. If Bennie Studio registers or manages a domain for you, ownership and transfer arrangements are confirmed in the written scope before payment.</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="font-black text-slate-950">What the monthly service covers</p><p className="mt-2 text-sm leading-6">Managed hosting, SSL, maintenance, the plan’s update allowance, enquiry infrastructure, and the tracking or improvement work included in your selected plan.</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="font-black text-slate-950">Support and turnaround</p><p className="mt-2 text-sm leading-6">Your support response target, update allowance, revision scope and expected turnaround are confirmed in writing before payment so there is no mystery SLA invented after checkout.</p></div>
        <div className="rounded-2xl bg-slate-50 p-5"><p className="font-black text-slate-950">Commitment, cancellation and transfer</p><p className="mt-2 text-sm leading-6">Managed plans have a 12-month initial commitment. Renewal, cancellation, export and transfer arrangements are confirmed in the written order terms. The managed website remains hosted while the service is active.</p></div>
      </div>
      <p className="mt-5 leading-7">Before payment, we also confirm page scope, content responsibilities, launch schedule and any custom features. Website Growth is most useful when you already attract visitors or have an agreed plan to reach them.</p>
      <Button variant="outline" className="mt-5" onClick={() => navigate(`/book-demo?market=${activeMarket}`)}>Discuss my scope first</Button>
    </section>
    {currentPlan && <p className="text-center text-xs font-bold text-slate-500">Current account entitlement: {currentPlan}. Existing subscriptions remain on their original plan.</p>}
    {pendingProduct && pendingPrice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Order summary"><div className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Order summary</p><h3 className="mt-2 text-2xl font-black text-slate-950">{pendingProduct.name}</h3></div><button onClick={() => setPendingProduct(null)} className="text-2xl leading-none text-slate-400" aria-label="Close">×</button></div><div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-700"><div className="flex justify-between"><span>Market / currency</span><span>{COMMERCIAL_MARKETS[activeMarket].label} · {pendingPrice.currency}</span></div><div className="flex justify-between"><span>Setup fee (one-time)</span><span>{formatCommercialMoney(pendingPrice.setupFee || 0, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>First month</span><span>{formatCommercialMoney(billingCycle === "monthly" ? pendingMonthly : (pendingPrice.annualPrice || 0), pendingPrice.currency)}</span></div><div className="flex justify-between border-t border-slate-200 pt-3 text-slate-950"><span>Due today</span><span>{formatCommercialMoney(dueToday, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>Billing</span><span>{pendingPrice.billingInterval === "month" ? `Renews monthly · ${pendingPrice.minimumTermMonths ?? COMMERCIAL_RECURRING_COMMITMENT_MONTHS}-month initial commitment` : "Managed service"}</span></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Your first payment includes the one-time setup fee and the first month of managed service. The service then renews monthly after onboarding.</p><Button onClick={() => { const product = pendingProduct; setPendingProduct(null); void startCheckout(product); }} className="mt-6 h-13 w-full rounded-2xl bg-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-500">Continue to secure checkout <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>}
  </div>;
};
export default Pricing;
