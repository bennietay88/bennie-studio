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
  ["Positioning before decoration", "The offer, audience and enquiry path are defined before visual styling starts."],
  ["A layout that matches the business", "Brand-led, editorial, conversion-first and media-led compositions are chosen deliberately instead of forcing every company into one template."],
  ["Proof before claims", "Reviews, people, logos, projects and statistics only appear when the business supplies real evidence."],
  ["One obvious next action", "Calls, WhatsApp, booking and forms are placed around buyer intent rather than scattered everywhere."],
  ["Managed after launch", "Hosting, maintenance, analytics and ongoing improvements keep the site useful after launch day."],
];

const designDirections = [
  {
    label: "Statement",
    title: "Typography can carry the brand.",
    body: "For businesses without a full photography library yet, the layout stays premium through type, spacing and graphic composition.",
    className: "bg-[#f0eee8] text-[#10131c]",
  },
  {
    label: "Media-led",
    title: "Customer assets become the hero.",
    body: "When strong photography or product media exists, the system gives it room instead of burying it inside little cards.",
    className: "bg-[#5b4bff] text-white",
  },
  {
    label: "Editorial",
    title: "Long-form credibility without visual boredom.",
    body: "Capabilities, people, insights and proof can use asymmetric layouts that feel designed rather than generated.",
    className: "bg-[#0c1224] text-white",
  },
];

const industries = [
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
        <section className="relative overflow-hidden bg-[#0c1224] text-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-40 -top-44 h-[38rem] w-[38rem] rounded-full border border-white/10" />
            <div className="absolute right-[8%] top-[18%] h-[24rem] w-[24rem] rounded-full bg-[#5b4bff]/30 blur-3xl" />
            <div className="absolute bottom-[-12rem] left-[12%] h-[28rem] w-[28rem] rounded-full border border-[#5b4bff]/30" />
          </div>
          <div className="relative mx-auto grid min-h-[82vh] max-w-[90rem] items-center gap-14 px-6 py-20 sm:px-10 lg:grid-cols-12 lg:px-16 lg:py-28">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="lg:col-span-7">
              <div className="mb-8 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.28em] text-white/55">
                <span className="h-px w-12 bg-[#8b7cff]" />
                Brand-led managed websites
              </div>
              <h1 className="max-w-[13ch] text-[clamp(2.7rem,5.2vw,4rem)] font-semibold leading-[1.02] tracking-[-0.06em] [text-wrap:balance]">
                Websites that make small businesses look impossible to ignore.
              </h1>
              <div className="mt-10 grid max-w-4xl gap-8 border-t border-white/15 pt-8 md:grid-cols-12 md:items-end">
                <p className="text-lg font-medium leading-8 text-white/70 md:col-span-7">
                  Bennie Studio plans, builds, hosts and keeps improving premium websites that earn trust quickly and turn visits into calls, WhatsApp conversations and qualified enquiries.
                </p>
                <div className="md:col-span-5 md:justify-self-end">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Managed plans from</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{entryMonthly}<span className="text-base text-white/45"> / month</span></p>
                </div>
              </div>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => go("/generate-preview", "Hero free website preview")} className="inline-flex min-h-14 items-center justify-center bg-white px-7 text-sm font-black text-[#10131c] transition hover:bg-[#ddd8ff]">
                  Get my free website preview <ArrowRight className="ml-3 h-4 w-4" />
                </button>
                <button onClick={() => go("/case-studies", "Hero view website examples")} className="inline-flex min-h-14 items-center justify-center border border-white/25 px-7 text-sm font-black text-white transition hover:border-white/60 hover:bg-white/5">
                  See website examples
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.8 }} className="lg:col-span-5">
              <div className="border border-white/15 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 px-2 pb-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#aaa0ff]">Live design system</p>
                    <p className="mt-1 text-sm font-semibold text-white">Brand-led customer website</p>
                  </div>
                  <span className="rounded-full border border-[#8b7cff]/40 bg-[#5b4bff]/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#c9c3ff]">Premium QA</span>
                </div>
                <div className="mt-4 bg-[#f1efe9] p-5 text-[#10131c]">
                  <div className="flex items-center justify-between border-b border-black/10 pb-4">
                    <span className="text-sm font-semibold tracking-tight">Your business</span>
                    <div className="flex gap-3 text-[9px] font-bold text-black/45"><span>Services</span><span>About</span><span>Contact</span></div>
                  </div>
                  <div className="py-10">
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#5b4bff]">Clear positioning</p>
                    <p className="mt-4 max-w-[9ch] text-5xl font-semibold leading-[1.04] tracking-[-0.055em]">A stronger first impression.</p>
                    <p className="mt-5 max-w-sm text-sm font-medium leading-6 text-black/55">Real customer assets, deliberate hierarchy and one clear enquiry path.</p>
                  </div>
                  <div className="grid gap-px bg-black/10 sm:grid-cols-3">
                    {["Offer clarity", "Real proof", "Direct enquiry"].map((item) => <div key={item} className="bg-[#f1efe9] p-4 text-[10px] font-black uppercase tracking-[0.14em]">{item}</div>)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-white/10">
                  {[
                    ["Design", "Brand-led"],
                    ["Assets", "Customer-owned"],
                    ["QA", "Before publish"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-[#11182d] p-4">
                      <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">{label}</p>
                      <p className="mt-2 text-xs font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-b border-[#d9d6ce] bg-[#f7f6f2]">
          <div className="mx-auto grid max-w-[90rem] grid-cols-2 border-x border-[#d9d6ce] sm:grid-cols-3 lg:grid-cols-6">
            {[
              [Sparkles, "Strategy"],
              [Layers3, "Brand design"],
              [MousePointerClick, "Lead capture"],
              [Search, "SEO foundations"],
              [ShieldCheck, "Managed hosting"],
              [LineChart, "Continuous growth"],
            ].map(([Icon, label]: any) => (
              <div key={label} className="flex min-h-24 items-center gap-3 border-b border-r border-[#d9d6ce] px-5 text-sm font-semibold last:border-r-0 lg:border-b-0">
                <Icon className="h-4 w-4 text-[#5b4bff]" /> {label}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#5b4bff]">A different website model</p>
              <h2 className="mt-5 max-w-[11ch] text-[clamp(2.2rem,3.8vw,3.4rem)] font-semibold leading-[0.95] tracking-[-0.055em] [text-wrap:balance]">
                The website is treated like a sales system, not a design file.
              </h2>
              <p className="mt-7 max-w-xl text-lg font-medium leading-8 text-black/55">
                Premium design matters, but the site still has a job to do. Every section should either explain the offer, increase trust or move the visitor toward the right action.
              </p>
              <button onClick={() => go("/how-it-works", "Capability how it works")} className="mt-8 inline-flex items-center text-sm font-black text-[#10131c]">
                See how the service works <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
            <div className="lg:col-span-7">
              <div className="border-t border-[#c9c5bc]">
                {capabilityRows.map(([title, body], index) => (
                  <div key={title} className="grid gap-4 border-b border-[#c9c5bc] py-7 sm:grid-cols-[3rem_1fr_1.35fr] sm:items-start">
                    <span className="text-xs font-black text-[#5b4bff]">0{index + 1}</span>
                    <h3 className="text-xl font-semibold tracking-[-0.025em]">{title}</h3>
                    <p className="text-sm font-medium leading-6 text-black/50">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-24 lg:py-32">
          <div className="mx-auto max-w-[90rem] px-6 sm:px-10 lg:px-16">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#5b4bff]">Design directions</p>
                <h2 className="mt-5 max-w-[12ch] text-[clamp(2.2rem,4vw,3.5rem)] font-semibold leading-[0.94] tracking-[-0.055em] [text-wrap:balance]">One design system. Different art direction for every business.</h2>
              </div>
              <p className="max-w-xl text-base font-medium leading-7 text-black/50 lg:col-span-5 lg:justify-self-end">
                The generator can choose a composition around business maturity, brand personality and available customer assets instead of repainting the same template.
              </p>
            </div>
            <div className="mt-14 grid gap-0 lg:grid-cols-3">
              {designDirections.map((item, index) => (
                <div
                  key={item.label}
                  className={`min-h-[31rem] p-8 sm:p-10 ${item.className} ${index === 0 ? "brand-on-light" : "brand-on-dark"} ${index === 1 ? "lg:-translate-y-8" : ""}`}
                >
                  <p className="text-current text-xs font-semibold uppercase tracking-[0.08em] opacity-60">{item.label}</p>
                  <div className="mt-24">
                    <h3 className="max-w-[11ch] text-current text-3xl font-semibold leading-[1.12] tracking-[-0.02em]">{item.title}</h3>
                    <p className="mt-6 max-w-sm text-current text-base font-normal leading-7 opacity-75">{item.body}</p>
                  </div>
                  <div className="mt-10 h-px w-full bg-current opacity-20" />
                  <p className="mt-5 text-current text-xs font-semibold uppercase tracking-[0.08em] opacity-55">Layout direction 0{index + 1}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#dcd6ff]">
          <div className="mx-auto grid max-w-[90rem] lg:grid-cols-12">
            <div className="border-b border-[#bdb4fa] px-6 py-20 sm:px-10 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-16 lg:py-28">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4338ca]">Built for service businesses</p>
              <h2 className="mt-5 max-w-[9ch] text-[clamp(2.2rem,4vw,3.5rem)] font-semibold leading-[0.94] tracking-[-0.055em]">Complex enough to feel premium. Clear enough to sell.</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-7">
              {industries.map((industry, index) => (
                <div key={industry} className="flex min-h-32 items-center justify-between border-b border-[#bdb4fa] px-6 py-7 sm:border-r sm:px-8">
                  <span className="text-lg font-semibold tracking-[-0.025em]">{industry}</span>
                  <span className="text-xs font-black text-[#5b4bff]">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#5b4bff]">Managed plans</p>
              <h2 className="mt-5 text-[clamp(2.8rem,4.5vw,4.8rem)] font-semibold leading-[0.95] tracking-[-0.05em]">Start with the website. Add growth when you need it.</h2>
              <p className="mt-6 text-sm font-medium leading-6 text-black/50">Local pricing follows the market selected in the navigation. Setup fee and the initial commitment are shown before checkout.</p>
            </div>
            <div className="lg:col-span-8">
              <div className="border-t border-[#c9c5bc]">
                {priced.map(({ product, price }, index) => (
                  <div key={product.slug} className="grid gap-5 border-b border-[#c9c5bc] py-7 md:grid-cols-[2.2fr_1fr_1fr_auto] md:items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#5b4bff]">0{index + 1}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{product.name}</h3>
                      <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/50">{product.description}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/35">Monthly</p>
                      <p className="mt-2 text-xl font-semibold">{formatCommercialMoney(price?.monthlyPrice, price?.currency || "MYR")}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/35">Setup</p>
                      <p className="mt-2 text-xl font-semibold">{formatCommercialMoney(price?.setupFee, price?.currency || "MYR")}</p>
                    </div>
                    <button onClick={() => go(`/pricing?product=${product.slug}`, `Pricing ${product.name}`)} className="inline-flex h-12 items-center justify-center border border-[#10131c] px-5 text-xs font-black transition hover:bg-[#10131c] hover:text-white">
                      Details <ChevronRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs font-semibold text-black/40">Managed plans use a 12-month initial commitment unless your written proposal states otherwise.</p>
            </div>
          </div>
        </section>

        <section className="bg-[#0c1224] text-white">
          <div className="mx-auto max-w-[90rem] px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#aaa0ff]">How it works</p>
                <h2 className="mt-5 max-w-[9ch] text-[clamp(2.2rem,4vw,3.5rem)] font-semibold leading-[0.94] tracking-[-0.055em]">From brief to a website you can actually use.</h2>
              </div>
              <div className="lg:col-span-8">
                <div className="grid sm:grid-cols-2">
                  {process.map(([number, title, body], index) => (
                    <div key={number} className={`min-h-64 border-white/10 p-7 sm:p-8 ${index % 2 === 0 ? "sm:border-r" : ""} ${index < 2 ? "border-b" : ""}`}>
                      <span className="text-xs font-black text-[#8b7cff]">{number}</span>
                      <h3 className="mt-12 text-3xl font-semibold tracking-[-0.04em]">{title}</h3>
                      <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-white/55">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#5b4bff]">Questions</p>
              <h2 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.05em]">A few things worth knowing before we build.</h2>
            </div>
            <div className="border-t border-[#c9c5bc] lg:col-span-8">
              {faqs.map(([question, answer]) => (
                <details key={question} className="group border-b border-[#c9c5bc] py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold tracking-[-0.025em]">
                    {question}
                    <span className="text-2xl font-light text-[#5b4bff] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pt-5 text-sm font-medium leading-7 text-black/50">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#5b4bff] text-white">
          <div className="mx-auto grid max-w-[90rem] gap-10 px-6 py-20 sm:px-10 lg:grid-cols-12 lg:items-end lg:px-16 lg:py-24">
            <div className="lg:col-span-8">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">See your direction first</p>
              <h2 className="mt-5 max-w-[12ch] text-[clamp(2.4rem,4.4vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.06em]">Your website should feel like your business, only sharper.</h2>
            </div>
            <div className="lg:col-span-4 lg:justify-self-end">
              <button onClick={() => go("/generate-preview", "Final free website preview")} className="inline-flex min-h-14 w-full items-center justify-center bg-white px-7 text-sm font-black text-[#10131c] transition hover:bg-[#0c1224] hover:text-white sm:w-auto">
                Generate my preview <ArrowRight className="ml-3 h-4 w-4" />
              </button>
              <button onClick={() => go("/book-demo", "Final book website review")} className="mt-3 inline-flex min-h-12 w-full items-center justify-center border border-white/35 px-7 text-sm font-black text-white transition hover:bg-white/10 sm:w-auto">
                Book 30-minute review
              </button>
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
