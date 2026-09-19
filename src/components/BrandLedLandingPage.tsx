import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Globe2,
  Layers3,
  LineChart,
  MapPin,
  MousePointerClick,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import { trackPublicEvent } from "../lib/publicTracking";
import {
  COMMERCIAL_FALLBACK_PRODUCTS,
  COMMERCIAL_MARKET_CHANGED_EVENT,
  formatCommercialMoney,
  getCommercialPrice,
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

const capabilityRows = [
  ["Clarify the offer", "Visitors should understand what you do, who it is for and why it matters within seconds."],
  ["Build confidence", "Real proof, clear services and credible business information replace vague marketing claims."],
  ["Create the next step", "Calls, WhatsApp, bookings and forms are organised around the way customers actually buy."],
  ["Keep improving", "Hosting, maintenance, analytics and plan-based optimisation continue after launch."],
];

const exampleTemplates = [
  ["dental-clinic-v1", "Dental / Clinic", "Trust-led premium design", "WhatsApp + appointment enquiry"],
  ["accounting-firm-v1", "Professional Services", "Authority-led design", "Consultation enquiry"],
  ["cleaning-company-v1", "Local Service", "Conversion-led design", "Quote request"],
] as const;

const designDirections = {
  brand: {
    label: "Brand-led",
    templateId: "accounting-firm-v1",
    layoutFamily: "brand_statement" as const,
    title: "Strong positioning and deliberate hierarchy.",
    copy: "Best when credibility, expertise and a premium first impression influence the sale.",
  },
  media: {
    label: "Media-led",
    templateId: "dental-clinic-v1",
    layoutFamily: "media_story" as const,
    title: "Customer photography carries more of the story.",
    copy: "Best when the business has strong people, place, project or product imagery to work with.",
  },
  editorial: {
    label: "Editorial",
    templateId: "law-firm-v1",
    layoutFamily: "editorial_b2b" as const,
    title: "Editorial authority for complex services.",
    copy: "Best when insight, expertise and evidence need room to breathe before the enquiry step.",
  },
} as const;

const industries = [
  { label: "Professional services", path: "/professional-services-website-design" },
  { label: "Clinics & healthcare", path: "/clinic-website-design-malaysia" },
  { label: "Consultants", path: "/consultant-website-design" },
  { label: "Contractors", path: "/renovation-contractor-website-design" },
  { label: "Accounting & finance", path: "/accounting-firm-website-design" },
  { label: "Education", path: "/tuition-centre-website-design" },
  { label: "Beauty & wellness", path: "/beauty-salon-website-design" },
  { label: "Local service businesses", path: "/local-service-website-design" },
] as const;

const process = [
  ["01", "Strategy", "We define the audience, offer, proof and strongest enquiry path."],
  ["02", "Design", "The system chooses the right visual structure and builds the site architecture around the business."],
  ["03", "Review", "You add real assets and approve the final message, pages and actions."],
  ["04", "Grow", "The site stays hosted, maintained and improved as the business changes."],
];

const faqs = [
  ["Is this a template website?", "No. The system uses reusable design rules and components, but the composition, hierarchy, copy structure and conversion path are selected around the business brief."],
  ["Do I need professional photography before we start?", "No. Brand-led layouts can work without customer photography at first. When real imagery is supplied, it is placed into deliberate media slots rather than replaced with fake AI photos."],
  ["What happens after launch?", "Managed plans include hosting and ongoing website management. Higher tiers add deeper conversion, landing-page and growth support."],
  ["Can I preview the website before paying?", "Yes. The free preview flow uses the same Premium and Brand-led generator system used for customer builds."],
];

export default function BrandLedLandingPage() {
  const navigate = useNavigate();
  const [market, setMarket] = React.useState(() => getStoredMarket());
  const { products } = usePublicCommercialPricing(market);
  const [platformSettings, setPlatformSettings] = React.useState<any>(null);
  const [designDirection, setDesignDirection] = React.useState<keyof typeof designDirections>("brand");
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
    const onMarketChanged = () => setMarket(getStoredMarket());
    window.addEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
    return () => window.removeEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
  }, []);

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
  const entryPrice = getCommercialPrice(managed, market);
  const entryMonthly = formatCommercialMoney(entryPrice?.monthlyPrice, entryPrice?.currency || "MYR");
  const planBestFor = ["Professional presence", "Active acquisition", "Ongoing growth"];
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
  const activeDirection = designDirections[designDirection];

  return (
    <div className="brand-public min-h-screen overflow-x-hidden bg-[#f8fafc] text-[#10131c]">
      <Helmet>
        <title>Bennie Studio | Premium Managed Websites for Service Businesses</title>
        <meta name="description" content="Brand-led, conversion-focused websites planned, built, hosted and continuously improved for service businesses that want stronger trust and more qualified enquiries." />
        <link rel="canonical" href="https://app.bennietay.com/" />
        <meta property="og:title" content="Bennie Studio | Premium Managed Websites" />
        <meta property="og:description" content="Premium websites built around trust, conversion and ongoing growth." />
        <meta property="og:type" content="website" />
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
        <section className="brand-on-dark bg-[#101827]">
          <div className="brand-shell grid gap-12 py-16 lg:grid-cols-12 lg:items-center lg:py-24">
            <div className="lg:col-span-6">
              <p className="brand-kicker !text-[#b9b1ff]">Managed websites for service businesses</p>
              <h1 className="mt-5 !max-w-[15ch] !text-white">Premium websites built around trust, enquiries and growth.</h1>
              <p className="brand-copy brand-muted-on-dark mt-6 !max-w-2xl">
                Bennie Studio plans, designs, builds and manages websites for service businesses that need stronger positioning, better enquiries and a site that stays useful after launch.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => go("/generate-preview", "Hero free preview")} className="inline-flex min-h-12 items-center justify-center bg-white px-6 font-semibold text-[#141821]">
                  Generate my free preview <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button onClick={() => go("/case-studies", "Hero examples")} className="inline-flex min-h-12 items-center justify-center border border-white/30 px-6 font-semibold text-white">
                  See website work
                </button>
              </div>
              <p className="mt-4 text-sm !text-white/60">No card required · Preview before choosing a plan · Managed plans from {entryMonthly}/month</p>
            </div>
            <div className="lg:col-span-6">
              <div className="relative pb-8 sm:pl-8">
                <div className="absolute bottom-0 left-0 top-8 hidden w-[88%] border border-white/10 bg-white/[0.035] sm:block" />
                <div className="relative overflow-hidden border border-white/15 bg-white shadow-[0_34px_90px_-42px_rgba(0,0,0,.75)]">
                  <TemplatePreviewThumbnail
                    templateId="accounting-firm-v1"
                    templateName="Professional services"
                    layoutFamily="brand_statement"
                    showFamilyLabel={false}
                    className="aspect-[16/10] min-h-0 border-0"
                  />
                </div>
                <div className="relative -mt-px ml-auto grid w-[92%] grid-cols-3 border border-[#d8d9dc] bg-[#f7f6f2] text-[#141821]">
                  {[["05", "Page structure"], ["02", "Device views"], ["01", "Clear enquiry path"]].map(([value, label]) => (
                    <div key={label} className="border-r border-[#d8d9dc] px-3 py-3 last:border-r-0 sm:px-4">
                      <p className="text-lg font-semibold">{value}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#687386]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#d8d9dc] bg-white">
          <div className="brand-shell grid grid-cols-2 md:grid-cols-4">
            {["5-page preview", "Desktop + mobile", "Real enquiry paths", "Managed after launch"].map((item) => (
              <div key={item} className="border-r border-[#d8d9dc] px-4 py-6 text-sm font-semibold last:border-r-0 md:px-6">{item}</div>
            ))}
          </div>
        </section>

        <section className="brand-shell brand-section">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="brand-kicker">What the website has to do</p>
              <h2 className="mt-4">Your website should do more than look professional.</h2>
              <p className="brand-copy mt-5">Every major section should explain the offer, increase confidence or move the right visitor toward a useful next step.</p>
              <button onClick={() => go("/how-it-works", "Homepage how it works")} className="mt-7 inline-flex items-center font-semibold">
                See how the service works <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
            <div className="brand-rule-list lg:col-span-7">
              {capabilityRows.map(([title, body]) => (
                <div key={title} className="brand-rule-row">
                  <h3>{title}</h3>
                  <p className="text-[#526071]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#d8d9dc] bg-white">
          <div className="brand-shell brand-section">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="brand-kicker">Website work</p>
                <h2 className="mt-4">Real layouts, not abstract design cards.</h2>
              </div>
              <p className="brand-copy lg:col-span-5">Inspect hierarchy, service presentation and conversion paths across different service-business categories.</p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:items-start">
              {exampleTemplates[0] ? (
                <article className="lg:col-span-7">
                  <TemplatePreviewThumbnail templateId={exampleTemplates[0][0]} templateName={exampleTemplates[0][1]} className="aspect-[16/10] min-h-0 border border-[#d8d9dc] bg-white shadow-[0_28px_70px_-48px_rgba(15,23,42,.5)]" />
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.2fr]">
                    <div>
                      <p className="text-sm font-semibold text-[#5746e8]">{exampleTemplates[0][1]}</p>
                      <h3 className="mt-2">{exampleTemplates[0][2]}</h3>
                    </div>
                    <p className="text-sm leading-6 text-[#526071]">{exampleTemplates[0][3]}</p>
                  </div>
                </article>
              ) : null}
              <div className="grid gap-6 lg:col-span-5">
                {exampleTemplates.slice(1).map(([templateId, category, direction, action]) => (
                  <article key={templateId} className="grid gap-4 border-t border-[#d8d9dc] pt-5 sm:grid-cols-[1.15fr_.85fr] lg:grid-cols-1">
                    <TemplatePreviewThumbnail templateId={templateId} templateName={category} className="aspect-[16/9] min-h-0 border border-[#d8d9dc] bg-white" />
                    <div>
                      <p className="text-sm font-semibold text-[#5746e8]">{category}</p>
                      <h3 className="mt-2">{direction}</h3>
                      <p className="mt-2 text-sm text-[#526071]">{action}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <button onClick={() => go("/case-studies", "Homepage all examples")} className="mt-8 inline-flex items-center font-semibold">
              View all website work <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="brand-kicker">Design approach</p>
              <h2 className="mt-4">One system. Three distinct visual styles.</h2>
              <p className="brand-copy mt-5">The layout, hierarchy and media treatment change with the business instead of repainting the same template.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {(Object.keys(designDirections) as Array<keyof typeof designDirections>).map((key) => (
                  <button key={key} type="button" onClick={() => setDesignDirection(key)} className={designDirection === key ? "border border-[#5746e8] bg-[#5746e8] px-4 py-2 text-sm font-semibold text-white" : "border border-[#d8d9dc] bg-white px-4 py-2 text-sm font-semibold text-[#526071]"}>
                    {designDirections[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="overflow-hidden border border-[#d8d9dc] bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,.45)]">
                <TemplatePreviewThumbnail
                  key={designDirection}
                  templateId={activeDirection.templateId}
                  templateName={activeDirection.label}
                  layoutFamily={activeDirection.layoutFamily}
                  showFamilyLabel={false}
                  className="aspect-[16/10] min-h-0 border-0"
                />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1.4fr]">
                <h3>{activeDirection.title}</h3>
                <p className="text-[#526071]">{activeDirection.copy}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#d8d9dc] bg-[#eeebff]">
          <div className="brand-shell brand-section grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="brand-kicker">Who it works for</p>
              <h2 className="mt-4">Built for businesses where trust affects the sale.</h2>
            </div>
            <div className="brand-rule-list lg:col-span-7">
              {industries.map((industry) => (
                <Link
                  key={industry.label}
                  to={industry.path}
                  onClick={() => trackPublicEvent({ eventType: "sales_cta_clicked", label: `Industry ${industry.label}`, target: industry.path })}
                  className="group flex min-h-16 w-full items-center justify-between gap-4 border-b border-[#cbc5f4] py-4 text-left transition hover:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5746e8] focus-visible:ring-offset-2"
                >
                  <span className="text-base font-semibold sm:text-lg">{industry.label}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#5746e8] transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="brand-kicker">Managed plans</p>
              <h2 className="mt-4">Start with the website. Add growth when you need it.</h2>
              <p className="brand-copy mt-5">One pricing system across the site. Monthly service is shown first; setup is shown clearly underneath.</p>
            </div>
            <div className="lg:col-span-8">
              <div className="grid gap-4 lg:grid-cols-3">
                {priced.map(({ product, price }, index) => {
                  const isGrowth = product.slug === "website-growth";
                  return (
                    <article key={product.slug} className={isGrowth ? "border-2 border-[#5746e8] bg-[#eeebff] p-5 shadow-sm" : "border border-[#d8d9dc] bg-white p-5"}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5746e8]">{isGrowth ? "Most Popular" : planBestFor[index]}</p>
                          <h3 className="mt-1">{product.name}</h3>
                        </div>
                        {isGrowth ? <span className="rounded-full bg-[#5746e8] px-3 py-1 text-xs font-semibold text-white">Most Popular</span> : null}
                      </div>
                      <p className="mt-5 text-3xl font-semibold">{formatCommercialMoney(price?.monthlyPrice, price?.currency || "MYR")}<span className="text-sm font-normal text-[#707b8a]">/month</span></p>
                      <p className="mt-1 text-sm text-[#707b8a]">+ {formatCommercialMoney(price?.setupFee, price?.currency || "MYR")} setup</p>
                      <div className="mt-5 space-y-3 border-t border-[#d8d9dc] pt-4">
                        {planComparisonRows.map(([label, values]) => (
                          <div key={label} className="flex items-start justify-between gap-4 text-sm">
                            <span className="font-semibold text-[#526071]">{label}</span>
                            <span className="text-right text-[#526071]">{values[index]}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => go("/pricing?market=" + market + "#plan-" + product.slug, "Pricing " + product.name)} className={isGrowth ? "mt-5 inline-flex min-h-12 w-full items-center justify-center bg-[#5746e8] px-5 font-semibold text-white" : "mt-5 inline-flex min-h-12 w-full items-center justify-center bg-[#141821] px-5 font-semibold text-white"}>
                        View plan <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="brand-on-dark bg-[#101827]">
          <div className="brand-shell brand-section">
            <p className="brand-kicker !text-[#b9b1ff]">How it works</p>
            <div className="mt-4 grid gap-10 lg:grid-cols-12">
              <h2 className="!text-white lg:col-span-4">From brief to a website you can actually use.</h2>
              <div className="lg:col-span-8">
                {process.map(([number, title, body]) => (
                  <div key={number} className="grid gap-3 border-t border-white/15 py-6 sm:grid-cols-[4rem_1fr_1.5fr]">
                    <span className="text-sm font-semibold !text-[#b9b1ff]">{number}</span>
                    <h3 className="!text-white">{title}</h3>
                    <p className="brand-muted-on-dark">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="brand-kicker">Questions</p>
              <h2 className="mt-4">A few things worth knowing before we build.</h2>
            </div>
            <div className="border-t border-[#d8d9dc] lg:col-span-8">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group border-b border-[#d8d9dc] py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
                    {question}<span className="text-xl text-[#5746e8] group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pt-4 text-[#526071]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#5746e8] text-white">
          <div className="brand-shell grid gap-8 py-14 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold !text-white/70">Preview before you choose</p>
              <h2 className="mt-2 !text-white">See what your website could become.</h2>
              <p className="mt-3 !text-white/75">Generate a personalised website preview before choosing a plan.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => go("/generate-preview", "Final free preview")} className="min-h-12 bg-white px-6 font-semibold text-[#141821]">Generate free preview</button>
              <button onClick={() => go("/book-demo", "Final book review")} className="min-h-12 border border-white/35 px-6 font-semibold text-white">Book 30-minute review</button>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter
        tagline="Brand-led managed websites for service businesses that want stronger trust, clearer enquiries and a site that keeps improving."
        email={platformSettings?.supportEmail}
        onManageCookies={() => setManageCookies(true)}
      />

      {showCookieBanner ? (
        <div className="fixed inset-x-4 bottom-4 z-[120] mx-auto max-w-4xl border border-white/10 bg-[#0c1224] p-5 text-white shadow-2xl">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold">Cookie preferences</p>
              <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-white/55">Necessary cookies keep the site working. Analytics and marketing cookies are optional and only load after consent.</p>
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
