import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { WebsiteConceptVisual } from "./WebsiteConceptVisual";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Layers3,
  LineChart,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Wrench,
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
import { DELIVERY_STANDARD_VERSION, PUBLIC_DELIVERY_PROMISES } from "../constants/deliveryStandards";

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

const systemModules = [
  {
    id: "positioning",
    step: "01",
    label: "Positioning",
    title: "Make the offer understandable in seconds.",
    copy: "Define the audience, core service, evidence and strongest next step before decoration gets a vote.",
    icon: Sparkles,
    bullets: ["Audience and offer", "Proof hierarchy", "Primary enquiry action"],
  },
  {
    id: "design",
    step: "02",
    label: "Design system",
    title: "Turn strategy into a distinctive visual direction.",
    copy: "Composition, typography, media and page hierarchy adapt to the business instead of repainting one generic template.",
    icon: Layers3,
    bullets: ["Brand-led composition", "Desktop + mobile", "Reusable page system"],
  },
  {
    id: "conversion",
    step: "03",
    label: "Lead capture",
    title: "Give intent somewhere useful to go.",
    copy: "Calls, WhatsApp, bookings, consultation requests and quote forms are placed around how customers actually buy.",
    icon: MousePointerClick,
    bullets: ["Clear CTAs", "Buyer-specific paths", "Lead capture built in"],
  },
  {
    id: "management",
    step: "04",
    label: "Managed growth",
    title: "Keep the website useful after launch.",
    copy: "Hosting, SSL, maintenance, analytics and plan-based improvements remain part of the service after the launch date.",
    icon: LineChart,
    bullets: ["Hosting + maintenance", "Analytics", "Plan-based improvement"],
  },
] as const;

const managedComparison = [
  ["Launch", "Project handoff", "Start of the managed service"],
  ["Hosting + SSL", "Often separate", "Managed with the website"],
  ["Content changes", "Quoted ad hoc", "Plan-based update allowance"],
  ["Conversion work", "Usually launch-only", "Continues by plan"],
  ["Ownership", "Files and handoff", "Clear business assets + managed delivery"],
] as const;

const workDirections = [
  ["Professional services", "Authority-led", "Expertise, evidence and a clear consultation path."],
  ["Clinics & healthcare", "Trust-led", "Patient confidence, service clarity and an easy booking path."],
  ["Local services", "Conversion-led", "Fast proof, service-area clarity and a focused quote journey."],
] as const;

const industries = [
  { label: "Professional services", path: "/professional-services-website-design", description: "Credibility, expertise and qualified consultation enquiries." },
  { label: "Clinics & healthcare", path: "/clinic-website-design", description: "Patient trust, treatment clarity and appointment paths." },
  { label: "Consultants", path: "/consultant-website-design", description: "Authority positioning, offers, proof and book-call journeys." },
  { label: "Contractors", path: "/renovation-contractor-website-design", description: "Projects, service areas, quote requests and local trust." },
  { label: "Accounting & finance", path: "/accounting-firm-website-design", description: "Service clarity, credentials and consultation conversion." },
  { label: "Education", path: "/tuition-centre-website-design", description: "Programme clarity, parent confidence and trial enquiries." },
  { label: "Beauty & wellness", path: "/beauty-salon-website-design", description: "Premium service presentation, proof and bookings." },
  { label: "Local service businesses", path: "/local-service-website-design", description: "Fast mobile actions, reviews, service areas and quotes." },
] as const;

const process = [
  ["01", "Strategy", "We define the audience, offer, proof and strongest enquiry path."],
  ["02", "Design", "The system chooses the right visual structure and builds the site architecture around the business."],
  ["03", "Review", "Bennie Studio art-directs and quality-checks the build, then you review and approve the final website before launch."],
  ["04", "Grow", "The site stays hosted, maintained and improved as the business changes."],
];

const faqs = [
  ["How is my website tailored?", "The page structure, hierarchy, content direction, proof placement and enquiry path are selected around your business brief, audience and strongest customer action."],
  ["Who reviews my website before launch?", "Every paid build goes through Bennie Studio's internal creative review, responsive QA, production-quality checks and customer approval before it can be published."],
  ["Why is there an initial commitment?", "The initial period covers strategy, build, launch and the first managed-service cycle. The current minimum term is shown on each plan and again in the order summary before payment; after it ends, service continues month-to-month under the written renewal, cancellation and transfer terms."],
  ["What stays mine?", "Your domain and the business assets you supply remain yours. Any managed transfer, export or platform arrangements are confirmed in the written terms before payment."],
  ["Do I need professional photography before we start?", "No. The design can launch with suitable approved assets and clear media placeholders. When real business photography is supplied, it is placed into the planned visual system."],
  ["What happens after launch?", "Managed plans include hosting, maintenance, tracking and plan-based updates. Higher tiers add deeper conversion, landing-page, SEO and growth work."],
  ["Can I preview the website before paying?", "Yes. The free website direction gives you a tailored starting point, not a finished or published website. You can also view clearly labelled concept examples before sharing your own business brief. No card is required for a direction preview."],
  ["Who supplies text and photos?", "You provide accurate business information, approvals, branding and any assets you wish us to use. The plan's content and design scope is confirmed in your order; additional content production or professional photography is quoted separately where needed."],
  ["What does the first payment cover?", "The first payment ordinarily combines the one-time setup fee and the first month of managed service. View the current amount in your chosen billing currency, applicable term and plan scope on the pricing page before you accept the order."],
  ["Can I cancel or move my website?", "Review the initial minimum term, renewal and cancellation notice in the Terms before payment. Your domain and supplied business assets remain yours; any website export or transfer is subject to the written managed-platform and handover terms. A standalone source-code export is not automatically included."],
  ["Do you use AI or automation?", "Yes. Modern tools help accelerate parts of production, but strategy, design decisions, review, QA and launch remain human-guided. Raw automated output is not published as a finished customer website."],
];



const serviceAssurances = [
  [ShieldCheck, "Studio review", "A Bennie Studio review happens before the customer review stage."],
  [Layers3, "Defined scope", "Pages, revision allowance and delivery targets are shown before payment."],
  [Wrench, "Managed launch", "Hosting, SSL, launch QA and website publication stay under one managed workflow."],
  [LineChart, "Ongoing service", "Updates, tracking and plan-based improvements continue after launch."],
] as const;

function ServiceAssuranceStrip() {
  return (
    <section className="border-b border-[#dfe2ea] bg-white" aria-label="Managed service assurances">
      <div className="brand-shell grid sm:grid-cols-2 lg:grid-cols-4">
        {serviceAssurances.map(([Icon, title, detail]) => (
          <div key={title} className="border-b border-[#dfe2ea] px-5 py-6 sm:border-r lg:border-b-0 lg:px-6">
            <Icon className="h-5 w-5 text-[#5746e8]" />
            <p className="mt-4 font-semibold text-[#141821]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#687386]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SystemVisual() {
  return (
    <div className="relative min-h-[31rem] overflow-hidden rounded-[1.2rem] border border-[#20283a] bg-[#090d18] p-5 shadow-[0_34px_90px_-55px_rgba(15,23,42,.8)] sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#6654ff]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#8d7bff]/10 blur-3xl" />

      <div className="relative mx-auto max-w-[41rem] pt-10 sm:pt-8">
        <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-[#111827] shadow-[0_36px_90px_-45px_rgba(0,0,0,.9)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/15" /><span className="h-2 w-2 rounded-full bg-white/10" /></div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] !text-white/70">Managed website system</span>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-[1.05fr_.95fr] sm:p-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] !text-[#b9b1ff]">Positioning first</p>
              <p className="mt-3 max-w-xs text-3xl font-semibold leading-[1.02] !text-white sm:text-4xl">Clear enough to trust. Built to convert.</p>
              <p className="mt-4 max-w-sm text-xs leading-5 !text-white/70">Offer, proof and next action are decided before visual polish. The page system follows the buying journey.</p>
              <div className="mt-6 flex gap-2">
                <span className="bg-white px-3 py-2 text-[10px] font-semibold text-[#101827]">Primary action</span>
                <span className="border border-white/15 px-3 py-2 text-[10px] font-semibold !text-white/65">Proof path</span>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl bg-[#ece9ff] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#5746e8]">Proof hierarchy</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <span className="h-16 bg-white" /><span className="h-16 bg-white" /><span className="h-16 bg-white" />
                </div>
                <div className="mt-3 h-2 w-3/4 bg-[#c8c2ff]" />
                <div className="mt-2 h-2 w-1/2 bg-[#d9d5ff]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <MousePointerClick className="h-4 w-4 text-[#b9b1ff]" />
                  <p className="mt-5 text-xs font-semibold !text-white">Lead capture</p>
                  <p className="mt-1 text-[10px] leading-4 !text-white/70">One useful next step.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <LineChart className="h-4 w-4 text-[#b9b1ff]" />
                  <p className="mt-5 text-xs font-semibold !text-white">Managed growth</p>
                  <p className="mt-1 text-[10px] leading-4 !text-white/70">Improve after launch.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-0 top-0 hidden -translate-x-5 rounded-xl border border-white/10 bg-[#111827]/95 p-4 shadow-xl backdrop-blur md:block">
          <Sparkles className="h-4 w-4 text-[#b9b1ff]" />
          <p className="mt-3 text-xs font-semibold !text-white">Strategy</p>
          <p className="mt-1 text-[10px] !text-white/70">Audience · offer · proof</p>
        </div>
        <div className="absolute right-0 top-2 hidden translate-x-5 rounded-xl border border-white/10 bg-[#111827]/95 p-4 shadow-xl backdrop-blur md:block">
          <Layers3 className="h-4 w-4 text-[#b9b1ff]" />
          <p className="mt-3 text-xs font-semibold !text-white">Design system</p>
          <p className="mt-1 text-[10px] !text-white/70">Hierarchy · media · type</p>
        </div>
      </div>
    </div>
  );
}

function WorkShowcase() {
  const examples = [
    { title: "Professional advisory website", eyebrow: "Credibility and consultation", index: 0, label: "Professional services", copy: "A calm, expertise-led direction that helps buyers understand the service and request a consultation." },
    { title: "Modern dental clinic website", eyebrow: "Clarity and appointment booking", index: 1, label: "Healthcare", copy: "A welcoming, treatment-led experience with accessible appointment routes and patient information." },
    { title: "Residential renovation website", eyebrow: "Trust and quotation requests", index: 3, label: "Home services", copy: "A project-led visual style that explains renovation services and helps visitors request a useful quote." },
  ] as const;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {examples.map((item) => (
        <article key={item.title} className="group overflow-hidden rounded-[1.2rem] border border-[#e0e3ec] bg-white shadow-[0_24px_65px_-50px_rgba(15,23,42,.28)] transition hover:-translate-y-1 hover:shadow-[0_30px_80px_-52px_rgba(15,23,42,.36)]">
          <WebsiteConceptVisual title={item.title} eyebrow={item.eyebrow} index={item.index} className="rounded-none border-b border-slate-200 shadow-none" />
          <div className="p-6">
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#5746e8]">{item.label} · Illustrative concept</p>
            <h3 className="mt-3 text-xl font-semibold text-[#152032]">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#5b687a]">{item.copy}</p>
            <Link to="/case-studies" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#5746e8] hover:underline">
              Explore design decisions <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function BrandLedLandingPage() {
  const navigate = useNavigate();
  const [market] = React.useState(getStoredMarket);
  const { products } = usePublicCommercialPricing(market);
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

  return (
    <div className="brand-public min-h-screen overflow-x-hidden bg-[#f6f7fb] text-[#10131c]">
      <Helmet>
        <title>Bennie Studio | Managed Website System for Service Businesses</title>
        <meta name="description" content="A managed website system combining strategy, design, lead capture, hosting and ongoing improvement for service businesses that need stronger trust and qualified enquiries." />
        <link rel="canonical" href="https://app.bennietay.com/" />
        <meta property="og:title" content="Bennie Studio | Managed Website System" />
        <meta property="og:description" content="Strategy, design, lead capture, hosting and ongoing improvement in one managed website service." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://app.bennietay.com/images/bennie-studio-hero-work.webp" />
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
            <div className="lg:col-span-5">
              <p className="brand-kicker !text-[#b9b1ff]">Designed for service businesses that need enquiries</p>
              <h1 className="mt-5 !max-w-[13ch] !text-white">A website that earns trust <span className="bt-gradient-title block">and makes enquiries easier.</span></h1>
              <p className="brand-copy brand-muted-on-dark mt-7 !max-w-xl">
                We design, build and manage websites that help customers understand your business and take the next step. Start with a free website review or explore a new design direction — then launch with a team behind you.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => go("/website-audit", "Hero existing website review")} className="inline-flex min-h-12 items-center justify-center bg-white px-6 font-semibold text-[#141821] transition hover:-translate-y-0.5 hover:bg-[#eeebff]">
                  Review my current website <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button type="button" onClick={() => go("/generate-preview?mode=business", "Hero new website direction")} className="inline-flex min-h-12 items-center justify-center border border-white/25 bg-white/[0.03] px-6 font-semibold text-white transition hover:bg-white/[0.08]">
                  I need a new website
                </button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm !text-white/65">
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#b9b1ff]" /> Free first review</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#b9b1ff]" /> Reviewed before launch</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-[#b9b1ff]" /> Managed after launch</span>
              </div>
              <p className="mt-5 text-sm leading-6 !text-white/70">
                Plans from {formatCommercialMoney(getCommercialPrice(managed, market)?.monthlyPrice, getCommercialPrice(managed, market)?.currency || "USD")}/month
                {" "}plus {formatCommercialMoney(getCommercialPrice(managed, market)?.setupFee, getCommercialPrice(managed, market)?.currency || "USD")} one-time setup.{" "}
                <Link to="/pricing" className="font-semibold text-white underline underline-offset-4">See first payment, full scope & commitment</Link>
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs !text-white/60">
                <Link to="/case-studies" className="underline underline-offset-4">View labelled examples</Link>
                <Link to="/book-demo" className="underline underline-offset-4">Speak to the studio</Link>
              </p>
            </div>

            <div className="relative lg:col-span-7 lg:-mr-5">
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-[#5746e8]/10 blur-3xl" />
              <WebsiteConceptVisual
                title="Professional service website"
                eyebrow="Premium responsive website direction"
                index={0}
                hero
                className="relative border border-white/10"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/65">
                <span>One credible, customer-focused direction — not a collage of interfaces.</span>
                <Link to="/case-studies" className="font-semibold text-white underline underline-offset-4">See more examples</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#dfe2ea] bg-white">
          <div className="brand-shell brand-section">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="brand-kicker">Selected work</p>
                <h2 className="mt-4">See the quality before you choose a plan.</h2>
              </div>
              <p className="brand-copy lg:col-span-5">Three distinct, fully composed website concepts. Each shows the kind of responsive presentation, credible messaging and enquiry path we can build around a real business.</p>
            </div>

            <div className="mt-11"><WorkShowcase /></div>
            <div className="mt-5 flex flex-col gap-4 border border-[#dfe2ea] bg-[#f8f8ff] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#141821]">What are these website examples?</p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#687386]">These are fictional brand concepts demonstrating visual quality; the businesses and photographs are illustrative. See the separate multi-platform portfolio library for more inspiration. Genuine customer evidence is shown only with approval.</p>
              </div>
              <a href="https://portfolio.bennietay.com/" target="_blank" rel="noopener noreferrer" onClick={() => trackPublicEvent({ eventType: "sales_cta_clicked", label: "Portfolio library", target: "https://portfolio.bennietay.com/" })} className="inline-flex min-h-11 shrink-0 items-center justify-center border border-[#dfe2ea] bg-white px-5 text-sm font-semibold text-[#141821] hover:border-[#5746e8]">Open portfolio library <ArrowRight className="ml-2 h-4 w-4" /></a>
            </div>

            <button onClick={() => go("/case-studies", "Homepage all examples")} className="mt-8 inline-flex items-center font-semibold">
              View all website work <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </section>

        <ServiceAssuranceStrip />

        <section id="system" className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5">
              <p className="brand-kicker">What Bennie Studio does</p>
              <h2 className="mt-4 max-w-xl">Make the important website decisions before polishing the interface.</h2>
              <p className="brand-copy mt-5">The work starts with what the customer needs to understand, what evidence earns trust and what action should happen next.</p>
              <button onClick={() => go("/how-it-works", "Homepage studio process")} className="mt-7 inline-flex items-center font-semibold text-[#141821]">See the studio process <ArrowRight className="ml-2 h-4 w-4" /></button>
            </div>
            <div className="border-t border-[#dfe2ea] lg:col-span-7">
              {[
                ["01", "Position the offer", "Clarify the audience, strongest service, evidence and reason to choose the business."],
                ["02", "Shape the customer journey", "Decide what belongs on each page and where proof and enquiry actions need to appear."],
                ["03", "Design for the business", "Use composition, typography, media and responsive behaviour that fit the category and brand."],
                ["04", "Review before launch", "Check the message, design, mobile experience, forms and customer approval before publishing."],
              ].map(([number,title,copy]) => (
                <article key={number} className="grid gap-4 border-b border-[#dfe2ea] py-6 sm:grid-cols-[3rem_1fr]">
                  <span className="text-xs font-bold text-[#5746e8]">{number}</span>
                  <div><h3 className="text-lg">{title}</h3><p className="mt-2 text-sm leading-6 text-[#687386]">{copy}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#dfe2ea] bg-[#101827] text-white">
          <div className="brand-shell brand-section">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="brand-kicker !text-[#b9b1ff]">Reviewed delivery · Standard {DELIVERY_STANDARD_VERSION}</p>
                <h2 className="mt-4 !text-white">Nothing goes live on the first draft.</h2>
                <p className="mt-5 max-w-xl text-base leading-7 !text-white/65">
                  Every paid website is reviewed for message clarity, design quality, responsive behaviour and conversion logic before it reaches launch. Customer approval stays part of the process.
                </p>
                <button onClick={() => go("/how-it-works", "Homepage delivery standard")} className="mt-7 inline-flex items-center font-semibold text-white">
                  See the delivery standard <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 lg:col-span-7 sm:grid-cols-2">
                {PUBLIC_DELIVERY_PROMISES.slice(0, 4).map((promise, index) => (
                  <div key={promise} className="border border-white/15 bg-white/[0.035] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] !text-[#b9b1ff]">
                      0{index + 1}
                    </p>
                    <p className="mt-3 text-sm font-semibold leading-6 !text-white/80">{promise}</p>
                  </div>
                ))}
              </div>
            </div>
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

        <section className="border-y border-[#dfe2ea] bg-[#f0efff]">
          <div className="brand-shell brand-section">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-6">
                <p className="brand-kicker">Built for trust-sensitive sales</p>
                <h2 className="mt-4">Built around how customers decide.</h2>
              </div>
              <p className="brand-copy lg:col-span-6">Different industries need different proof, page depth and enquiry paths. The underlying system stays consistent; the buying journey does not.</p>
            </div>
            <div className="mt-10 grid gap-3 md:grid-cols-2">
              {industries.map((industry, index) => (
                <Link
                  key={industry.label}
                  to={industry.path}
                  onClick={() => trackPublicEvent({ eventType: "sales_cta_clicked", label: `Industry ${industry.label}`, target: industry.path })}
                  className="group grid min-h-36 grid-cols-[3rem_1fr_auto] gap-4 border border-[#d8d6f1] bg-white/75 p-5 transition hover:-translate-y-0.5 hover:border-[#b8b0ff] hover:bg-white"
                >
                  <span className="text-xs font-semibold text-[#5746e8]">{String(index + 1).padStart(2, "0")}</span>
                  <span><span className="block text-lg font-semibold text-[#141821]">{industry.label}</span><span className="mt-2 block text-sm leading-6 text-[#687386]">{industry.description}</span></span>
                  <ChevronRight className="mt-1 h-5 w-5 text-[#5746e8] transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="brand-kicker">Managed, not handed off</p>
              <h2 className="mt-4">Launch is the beginning.</h2>
              <p className="brand-copy mt-5">This is the operating difference between buying a one-off website project and using a managed website service.</p>
            </div>
            <div className="overflow-hidden border border-[#dfe2ea] bg-white lg:col-span-8">
              <div className="grid grid-cols-[1fr_1fr] border-b border-[#dfe2ea] bg-[#f3f4f8] sm:grid-cols-[1.1fr_1fr_1fr]">
                <div className="hidden px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#526071] sm:block">Area</div>
                <div className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#526071]">Project-only build</div>
                <div className="bg-[#101827] px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#b9b1ff]">Bennie Studio</div>
              </div>
              {managedComparison.map(([area, project, managed]) => (
                <div key={area} className="grid grid-cols-[1fr_1fr] border-b border-[#dfe2ea] last:border-b-0 sm:grid-cols-[1.1fr_1fr_1fr]">
                  <div className="hidden px-5 py-4 text-sm font-semibold text-[#141821] sm:block">{area}</div>
                  <div className="px-5 py-4 text-sm leading-6 text-[#687386]">{project}</div>
                  <div className="bg-[#f8f8ff] px-5 py-4 text-sm font-semibold leading-6 text-[#141821]">{managed}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#dfe2ea] bg-white">
          <div className="brand-shell brand-section">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="brand-kicker">Simple, transparent pricing</p>
                <h2 className="mt-4">Choose the right level of support.</h2>
                <p className="brand-copy mt-5">Start with the website you need now. Add deeper conversion, SEO and growth support when your business is ready for it.</p>
              </div>
              <div className="lg:col-span-8">
                <div className="grid gap-4 lg:grid-cols-3">
                  {priced.map(({ product, price }, index) => {
                    const isGrowth = product.slug === "website-growth";
                    return (
                      <article key={product.slug} className={isGrowth ? "border border-[#101827] bg-[#101827] p-6 text-white shadow-[0_24px_70px_-45px_rgba(15,23,42,.6)]" : "border border-[#dfe2ea] bg-white p-6"}>
                        <div>
                          <p className={isGrowth ? "text-xs font-semibold uppercase tracking-[0.08em] !text-[#b9b1ff]" : "text-xs font-semibold uppercase tracking-[0.08em] text-[#5746e8]"}>{isGrowth ? "Recommended" : planBestFor[index]}</p>
                          <h3 className={isGrowth ? "mt-2 !text-white" : "mt-2"}>{product.name}</h3>
                        </div>
                        <p className={isGrowth ? "mt-7 text-3xl font-semibold !text-white" : "mt-7 text-3xl font-semibold"}>{formatCommercialMoney(price?.monthlyPrice, price?.currency || "USD")}<span className={isGrowth ? "text-sm font-normal !text-white/75" : "text-sm font-normal text-[#5f6673]"}>/month</span></p>
                        <p className={isGrowth ? "mt-1 text-sm !text-white/75" : "mt-1 text-sm text-[#5f6673]"}>+ {formatCommercialMoney(price?.setupFee, price?.currency || "USD")} one-time setup</p>
                        <p className={isGrowth ? "mt-2 text-sm font-semibold !text-white" : "mt-2 text-sm font-semibold text-[#141821]"}>First payment: {price?.monthlyPrice == null ? "By quote" : formatCommercialMoney((price.setupFee || 0) + price.monthlyPrice, price.currency)}</p>
                        <p className={isGrowth ? "mt-2 text-xs font-semibold !text-white/65" : "mt-2 text-xs font-semibold text-[#687386]"}>{formatCommitmentLabel(getMinimumTermMonths(price))}, then month-to-month unless the accepted order states otherwise.</p>
                        <div className={isGrowth ? "mt-6 space-y-3 border-t border-white/25 pt-5" : "mt-6 space-y-3 border-t border-[#dfe2ea] pt-5"}>
                          {planComparisonRows.map(([label, values]) => (
                            <div key={label} className="flex items-start justify-between gap-4 text-sm">
                              <span className={isGrowth ? "font-semibold !text-white/80" : "font-semibold text-[#526071]"}>{label}</span>
                              <span className={isGrowth ? "text-right font-semibold !text-white" : "text-right text-[#526071]"}>{values[index]}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => go("/pricing#plan-" + product.slug, "Pricing " + product.name)} className={isGrowth ? "mt-6 inline-flex min-h-12 w-full items-center justify-center bg-white px-5 font-semibold text-[#101827]" : "mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#141821] px-5 font-semibold text-white"}>
                          View plan <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="brand-on-dark bg-[#0b1020]">
          <div className="brand-shell brand-section">
            <p className="brand-kicker !text-[#b9b1ff]">From brief to ongoing</p>
            <div className="mt-4 grid gap-10 lg:grid-cols-12">
              <h2 className="!text-white lg:col-span-4">From strategy to launch — without the chaos.</h2>
              <div className="lg:col-span-8">
                {process.map(([number, title, body]) => (
                  <div key={number} className="grid gap-3 border-t border-white/15 py-7 sm:grid-cols-[4rem_1fr_1.5fr]">
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

        <section className="brand-grid-bg relative overflow-hidden bg-[#5746e8] text-white">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="brand-shell relative grid gap-8 py-16 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold !text-white/70">Ready for a better website?</p>
              <h2 className="mt-2 max-w-2xl !text-white">Let’s build a website that moves your business forward.</h2>
              <p className="mt-4 max-w-xl !text-white/75">Start with a website review. See what needs attention first, then decide whether you want Bennie Studio to prepare a direction and manage the build.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <button onClick={() => go("/website-audit", "Final website review")} className="min-h-12 bg-white px-6 font-semibold text-[#141821]">Get a website review <ArrowRight className="ml-2 inline h-4 w-4" /></button>
              <button onClick={() => go("/book-demo", "Final book review")} className="min-h-12 border border-white/30 bg-white/[0.04] px-6 font-semibold text-white">Book a free call</button>
            </div>
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
