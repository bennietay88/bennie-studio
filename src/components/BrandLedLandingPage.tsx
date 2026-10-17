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
  ["What do I pay to get started?", "The first payment is setup plus the first month of service. The pricing step shows your selected plan, market currency, due-today amount and full initial commitment before checkout."],
  ["What happens after launch?", "Your plan continues to cover managed hosting, maintenance and its stated update allowance. Higher tiers include additional conversion, local SEO and growth work."],
  ["Who approves the website before it goes live?", "Bennie Studio reviews the build, then you review and approve it before publication. Your plan covers hosting, maintenance and the stated update allowance after launch."],
  ["What if I cancel or move my website?", "Your domain and supplied business assets remain yours. Review the plan's initial term, cancellation notice and handover options in the written terms before checkout."],
  ["Can I see a direction before buying?", "Yes. The free preview is an illustrative starting direction, not the finished paid website. No card is required."],
];



export default function BrandLedLandingPage() {
  const navigate = useNavigate();
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
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    fetch("/api/public/site-config", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setPlatformSettings(payload?.platform || null))
      .catch(() => null)
      .finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
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

  const managed = products.find((product) => product.slug === "managed-website") || COMMERCIAL_FALLBACK_PRODUCTS[0];
  const growth = products.find((product) => product.slug === "website-growth") || COMMERCIAL_FALLBACK_PRODUCTS[1];
  const partner = products.find((product) => product.slug === "growth-partner") || COMMERCIAL_FALLBACK_PRODUCTS[2];
  const priced = [managed, growth, partner].map((product) => ({
    product,
    price: getCommercialPrice(product, market),
  }));
  const planBestFor = ["Your first professional website", "For businesses seeking more enquiries", "For hands-on growth support"];
  const planComparisonRows = [
    ["Website management", ["Included", "Included", "Included"]],
    ["Conversion optimisation", ["Foundation", "Monthly", "Advanced"]],
    ["Local SEO", ["Foundation", "Expansion", "Ongoing"]],
    ["Growth support", ["—", "Limited", "Ongoing"]],
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
        <title>Business Websites That Build Trust & Encourage Enquiries | Bennie Studio</title>
        <meta name="description" content="Get a professional business website designed to encourage enquiries. Explore a free website preview, then choose a managed plan for design, hosting and updates." />
        <link rel="canonical" href="https://app.bennietay.com/" />
        <meta property="og:title" content="Bennie Studio | Managed Website System" />
        <meta property="og:description" content="Strategy, design, lead capture, hosting and ongoing improvement in one managed website service." />
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
        <section className="brand-on-dark brand-grid-bg relative overflow-hidden bg-[#0b1020]">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#5b4bff]/20 blur-3xl" />
          <div className="brand-shell relative grid gap-14 py-20 lg:grid-cols-12 lg:items-center lg:py-28">
            <div className="lg:col-span-6">
              <p className="brand-kicker !text-[#b9b1ff]">A managed website for service businesses</p>
              <h1 className="bt-sales-hero-title mt-5 !text-white">A website that builds trust <span className="bt-gradient-title block">and encourages enquiries.</span></h1>
              <p className="brand-copy brand-muted-on-dark mt-7 !max-w-xl">
                Make it easier for customers to understand your services and take the next step. We design, build, host and maintain your business website, so you can stay focused on running your business.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => go("/generate-preview", "Homepage hero free preview")} className="inline-flex min-h-14 items-center justify-center bg-white px-7 font-semibold text-[#141821] transition hover:-translate-y-0.5 hover:bg-[#eeebff]">
                  See my free website preview <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <Link to="/case-studies" onClick={() => trackPublicEvent({ eventType: "sales_cta_clicked", label: "Homepage hero examples", target: "/case-studies" })} className="inline-flex min-h-14 items-center justify-center border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10">
                  View website examples
                </Link>
              </div>
              <p className="mt-3 text-xs font-semibold !text-white/70">Free preliminary direction · No card required · No obligation to purchase</p>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm !text-white/65">
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#b9b1ff]" /> Your approval before launch</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#b9b1ff]" /> Transparent setup, monthly costs and terms</span>
              </div>
              <p className="mt-5 text-sm leading-6 !text-white/70">
                {pricingLoading
                  ? "Checking current regional prices."
                  : pricingError || !getCommercialPrice(managed, market)
                  ? "Ask for verified local pricing."
                  : <>Plans from {formatCommercialMoney(getCommercialPrice(managed, market)?.monthlyPrice, getCommercialPrice(managed, market)?.currency || "USD")}/month plus {formatCommercialMoney(getCommercialPrice(managed, market)?.setupFee, getCommercialPrice(managed, market)?.currency || "USD")} one-time setup.</>}{" "}
                <Link to="/pricing" className="font-semibold text-white underline underline-offset-4">See first payment and terms</Link>
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs !text-white/70">
                <span>Check the pricing page for any available introductory offer and its exact minimum term.</span>
              </p>
            </div>

            <div className="relative lg:col-span-6">
              <div className="absolute -inset-10 rounded-full bg-[#5746e8]/10 blur-3xl" />
              <div className="relative border border-white/12 bg-[#111827]/90 p-6 shadow-[0_35px_100px_-50px_rgba(0,0,0,.8)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#b9b1ff]">A website should make this clear</p>
                <h2 className="mt-4 max-w-lg text-2xl !text-white">A clear website. One team to manage it.</h2>
                <div className="mt-7 divide-y divide-white/10">
                  {[
                    ["01", "What you do", "Clear services and who they are for."],
                    ["02", "Why trust you", "Relevant proof, credentials and real work."],
                    ["03", "What to do next", "One easy route to enquire, book or get a quote."],
                  ].map(([number, title, detail]) => (
                    <div key={number} className="grid gap-2 py-4 sm:grid-cols-[2.5rem_1fr] sm:gap-4">
                      <span className="text-xs font-bold text-[#b9b1ff]">{number}</span>
                      <div><p className="font-semibold !text-white">{title}</p><p className="mt-1 text-sm leading-6 !text-white/60">{detail}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#dfe2ea] bg-white" aria-labelledby="managed-value-title">
          <div className="brand-shell brand-section">
            <div className="max-w-3xl">
              <p className="brand-kicker">One team from launch through ongoing care</p>
              <h2 id="managed-value-title" className="mt-4">A website that stays looked after.</h2>
              <p className="brand-copy mt-4">Get the build, hosting and agreed updates under one clear plan, with the website reviewed and approved before it goes live.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Made for your business", "Present your services, customer proof and next step clearly."],
                ["Checked before launch", "Responsive pages and enquiry paths reviewed before your approval."],
                ["Managed month to month", "Hosting, maintenance and the update allowance stated in your plan."],
              ].map(([title, detail]) => (
                <article key={title} className="border-t-2 border-[#5746e8] bg-[#f8f8ff] p-5">
                  <h3 className="text-base">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#687386]">{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>


        <section className="brand-shell brand-section" aria-labelledby="example-title">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="brand-kicker">See the result, not just the features</p>
              <h2 id="example-title" className="mt-4">Explore real website interactions through illustrative examples.</h2>
              <p className="brand-copy mt-3 max-w-3xl">These are independent demonstration concepts for fictional businesses, not commissioned customer projects or evidence of revenue gains. Explore the structure, content and enquiry journey before sharing your own brief.</p>
            </div>
            <Link to="/case-studies" className="inline-flex shrink-0 items-center gap-2 font-semibold text-[#5746e8]">All examples <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { label: "Clinic", title: "Make appointments easier to find", detail: "Treatment information, patient reassurance and clear booking actions.", link: "/portfolio/sample/dental" },
              { label: "Contractor", title: "Help customers request useful quotes", detail: "Services, projects, service areas and an enquiry-led layout.", link: "/portfolio/sample/contractor" },
              { label: "Consultant", title: "Turn expertise into a clear offer", detail: "Focused positioning, relevant proof and consultation next steps.", link: "/portfolio/sample/consultant" },
            ].map((example) => (
              <article key={example.label} className="flex flex-col border border-[#dfe2ea] bg-white p-6">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#5746e8]">{example.label} · Demonstration concept</p>
                <h3 className="mt-4 text-xl">{example.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-[#526071]">{example.detail}</p>
                <Link to={example.link} onClick={() => trackPublicEvent({ eventType: "example_opened", label: example.label, target: example.link })} className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-[#5746e8]">Explore this example <ArrowRight className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[#dfe2ea] bg-white" aria-labelledby="steps-title">
          <div className="brand-shell brand-section">
            <p className="brand-kicker">Simple next steps</p>
            <h2 id="steps-title" className="mt-4">See the direction first. Commit only when the scope fits.</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                ["01", "Share the business basics", "Tell us what you offer or paste your current website URL."],
                ["02", "Review a free preview", "Explore an initial concept and the suggested enquiry journey."],
                ["03", "Choose your next step", "Compare a managed plan or talk through the build and its commitments."],
              ].map(([number, title, copy]) => (
                <div key={number} className="border-t-2 border-[#5746e8] pt-5">
                  <span className="text-sm font-bold text-[#5746e8]">{number}</span>
                  <h3 className="mt-3 text-lg">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#526071]">{copy}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => go("/generate-preview", "Homepage process free preview")} className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#141821] px-6 font-semibold text-white">Get my free preview <ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>

        {verifiedProof.length ? (
          <section className="brand-on-dark bg-[#0b1020]">
            <div className="brand-shell brand-section">
              <div className="grid gap-10 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <p className="brand-kicker !text-[#b9b1ff]">Verified customer proof</p>
                  <h2 className="mt-4 !text-white">Real proof, published with approval.</h2>
                  <button onClick={() => go("/case-studies", "Homepage verified proof")} className="mt-7 inline-flex items-center font-semibold text-white">See customer proof <ArrowRight className="ml-2 h-4 w-4" /></button>
                </div>
                <div className="grid gap-4 lg:col-span-8">
                  {verifiedProof.map((proof) => (
                    <article key={proof.id} className="border border-white/15 bg-white/[0.035] p-6 sm:p-7">
                      <p className="text-lg leading-8 !text-white/85">“{proof.testimonial}”</p>
                      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/15 pt-5">
                        <div><p className="font-semibold !text-white">{proof.customer_name || "Customer"}</p><p className="mt-1 text-sm !text-white/70">{proof.company || proof.title || proof.result_summary}</p></div>
                        {Array.isArray(proof.result_metrics) && proof.result_metrics.length ? <div className="flex flex-wrap gap-2">{proof.result_metrics.slice(0, 3).map((metric: any) => <span key={String(metric.metric) + String(metric.value)} className="border border-white/15 px-3 py-2 text-xs font-semibold !text-[#c7c1ff]">{metric.metric}: {metric.value}</span>)}</div> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="plans" className="scroll-mt-24 border-y border-[#dfe2ea] bg-white">
          <div className="brand-shell brand-section">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="brand-kicker">Simple, transparent pricing</p>
                <h2 className="mt-4">Choose the support your business needs.</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[#526071]">Compare what you pay today and the support included at each level. <Link to="/pricing" className="font-semibold text-[#5746e8] underline underline-offset-4">See full scope and terms</Link>.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {priced.map(({ product, price }, index) => {
                    const isRecommended = product.slug === "website-growth";
                    const priceReady = !pricingLoading && !pricingError && Boolean(price);
                    return (
                      <article key={product.slug} className={isRecommended ? "border border-[#101827] bg-[#101827] p-6 text-white shadow-[0_24px_70px_-45px_rgba(15,23,42,.6)]" : "border border-[#dfe2ea] bg-white p-6"}>
                        <div>
                          <p className={isRecommended ? "text-xs font-semibold uppercase tracking-[0.08em] !text-[#b9b1ff]" : "text-xs font-semibold uppercase tracking-[0.08em] text-[#5746e8]"}>{isRecommended ? "Recommended" : planBestFor[index]}</p>
                          <h3 className={isRecommended ? "mt-2 !text-white" : "mt-2"}>{product.name}</h3>
                        </div>
                        <p className={isRecommended ? "mt-7 text-3xl font-semibold !text-white" : "mt-7 text-3xl font-semibold"}>{priceReady ? formatCommercialMoney(price?.monthlyPrice, price?.currency || "USD") : pricingLoading ? "Checking…" : "Ask for quote"}<span className={isRecommended ? "text-sm font-normal !text-white/75" : "text-sm font-normal text-[#5f6673]"}>/month</span></p>
                        <p className={isRecommended ? "mt-1 text-sm !text-white/75" : "mt-1 text-sm text-[#5f6673]"}>+ {priceReady ? formatCommercialMoney(price?.setupFee, price?.currency || "USD") : "—"} one-time setup</p>
                        <p className={isRecommended ? "mt-2 text-sm font-semibold !text-white" : "mt-2 text-sm font-semibold text-[#141821]"}>First payment: {!priceReady || price?.monthlyPrice == null ? "By quote" : formatCommercialMoney((price.setupFee || 0) + price.monthlyPrice, price.currency)}</p>
                        <p className={isRecommended ? "mt-2 text-xs font-semibold !text-white/65" : "mt-2 text-xs font-semibold text-[#687386]"}>{formatCommitmentLabel(getMinimumTermMonths(price))}, then month-to-month unless the accepted order states otherwise.</p>
                        <p className={isRecommended ? "mt-2 text-xs leading-5 !text-white/75" : "mt-2 text-xs leading-5 text-[#526071]"}>Standard initial term total (including setup, before tax): {priceReady && price?.monthlyPrice != null ? formatCommercialMoney((price.setupFee || 0) + price.monthlyPrice * getMinimumTermMonths(price), price.currency) : "Confirm by quote"}</p>
                        <div className={isRecommended ? "mt-6 space-y-3 border-t border-white/25 pt-5" : "mt-6 space-y-3 border-t border-[#dfe2ea] pt-5"}>
                          {planComparisonRows.map(([label, values]) => (
                            <div key={label} className="flex items-start justify-between gap-4 text-sm">
                              <span className={isRecommended ? "font-semibold !text-white/80" : "font-semibold text-[#526071]"}>{label}</span>
                              <span className={isRecommended ? "text-right font-semibold !text-white" : "text-right text-[#526071]"}>{values[index]}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => go("/pricing#plan-" + product.slug, "Choose " + product.name)} className={isRecommended ? "mt-6 inline-flex min-h-12 w-full items-center justify-center bg-white px-5 font-semibold text-[#101827]" : "mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#141821] px-5 font-semibold text-white"}>
                          See scope & choose plan <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                      </article>
                    );
                  })}
            </div>
            <p className="mt-5 text-center text-sm text-[#687386]">Not ready to decide? <Link to="/generate-preview" onClick={() => trackPublicEvent({ eventType: "sales_cta_clicked", label: "Pricing section free preview", target: "/generate-preview" })} className="font-semibold text-[#5746e8] underline underline-offset-4">Get a free website direction first.</Link></p>
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
                <details key={question} className="group border-b border-[#dfe2ea] py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
                    {question}<span className="text-xl text-[#5746e8] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pt-4 text-[#526071]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#dfe2ea] bg-white">
          <div className="brand-shell flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#526071]">Have questions about scope, ongoing support or your existing website?</p>
            <button onClick={() => go("/book-demo", "Discuss website scope")} className="inline-flex min-h-11 items-center justify-center bg-[#141821] px-5 font-semibold text-white">Talk through your requirements <ArrowRight className="ml-2 h-4 w-4" /></button>
          </div>
        </section>
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
