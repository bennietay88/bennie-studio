import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Check,
} from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { trackPublicEvent } from "../lib/publicTracking";
import { supabase } from "../lib/supabase";
import {
  COMMERCIAL_FALLBACK_PRODUCTS,
  formatCommitmentLabel,
  formatCommercialMoney,
  getCommercialPrice,
  getMinimumTermMonths,
  getStoredMarket,
} from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import { ConversionHomepage } from "./ConversionHomepage";
import { usePublishedPlatformCms } from "../lib/platformSiteCms";
import { PlatformCmsSections } from "./PlatformCmsSections";
import { getPublicSiteConfig } from "../lib/publicSiteConfigCache";

const CONSENT_KEY = "bt_sales_cookie_consent";
const CONSENT_VERSION = "uk-sales-consent-v1";

type Consent = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
};

const faqs = [
  ["What do I pay to get started?", "The first payment is setup plus the first month of service. The pricing step shows your selected plan, market currency, due-today amount and billing terms before checkout."],
  ["What happens after launch?", "Your plan continues to cover managed hosting, maintenance and its stated update allowance. Higher tiers include additional conversion, local SEO and growth work."],
  ["Who approves the website before it goes live?", "Bennie Studio reviews the build, then you review and approve it before publication. Your plan covers hosting, maintenance and the stated update allowance after launch."],
  ["What if I cancel or move my website?", "Your domain and supplied business assets remain yours. Review the plan's initial term, cancellation notice and handover options in the written terms before checkout."],
  ["Can I see a direction before buying?", "Yes. The free preview is an illustrative starting direction, not the finished paid website. No card is required."],
];



export default function BrandLedLandingPage() {
  const navigate = useNavigate();
  const siteCms = usePublishedPlatformCms();
  const pageCms = siteCms.pages["/"];
  const [market] = React.useState(getStoredMarket);
  const { products, loading: pricingLoading, error: pricingError } = usePublicCommercialPricing(market);
  const [platformSettings, setPlatformSettings] = React.useState<any>(null);
  const [verifiedProof, setVerifiedProof] = React.useState<any[]>([]);
  const [manageCookies, setManageCookies] = React.useState(false);
  const [consent, setConsent] = React.useState<Consent | null>(() => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.version === CONSENT_VERSION ? parsed : null;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    let cancelled = false;
    const approvedIds = Array.isArray(platformSettings?.publicProofTestimonialIds)
      ? platformSettings.publicProofTestimonialIds.filter(Boolean)
      : [];
    if (!approvedIds.length) {
      setVerifiedProof([]);
      return () => { cancelled = true; };
    }
    supabase
      .from("customer_testimonials")
      .select("id,title,customer_name,company,testimonial,result_summary,result_metrics,date_approved")
      .in("id", approvedIds)
      .eq("publish_status", "published")
      .eq("consent_status", "approved")
      .order("date_approved", { ascending: false })
      .limit(3)
      .then(({ data }) => { if (!cancelled) setVerifiedProof(data || []); });
    return () => { cancelled = true; };
  }, [platformSettings?.publicProofTestimonialIds]);

  React.useEffect(() => {
    let cancelled = false;
    getPublicSiteConfig()
      .then((payload) => { if (!cancelled) setPlatformSettings(payload?.platform || null); })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  const saveConsent = (analytics: boolean, marketing: boolean) => {
    const next: Consent = {
      necessary: true,
      functional: false,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    setConsent(next);
    setManageCookies(false);
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); } catch {}
  };

  const profilePlan = products.find((product) => product.slug === "personal-profile") || COMMERCIAL_FALLBACK_PRODUCTS.find((product) => product.slug === "personal-profile")!;
  const managed = products.find((product) => product.slug === "managed-website") || COMMERCIAL_FALLBACK_PRODUCTS[0];
  const growth = products.find((product) => product.slug === "website-growth") || COMMERCIAL_FALLBACK_PRODUCTS[1];
  const partner = products.find((product) => product.slug === "growth-partner") || COMMERCIAL_FALLBACK_PRODUCTS[2];
  const priced = [profilePlan, managed, growth, partner].map((product) => ({
    product,
    price: getCommercialPrice(product, market),
  }));
  const planBestFor = ["Professional identity", "First business website", "More business enquiries", "Hands-on growth support"];
  // Three differentiators per plan, rather than repeating the same comparison
  // labels and terms in every card. Full contractual scope stays on /pricing.
  const planHighlights = [
    ["3–5 professional profile pages", "Contact and social links", "1 small monthly content update"],
    ["Up to 5 core pages", "Clear enquiry paths", "Routine managed updates"],
    ["Conversion improvements", "Local SEO expansion", "Monthly growth support"],
    ["Priority growth support", "Campaign landing pages", "Ongoing performance guidance"],
  ] as const;

  const go = (path: string, label: string) => {
    trackPublicEvent({ eventType: "sales_cta_clicked", label, target: path });
    navigate(path);
  };

  const analyticsAllowed = platformSettings?.salesCookieBannerEnabled === false || Boolean(consent?.analytics);
  const marketingAllowed = platformSettings?.salesCookieBannerEnabled === false || Boolean(consent?.marketing);
  const showCookieBanner = platformSettings?.salesCookieBannerEnabled !== false && (!consent || manageCookies);

  return (
    <div className="brand-public min-h-screen overflow-x-hidden bg-[#f6f7fb] text-[#10131c]">
      <Helmet>
        <title>{pageCms?.seoTitle || "Professional Websites for Service Businesses | Bennie Studio"}</title>
        <meta name="description" content={pageCms?.seoDescription || "Professional websites for service businesses, designed for clearer enquiries. Get a free preview before choosing managed design, hosting and website support."} />
        {pageCms?.noIndex && <meta name="robots" content="noindex,nofollow" />}
        <link rel="canonical" href={pageCms?.canonicalUrl || "https://app.bennietay.com/"} />
        <meta property="og:title" content={pageCms?.seoTitle || "Bennie Studio | Managed Website System"} />
        <meta property="og:description" content={pageCms?.seoDescription || "Strategy, design, lead capture, hosting and ongoing improvement in one managed website service."} />
        {pageCms?.ogImage && <meta property="og:image" content={pageCms.ogImage} />}
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://app.bennietay.com/og-preview.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        {analyticsAllowed && platformSettings?.gaMeasurementId ? <script async src={`https://www.googletagmanager.com/gtag/js?id=${platformSettings.gaMeasurementId}`} /> : null}
        {analyticsAllowed && platformSettings?.gaMeasurementId ? (
          <script>{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${platformSettings.gaMeasurementId}');
          `}</script>
        ) : null}
        {marketingAllowed && platformSettings?.metaPixelId ? (
          <script>{`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
            (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${platformSettings.metaPixelId}');fbq('track', 'PageView');
          `}</script>
        ) : null}
      </Helmet>

      <PublicSiteHeader />

      <main>
        <ConversionHomepage onCta={go} />
        <PlatformCmsSections path="/" />

        {verifiedProof.length ? (
          <section className="border-y border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="brand-shell brand-section">
              <div className="grid gap-10 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <p className="brand-kicker !text-[#1D4ED8]">Verified customer proof</p>
                  <h2 className="mt-4 !text-[#0F172A]">Real proof, published with approval.</h2>
                  <button onClick={() => go("/case-studies", "Homepage verified proof")} className="mt-7 inline-flex items-center font-semibold text-[#1D4ED8]">See customer proof <ArrowRight className="ml-2 h-4 w-4" /></button>
                </div>
                <div className="grid gap-4 lg:col-span-8">
                  {verifiedProof.map((proof) => (
                    <article key={proof.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-7">
                      <p className="text-lg leading-8 !text-[#0F172A]">“{proof.testimonial}”</p>
                      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-[#E2E8F0] pt-5">
                        <div><p className="font-semibold !text-[#0F172A]">{proof.customer_name || "Customer"}</p><p className="mt-1 text-sm !text-[#475569]">{proof.company || proof.title || proof.result_summary}</p></div>
                        {Array.isArray(proof.result_metrics) && proof.result_metrics.length ? <div className="flex flex-wrap gap-2">{proof.result_metrics.slice(0, 3).map((metric: any) => <span key={String(metric.metric) + String(metric.value)} className="border border-[#E2E8F0] px-3 py-2 text-xs font-semibold !text-[#1D4ED8]">{metric.metric}: {metric.value}</span>)}</div> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="plans" className="c26-pricing-section scroll-mt-24 border-y border-[#dfe2ea] bg-white">
          <div className="brand-shell brand-section">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="brand-kicker">Simple, transparent pricing</p>
                <h2 className="mt-4">A managed website for every stage.</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-[#526071]">Choose the level of website support that fits your next stage.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {priced.map(({ product, price }, index) => {
                    const isRecommended = product.slug === "website-growth";
                    const priceReady = !pricingLoading && !pricingError && Boolean(price);
                    return (
                      <article key={product.slug} className={isRecommended ? "flex h-full flex-col rounded-2xl border border-[#0F172A] bg-[#0F172A] p-6 text-white shadow-sm" : "flex h-full flex-col rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm"}>
                        <div>
                          <p className={isRecommended ? "text-xs font-semibold uppercase tracking-[0.08em] !text-[#b9b1ff]" : "text-xs font-semibold uppercase tracking-[0.08em] text-[#5746e8]"}>{isRecommended ? "Recommended" : planBestFor[index]}</p>
                          <h3 className={isRecommended ? "mt-2 !text-white" : "mt-2"}>{product.name}</h3>
                        </div>
                        <p className={isRecommended ? "mt-7 text-3xl font-semibold !text-white" : "mt-7 text-3xl font-semibold"}>{priceReady ? formatCommercialMoney(price?.monthlyPrice, price?.currency || "USD") : pricingLoading ? "Checking…" : "Ask for quote"}<span className={isRecommended ? "text-sm font-normal !text-white/75" : "text-sm font-normal text-[#5f6673]"}>/month</span></p>
                        <p className={isRecommended ? "mt-1 text-sm !text-white/75" : "mt-1 text-sm text-[#5f6673]"}>+ {priceReady ? formatCommercialMoney(price?.setupFee, price?.currency || "USD") : "—"} one-time setup</p>
                        <p className={isRecommended ? "mt-2 text-sm font-semibold !text-white" : "mt-2 text-sm font-semibold text-[#141821]"}>First payment: {!priceReady || price?.monthlyPrice == null ? "By quote" : formatCommercialMoney((price.setupFee || 0) + price.monthlyPrice, price.currency)}</p>
                        <div className={isRecommended ? "mt-5 flex-1 border-t border-white/25 pt-5" : "mt-5 flex-1 border-t border-[#E2E8F0] pt-5"}>
                          <ul className="space-y-3">
                            {planHighlights[index].map((highlight) => (
                              <li key={highlight} className={isRecommended ? "flex items-start gap-2.5 text-sm leading-5 !text-white/85" : "flex items-start gap-2.5 text-sm leading-5 text-[#526071]"}>
                                <Check className={isRecommended ? "mt-0.5 h-4 w-4 shrink-0 text-[#b9b1ff]" : "mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]"} aria-hidden="true" />
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button onClick={() => go("/pricing#plan-" + product.slug, "Choose " + product.name)} className={isRecommended ? "mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1D4ED8] px-5 font-semibold text-white hover:bg-[#2563EB]" : "mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1D4ED8] px-5 font-semibold text-white hover:bg-[#2563EB]"}>
                          Explore plan <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                      </article>
                    );
                  })}
            </div>
            <p className="mt-6 text-center text-xs leading-6 text-[#687386]">
              Managed hosting and maintenance are included with {formatCommitmentLabel(getMinimumTermMonths(priced[0]?.price)).toLowerCase()} billing. Prices before tax.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold">
              <Link to="/pricing" className="text-[#1D4ED8] underline underline-offset-4 hover:text-[#1741ed]">Compare full plan scope</Link>
              <Link to="/generate-preview" onClick={() => trackPublicEvent({ eventType: "sales_cta_clicked", label: "Pricing section free preview", target: "/generate-preview" })} className="text-[#1D4ED8] underline underline-offset-4 hover:text-[#1741ed]">Get a free website direction</Link>
            </div>
          </div>
        </section>


        <section className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="brand-kicker">Common questions</p>
              <h2 className="mt-4">Questions serious buyers ask.</h2>
            </div>
            <div className="border-t border-[#dfe2ea] lg:col-span-8">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group border-b border-[#dfe2ea] px-5 py-5 sm:px-8">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-6 rounded-sm text-base font-semibold text-[#0F172A] outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-4 sm:text-lg">
                    {question}<span aria-hidden="true" className="shrink-0 text-xl text-[#1D4ED8] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pb-2 pt-3 leading-7 text-[#526071]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="c26-close" aria-labelledby="c26-close-title"><div className="brand-shell"><div><p className="!text-white/75 text-xs font-bold uppercase tracking-[.15em]">Ready when you are</p><h2 id="c26-close-title">{pageCms?.finalCtaTitle || <>Ready for a website that <em>brings more enquiries?</em></>}</h2></div><div><p>{pageCms?.finalCtaDescription || "See a free, preliminary direction for your business. No card required and no obligation to buy."}</p><button type="button" onClick={() => go(pageCms?.primaryCtaHref || "/generate-preview", "Homepage closing free preview")}>{pageCms?.primaryCtaLabel || "Get your free website preview"} <ArrowRight size={18} aria-hidden="true" /></button><Link to="/book-demo" className="mt-3 inline-block text-sm font-semibold text-white underline underline-offset-4">Prefer to talk first? Book a call</Link></div></div></section>
      </main>

      <PublicSiteFooter
        tagline="A managed website system for service businesses that need stronger trust, clearer enquiries and ongoing improvement."
        email={platformSettings?.supportEmail}
        onManageCookies={() => setManageCookies(true)}
      />

      {showCookieBanner ? (
        <div className="fixed inset-x-4 bottom-4 z-[120] mx-auto max-w-4xl border border-white/10 bg-[#0c1224] p-5 text-white shadow-2xl">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold">Cookie preferences</p>
              <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-white/75">Necessary cookies keep the site working. Analytics and marketing cookies are optional and only load after consent.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => saveConsent(false, false)} className="border border-white/20 px-4 py-2 text-xs font-black">Necessary only</button>
              <button onClick={() => saveConsent(true, true)} className="bg-white px-4 py-2 text-xs font-black text-[#10131c]">Accept all</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
