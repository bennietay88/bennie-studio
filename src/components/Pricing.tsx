import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { CHECKOUT_CURRENCIES, COMMERCIAL_FALLBACK_PRODUCTS, CommercialMarket, CommercialProduct, type CommercialCurrency, formatCommitmentLabel, formatCommercialMoney, getCommercialPrice, getMinimumTermMonths, marketForCurrency, COMMERCIAL_MARKETS, getStoredMarket, persistCommercialMarket } from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import { trackPublicEvent } from "../lib/publicTracking";
import { PLAN_DELIVERY_STANDARDS, PUBLIC_DELIVERY_PROMISES, type PublicPlanSlug } from "../constants/deliveryStandards";

interface PricingProps { currentPlan?: string; onSelectPlan?: (plan: any) => void; isDashboard?: boolean; onDark?: boolean; hideIntro?: boolean; }
const outcomes = ["Website planned and built around your offer", "Managed hosting, updates and launch support", "WhatsApp, call, booking and quotation enquiry paths", "Trust proof, local SEO foundation and analytics"];

export const Pricing: React.FC<PricingProps> = ({ currentPlan, onSelectPlan, onDark = false, hideIntro = false }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // The same market is used in public cards, the order review and Stripe checkout.
  // Avoid showing a USD teaser followed by a different regional price at checkout.
  const [checkoutCurrency, setCheckoutCurrency] = React.useState<CommercialCurrency>(() => COMMERCIAL_MARKETS[getStoredMarket()].currency);
  const publicMarket: CommercialMarket = marketForCurrency(checkoutCurrency);
  const { products, loading, error: pricingError } = usePublicCommercialPricing(publicMarket);
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [pendingProduct, setPendingProduct] = React.useState<CommercialProduct | null>(null);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const checkoutMarket = publicMarket;
  const { products: checkoutProducts, loading: checkoutPricingLoading, error: checkoutPricingError } = usePublicCommercialPricing(checkoutMarket);

  const startCheckout = async (product: CommercialProduct) => {
    let previewId: string | null = null;
    try { previewId = JSON.parse(localStorage.getItem("bt_preview_intent") || "{}").previewId || null; } catch { /* ignore malformed preview state */ }
    const queryReferral = new URLSearchParams(window.location.search).get("ref")?.trim() || "";
    if (queryReferral) localStorage.setItem("bt_platform_affiliate_ref", queryReferral);
    const referralCode = queryReferral || localStorage.getItem("bt_platform_affiliate_ref") || undefined;
    trackPublicEvent({ eventType: "checkout_started", label: product.name, target: "/pricing", metadata: { product: product.slug, currency: checkoutCurrency, billingCycle, previewId } });
    const checkoutProduct = checkoutProducts.find((item) => item.slug === product.slug) || product;
    const price = getCommercialPrice(checkoutProduct, checkoutMarket);
    if (onSelectPlan) return onSelectPlan({ ...product, price });
    if (product.slug === "custom-website") { navigate(`/apply-custom?product=${product.slug}`); return; }
    if (product.salesMotion !== "self_serve") { navigate(`/book-demo?product=${product.slug}`); return; }
    localStorage.setItem("bt_checkout_intent", JSON.stringify({ productSlug: product.slug, currency: checkoutCurrency, billingCycle, savedAt: new Date().toISOString() }));

    // New customers pay first. Bennie Studio creates/claims the portal only
    // after Stripe confirms payment, matching the existing public preview flow.
    if (!profile?.businessId) {
      try {
        const response = await fetch("/api/public/plan-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productSlug: product.slug, billingCycle, currency: checkoutCurrency, customerEmail: profile?.email || undefined, referralCode, termsAccepted: true }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.url) throw new Error(result.error || "Unable to start secure checkout.");
        window.location.href = result.url;
      } catch (error: any) {
        toast.error(error.message || "Payment process failed");
      }
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be logged in to start checkout.");
      const response = await fetch("/api/create-checkout-session", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ businessId: profile.businessId, customerEmail: profile.email, type: "subscription", productSlug: product.slug, billingCycle, market: checkoutMarket, upgradeFrom: currentPlan === "managed-website" ? "managed-website" : undefined, termsAccepted: true }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Unable to start checkout.");
      window.location.href = result.url;
    } catch (error: any) { toast.error(error.message || "Payment process failed"); }
  };

  const handleSelect = async (product: CommercialProduct) => {
    if (loading || pricingError) { toast.error("Wait for verified market pricing before selecting a plan."); return; }
    const currentProduct = products.find((item) => item.slug === product.slug);
    if (!currentProduct || !getCommercialPrice(currentProduct, publicMarket)) {
      toast.error("This market's price is unavailable. Please contact Bennie Studio.");
      return;
    }
    if (onSelectPlan || currentProduct.salesMotion !== "self_serve") return startCheckout(currentProduct);
    // Self-serve selection always opens the order review. The server remains
    // authoritative for live Stripe availability and fails closed if a market
    // has not been activated yet.
    setTermsAccepted(false);
    setPendingProduct(currentProduct);
  };

  const closeOrderSummary = React.useCallback(() => {
    setPendingProduct(null);
    setTermsAccepted(false);
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
  const managedPrice = getCommercialPrice(managed, publicMarket); const growthPrice = getCommercialPrice(growth, publicMarket); const premiumPrice = getCommercialPrice(premium, publicMarket);
  React.useEffect(() => {
    if (!loading) {
      trackPublicEvent({ eventType: "plan_viewed", label: "Managed website plan comparison", target: "/pricing", metadata: { currency: checkoutCurrency, market: publicMarket, products: products.map((product) => product.slug) } });
    }
  }, [loading, products, checkoutCurrency, publicMarket]);
  const annualAvailable = false;
  React.useEffect(() => { if (!annualAvailable && billingCycle === "yearly") setBillingCycle("monthly"); }, [annualAvailable, billingCycle]);
  const pendingCheckoutProduct = pendingProduct ? (checkoutProducts.find((item) => item.slug === pendingProduct.slug) || pendingProduct) : null;
  const pendingPrice = pendingCheckoutProduct && !checkoutPricingLoading && !checkoutPricingError ? getCommercialPrice(pendingCheckoutProduct, checkoutMarket) : null;
  const pendingMonthly = pendingPrice?.monthlyPrice || 0;
  const dueToday = pendingPrice?.billingInterval === "one_time" ? (pendingPrice?.monthlyPrice || 0) : ((pendingPrice?.setupFee || 0) + (billingCycle === "monthly" ? pendingMonthly : (pendingPrice?.annualPrice || 0)));
  const pendingTermMonths = getMinimumTermMonths(pendingPrice);
  const minimumInitialTermTotal = pendingPrice?.monthlyPrice == null ? null : (pendingPrice.setupFee || 0) + (pendingPrice.monthlyPrice * pendingTermMonths);
  const pendingStandard = pendingCheckoutProduct ? PLAN_DELIVERY_STANDARDS[pendingCheckoutProduct.slug as PublicPlanSlug] : null;
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

  return <div id="plans" aria-busy={loading} className={cn("brand-shell scroll-mt-24", hideIntro ? "py-14 sm:py-20" : "py-14 sm:py-20")}>
    <div aria-live="polite" aria-atomic="true">
      {loading ? <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-900"><Loader2 className="h-4 w-4 animate-spin" /> Checking current {COMMERCIAL_MARKETS[publicMarket].label} rates…</div> : null}
      {pricingError ? <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Verified prices are temporarily unavailable. Plan details remain visible; please contact the studio for a quote. Checkout has been disabled.</div> : null}
    </div>
    <div className="relative h-0 overflow-visible" aria-hidden="true">
      {planSet.map(([product]) => (
        <span key={product.slug} id={`plan-${product.slug}`} className="absolute -top-24" data-plan-anchor={product.slug} />
      ))}
    </div>
    {!hideIntro && (
      <div className="grid gap-8 border-b border-slate-300 pb-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-600">Managed website plans</p>
          <h2 className={cn("mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.02em] sm:text-5xl", onDark ? "text-white" : "text-slate-950")}>Three plans. One managed website system.</h2>
          <p className={cn("mt-5 max-w-2xl text-base leading-7", onDark ? "text-slate-300" : "text-slate-600")}>Start with a professionally managed website, then add deeper conversion, SEO and growth support as the business needs it.</p>
        </div>
        <p className="text-sm font-semibold leading-6 text-slate-500 lg:col-span-4 lg:text-right">Select your market below · setup and recurring charges are shown together · minimum terms are displayed per plan</p>
      </div>
    )}

    <div className="mt-8 flex flex-col gap-3 border border-[#dfe2ea] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Choose pricing currency">
      <div>
        <label htmlFor="pricing-currency" className="block text-sm font-semibold text-slate-950">Your billing currency</label>
        <p className="mt-1 text-xs leading-5 text-slate-600">Prices are market-specific published rates, not currency-converted estimates. The same currency continues to the order summary.</p>
      </div>
      <select id="pricing-currency" value={checkoutCurrency} onChange={(event) => { const currency = event.target.value as CommercialCurrency; setCheckoutCurrency(currency); persistCommercialMarket(marketForCurrency(currency)); setTermsAccepted(false); }} className="min-h-11 min-w-36 border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
        {CHECKOUT_CURRENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </div>
    <div className="mt-6 grid gap-4 lg:grid-cols-3" aria-busy={loading}>

      {planSet.map(([product, price, bestFor], index) => {
        const isGrowth = product.slug === "website-growth";
        const priceReady = !loading && !pricingError && Boolean(price);
        return (
          <article key={product.slug} className={cn("border p-6 lg:p-7", isGrowth ? "border-[#101827] bg-[#101827] text-white shadow-[0_28px_80px_-48px_rgba(15,23,42,.75)]" : "border-[#dfe2ea] bg-white")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={isGrowth ? "text-xs font-semibold uppercase tracking-[0.08em] !text-[#b9b1ff]" : "text-xs font-semibold uppercase tracking-[0.08em] text-[#5746e8]"}>{isGrowth ? "Recommended" : bestFor}</p>
                <h3 className={isGrowth ? "mt-2 text-2xl font-semibold !text-white" : "mt-2 text-2xl font-semibold text-[#141821]"}>{product.name}</h3>
              </div>
            </div>
            <p className={isGrowth ? "mt-5 text-3xl font-semibold !text-white" : "mt-5 text-3xl font-semibold text-[#141821]"}>{priceReady ? formatCommercialMoney(price?.monthlyPrice, price?.currency || checkoutCurrency) : loading ? "Checking…" : "Ask for quote"}<span className={isGrowth ? "text-sm font-normal !text-white/75" : "text-sm font-normal text-[#526071]"}>/month</span></p>
            <p className={isGrowth ? "mt-1 text-sm !text-white/75" : "mt-1 text-sm text-[#526071]"}>+ {priceReady ? formatCommercialMoney(price?.setupFee, price?.currency || checkoutCurrency) : "—"} one-time setup</p>
            <p className={isGrowth ? "mt-3 border-t border-white/20 pt-3 text-sm font-semibold !text-white" : "mt-3 border-t border-slate-200 pt-3 text-sm font-semibold text-slate-950"}>
              First payment: {!priceReady || price?.monthlyPrice == null ? "Confirm by quote" : formatCommercialMoney((price.setupFee || 0) + price.monthlyPrice, price.currency)}
            </p>
            <p className={isGrowth ? "mt-1 text-xs !text-white/70" : "mt-1 text-xs text-slate-500"}>Setup + first month, before any applicable tax. Future months billed separately.</p>
            <p className={isGrowth ? "mt-2 text-xs font-semibold !text-white/65" : "mt-2 text-xs font-semibold text-[#687386]"}>{formatCommitmentLabel(getMinimumTermMonths(price))}, then month-to-month unless the agreed order states otherwise.</p>
            <p className={isGrowth ? "mt-4 text-sm leading-6 !text-white/70" : "mt-4 text-sm leading-6 text-[#526071]"}>{product.description}</p>
            {PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug] && (
              <div className={isGrowth ? "mt-5 border-t border-white/20 pt-4" : "mt-5 border-t border-[#dfe2ea] pt-4"}>
                <p className={isGrowth ? "text-[10px] font-black uppercase tracking-widest !text-[#b9b1ff]" : "text-[10px] font-black uppercase tracking-widest text-[#5746e8]"}>Defined delivery scope</p>
                <ul className="mt-3 space-y-2">
                  {[
                    PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug].pages,
                    PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug].revisions,
                    PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug].targetFirstDraft,
                    PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug].updates,
                    PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug].targetUpdateTurnaround,
                  ].map((item) => (
                    <li key={item} className={isGrowth ? "flex gap-2 text-xs leading-5 !text-white/75" : "flex gap-2 text-xs leading-5 text-[#526071]"}>
                      <Check className={isGrowth ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b9b1ff]" : "mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5746e8]"} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={isGrowth ? "mt-5 space-y-3 border-t border-white/25 pt-4" : "mt-5 space-y-3 border-t border-[#dfe2ea] pt-4"}>
              {comparisonRows.map(([label, values]: any) => (
                <div key={label} className="flex items-start justify-between gap-4 text-sm">
                  <span className={isGrowth ? "font-semibold !text-white/80" : "font-semibold text-[#526071]"}>{label}</span>
                  <span className={isGrowth ? "text-right font-semibold !text-white" : "text-right text-[#526071]"}>{values[index]}</span>
                </div>
              ))}
            </div>
            <Button type="button" disabled={!priceReady} onClick={() => handleSelect(product)} className={cn("mt-6 min-h-12 w-full px-5 font-semibold", isGrowth ? "bg-white text-[#101827] hover:bg-[#eeebff]" : "bg-[#141821] text-white hover:bg-[#5746e8]")}>
              {!priceReady ? loading ? "Verifying rates…" : "Contact for pricing" : product.salesMotion === "self_serve" ? "Choose plan" : "Discuss plan"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </article>
        );
      })}
    </div>

    <section className="mt-10 border border-[#dfe2ea] bg-[#f8f8ff] p-6 sm:p-8" aria-label="Delivery safeguards">
      <div className="grid gap-7 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[#5746e8]">Before your site goes live</p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">Payment starts the managed build.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            You see the direction before buying, then approve the finished website before launch.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PUBLIC_DELIVERY_PROMISES.slice(0, 4).map((promise) => (
            <div key={promise} className="flex gap-3 border-t border-slate-200 pt-3 text-sm font-semibold leading-6 text-slate-700">
              <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
              {promise}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="mt-12 grid gap-8 border-t border-slate-300 pt-8 lg:grid-cols-12" aria-label="What fees cover">
      <div className="lg:col-span-4">
        <h3 className="text-2xl font-semibold text-slate-950">Know exactly what you are buying.</h3>
        <p className="mt-3 leading-7 text-slate-600">Advertising, guaranteed rankings, guaranteed leads and guaranteed sales are not included unless separately scoped.</p>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">Timelines begin after the business brief and required assets are complete. Complex integrations, ecommerce, custom applications and work outside the defined plan scope are quoted separately before work begins.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:col-span-8">
        {[
          ["Setup fee", "Strategy, content structure, design, development, tracking and launch setup."],
          ["Monthly service", "Hosting, SSL, maintenance, updates, analytics and the optimisation included in your plan."],
          ["Domain ownership", "If you already own your domain, it remains yours. Any managed transfer is confirmed before payment."],
          ["Commitment and transfer", "Each plan shows its initial commitment. Before you pay, review the written Terms for renewal, cancellation notice, and any supported data export or transfer. A managed-platform site may not be portable as standalone source code."],
        ].map(([title, body]) => <div key={title} className="border-t border-slate-200 pt-4"><p className="font-semibold text-slate-950">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>)}
      </div>
      <div className="lg:col-start-5 lg:col-span-8">
        <Button variant="outline" onClick={() => navigate("/book-demo")}>Discuss my scope first</Button>
      </div>
    </section>

    <section className="mt-9 border-t border-slate-200 pt-7" aria-label="Before you commit">
      <h3 className="text-xl font-semibold text-slate-950">Still comparing options?</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Explore clearly labelled design examples before you choose, or ask us to confirm the exact page count, delivery scope, required content and exit options in writing. We do not present illustrative demos as completed client results.</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-indigo-700">
        <Link to="/case-studies" className="underline underline-offset-4">Explore project examples</Link>
        <Link to="/generate-preview" className="underline underline-offset-4">Try a free website direction</Link>
        <Link to="/terms" className="underline underline-offset-4">Read service terms</Link>
      </div>
    </section>
    {currentPlan && <p className="mt-8 text-center text-xs font-semibold text-slate-500">Current account entitlement: {currentPlan}. Existing subscriptions remain on their original plan.</p>}

    {pendingProduct && (checkoutPricingLoading || checkoutPricingError || !pendingPrice) ? <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">{checkoutPricingLoading ? "Verifying current order amounts…" : "This market's checkout rates are unavailable. Please contact the studio."}</div> : null}
    {pendingProduct && pendingPrice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Order summary" onClick={(event) => { if (event.target === event.currentTarget) closeOrderSummary(); }}><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-600">Order summary</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">{pendingProduct.name}</h3></div><button type="button" onClick={closeOrderSummary} className="relative z-10 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-transparent text-2xl leading-none text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Close order summary" data-order-summary-close="true">×</button></div><div className="mt-6 space-y-3 border-y border-slate-200 py-5 text-sm font-semibold text-slate-700"><div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><label htmlFor="checkout-currency">Billing currency</label><select id="checkout-currency" value={checkoutCurrency} onChange={(event) => { const currency = event.target.value as CommercialCurrency; setCheckoutCurrency(currency); persistCommercialMarket(marketForCurrency(currency)); setTermsAccepted(false); }} className="border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">{CHECKOUT_CURRENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div className="flex justify-between"><span>Setup fee</span><span>{formatCommercialMoney(pendingPrice.setupFee || 0, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>First month</span><span>{formatCommercialMoney(billingCycle === "monthly" ? pendingMonthly : (pendingPrice.annualPrice || 0), pendingPrice.currency)}</span></div><div className="flex justify-between"><span>Initial commitment</span><span>{pendingTermMonths} month{pendingTermMonths === 1 ? "" : "s"}</span></div><div className="flex justify-between border-t border-slate-200 pt-3 text-slate-950"><span>Due today, before tax</span><span>{formatCommercialMoney(dueToday, pendingPrice.currency)}</span></div><div className="flex justify-between gap-4 text-xs text-slate-600"><span>Estimated total over initial {pendingTermMonths}-month term, including setup</span><span className="shrink-0 font-semibold">{formatCommercialMoney(minimumInitialTermTotal, pendingPrice.currency)}</span></div></div>{pendingStandard ? <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Managed delivery included</p><ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-700">{[pendingStandard.pages, pendingStandard.revisions, pendingStandard.targetFirstDraft, pendingStandard.updates, pendingStandard.targetUpdateTurnaround].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{item}</li>)}</ul></div> : null}<p className="mt-4 text-xs leading-5 text-slate-500">Your first payment includes the one-time setup fee and the first month of managed service. The site is human-reviewed, quality-checked and requires your approval before launch.</p><p className="mt-2 text-xs font-semibold leading-5 text-emerald-700">No account is required before payment. New customers activate their Bennie Studio portal after Stripe confirms the payment.</p><label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-700"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>I confirm this scope, {pendingTermMonths}-month initial commitment and recurring managed service, and agree to the <Link to={`/terms?market=${checkoutMarket}`} target="_blank" className="text-indigo-600 underline underline-offset-2">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-indigo-600 underline underline-offset-2">Privacy Policy</Link>.</span></label><Button disabled={!termsAccepted || checkoutPricingLoading || Boolean(checkoutPricingError) || !pendingPrice} onClick={() => { const product = pendingProduct; setPendingProduct(null); void startCheckout(product); }} className="mt-6 min-h-12 w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">Continue to secure checkout <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>}
  </div>;
};
export default Pricing;
