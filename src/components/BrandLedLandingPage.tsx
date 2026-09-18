import React from "react";
import { useNavigate } from "react-router-dom";
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
    title: "Strong positioning and deliberate hierarchy.",
    copy: "Best when credibility, expertise and a premium first impression influence the sale.",
  },
  media: {
    label: "Media-led",
    templateId: "dental-clinic-v1",
    title: "Customer photography carries more of the story.",
    copy: "Best when the business has strong people, place, project or product imagery to work with.",
  },
  editorial: {
    label: "Editorial",
    templateId: "corporate-v1",
    title: "Long-form credibility without a wall of cards.",
    copy: "Best for consultants, B2B and professional services that need more explanation and proof.",
  },
} as const;

const industries = [const industries = [
  "Professional services",
  "Clinics & healthcare",
  "Consultants",
  "Contractors",
  "Accounting & finance",
  "Education",
  "Beauty & wellness",
  "Local service businesses",
];

const process = [
  ["01", "Direction", "We define the audience, offer, proof and strongest enquiry path."],
  ["02", "Design", "The system chooses an art direction and builds the site architecture around the business."],
  ["03", "Review", "You add real assets and approve the final message, pages and actions."],
  ["04", "Grow", "The site stays hosted, maintained and improved as the business changes."],
];

const faqs = [
  ["Is this a template website?", "No. The system uses reusable design rules and components, but the composition, hierarchy, copy structure and conversion path are selected around the business brief."],
  ["Do I need professional photography before we start?", "No. Brand-led layouts can work without customer photography at first. When real imagery is supplied, it is placed into deliberate media slots rather than replaced with fake AI photos."],
  ["What happens after launch?", "Managed plans include hosting and ongoing website management. Higher tiers add deeper conversion, landing-page and growth support."],
  ["Can I see the direction before paying?", "Yes. The free preview flow now uses the same Premium and Brand-led generator system used for customer builds."],
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

  const go = (path: string, label: string) => {
    trackPublicEvent({ eventType: "sales_cta_clicked", label, target: path });
    navigate(path);
  };

  const analyticsAllowed = platformSettings?.salesCookieBannerEnabled === false || Boolean(consent?.analytics);
  const marketingAllowed = platformSettings?.salesCookieBannerEnabled === false || Boolean(consent?.marketing);
  const showCookieBanner = platformSettings?.salesCookieBannerEnabled !== false && (!consent || manageCookies);
  const activeDirection = designDirections[designDirection];

  return (
    <div className="brand-public min-h-screen overflow-x-hidden bg-[#f7f6f2] text-[#10131c]">
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
            <div className="lg:col-span-7">
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
                  See website examples
                </button>
              </div>
              <p className="mt-4 text-sm !text-white/60">No card required · Preview before choosing a plan · Managed plans from {entryMonthly}/month</p>
            </div>
            <div className="lg:col-span-5">
              <div className="border border-white/15 bg-white p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-[#141821]">Example managed website direction</span>
                  <span className="text-xs font-semibold text-[#5746e8]">Live template</span>
                </div>
                <TemplatePreviewThumbnail templateId="accounting-firm-v1" templateName="Professional service website" className="aspect-[4/3] min-h-[360px] border border-[#e2e4e8]" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#d8d9dc] bg-white">
          <div className="brand-shell grid grid-cols-2 md:grid-cols-4">
            {["Strategy", "Premium design", "Lead capture", "Managed growth"].map((item) => (
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
                <p className="brand-kicker">Website examples</p>
                <h2 className="mt-4">Real layouts, not abstract design cards.</h2>
              </div>
              <p className="brand-copy lg:col-span-5">Inspect hierarchy, service presentation and conversion paths across different service-business categories.</p>
            </div>
            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              {exampleTemplates.map(([templateId, category, direction, action]) => (
                <article key={templateId}>
                  <TemplatePreviewThumbnail templateId={templateId} templateName={category} className="aspect-[4/3] min-h-[300px] border border-[#d8d9dc] bg-white" />
                  <p className="mt-5 text-sm font-semibold text-[#5746e8]">{category}</p>
                  <h3 className="mt-2">{direction}</h3>
                  <p className="mt-2 text-sm text-[#526071]">{action}</p>
                </article>
              ))}
            </div>
            <button onClick={() => go("/case-studies", "Homepage all examples")} className="mt-8 inline-flex items-center font-semibold">
              View all website examples <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="brand-kicker">Design approach</p>
              <h2 className="mt-4">One system, different art direction.</h2>
              <p className="brand-copy mt-5">The layout changes with the business instead of repainting the same template.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {(Object.keys(designDirections) as Array<keyof typeof designDirections>).map((key) => (
                  <button key={key} type="button" onClick={() => setDesignDirection(key)} className={designDirection === key ? "border border-[#5746e8] bg-[#5746e8] px-4 py-2 text-sm font-semibold text-white" : "border border-[#d8d9dc] bg-white px-4 py-2 text-sm font-semibold text-[#526071]"}>
                    {designDirections[key].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="border border-[#d8d9dc] bg-white p-4">
                <TemplatePreviewThumbnail templateId={activeDirection.templateId} templateName={activeDirection.label} className="aspect-[16/9] min-h-[430px]" />
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
                <div key={industry} className="flex items-center justify-between border-b border-[#cbc5f4] py-4">
                  <span className="text-lg font-semibold">{industry}</span>
                  <ChevronRight className="h-4 w-4 text-[#5746e8]" />
                </div>
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
            <div className="overflow-x-auto lg:col-span-8">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#d8d9dc]">
                    <th className="py-4 pr-4 text-sm font-semibold">Plan</th>
                    {priced.map(({product}) => <th key={product.slug} className="px-4 py-4 text-lg font-semibold">{product.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Best for", ["Professional presence", "Active acquisition", "Ongoing growth"]],
                    ["Website management", ["Included", "Included", "Included"]],
                    ["Conversion optimisation", ["Foundation", "Monthly", "Advanced"]],
                    ["Local SEO", ["Foundation", "Expansion", "Ongoing"]],
                    ["Growth support", ["—", "Limited", "Ongoing"]],
                  ].map(([label, values]: any) => (
                    <tr key={label} className="border-b border-[#d8d9dc]">
                      <th className="py-4 pr-4 text-sm font-semibold text-[#526071]">{label}</th>
                      {values.map((value: string, index: number) => <td key={index} className="px-4 py-4 text-sm text-[#526071]">{value}</td>)}
                    </tr>
                  ))}
                  <tr>
                    <th className="py-6 pr-4 text-sm font-semibold">Price</th>
                    {priced.map(({product, price}) => (
                      <td key={product.slug} className="px-4 py-6 align-top">
                        <p className="text-2xl font-semibold">{formatCommercialMoney(price?.monthlyPrice, price?.currency || "MYR")}<span className="text-sm font-normal text-[#707b8a]">/month</span></p>
                        <p className="mt-1 text-sm text-[#707b8a]">+ {formatCommercialMoney(price?.setupFee, price?.currency || "MYR")} setup</p>
                        <button onClick={() => go("/pricing?product=" + product.slug, "Pricing " + product.name)} className="mt-4 inline-flex items-center font-semibold text-[#5746e8]">Details <ArrowRight className="ml-1 h-4 w-4" /></button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
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
              <p className="text-sm font-semibold !text-white/70">See your direction first</p>
              <h2 className="mt-2 !text-white">See what your website could become.</h2>
              <p className="mt-3 !text-white/75">Generate a personalised website direction before choosing a plan.</p>
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
