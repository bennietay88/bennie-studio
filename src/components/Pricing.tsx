import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { COMMERCIAL_FALLBACK_PRODUCTS, CommercialMarket, CommercialProduct, type CommercialCurrency, formatCommitmentLabel, formatCommercialMoney, getCommercialPrice, getMinimumTermMonths, marketForCurrency, COMMERCIAL_MARKETS } from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import { trackPublicEvent } from "../lib/publicTracking";
import { INTRO_OFFER_CODE, getIntroductoryQuote } from "../lib/introOffer";
import { PLAN_DELIVERY_STANDARDS, type PublicPlanSlug } from "../constants/deliveryStandards";

interface PricingProps { currentPlan?: string; onSelectPlan?: (plan: any) => void; isDashboard?: boolean; onDark?: boolean; hideIntro?: boolean; editorial?: boolean; }
const outcomes = ["Website planned and built around your offer", "Managed hosting, updates and launch support", "WhatsApp, call, booking and quotation enquiry paths", "Trust proof, local SEO foundation and analytics"];

export const Pricing: React.FC<PricingProps> = ({ currentPlan, onSelectPlan, onDark = false, hideIntro = false, editorial = false }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // The same market is used in public cards, the order review and Stripe checkout.
  // Avoid showing a USD teaser followed by a different regional price at checkout.
  const checkoutCurrency: CommercialCurrency = "USD";
  const publicMarket: CommercialMarket = marketForCurrency(checkoutCurrency);
  const { products, loading, error: pricingError } = usePublicCommercialPricing(publicMarket);
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");
  const [pendingProduct, setPendingProduct] = React.useState<CommercialProduct | null>(null);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [accountWaiver,setAccountWaiver]=React.useState<{loading:boolean;source:string|null;error:boolean}>({loading:false,source:null,error:false});
  React.useEffect(()=>{
    if(!pendingProduct||!profile?.businessId){setAccountWaiver({loading:false,source:null,error:false});return;}
    let aborted=false;
    setAccountWaiver({loading:true,source:null,error:false});
    (async()=>{
      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(!session?.access_token)throw new Error("Not authenticated");
        const response=await fetch(`/api/account/otc-waiver?businessId=${encodeURIComponent(profile.businessId)}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
        if(!response.ok)throw new Error("Waiver check unavailable");
        const result=await response.json();
        if(!aborted)setAccountWaiver({loading:false,source:result.source || null,error:false});
      }catch{if(!aborted)setAccountWaiver({loading:false,source:null,error:true});}
    })();
    return()=>{aborted=true;};
  },[pendingProduct,profile?.businessId]);
  const [introOfferEmail, setIntroOfferEmail] = React.useState(profile?.email || "");
  const checkoutMarket = publicMarket;
  // Same market and data as the public cards: do not fire a second API request.
  const checkoutProducts = products;
  const checkoutPricingLoading = loading;
  const checkoutPricingError = pricingError;
  const promoActive = false;
  React.useEffect(() => {
    if (!currentPlan && !onSelectPlan) {
      trackPublicEvent({ eventType: "pricing_view", label: "Public pricing", target: "/pricing", metadata: { market: publicMarket } });
    }
  }, [currentPlan, onSelectPlan, publicMarket]);

  const startCheckout = async (product: CommercialProduct) => {
    let previewId: string | null = null;
    try { previewId = JSON.parse(sessionStorage.getItem("bt_preview_intent") || "{}").previewId || null; } catch { /* ignore malformed preview state */ }
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
        const customerEmail = profile?.email || (promoActive ? introOfferEmail.trim() : undefined);
        if (promoActive && !customerEmail) {
          toast.error("Enter your email so we can check offer eligibility.");
          return;
        }
        const response = await fetch("/api/public/plan-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productSlug: product.slug, billingCycle, currency: checkoutCurrency, customerEmail, referralCode, introOffer: promoActive ? INTRO_OFFER_CODE : undefined, termsAccepted: true }),
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

  // Product-specific landing pages can open the existing reviewed order
  // summary directly. This never bypasses the verified price, contract
  // acknowledgement, or Stripe checkout safeguards.
  const requestedProduct = new URLSearchParams(location.search).get("product");
  React.useEffect(() => {
    if (location.pathname !== "/pricing" || requestedProduct !== "personal-profile"
      || loading || pricingError || pendingProduct || currentPlan || onSelectPlan) return;
    const item = products.find((product) => product.slug === "personal-profile");
    if (!item || item.salesMotion !== "self_serve" || !getCommercialPrice(item, publicMarket)) return;
    setTermsAccepted(false);
    setPendingProduct(item);
  }, [location.pathname, requestedProduct, loading, pricingError, pendingProduct, currentPlan, onSelectPlan, products, publicMarket]);

  const handleSelect = async (product: CommercialProduct) => {
    trackPublicEvent({eventType:"plan_selected",label:product.name,target:"/pricing",metadata:{product:product.slug,currency:checkoutCurrency,market:publicMarket}});
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

  const profilePlan = products.find((product) => product.slug === "personal-profile") || COMMERCIAL_FALLBACK_PRODUCTS.find((product) => product.slug === "personal-profile")!;
  const managed = products.find((product) => product.slug === "managed-website") || COMMERCIAL_FALLBACK_PRODUCTS[0];
  const growth = products.find((product) => product.slug === "website-growth") || COMMERCIAL_FALLBACK_PRODUCTS[1];
  const premium = products.find((product) => product.slug === "growth-partner") || COMMERCIAL_FALLBACK_PRODUCTS[2];
  const profilePrice = getCommercialPrice(profilePlan, publicMarket);
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
  const pendingOfferQuote = getIntroductoryQuote(pendingMonthly, accountWaiver.source ? 0 : (pendingPrice?.setupFee || 0), getMinimumTermMonths(pendingPrice), promoActive);
  const dueToday = pendingOfferQuote.dueToday;
  const pendingTermMonths = pendingOfferQuote.termMonths;
  const pendingStandard = pendingCheckoutProduct ? PLAN_DELIVERY_STANDARDS[pendingCheckoutProduct.slug as PublicPlanSlug] : null;
  const planSet = [
    [profilePlan, profilePrice, "For solo professionals"],
    [managed, managedPrice, "For service businesses"],
    [growth, growthPrice, "Active acquisition"],
    [premium, premiumPrice, "Ongoing growth"],
  ] as const;

  const comparisonRows = [
    ["Website management", ["Included", "Included", "Included", "Included"]],
    ["Conversion optimisation", ["Contact CTA", "Foundation", "Monthly", "Advanced"]],
    ["Local SEO", ["Basic on-page", "Foundation", "Expansion", "Ongoing"]],
    ["Landing pages", ["Not included", "Limited", "Included", "Included"]],
    ["Growth support", ["—", "—", "Limited", "Ongoing"]],
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
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1741ed]">Straightforward managed website pricing</p>
          <h1 className={cn("mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.02em] sm:text-5xl", onDark ? "text-white" : "text-slate-950")}>Clear pricing. A website built to work for your business.</h1>
          <p className={cn("mt-5 max-w-2xl text-base leading-7", onDark ? "text-slate-300" : "text-slate-600")}>Share your business details once. Bennie Studio uses AI-assisted content and automated website creation to prepare your managed site, with human review when needed. Compare hosting, update allowances and growth support alongside setup fees, monthly charges and minimum commitments.</p>
        </div>
        <p className="text-sm font-semibold leading-6 text-slate-500 lg:col-span-4 lg:text-right">All new orders are billed in USD · automated website production + managed service · setup, monthly fees and commitments shown clearly</p>
      </div>
    )}

    <div className={editorial ? "mt-3 flex flex-col gap-3 border border-[#d5dce6] bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between" : "mt-8 flex flex-col gap-3 border border-[#dfe2ea] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"} aria-label="Billing currency">
      <div>
        <p className="block text-sm font-semibold text-slate-950">Billing currency</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">All published prices and new checkout charges are in US dollars (USD), regardless of location. AI-assisted creation accelerates delivery; the plan comparison defines ongoing human support and update limits.</p>
      </div>
      <span className="border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-900">USD ($)</span>
    </div>
    {editorial ? (
      <>
        <div className="s28-price-plans !grid !grid-cols-1 md:!grid-cols-2 xl:!grid-cols-4" aria-busy={loading}>
        {planSet.map(([product,price,bestFor])=>{
          const recommended=product.slug==="website-growth";
          const priceReady=!loading&&!pricingError&&Boolean(price);
          const offer=getIntroductoryQuote(price?.monthlyPrice||0,price?.setupFee||0,getMinimumTermMonths(price),promoActive);
          const delivery=PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug];
          return <article className={"s28-price-card"+(recommended?" s28-price-featured":"")} key={product.slug}>
            <div className="s28-price-best">{recommended?"Recommended / Most balanced":bestFor}</div>
            <h3 className="s28-price-name">{product.name}</h3>
            <p className="s28-price-desc">{product.description}</p>
            <div className="s28-price-number" aria-label={priceReady?`${formatCommercialMoney(price?.monthlyPrice,price?.currency||checkoutCurrency)} per month`:"Plan monthly price pending verification"}><span className="s28-price-amount">{priceReady?formatCommercialMoney(price?.monthlyPrice,price?.currency||checkoutCurrency):loading?"Checking…":"Ask for quote"}</span><span className="s28-price-period">/ month</span></div>
            <p className="s28-price-fee">+ {priceReady?formatCommercialMoney(price?.setupFee,price?.currency||checkoutCurrency):"—"} one-time website setup</p>
            <div className="s28-price-ledger" aria-label={product.name+" upfront and commitment costs"}>
              <div><span>First payment</span><strong>{priceReady?formatCommercialMoney(offer.dueToday,price.currency):"By quote"}</strong></div>
              <div><span>Minimum commitment</span><strong>{formatCommitmentLabel(offer.termMonths)}</strong></div>
              <div className="s28-price-total"><span>Monthly after first payment</span><strong>{priceReady?formatCommercialMoney(price.monthlyPrice,price.currency):"By quote"}</strong></div>
            </div>
            <p className="s28-price-explanation">{promoActive?"Optional offer: the first month of service is free, but the 12-month commitment applies. Setup remains payable.":"First payment includes setup and the first service month. Subsequent months billed separately."} All amounts before applicable tax.</p>
            <div className="s28-price-plan-includes">
              <p>Scope at a glance</p>
              <ul>{delivery?[delivery.pages,delivery.revisions,delivery.updates].map(x=><li key={x}><Check size={15}/>{x}</li>):<li><Check size={15}/> Scope confirmed before order</li>}</ul>
            </div>
            <div className="s28-price-action"><Button type="button" disabled={!priceReady} onClick={()=>handleSelect(product)} className="w-full px-5 font-semibold">
              {!priceReady?loading?"Verifying rates…":"Contact for pricing":product.salesMotion==="self_serve"?"Choose this plan":"Discuss this plan"} <ArrowRight className="ml-2 h-4 w-4"/>
            </Button><p className="s28-price-minor">{recommended?"Recommended for businesses actively acquiring customers.":product.salesMotion==="self_serve"?"Review the order, terms and totals before payment.":"We'll clarify fit, scope and pricing together."}</p></div>
          </article>;
        })}
      </div>
      <div className="s28-compare" id="compare-scope">
        <h2>Compare what's actually included.</h2>
        <p>The published delivery scope and ongoing growth support vary by plan. On mobile, compare each plan's complete scope without horizontal scrolling.</p>
        <div className="mt-5 grid gap-4 md:hidden" aria-label="Mobile managed website plan comparison">
          {planSet.map(([product], index) => {
            const standard = PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug];
            const mobileRows: Array<[string, string]> = [
              ["Website pages", standard?.pages || "Confirm scope"],
              ["Design revisions", standard?.revisions || "Confirm scope"],
              ["First draft target", standard?.targetFirstDraft || "Confirm scope"],
              ["Ongoing updates", standard?.updates || "Confirm scope"],
              ["Update turnaround target", standard?.targetUpdateTurnaround || "Confirm scope"],
              ...comparisonRows.map(([label, values]: any) => [String(label), String(values[index] || "—")] as [string, string]),
            ];
            return <section key={product.slug} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4" aria-label={product.name + " plan scope"}>
              <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
              <dl className="mt-4 divide-y divide-slate-100">
                {mobileRows.map(([label, value]) => <div key={label} className="grid min-w-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-3 py-3 text-sm">
                  <dt className="min-w-0 break-words font-semibold text-slate-600">{label}</dt>
                  <dd className="min-w-0 break-words text-right font-semibold text-slate-900">{value}</dd>
                </div>)}
              </dl>
            </section>;
          })}
        </div>
        <div className="s28-compare-scroll hidden md:block" role="region" aria-label="Detailed managed website plan comparison" tabIndex={0}>
          <table><thead><tr><th scope="col">Included scope</th>{planSet.map(([product])=><th scope="col" key={product.slug}>{product.name}</th>)}</tr></thead>
          <tbody>
            {[
              ["Website pages","pages"],
              ["Design revisions","revisions"],
              ["First draft target","targetFirstDraft"],
              ["Ongoing updates","updates"],
              ["Update turnaround target","targetUpdateTurnaround"],
            ].map(([label,field])=><tr key={field}><th scope="row">{label}</th>{planSet.map(([product])=><td key={product.slug}>{PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug]?.[field as keyof typeof PLAN_DELIVERY_STANDARDS[PublicPlanSlug]]||"Confirm scope"}</td>)}</tr>)}
            {comparisonRows.map(([label,values]:any)=><tr key={label}><th scope="row">{label}</th>{values.map((value:string,index:number)=><td key={planSet[index][0].slug}>{value}</td>)}</tr>)}
          </tbody></table>
        </div>
      </div>
      </>
    ) : (
    <div className="mt-6 grid gap-4 lg:grid-cols-4" aria-busy={loading}>

      {planSet.map(([product, price, bestFor], index) => {
        const isGrowth = product.slug === "website-growth";
        const priceReady = !loading && !pricingError && Boolean(price);
        const introQuote = getIntroductoryQuote(price?.monthlyPrice || 0, price?.setupFee || 0, getMinimumTermMonths(price), promoActive);
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
              First payment: {!priceReady || price?.monthlyPrice == null ? "Confirm by quote" : formatCommercialMoney(introQuote.dueToday, price.currency)}
            </p>
            <p className={isGrowth ? "mt-1 text-xs !text-white/70" : "mt-1 text-xs text-slate-500"}>{promoActive ? "Setup only; first month of service discounted to zero. Before tax." : "Setup + first month, before any applicable tax. Future months billed separately."}</p>
            <p className={isGrowth ? "mt-2 text-xs font-semibold !text-white/65" : "mt-2 text-xs font-semibold text-[#687386]"}>{formatCommitmentLabel(introQuote.termMonths)}, then month-to-month unless the agreed order states otherwise.</p>
            <p className={isGrowth ? "mt-2 text-sm font-semibold !text-white" : "mt-2 text-sm font-semibold text-[#141821]"}>Monthly after first payment: {priceReady ? formatCommercialMoney(price.monthlyPrice, price.currency) : "Confirm by quote"}</p>
            <p className={isGrowth ? "mt-1 text-xs !text-white/65" : "mt-1 text-xs text-[#687386]"}>Including setup, before any applicable taxes. The optional introductory offer changes the commitment.</p>
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
    )}

    <section className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between" aria-label="Plan details">
      <p className="max-w-2xl text-sm leading-6 text-slate-600">You approve the finished site before launch. Your existing domain remains yours. Review the plan scope, commitment and cancellation terms before checkout.</p>
      <div className="flex shrink-0 flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-indigo-700">
        <Link to="/generate-preview" className="underline underline-offset-4">Get a free preview</Link>
        <Link to="/terms" className="underline underline-offset-4">Service terms</Link>
        <button type="button" onClick={() => navigate("/book-demo")} className="underline underline-offset-4">Ask a question</button>
      </div>
    </section>
    {currentPlan && <p className="mt-8 text-center text-xs font-semibold text-slate-500">Current account entitlement: {currentPlan}. Existing subscriptions remain on their original plan.</p>}

    {pendingProduct && (checkoutPricingLoading || checkoutPricingError || !pendingPrice) ? <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">{checkoutPricingLoading ? "Verifying current order amounts…" : "This market's checkout rates are unavailable. Please contact the studio."}</div> : null}
    {pendingProduct && pendingPrice && createPortal(<div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Order summary" onClick={(event) => { if (event.target === event.currentTarget) closeOrderSummary(); }}><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-600">Order summary</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">{pendingProduct.name}</h3></div><button type="button" onClick={closeOrderSummary} className="relative z-10 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-transparent text-2xl leading-none text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Close order summary" data-order-summary-close="true">×</button></div><div className="mt-6 space-y-3 border-y border-slate-200 py-5 text-sm font-semibold text-slate-700"><div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><span>Billing currency</span><span className="font-bold text-slate-950">USD ($)</span></div>{promoActive && !profile?.email ? <div className="space-y-1"><label htmlFor="intro-offer-email">Email for offer eligibility</label><input id="intro-offer-email" type="email" autoComplete="email" maxLength={254} required value={introOfferEmail} onChange={(event) => setIntroOfferEmail(event.target.value)} className="w-full border border-slate-300 px-3 py-2 text-slate-950" /><p className="text-xs font-normal text-slate-500">We check this email against existing Bennie Studio accounts and subscriptions.</p></div> : null}<div className="flex justify-between"><span>Setup fee</span><span>{accountWaiver.loading?"Checking waiver…":accountWaiver.source?<><s className="mr-2 text-slate-400">{formatCommercialMoney(pendingPrice.standardSetupFee ?? pendingPrice.setupFee,pendingPrice.currency)}</s>{formatCommercialMoney(0,pendingPrice.currency)}</>:formatCommercialMoney(pendingPrice.setupFee || 0, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>First month{promoActive ? " (introductory offer)" : ""}</span><span>{promoActive ? <><s className="mr-2 font-normal text-slate-400">{formatCommercialMoney(pendingMonthly, pendingPrice.currency)}</s>{formatCommercialMoney(0, pendingPrice.currency)}</> : formatCommercialMoney(pendingMonthly, pendingPrice.currency)}</span></div><div className="flex justify-between"><span>Commitment</span><span>{formatCommitmentLabel(pendingTermMonths)}</span></div><div className="flex justify-between border-t border-slate-200 pt-3 text-slate-950"><span>Due today, before tax</span><span>{formatCommercialMoney(dueToday, pendingPrice.currency)}</span></div><div className="flex justify-between gap-4 text-xs text-slate-600"><span>Monthly service after today</span><span className="shrink-0 font-semibold">{formatCommercialMoney(pendingMonthly, pendingPrice.currency)}</span></div></div>{pendingStandard ? <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Managed delivery included</p><ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-700">{[pendingStandard.pages, pendingStandard.revisions, pendingStandard.targetFirstDraft, pendingStandard.updates, pendingStandard.targetUpdateTurnaround].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{item}</li>)}</ul></div> : null}<p className="mt-4 text-xs leading-5 text-slate-500">{promoActive ? "Your first monthly service charge is discounted in full. Any applicable setup is charged today. Months 2–12 are billed at the normal monthly price, and a 12-month initial commitment applies. " : "Your first payment includes any applicable setup and the first month of managed service. "}The site is human-reviewed, quality-checked and requires your approval before launch.</p><p className="mt-2 text-xs font-semibold leading-5 text-emerald-700">No account is required before payment. New customers activate their Bennie Studio portal after Stripe confirms the payment.</p><label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-700"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>I confirm this scope, month-to-month recurring managed service, and agree to the <Link to={`/terms?market=${checkoutMarket}&introOffer=${promoActive ? INTRO_OFFER_CODE : ""}`} target="_blank" className="text-indigo-600 underline underline-offset-2">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-indigo-600 underline underline-offset-2">Privacy Policy</Link>.</span></label><Button disabled={!termsAccepted || accountWaiver.loading || accountWaiver.error || checkoutPricingLoading || Boolean(checkoutPricingError) || !pendingPrice || (promoActive && !profile?.email && !introOfferEmail.trim())} onClick={() => { const product = pendingProduct; setPendingProduct(null); void startCheckout(product); }} className="mt-6 min-h-12 w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">Continue to secure checkout <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>, document.body)}
  </div>;
};
export default Pricing;
