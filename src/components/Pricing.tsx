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

  const closeOrderSummary = React.useCallback(() => {
    setPendingProduct(null);
    const params = new URLSearchParams(location.search);
    if (params.has("product")) {
      params.delete("product");
      const search = params.toString();
      navigate({ pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash }, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  React.useEffect(() => {
    if (!pendingProduct) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOrderSummary();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeOrderSummary, pendingProduct]);

  const managed = products.find((product) => product.slug === "managed-website") || COMMERCIAL_FALLBACK_PRODUCTS[0];
  const growth = products.find((product) => product.slug === "website-growth") || COMMERCIAL_FALLBACK_PRODUCTS[1];
  const premium = products.find((product) => product.slug === "growth-partner") || COMMERCIAL_FALLBACK_PRODUCTS[2];
  const managedPrice = getCommercialPrice(managed, activeMarket); const growthPrice = getCommercialPrice(growth, activeMarket); const premiumPrice = getCommercialPrice(premium, activeMarket);
  React.useEffect(() => {
    if (!loading) {
      trackPublicEvent({ eventType: "plan_viewed", label: "Managed website plan comparison", target: "/pricing", metadata: { market: activeMarket, products: products.map((product) => product.slug) } });
    }
  }, [loading, activeMarket, products]);
  const annualAvailable = false;
  React.useEffect(() => { if (!annualAvailable && billingCycle === "yearly") setBillingCycle("monthly"); }, [annualAvailable, billingCycle]);
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  const pendingPrice = pendingProduct ? getCommercialPrice(pendingProduct, activeMarket) : null;
  const pendingMonthly = pendingPrice?.monthlyPrice || 0;
  const dueToday = pendingPrice?.billingInterval === "one_time" ? (pendingPrice?.monthlyPrice || 0) : ((pendingPrice?.setupFee || 0) + (billingCycle === "monthly" ? pendingMonthly : (pendingPrice?.annualPrice || 0)));
  const planSet = [
    [managed, managedPrice, "Professional presence"],
    [growth, growthPrice, "Active acquisition"],
    [premium, premiumPrice, "Ongoing growth"],
  ] as const;

  const comparisonRows = [
    ["Website management", ["Included", "Included", "Included"]],
    ["Conversion optimisation", ["Foundation", "Monthly", "Advanced"]],
    ["Local SEO", ["Foundation", "Expansion", "Ongoing"]],
    ["Landing pages", ["Limited", "Included", "Included"]],
    ["Growth support", ["—", "Limited", "Ongoing"]],
  ];

  return <div id="plans" className={cn("mx-auto max-w-6xl scroll-mt-24 px-5", hideIntro ? "pb-10 pt-2 sm:pb-14" : "py-14 sm:py-20")}>
    <div className="relative h-0 overflow-visible" aria-hidden="true">
      {planSet.map(([product]) => (
        <span key={product.slug} id={`plan-${product.slug}`} className="absolute -top-24" data-plan-anchor={product.slug} />
      ))}
    </div>
    {!hideIntro && (
      <div className="grid gap-8 border-b border-slate-300 pb-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-600">Managed website plans</p>
          <h2 className={cn("mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.02em] sm:text-5xl", onDark ? "text-white" : "text-slate-950")}>Choose the level of website support your business needs.</h2>
          <p className={cn("mt-5 max-w-2xl text-base leading-7", onDark ? "text-slate-300" : "text-slate-600")}>Start with the website itself, then add conversion, SEO and ongoing growth support when it makes sense.</p>
        </div>
        <p className="text-sm font-semibold leading-6 text-slate-500 lg:col-span-4 lg:text-right">{COMMERCIAL_MARKETS[activeMarket].label} · {COMMERCIAL_MARKETS[activeMarket].currency} · 12-month initial commitment</p>
      </div>
    )}

    <div className="mt-8 grid gap-4 md:hidden">
      {planSet.map(([product, price, bestFor], index) => {
        const isGrowth = product.slug === "website-growth";
        return (
          <article key={product.slug} className={cn("rounded-xl border bg-white p-5", isGrowth ? "border-2 border-indigo-500 bg-indigo-50/70 shadow-lg shadow-indigo-100/70" : "border-slate-200")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-600">{isGrowth ? "Most Popular" : bestFor}</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{product.name}</h3>
              </div>
              {isGrowth ? <Badge className="bg-indigo-600 text-white">Most Popular</Badge> : null}
            </div>
            <p className="mt-5 text-3xl font-semibold text-slate-950">{formatCommercialMoney(price?.monthlyPrice, price?.currency || "MYR")}<span className="text-sm font-normal text-slate-500">/month</span></p>
            <p className="mt-1 text-sm text-slate-500">+ {formatCommercialMoney(price?.setupFee, price?.currency || "MYR")} setup</p>
            <p className="mt-4 text-sm leading-6 text-slate-600">{product.description}</p>
            <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
              {comparisonRows.map(([label, values]: any) => (
                <div key={label} className="flex items-start justify-between gap-4 text-sm">
                  <span className="font-semibold text-slate-600">{label}</span>
                  <span className="text-right text-slate-700">{values[index]}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => handleSelect(product)} className={cn("mt-6 min-h-12 w-full px-5 font-semibold text-white", isGrowth ? "bg-indigo-600 hover:bg-indigo-500" : "bg-slate-950 hover:bg-slate-800")}>
              {price?.monthlyConfigured ? "Choose plan" : "Discuss plan"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </article>
        );
      })}
    </div>

    <div className="mt-8 hidden overflow-x-auto md:block">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="py-4 pr-5 text-sm font-semibold text-slate-600">Plan</th>
            {planSet.map(([product, price, bestFor], index) => (
              <th key={product.slug} className={cn("px-5 py-5 align-top", index === 1 && "bg-indigo-50/60")}>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-600">{index === 1 ? "Most Popular" : bestFor}</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{product.name}</h3>
                <p className="mt-3 text-sm font-normal leading-6 text-slate-600">{product.description}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-300">
            <th className="py-5 pr-5 text-sm font-semibold text-slate-600">Monthly</th>
            {planSet.map(([product, price], index) => (
              <td key={product.slug} className={cn("px-5 py-5 align-top", index === 1 && "bg-indigo-50/60")}>
                <p className="text-3xl font-semibold text-slate-950">{formatCommercialMoney(price?.monthlyPrice, price?.currency || "MYR")}<span className="text-sm font-normal text-slate-500">/month</span></p>
                <p className="mt-1 text-sm text-slate-500">+ {formatCommercialMoney(price?.setupFee, price?.currency || "MYR")} setup</p>
              </td>
            ))}
          </tr>
          <tr className="border-b border-slate-300">
            <th className="py-4 pr-5 text-sm font-semibold text-slate-600">Best for</th>
            {planSet.map(([product, price, bestFor], index) => <td key={product.slug} className={cn("px-5 py-4 text-sm text-slate-600", index === 1 && "bg-indigo-50/60")}>{bestFor}</td>)}
          </tr>
          {comparisonRows.map(([label, values]: any) => (
            <tr key={label} className="border-b border-slate-300">
              <th className="py-4 pr-5 text-sm font-semibold text-slate-600">{label}</th>
              {values.map((value: string, index: number) => <td key={index} className={cn("px-5 py-4 text-sm text-slate-600", index === 1 && "bg-indigo-50/60")}>{value}</td>)}
            </tr>
          ))}
          <tr>
            <th className="py-6 pr-5"></th>
            {planSet.map(([product, price], index) => (
              <td key={product.slug} className={cn("px-5 py-6", index === 1 && "bg-indigo-50/60")}>
                <Button onClick={() => handleSelect(product)} className={cn("min-h-12 w-full px-5 font-semibold text-white", index === 1 ? "bg-indigo-600 hover:bg-indigo-500" : "bg-slate-950 hover:bg-slate-800")}>{price?.monthlyConfigured ? "Choose plan" : "Discuss plan"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>

    <section className="mt-12 grid gap-8 border-t border-slate-300 pt-8 lg:grid-cols-12" aria-label="What fees cover">
      <div className="lg:col-span-4">
        <h3 className="text-2xl font-semibold text-slate-950">Know exactly what you are buying.</h3>
        <p className="mt-3 leading-7 text-slate-600">Advertising, guaranteed rankings, guaranteed leads and guaranteed sales are not included unless separately scoped.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:col-span-8">
        {[
          ["Setup fee", "Strategy, content structure, design, development, tracking and launch setup."],
          ["Monthly service", "Hosting, SSL, maintenance, updates, analytics and the optimisation included in your plan."],
          ["Domain ownership", "If you already own your domain, it remains yours. Any managed transfer is confirmed before payment."],
          ["Commitment and transfer", "Managed plans have a 12-month initial commitment. Renewal, cancellation and export arrangements are covered in the written terms."],
        ].map(([title, body]) => <div key={title} className="border-t border-slate-200 pt-4"><p className="font-semibold text-slate-950">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>)}
      </div>
      <div className="lg:col-start-5 lg:col-span-8">
        <Button variant="outline" onClick={() => navigate("/book-demo?market=" + activeMarket)}>Discuss my scope first</Button>
      </div>
    </section>

    {currentPlan && <p className="mt-8 text-center text-xs font-semibold text-slate-500">Current account entitlement: {currentPlan}. Existing subscriptions remain on their original plan.</p>}

    {pendingProduct && pendingPrice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Order summary" onClick={(event) => { if (event.target === event.currentTarget) closeOrderSummary(); }}><div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-600">Order summary</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">{pendingProduct.name}</h3></div><button type="button" onClick={closeOrderSummary} className="relative z-10 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-transparent text-2xl leading-none text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Close order summary" data-order-summary-close="true">×</button></div><div className="mt-6 space-y-3 border-y border-slate-200 py-5 text-sm font-semibold text-slate-700"><div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><span>Market / currency</span><span>{COMMERCIAL_MARKETS[activeMarket].label} · {pendingPrice.currency}</span></div><div className="flex justify-between"><span>Setup fee</span><span>{formatCommercialMoney(pendingPrice.setupFee || 0, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>First month</span><span>{formatCommercialMoney(billingCycle === "monthly" ? pendingMonthly : (pendingPrice.annualPrice || 0), pendingPrice.currency)}</span></div><div className="flex justify-between border-t border-slate-200 pt-3 text-slate-950"><span>Due today</span><span>{formatCommercialMoney(dueToday, pendingPrice.currency)}</span></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Your first payment includes the one-time setup fee and the first month of managed service.</p><Button onClick={() => { const product = pendingProduct; setPendingProduct(null); void startCheckout(product); }} className="mt-6 min-h-12 w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-500">Continue to secure checkout <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>}
  </div>;
};
export default Pricing;
