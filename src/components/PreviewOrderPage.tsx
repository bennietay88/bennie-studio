import React from "react";
import { ArrowLeft, ArrowRight, Check, CreditCard, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import {
  CHECKOUT_CURRENCIES,
  COMMERCIAL_FALLBACK_PRODUCTS,
  formatCommitmentLabel,
  formatCommercialMoney,
  getCommercialPrice,
  getMinimumTermMonths,
  marketForCurrency,
  type CommercialCurrency,
  type CommercialProduct,
} from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import { trackPublicEvent } from "../lib/publicTracking";
import { PLAN_DELIVERY_STANDARDS, type PublicPlanSlug } from "../constants/deliveryStandards";

type PreviewIntent = {
  previewId?: string;
  leadId?: string;
  email?: string;
  businessName?: string;
  industry?: string;
  location?: string;
  recommendedProduct?: string;
  previewMode?: "website" | "business";
  attribution?: {
    referralCode?: string;
  };
  previewProfile?: {
    sourceUrl?: string;
    businessName?: string;
    location?: string;
  };
};

const productPriority = ["managed-website", "website-growth", "growth-partner"] as const;

const fitCopy: Record<string, { kicker: string; title: string; points: string[] }> = {
  "managed-website": {
    kicker: "Website essentials",
    title: "A professionally managed website without the agency overhead.",
    points: [
      "Website build and managed hosting",
      "Mobile-responsive enquiry experience",
      "Core SEO and contact-path setup",
      "Ongoing maintenance and managed updates",
    ],
  },
  "website-growth": {
    kicker: "Recommended for active lead generation",
    title: "Launch the site, then keep improving how it earns enquiries.",
    points: [
      "Everything in Managed Website",
      "Stronger conversion and trust structure",
      "Local SEO foundations and improvement work",
      "Lead-path tracking and ongoing optimisation",
    ],
  },
  "growth-partner": {
    kicker: "For deeper growth support",
    title: "Website plus hands-on conversion, landing-page and growth direction.",
    points: [
      "Everything in Website Growth",
      "Expanded landing-page support",
      "Ongoing conversion and local SEO direction",
      "Priority growth and campaign support",
    ],
  },
};

function readPreviewIntent(): PreviewIntent {
  try {
    return JSON.parse(localStorage.getItem("bt_preview_intent") || "{}");
  } catch {
    return {};
  }
}

export function PreviewOrderPage() {
  const location = useLocation();
  const [intent] = React.useState<PreviewIntent>(() => readPreviewIntent());
  const [checkoutCurrency, setCheckoutCurrency] = React.useState<CommercialCurrency>("USD");
  const checkoutMarket = marketForCurrency(checkoutCurrency);
  const { products, loading } = usePublicCommercialPricing(checkoutMarket);
  const [selectedSlug, setSelectedSlug] = React.useState(
    intent.recommendedProduct && productPriority.includes(intent.recommendedProduct as any)
      ? intent.recommendedProduct
      : "website-growth",
  );
  const [showAlternatives, setShowAlternatives] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const availableProducts = productPriority
    .map((slug) => products.find((product) => product.slug === slug)
      || COMMERCIAL_FALLBACK_PRODUCTS.find((product) => product.slug === slug))
    .filter(Boolean) as CommercialProduct[];

  const selected = availableProducts.find((product) => product.slug === selectedSlug)
    || availableProducts[1]
    || availableProducts[0];
  const price = selected ? getCommercialPrice(selected, checkoutMarket) : null;
  const monthly = Number(price?.monthlyPrice || 0);
  const setup = Number(price?.setupFee || 0);
  const dueToday = monthly + setup;
  const commitmentMonths = getMinimumTermMonths(price);
  const deliveryStandard = selected ? PLAN_DELIVERY_STANDARDS[selected.slug as PublicPlanSlug] : null;
  const fit = selected ? fitCopy[selected.slug] || fitCopy["website-growth"] : fitCopy["website-growth"];
  const businessName = intent.previewProfile?.businessName || intent.businessName || "Your business";
  const cancelled = new URLSearchParams(location.search).get("cancelled") === "1";

  React.useEffect(() => {
    trackPublicEvent({
      eventType: "preview_order_viewed",
      label: selected?.name || "Preview order",
      target: "/preview-order",
      metadata: {
        previewId: intent.previewId || null,
        productSlug: selected?.slug || null,
        dueToday,
        currency: checkoutCurrency,
      },
    });
  }, [checkoutCurrency, dueToday, intent.previewId, selected?.name, selected?.slug]);

  const startCheckout = async () => {
    if (!intent.previewId || !intent.leadId || !intent.email || !selected) {
      setError("Your preview session is incomplete. Return to the preview page and generate it again.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      trackPublicEvent({
        eventType: "preview_checkout_started",
        label: selected.name,
        target: "/preview-order",
        metadata: { previewId: intent.previewId, productSlug: selected.slug, dueToday },
      });

      const response = await fetch("/api/public/preview-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previewId: intent.previewId,
          leadId: intent.leadId,
          email: intent.email,
          productSlug: selected.slug,
          currency: checkoutCurrency,
          referralCode: intent.attribution?.referralCode || localStorage.getItem("bt_platform_affiliate_ref") || undefined,
          termsAccepted: true,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Secure checkout could not be started.");
      }
      window.location.href = payload.url;
    } catch (checkoutError: any) {
      setError(checkoutError?.message || "Secure checkout could not be started.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!intent.previewId || !intent.leadId || !intent.email) {
    return (
      <main className="bg-[#f6f7fb]">
        <section className="brand-shell py-16 sm:py-24">
          <div className="mx-auto max-w-2xl border border-[#dfe2ea] bg-white p-8 sm:p-10">
            <p className="brand-kicker">Preview required</p>
            <h1 className="mt-4 text-4xl font-semibold text-[#141821]">Start with your website preview.</h1>
            <p className="mt-4 leading-7 text-[#526071]">The order is linked to the exact preview and lead information you already supplied, so there is no account form to repeat.</p>
            <Link to="/generate-preview" className="mt-7 inline-flex min-h-12 items-center bg-[#141821] px-6 font-semibold text-white">
              Generate preview <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[#f6f7fb]">
      <section className="border-b border-[#dfe2ea] bg-white">
        <div className="brand-shell py-10 sm:py-14">
          <Link to="/generate-preview" className="inline-flex items-center text-sm font-semibold text-[#526071] hover:text-[#141821]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to preview
          </Link>
          <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="brand-kicker">Launch this website</p>
              <h1 className="mt-4 max-w-4xl text-[clamp(2.8rem,6vw,5.5rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#141821]">
                Turn the {businessName} preview into the real site.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#526071]">
                Your business information and preview are already connected to this order. Pay first, then activate your account and confirm the remaining launch details.
              </p>
            </div>
            <div className="lg:col-span-4 lg:text-right">
              <p className="text-sm font-semibold text-[#526071]">Choose billing currency at checkout · {formatCommitmentLabel(commitmentMonths)}</p>
              <p className="mt-1 text-sm text-[#707b8a]">Month-to-month after the initial commitment unless your accepted order states otherwise.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="brand-shell py-10 sm:py-14">
        {cancelled ? (
          <div className="mb-6 border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
            Checkout was cancelled. Nothing was charged and your preview is still saved.
          </div>
        ) : null}

        <div className="grid gap-7 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <article className="border border-[#dfe2ea] bg-white p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#5746e8]">{fit.kicker}</p>
              <div className="mt-3 flex flex-col gap-5 border-b border-[#dfe2ea] pb-7 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-[#141821]">{selected?.name || "Website Growth"}</h2>
                  <p className="mt-3 max-w-xl leading-7 text-[#526071]">{fit.title}</p>
                </div>
                {intent.recommendedProduct === selected?.slug ? (
                  <span className="shrink-0 bg-[#eeebff] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#5746e8]">Recommended</span>
                ) : null}
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {fit.points.map((point) => (
                  <div key={point} className="flex gap-3 border-t border-[#dfe2ea] pt-4 text-sm font-semibold leading-6 text-[#374151]">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /> {point}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowAlternatives((value) => !value)}
                className="mt-8 text-sm font-semibold text-[#5746e8] underline underline-offset-4"
              >
                {showAlternatives ? "Hide other plans" : "Compare other plans"}
              </button>

              {showAlternatives ? (
                <div className="mt-5 divide-y divide-[#dfe2ea] border-y border-[#dfe2ea]">
                  {availableProducts.map((product) => {
                    const productPrice = getCommercialPrice(product, checkoutMarket);
                    const active = product.slug === selected?.slug;
                    return (
                      <button
                        key={product.slug}
                        type="button"
                        onClick={() => {
                          setSelectedSlug(product.slug);
                          setTermsAccepted(false);
                          setError("");
                        }}
                        className={active
                          ? "grid w-full gap-3 bg-[#f6f7fb] px-4 py-5 text-left sm:grid-cols-[1fr_auto] sm:items-center"
                          : "grid w-full gap-3 bg-white px-4 py-5 text-left hover:bg-[#f9f8f4] sm:grid-cols-[1fr_auto] sm:items-center"}
                      >
                        <span>
                          <span className="block font-semibold text-[#141821]">{product.name}</span>
                          <span className="mt-1 block text-sm text-[#707b8a]">{product.description}</span>
                        </span>
                        <span className="font-semibold text-[#141821]">
                          {formatCommercialMoney(productPrice?.monthlyPrice, productPrice?.currency || "USD")}/mo
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </article>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                [ShieldCheck, "No signup before payment", "Your lead and preview identify the order."],
                [CreditCard, "Secure Stripe checkout", "Payment details stay with Stripe."],
                [Check, "Preview carries forward", "We do not ask you to re-enter the same business brief."],
              ].map(([Icon, title, body]: any) => (
                <div key={title} className="border border-[#dfe2ea] bg-white p-5">
                  <Icon className="h-5 w-5 text-[#5746e8]" />
                  <p className="mt-4 font-semibold text-[#141821]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#707b8a]">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="border border-[#141821] bg-[#141821] p-6 text-white sm:p-8 lg:sticky lg:top-24">
              <p className="text-xs font-bold uppercase tracking-[0.13em] !text-[#b9b1ff]">Order summary</p>
              <label htmlFor="preview-checkout-currency" className="mt-5 block text-xs font-semibold uppercase tracking-[0.08em] !text-white/60">Billing currency</label>
              <select id="preview-checkout-currency" value={checkoutCurrency} onChange={(event) => { setCheckoutCurrency(event.target.value as CommercialCurrency); setTermsAccepted(false); }} className="mt-2 h-11 w-full border border-white/20 bg-white px-3 text-sm font-semibold text-[#141821]">
                {CHECKOUT_CURRENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <h2 className="mt-3 text-3xl font-semibold !text-white">{selected?.name || "Website Growth"}</h2>

              {loading ? <p className="mt-6 !text-white/70">Loading current price…</p> : (
                <>
                  <div className="mt-7 space-y-4 border-y border-white/15 py-6 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="!text-white/70">Website setup</span>
                      <span className="font-semibold !text-white">{formatCommercialMoney(setup, price?.currency || "USD")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="!text-white/70">First month</span>
                      <span className="font-semibold !text-white">{formatCommercialMoney(monthly, price?.currency || "USD")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="!text-white/70">Initial commitment</span>
                      <span className="font-semibold !text-white">{commitmentMonths} month{commitmentMonths === 1 ? "" : "s"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-4 text-base">
                      <span className="font-semibold !text-white">Due today</span>
                      <span className="text-xl font-semibold !text-white">{formatCommercialMoney(dueToday, price?.currency || "USD")}</span>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-6 !text-white/70">
                    Then {formatCommercialMoney(monthly, price?.currency || "USD")}/month. {formatCommitmentLabel(commitmentMonths)}, then month-to-month unless the accepted order states otherwise.
                  </p>
                  {deliveryStandard ? (
                    <div className="mt-5 border-t border-white/15 pt-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] !text-[#b9b1ff]">What happens after payment</p>
                      <div className="mt-3 space-y-2 text-xs font-semibold leading-5 !text-white/75">
                        {[deliveryStandard.pages, deliveryStandard.revisions, deliveryStandard.targetFirstDraft, deliveryStandard.updates, deliveryStandard.targetUpdateTurnaround].map((item) => <p key={item} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />{item}</p>)}
                      </div>
                    </div>
                  ) : null}
                  <label className="mt-5 flex items-start gap-3 border border-white/15 bg-white/[0.04] p-4 text-xs font-semibold leading-5 !text-white/75">
                    <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                    <span>I confirm this scope, {commitmentMonths}-month initial commitment and recurring managed service, and agree to the <Link to={`/terms?market=${checkoutMarket}`} target="_blank" className="!text-[#c7c1ff] underline underline-offset-2">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="!text-[#c7c1ff] underline underline-offset-2">Privacy Policy</Link>.</span>
                  </label>

                  {error ? <div className="mt-5 border border-rose-300/30 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">{error}</div> : null}

                  <Button
                    onClick={startCheckout}
                    disabled={submitting || loading || !termsAccepted}
                    className="mt-7 min-h-14 w-full rounded-none bg-white px-6 font-semibold text-[#141821] hover:bg-[#eeebff]"
                  >
                    {submitting ? "Opening secure checkout…" : "Continue to secure checkout"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="mt-4 text-center text-xs leading-5 !text-white/50">No Bennie Studio account is required before payment.</p>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default PreviewOrderPage;
