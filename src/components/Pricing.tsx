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
  return <div className={cn("mx-auto max-w-6xl px-5", hideIntro ? "pb-10 pt-2 sm:pb-14" : "py-14 sm:py-20")}>
    {!hideIntro && (
      <div className="grid gap-8 border-b border-slate-300 pb-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-indigo-600">Managed website plans</p>
          <h2 className={cn("mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl", onDark ? "text-white" : "text-slate-950")}>Choose the level of website management your business actually needs.</h2>
          <p className={cn("mt-5 max-w-2xl text-base leading-7", onDark ? "text-slate-300" : "text-slate-600")}>Each plan combines setup with an ongoing managed service. Pricing below follows your selected market.</p>
        </div>
        <p className="text-sm font-semibold leading-6 text-slate-500 lg:col-span-4 lg:text-right">{COMMERCIAL_MARKETS[activeMarket].label} · {COMMERCIAL_MARKETS[activeMarket].currency} · 12-month initial commitment</p>
      </div>
    )}

    <div className="mt-2 border-t border-slate-300">
      {[[managed, managedPrice, "Best starting point"], [growth, growthPrice, "Most popular"], [premium, premiumPrice, "For deeper growth"]].map(([product, price, label]: any, index) => (
        <motion.section key={product.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="grid gap-6 border-b border-slate-300 py-8 lg:grid-cols-[1.7fr_1fr_1fr_auto] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-indigo-600">{label}</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">{product.name}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{product.description}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {outcomes.slice(0, index === 0 ? 3 : 4).map((item) => <li key={item} className="flex gap-2 text-sm font-semibold text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />{item}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Setup</p>
            <p className="mt-2 text-xl font-bold text-slate-950">{formatCommercialMoney(price?.setupFee, price?.currency || "MYR")}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Monthly</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{formatCommercialMoney(price?.monthlyPrice, price?.currency || "MYR")}<span className="text-sm font-semibold text-slate-500">/month</span></p>
            <p className="mt-2 text-xs leading-5 text-slate-500">Setup + first month due at checkout when self-serve checkout is available.</p>
          </div>
          <Button onClick={() => handleSelect(product)} className="min-h-12 min-w-44 bg-slate-950 px-5 font-bold text-white hover:bg-indigo-600">{price?.monthlyConfigured ? "Choose plan" : "Discuss plan"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </motion.section>
      ))}
    </div>

    <section className="mt-10 border-t border-slate-300 pt-8 text-slate-700" aria-label="Before you choose">
      <h3 className="text-2xl font-bold text-slate-950">Know exactly what you are buying</h3>
      <p className="mt-3 max-w-3xl leading-7">The website is designed to help visitors understand your services and contact you. Advertising, guaranteed rankings, guaranteed leads and guaranteed sales are not included unless separately scoped.</p>
      <div className="mt-7 grid gap-6 md:grid-cols-2">
        {[
          ["Domain ownership", "If you already own your domain, it remains yours. Any managed registration or transfer arrangement is confirmed in writing before payment."],
          ["Monthly service", "Managed hosting, SSL, maintenance, plan-based updates, enquiry infrastructure and the tracking or improvement work included in your plan."],
          ["Support and turnaround", "Response targets, update allowance, revision scope and expected turnaround are confirmed in writing before payment."],
          ["Commitment and transfer", "Managed plans have a 12-month initial commitment. Renewal, cancellation, export and transfer arrangements are confirmed in the written terms."],
        ].map(([title, body]) => <div key={title} className="border-t border-slate-200 pt-4"><p className="font-bold text-slate-950">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>)}
      </div>
      <Button variant="outline" className="mt-7" onClick={() => navigate(`/book-demo?market=${activeMarket}`)}>Discuss my scope first</Button>
    </section>

    {currentPlan && <p className="mt-8 text-center text-xs font-bold text-slate-500">Current account entitlement: {currentPlan}. Existing subscriptions remain on their original plan.</p>}

    {pendingProduct && pendingPrice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Order summary"><div className="w-full max-w-lg rounded-xl bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-indigo-600">Order summary</p><h3 className="mt-2 text-2xl font-bold text-slate-950">{pendingProduct.name}</h3></div><button onClick={() => setPendingProduct(null)} className="text-2xl leading-none text-slate-400" aria-label="Close">×</button></div><div className="mt-6 space-y-3 border-y border-slate-200 py-5 text-sm font-bold text-slate-700"><div className="flex justify-between"><span>Market / currency</span><span>{COMMERCIAL_MARKETS[activeMarket].label} · {pendingPrice.currency}</span></div><div className="flex justify-between"><span>Setup fee</span><span>{formatCommercialMoney(pendingPrice.setupFee || 0, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>First month</span><span>{formatCommercialMoney(billingCycle === "monthly" ? pendingMonthly : (pendingPrice.annualPrice || 0), pendingPrice.currency)}</span></div><div className="flex justify-between border-t border-slate-200 pt-3 text-slate-950"><span>Due today</span><span>{formatCommercialMoney(dueToday, pendingPrice.currency)}</span></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Your first payment includes the one-time setup fee and the first month of managed service.</p><Button onClick={() => { const product = pendingProduct; setPendingProduct(null); void startCheckout(product); }} className="mt-6 min-h-12 w-full bg-indigo-600 font-bold text-white hover:bg-indigo-500">Continue to secure checkout <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>}
  </div>;
};  </div>;
};
export default Pricing;
