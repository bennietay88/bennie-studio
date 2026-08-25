import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileSearch,
  Globe,
  LayoutTemplate,
  Mail,
  MessageCircle,
  MoveDown,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { SafeImage } from "./SafeImage";
import { WAAS_TEMPLATE_PACKS } from "../constants/nicheTemplates";
import {
  buildReviewWebsiteStrategy,
  assessManualReviewInput,
} from "../constants/reviewPoweredWaas";
import { Pricing as CommercialPricing } from "./Pricing";
import { trackPinterestLead } from "../lib/pinterestTracking";
import { trackPublicEvent } from "../lib/publicTracking";
import { FREE_PREVIEW_LIMITS, PUBLIC_PROMISE, SUBSCRIPTION_DELIVERY_FLOW } from "../constants/salesFlow";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { FlagshipTemplateGallery } from "./FlagshipTemplateGallery";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import { supabase } from "../lib/supabase";
import {
  normalizeWebsiteAuditResult,
  type AuditPriority,
  type WebsiteAuditResult,
} from "../lib/websiteAudit";

type PublicPageKind =
  | "templates"
  | "pricing"
  | "how-it-works"
  | "case-studies"
  | "website-audit"
  | "generate-preview"
  | "clinic-website-design-malaysia"
  | "renovation-contractor-website-design"
  | "beauty-salon-website-design"
  | "tuition-centre-website-design"
  | "consultant-website-design";
type PricingMarket = "MY" | "SG" | "GB" | "US";

const pageMeta: Record<PublicPageKind, { title: string; description: string }> = {
  templates: {
    title: "Website Templates by Industry | Bennie Studio",
    description:
      "Browse focused website templates for clinics, wellness providers, renovation companies, home service businesses, beauty salons, and aesthetic services.",
  },
  pricing: {
    title: "Lead Website Pricing by Location | Bennie Studio",
    description:
      "Clear managed lead-generation website pricing shown by visitor location, with custom website pricing for businesses that need full control.",
  },
  "how-it-works": {
    title: "How It Works | Bennie Studio",
    description:
      "See how Bennie Studio takes you from signup and business brief to website build, review, launch, and ongoing support.",
  },
  "case-studies": {
    title: "Website Case Studies by Industry | Bennie Studio",
    description:
      "Explore complete concept case studies showing the challenge, website strategy, conversion path, and page structure for six service industries.",
  },
  "website-audit": {
    title: "Free Website Growth Audit | Bennie Studio",
    description:
      "Request a free website audit to identify design, mobile, SEO, enquiry, speed, content, and trust issues on your current website.",
  },
  "generate-preview": {
    title: "Generate a Limited Website Preview | Bennie Studio",
    description:
      "Paste real reviews and business details to get a limited homepage concept before creating an account or choosing a managed website plan.",
  },
  "clinic-website-design-malaysia": {
    title: "Clinic Website Design Malaysia | Appointment Enquiry Websites",
    description:
      "Lead-generation clinic websites for Malaysia clinics that need treatment pages, patient trust, local SEO structure, WhatsApp enquiries, and appointment CTAs.",
  },
  "renovation-contractor-website-design": {
    title: "Renovation Contractor Website Design | Quote Request Websites",
    description:
      "Conversion-focused renovation contractor websites with project galleries, quote forms, service areas, before-and-after proof, and WhatsApp enquiries.",
  },
  "beauty-salon-website-design": {
    title: "Beauty Salon Website Design | Booking and Treatment Websites",
    description:
      "Beauty salon and spa websites built around treatment enquiries, booking CTAs, service menus, proof, FAQs, and WhatsApp follow-up.",
  },
  "tuition-centre-website-design": {
    title: "Tuition Centre Website Design | Trial Class Enquiry Websites",
    description:
      "Tuition centre websites for parent enquiries, trial class bookings, programme pages, teacher trust, results, FAQs, and local search visibility.",
  },
  "consultant-website-design": {
    title: "Consultant Website Design | Authority and Book-Call Websites",
    description:
      "Consultant websites that explain your offer, build trust, present services, and convert visitors into consultation calls and qualified enquiries.",
  },
};

const primaryCtaClass =
  "inline-flex min-h-12 items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_-14px_rgba(79,70,229,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-[0_18px_34px_-16px_rgba(79,70,229,0.9)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 active:translate-y-0";
const secondaryCtaClass =
  "inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_8px_22px_-14px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_14px_28px_-16px_rgba(15,23,42,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:translate-y-0";

const industries = [
  ["Dental Clinic", "Appointment booking, treatment pages, local SEO, WhatsApp enquiries."],
  ["Aesthetic Clinic", "Premium service presentation, treatment categories, consultation CTA."],
  ["Cleaning Service", "Fast quote flow, service areas, reviews, recurring cleaning packages."],
  ["Renovation Contractor", "Project gallery, quote request, before/after proof, service areas."],
  ["Consultant", "Authority positioning, services, case studies, book-a-call flow."],
  ["Law Firm", "Trust-first layout, practice areas, consultation enquiry, FAQ."],
  ["Real Estate Agent", "Property lead capture, buyer/seller CTAs, local positioning."],
  ["Restaurant", "Menu preview, reservations, location, promotions, gallery."],
  ["Fitness Coach", "Program offer, transformation proof, booking and WhatsApp CTA."],
  ["Salon / Spa", "Treatments, pricing preview, booking CTA, photo-led trust sections."],
  ["Accounting Firm", "Packages, who-we-help, consultation CTA, compliance-friendly copy."],
  ["IT Support Company", "Service plans, response promise, support request CTA, B2B trust."],
];

const pricingMarkets: Record<PricingMarket, { label: string; country: string; note: string }> = {
  MY: {
    label: "Malaysia",
    country: "Malaysia",
    note: "Prices shown in Malaysian Ringgit for Malaysia-based businesses.",
  },
  SG: {
    label: "Singapore",
    country: "Singapore",
    note: "Prices shown in Singapore Dollars for Singapore-based businesses.",
  },
  GB: {
    label: "United Kingdom",
    country: "UK",
    note: "Prices shown in GBP for UK businesses.",
  },
  US: {
    label: "United States / Global",
    country: "Global",
    note: "Prices shown in USD for international buyers.",
  },
};

const deliveryStages = [
  {
    title: "See the direction",
    timing: "Before you buy",
    customer: "Share your website or a short business brief.",
    studio: "We identify the clearest offer, proof, and enquiry direction, then prepare a limited preview.",
    outcome: "You can judge the direction before committing.",
  },
  {
    title: "Confirm the plan",
    timing: "Signup",
    customer: "Choose the plan that matches the pages and support you need.",
    studio: "We preserve your preview details and guide you through checkout and onboarding.",
    outcome: "No need to repeat the same business information.",
  },
  {
    title: "Review the build",
    timing: "Build and approval",
    customer: "Provide content and one clear round of consolidated feedback.",
    studio: "We build the agreed pages, enquiry paths, mobile layout, SEO basics, and tracking.",
    outcome: "Nothing launches until you approve it.",
  },
  {
    title: "Launch and improve",
    timing: "Ongoing",
    customer: "Approve recommendations or request plan-based updates.",
    studio: "We host, maintain, track real enquiry actions, and make managed improvements.",
    outcome: "You see what happened, what changed, and what we recommend next.",
  },
];

const caseStudies = [
  {
    title: "SmileHaus Dental Clinic",
    templateId: "dental-clinic-v1",
    industry: "Dental clinic",
    type: "Appointment conversion",
    image: "/brand-template-preview.svg",
    challenge: "Patients need treatment clarity and reassurance before they are ready to book.",
    strategy: "Lead with understandable treatment pages, dentist trust, location proof, FAQs, and a persistent WhatsApp booking path.",
    outcome: "A clinic-ready journey designed to turn treatment research into appointment enquiries.",
    delivered: ["Treatment pages", "Dentist profile", "Patient FAQ", "WhatsApp booking"],
    href: "/portfolio/sample/dental",
  },
  {
    title: "PrimeBuild Renovation",
    templateId: "renovation-contractor-v1",
    industry: "Renovation contractor",
    type: "Qualified quote flow",
    image: "/brand-template-preview.svg",
    challenge: "Generic contact forms produce weak enquiries without project type, budget, location, or timing.",
    strategy: "Show project capability first, then guide prospects through service areas, process, trust points, and a structured quote request.",
    outcome: "A proof-led website direction designed to generate better-qualified renovation enquiries.",
    delivered: ["Project highlights", "Service pages", "Areas served", "Quote request"],
    href: "/portfolio/sample/contractor",
  },
  {
    title: "NorthStar Growth Advisory",
    templateId: "law-firm-v1",
    industry: "Consulting",
    type: "Authority and call booking",
    image: "/brand-template-preview.svg",
    challenge: "Prospects cannot assess expertise when services, outcomes, and the engagement model are vague.",
    strategy: "Clarify the advisory offer, connect services to buyer problems, add proof prompts, and create one direct strategy-call path.",
    outcome: "An authority-first sales journey designed to convert interest into qualified consultation calls.",
    delivered: ["Offer positioning", "Service outcomes", "Proof sections", "Call booking"],
    href: "/portfolio/sample/consultant",
  },
  {
    title: "Lumi Beauty Studio",
    templateId: "salon-spa-v1",
    industry: "Beauty salon",
    type: "Treatment booking",
    image: "/brand-template-preview.svg",
    challenge: "Visitors need to compare treatments, packages, quality, and availability quickly on mobile.",
    strategy: "Organise the service menu, visual proof, packages, promotions, and FAQs around a simple WhatsApp booking action.",
    outcome: "A polished mobile-first direction designed to move treatment browsers toward booking.",
    delivered: ["Service menu", "Package blocks", "Gallery sections", "Booking CTA"],
    href: "/portfolio/sample/beauty",
  },
  {
    title: "Kopi Yard Cafe",
    templateId: "restaurant-v1",
    industry: "Restaurant and cafe",
    type: "Local discovery",
    image: "/brand-template-preview.svg",
    challenge: "Diners want menu, photos, location, opening hours, and reservation options without searching across several platforms.",
    strategy: "Put the most-requested information near the top and connect menu discovery to reservations, WhatsApp, maps, and promotions.",
    outcome: "A local-discovery website direction designed to support visits, reservations, and direct orders.",
    delivered: ["Menu showcase", "Food gallery", "Maps and hours", "Reservation CTA"],
    href: "/portfolio/sample/restaurant",
  },
  {
    title: "BrightPath Tuition Centre",
    templateId: "tuition-centre-v1",
    industry: "Education",
    type: "Trial-class enquiries",
    image: "/brand-template-preview.svg",
    challenge: "Parents need clear programmes, levels, teachers, schedules, and outcomes before making contact.",
    strategy: "Structure programmes for comparison, build teacher trust, answer parent questions, and centre the journey on a trial-class enquiry.",
    outcome: "A parent-friendly website direction designed to generate enrolment and trial-class leads.",
    delivered: ["Programme pages", "Teacher profiles", "Parent FAQ", "Trial-class CTA"],
    href: "/portfolio/sample/education",
  },
];

const industrySalesStarts = [
  {
    industry: "Dental and clinics",
    path: "/templates",
    promise: "Appointment-ready pages with treatment sections, location trust, FAQ, and WhatsApp or booking CTAs.",
  },
  {
    industry: "Local services",
    path: "/templates",
    promise: "Quote-request websites for cleaning, pest control, contractors, home repair, and emergency services.",
  },
  {
    industry: "Consultants and coaches",
    path: "/templates",
    promise: "Authority-led pages with services, proof, book-a-call flow, and professional positioning.",
  },
  {
    industry: "Real estate",
    path: "/templates",
    promise: "Property lead capture, buyer/seller enquiry paths, listing sections, and local area positioning.",
  },
  {
    industry: "Restaurants and lifestyle",
    path: "/templates",
    promise: "Menu, reservations, gallery, location, promotions, and contact-ready mobile layouts.",
  },
  {
    industry: "Professional services",
    path: "/templates",
    promise: "Trust-first structures for law, accounting, insurance, IT support, recruitment, and B2B services.",
  },
];

const nichePages: Record<
  Extract<
    PublicPageKind,
    | "clinic-website-design-malaysia"
    | "renovation-contractor-website-design"
    | "beauty-salon-website-design"
    | "tuition-centre-website-design"
    | "consultant-website-design"
  >,
  {
    label: string;
    title: string;
    subtitle: string;
    positioning: string;
    pain: string;
    promise: string;
    cta: string;
    leadCapture: string;
    sections: string[];
  }
> = {
  "clinic-website-design-malaysia": {
    label: "Clinic lead websites",
    title: "Clinic Websites Built to Increase Patient Enquiries",
    subtitle:
      "For dental, aesthetic, wellness, and healthcare clinics that need treatment pages, doctor trust, local visibility, and appointment CTAs.",
    positioning: "Appointment-focused websites for clinics in Malaysia.",
    pain: "Patients compare treatments, trust, reviews, location, and booking convenience before contacting a clinic.",
    promise: "We structure your website so treatments are clear, trust is visible, FAQs reduce hesitation, and WhatsApp or appointment CTAs are easy to act on.",
    cta: "Get a Free Clinic Website Audit",
    leadCapture: "WhatsApp enquiry, appointment form, phone call, and treatment-specific CTA.",
    sections: ["Hero with appointment CTA", "Treatment categories", "Practitioner trust", "Patient FAQs", "Reviews/proof", "Location/map", "Appointment form"],
  },
  "renovation-contractor-website-design": {
    label: "Contractor quote websites",
    title: "Renovation Websites That Turn Project Visitors Into Quote Requests",
    subtitle:
      "For contractors, renovation firms, interior specialists, and home service companies that need project proof and clear quote flow.",
    positioning: "Quote-request websites for renovation and home improvement businesses.",
    pain: "Homeowners need proof, process clarity, service areas, budget confidence, and an easy way to request a quote.",
    promise: "We build the website around services, project galleries, before/after proof, FAQs, service areas, and quote request CTAs.",
    cta: "Get a Free Contractor Website Review",
    leadCapture: "Quote request form, WhatsApp quote CTA, project-type enquiry, and call button.",
    sections: ["Hero with quote CTA", "Service categories", "Project gallery", "Before/after proof", "Process", "Service areas", "Quote form"],
  },
  "beauty-salon-website-design": {
    label: "Salon booking websites",
    title: "Salon Websites Built for Bookings, Trust, and Treatment Enquiries",
    subtitle:
      "For beauty salons, spas, aesthetic providers, nail studios, and wellness brands that need better treatment presentation and booking flow.",
    positioning: "Booking-focused websites for beauty and lifestyle businesses.",
    pain: "Customers want to compare treatments, pricing guidance, results, location, and booking options before messaging.",
    promise: "We organize services, packages, visuals, reviews, FAQs, and booking CTAs so visitors can enquire without confusion.",
    cta: "Get a Free Salon Website Audit",
    leadCapture: "WhatsApp booking, booking link, treatment enquiry form, and offer CTA.",
    sections: ["Premium hero", "Treatment menu", "Packages/pricing preview", "Gallery", "Reviews", "FAQ", "Booking CTA"],
  },
  "tuition-centre-website-design": {
    label: "Tuition enquiry websites",
    title: "Tuition Centre Websites That Help Parents Enquire Faster",
    subtitle:
      "For tuition centres, education centres, enrichment programmes, and tutors that need parent trust and trial class enquiries.",
    positioning: "Parent-enquiry websites for education businesses.",
    pain: "Parents need programme clarity, level fit, teacher trust, results, schedules, fees guidance, and a trial class path.",
    promise: "We structure programmes, levels, outcomes, teacher trust, FAQs, and trial-class CTAs so parents know what to ask next.",
    cta: "Get a Free Tuition Website Review",
    leadCapture: "Trial class form, WhatsApp enquiry, call button, and programme-specific CTA.",
    sections: ["Hero with trial class CTA", "Programme cards", "Age/level selector", "Teacher trust", "Results/outcomes", "FAQs", "Trial class form"],
  },
  "consultant-website-design": {
    label: "Consultant authority websites",
    title: "Consultant Websites That Explain Your Value and Convert Visitors Into Calls",
    subtitle:
      "For consultants, coaches, advisors, and professional service providers who need clearer positioning and qualified call requests.",
    positioning: "Authority websites for consultants and expert-led businesses.",
    pain: "Prospects leave when the offer is vague, proof is weak, or the next step is unclear.",
    promise: "We clarify your positioning, package your services, add proof, answer objections, and guide visitors to book a consultation.",
    cta: "Get a Free Consultant Website Audit",
    leadCapture: "Book-call CTA, consultation form, LinkedIn/WhatsApp enquiry, and lead qualification questions.",
    sections: ["Authority hero", "Problem/solution", "Services/programmes", "Proof/case studies", "Process", "FAQ", "Book-call CTA"],
  },
};

const getTrackingContext = () => {
  if (typeof window === "undefined") {
    return {
      sourcePage: "/",
      pageTitle: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      country: "",
      source: "",
      campaign: "",
      referrer: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  const currentTouch = {
    sourcePage: `${window.location.pathname}${window.location.search}`,
    pageTitle: document.title,
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    source: params.get("source") || params.get("src") || "",
    campaign: params.get("campaign") || params.get("utm_campaign") || "",
    referrer: document.referrer || "",
    country: navigator.language?.split("-")?.[1] || "",
    referralCode: params.get("ref") || params.get("referral") || localStorage.getItem("ref_platform") || "",
  };
  let firstTouch = currentTouch;
  try {
    const saved = localStorage.getItem("bt_first_touch");
    if (saved) firstTouch = { ...currentTouch, ...JSON.parse(saved) };
    else localStorage.setItem("bt_first_touch", JSON.stringify(currentTouch));
    localStorage.setItem("bt_last_touch", JSON.stringify(currentTouch));
  } catch {
    // Attribution storage is best effort; form submission must continue.
  }
  return { ...currentTouch, firstTouch, lastTouch: currentTouch };
};

async function submitPlatformLead(input: {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  industry?: string;
  websiteUrl?: string;
  message?: string;
  formName: string;
  leadType: string;
  landingPage?: string;
  service?: string;
  selectedProduct?: string;
}) {
  const response = await fetch("/api/platform-leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      ...getTrackingContext(),
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || "Unable to submit request right now.");
  }

  trackPinterestLead(input.leadType, {
    form_name: input.formName,
    source_page: window.location.pathname,
  });

  return data;
}

function Hero({ title, copy, icon: Icon }: { title: string; copy: string; icon: React.ElementType }) {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <Badge className="mb-5 rounded-full bg-indigo-50 px-4 py-1 text-indigo-600 hover:bg-indigo-50">
            Lead-generation website system
          </Badge>
          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
            {copy}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/generate-preview"
              onClick={() => trackPublicEvent({ eventType: "click_generate_preview", label: "Hero Generate Free Website Preview", target: "/generate-preview" })}
              className={primaryCtaClass}
            >
              Generate My Free Website Preview <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/website-audit"
              onClick={() => trackPublicEvent({ eventType: "click_request_audit", label: "Hero Website Growth Audit", target: "/website-audit" })}
              className={secondaryCtaClass}
            >
              Request Website Growth Audit
            </Link>
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl">
          <div className="rounded-[1.5rem] bg-slate-950 p-7 text-white">
            <Icon className="mb-12 h-10 w-10 rounded-2xl bg-indigo-600 p-2" />
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-200">Built to sell faster</p>
            <p className="mt-4 text-2xl font-black leading-tight text-white">
              Templates, pricing, case studies, website audit, and launch flow in one clear sales path.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TemplatesPage() {
  return (
    <>
      <Hero
        title="Website templates organised by industry"
        copy="Choose a niche-ready website structure instead of starting from a blank page. Each template is built around the business type, conversion goal, contact method, page count, and local SEO structure."
        icon={LayoutTemplate}
      />
      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Five flagship directions</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Preview the real website—not a generic wireframe.</h2>
          <p className="mt-4 text-base font-semibold leading-7 text-slate-600">Each family uses a distinct visual direction, enquiry path, proof structure and launch checklist. Open the live build, then personalise it with your business details.</p>
        </div>
        <FlagshipTemplateGallery />

        <div className="mt-14 border-t border-slate-200 pt-12">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">More niche starting points</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">The same managed system, organised around your market.</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">These packs help us choose the right CTA, page structure and evidence requirements. They are not separate low-quality themes.</p>
          </div>
        </div>
        <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {WAAS_TEMPLATE_PACKS.map((pack) => (
            <div key={pack.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">{pack.name}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{pack.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {pack.niches.map((niche) => (
                  <span key={niche} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                    {niche}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Industry sales paths</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Start from the business type, then choose the right template.
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
              These quick starts keep the customer conversation simple: niche, goal, pages, CTA, and local SEO direction.
            </p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {industrySalesStarts.map((item) => (
              <Link
                key={item.industry}
                to={item.path}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white/10"
              >
                <p className="text-lg font-black text-white">{item.industry}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{item.promise}</p>
                <span className="mt-4 inline-flex items-center text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
                  View the industry path <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function PricingPage() {
  return <CommercialPricing />;
  /* Legacy implementation retained in git history; current pricing is rendered by CommercialPricing. */
  /*
  const [selectedMarket, setSelectedMarket] = React.useState<PricingMarket>("US");
  const [detectedLabel, setDetectedLabel] = React.useState("Detecting your location...");

  React.useEffect(() => {
    let cancelled = false;
    const detectMarket = async () => {
      try {
        const response = await fetch("/api/public/geo-pricing");
        if (!response.ok) throw new Error("Location detection failed");
        const data = await response.json();
        const market = countryToRevenueMarket(data?.countryCode);
        if (cancelled) return;
        setSelectedMarket(market);
        const countryName = String(data?.countryName || pricingMarkets[market].label);
        setDetectedLabel(`Detected ${countryName.charAt(0).toUpperCase()}${countryName.slice(1)}`);
      } catch {
        if (cancelled) return;
        setSelectedMarket("US");
        setDetectedLabel("Showing global USD pricing");
      }
    };

    detectMarket();
    return () => {
      cancelled = true;
    };
  }, []);

  const market = pricingMarkets[selectedMarket];
  const offer = getOfferForMarket(selectedMarket);
  const basicOffers = getBasicWebsiteOffers(selectedMarket);
  const entryPrice = basicOffers[0]?.price || "US$99/month";
  const customWebsiteQuote = formatUsdRangeForCountry(1500, 3500, selectedMarket, {
    from: true,
    plus: true,
  });

  return (
    <>
      <Hero
        title="Choose how much help you need"
        copy={`Start with a practical managed website from ${entryPrice}/month, add a hands-on growth partnership when you are ready, or commission a fully custom website.`}
        icon={ClipboardCheck}
      />
      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Location-based pricing</p>
            <p className="mt-2 text-sm font-bold text-slate-600">{detectedLabel}. {market.note}</p>
          </div>
          <label className="flex flex-col gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 sm:min-w-64">
            Pricing market
            <select
              value={selectedMarket}
              onChange={(event) => {
                const nextMarket = event.target.value as PricingMarket;
                setSelectedMarket(nextMarket);
                setDetectedLabel(`Showing ${pricingMarkets[nextMarket].label} pricing`);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black normal-case tracking-normal text-slate-950 outline-none focus:border-indigo-400"
            >
              {Object.entries(pricingMarkets).map(([code, item]) => (
                <option key={code} value={code}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mb-6 rounded-[2.5rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Basic website plans</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Managed website plans from {entryPrice}/month</h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Template-led plans for businesses that provide their core information and approve the direction. Billed in {selectedMarket === "MY" ? "Malaysian Ringgit" : selectedMarket === "SG" ? "Singapore Dollars" : selectedMarket === "GB" ? "British Pounds" : "US Dollars"}.
              </p>
            </div>
            <p className="rounded-2xl bg-slate-100 px-4 py-3 text-xs font-bold leading-5 text-slate-600">
              Best for getting online first. Upgrade when you need deeper strategy and proactive improvement.
            </p>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {basicOffers.map((plan) => (
              <article
                key={plan.id}
                className={`flex h-full flex-col rounded-[2rem] border p-6 ${plan.isPopular ? "border-indigo-300 bg-indigo-50/70 ring-4 ring-indigo-50" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-black text-slate-950">{plan.name}</h3>
                  {plan.isPopular ? <Badge className="border-0 bg-indigo-600 text-white">Popular</Badge> : null}
                </div>
                <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{plan.price}<span className="text-sm text-slate-500">/month</span></p>
                <p className="mt-2 text-xs font-bold text-slate-500">{plan.setupFee} one-time setup · {plan.commitmentMonths}-month term</p>
                <p className="mt-3 min-h-12 text-sm font-semibold leading-6 text-slate-600">{plan.bestFor}</p>
                <ul className="mt-5 space-y-3">
                  {plan.included.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm font-bold text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup?redirectTo=%2Fdashboard%2Fonboarding"
                  onClick={() => {
                    saveBasicPlanIntent(plan.id, selectedMarket);
                    trackPublicEvent({ eventType: "click_pricing_plan", label: plan.name, target: "/signup", metadata: { planId: plan.id, price: plan.price, tier: "basic" } });
                  }}
                  className={`${plan.isPopular ? primaryCtaClass : secondaryCtaClass} mt-6 w-full`}
                >
                  Choose {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </div>
        <div className="mb-5 flex items-center gap-4 px-2">
          <div className="h-px flex-1 bg-slate-200" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Need Bennie Studio to lead the work?</p>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2.5rem] border border-indigo-200 bg-indigo-50 p-7 shadow-sm sm:p-9">
            <Badge className="border-0 bg-indigo-600 text-white">Core managed service</Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950">{PRIMARY_REVENUE_OFFER.name}</h2>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600">{PRIMARY_REVENUE_OFFER.description}</p>
            <p className="mt-3 text-sm font-black text-indigo-700">Bennie Studio leads the strategy, copy, build, tracking, and ongoing improvement.</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Ongoing partnership</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{offer.monthlyLabel}<span className="text-base text-slate-500">/month</span></p>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Strategy, copy and build</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{offer.setupLabel}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">One-time setup fee</p>
              </div>
            </div>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {PRIMARY_REVENUE_OFFER.included.map((feature) => (
                <li key={feature} className="flex gap-2 rounded-2xl bg-white/75 p-3 text-sm font-bold text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {feature}
                </li>
              ))}
            </ul>
            <div className="mt-7 rounded-2xl border border-indigo-200 bg-white/70 p-4 text-sm font-bold leading-6 text-slate-700">
              Six-month initial commitment. Final scope and launch timing are confirmed after the website growth call.
            </div>
            <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-100/70 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-700">Your first 30 days</p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-3">
                <span>1. Review and direction</span>
                <span>2. Priority pages and CTAs</span>
                <span>3. Launch roadmap and tracking</span>
              </div>
            </div>
            <Link
              to="/book-demo"
              onClick={() => {
                localStorage.setItem("bt_offer_intent", JSON.stringify({ offerId: offer.id, planId: offer.planId, market: selectedMarket, monthly: offer.monthlyPrice, setupFee: offer.setupFee, savedAt: new Date().toISOString() }));
                trackPublicEvent({ eventType: "recommended_plan_viewed", label: offer.name, target: "/book-demo", metadata: { offerId: offer.id, market: selectedMarket } });
              }}
              className="mt-7 inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
            >
              Book a Website Growth Call <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Before you commit</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">See what we would change first.</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-slate-600">Start with an evidence-based website review. We will identify the main friction, recommend a clearer enquiry journey, and show the website direction before discussing a proposal.</p>
            <div className="mt-6 space-y-3">
              {["Observable website findings", "Recommended changes", "Personalised website direction", "Limited preview where useful"].map((item) => <p key={item} className="flex gap-2 text-sm font-bold text-slate-700"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />{item}</p>)}
            </div>
            <Link to="/website-audit" className={`${secondaryCtaClass} mt-7 w-full`}>Get My Website Review</Link>
          </div>
        </div>
        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">Not a subscription fit?</p>
              <p className="mt-2 text-2xl font-black text-white">Choose a Custom Website</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
                {customWebsiteQuote} for full CMS control, blog publishing, advanced SEO pages, custom integrations, and bespoke design.
              </p>
            </div>
            <Link
              to="/apply-custom"
              onClick={() => trackPublicEvent({ eventType: "click_pricing_plan_custom", label: "Request Website Quote", target: "/apply-custom", metadata: { market: selectedMarket } })}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              Request Website Quote
            </Link>
          </div>
        </div>
      </section>
    </>
  );
  */
}

function HowItWorksPage() {
  return (
    <>
      <Hero
        title="You run the business. We manage the website."
        copy="See exactly what you provide, what Bennie Studio handles, when you approve the work, and what continues after launch."
        icon={Rocket}
      />
      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="mb-8 rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">The working agreement</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">One clear owner on each side.</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-700 md:mt-0">
            You provide accurate business information and timely approval. Bennie Studio handles website strategy, production, hosting, maintenance, tracking, and plan-based improvements.
          </p>
        </div>
        <div className="space-y-5">
          {deliveryStages.map((stage, index) => (
            <article key={stage.title} className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.55fr_1fr_1fr] lg:items-start">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-600">{index + 1}</span>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-indigo-600">{stage.timing}</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{stage.title}</h2>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">What you do</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{stage.customer}</p>
              </div>
              <div>
                <div className="rounded-2xl bg-indigo-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">What Bennie Studio does</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{stage.studio}</p>
                </div>
                <p className="mt-3 flex gap-2 text-sm font-black text-emerald-700"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {stage.outcome}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Before launch", "You review the prepared website and approve it before it goes live."],
            ["After launch", "Hosting, SSL, maintenance, tracking, and included updates remain managed."],
            ["When needs change", "Upgrade the plan or request a custom quote for CMS, ecommerce, or integrations."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="font-black text-slate-950">{title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function WebsiteWireframe({ title, accent = "indigo" }: { title: string; accent?: "indigo" | "emerald" | "amber" }) {
  const accentClass = accent === "emerald" ? "bg-emerald-500" : accent === "amber" ? "bg-amber-400" : "bg-indigo-600";
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 p-4">
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 h-2 w-24 rounded-full bg-slate-200" />
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[1.1fr_0.9fr] sm:p-7">
          <div>
            <div className={`h-2.5 w-20 rounded-full ${accentClass}`} />
            <div className="mt-4 h-7 w-11/12 rounded-lg bg-slate-900" />
            <div className="mt-2 h-7 w-8/12 rounded-lg bg-slate-200" />
            <div className="mt-4 h-3 w-full rounded-full bg-slate-100" /><div className="mt-2 h-3 w-10/12 rounded-full bg-slate-100" />
            <div className={`mt-6 h-10 w-32 rounded-xl ${accentClass}`} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="h-24 rounded-xl bg-[linear-gradient(135deg,#e2e8f0_25%,#cbd5e1_25%,#cbd5e1_50%,#e2e8f0_50%,#e2e8f0_75%,#cbd5e1_75%)] bg-[length:18px_18px]" />
            <div className="mt-3 h-3 w-9/12 rounded-full bg-slate-300" /><div className="mt-2 h-3 w-6/12 rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 p-5"><div className="h-12 rounded-xl bg-slate-100" /><div className="h-12 rounded-xl bg-slate-100" /><div className="h-12 rounded-xl bg-slate-100" /></div>
      </div>
      <div className="pointer-events-none absolute bottom-6 left-6 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg">{title} · wireframe direction</div>
    </div>
  );
}

function CaseStudiesPage() {
  const [verifiedProof, setVerifiedProof] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    supabase
      .from("customer_testimonials")
      .select("id,slug,title,customer_name,company,testimonial,result_summary,evidence_reference,date_approved,before_summary,changes,result_metrics,before_image_url,after_image_url")
      .eq("publish_status", "published")
      .eq("consent_status", "approved")
      .order("date_approved", { ascending: false })
      .then(({ data }) => { if (!cancelled) setVerifiedProof(data || []); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Hero
        title="Website case studies built around real buyer journeys"
        copy="Explore six complete concept case studies showing the business challenge, website strategy, conversion path, and page structure for service-led businesses. Every study opens into a working demonstration build."
        icon={Sparkles}
      />
      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="mb-10 rounded-[2rem] bg-slate-950 p-6 text-white sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Verified customer outcomes</p>
          {verifiedProof.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{verifiedProof.map((proof) => <article key={proof.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">{(proof.before_image_url || proof.after_image_url) && <div className="grid grid-cols-2">{proof.before_image_url && <img src={proof.before_image_url} alt={`Before improvements for ${proof.company || proof.customer_name}`} className="h-40 w-full object-cover" />}{proof.after_image_url && <img src={proof.after_image_url} alt={`After improvements for ${proof.company || proof.customer_name}`} className="h-40 w-full object-cover" />}</div>}<div className="p-5"><p className="text-lg font-black">{proof.title || proof.result_summary || "Customer outcome"}</p>{proof.before_summary && <div className="mt-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Before</p><p className="mt-1 text-sm font-semibold text-slate-300">{proof.before_summary}</p></div>}{Array.isArray(proof.changes) && proof.changes.length > 0 && <div className="mt-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">What changed</p><ul className="mt-2 space-y-1 text-sm font-semibold text-slate-300">{proof.changes.map((change: string) => <li key={change}>• {change}</li>)}</ul></div>}{Array.isArray(proof.result_metrics) && proof.result_metrics.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{proof.result_metrics.map((metric: any) => <span key={`${metric.metric}-${metric.value}`} className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300">{metric.metric}: {metric.value}</span>)}</div>}<p className="mt-4 text-sm font-semibold leading-6 text-slate-300">“{proof.testimonial}”</p><p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-indigo-200">{proof.customer_name}{proof.company ? ` · ${proof.company}` : ""}</p>{proof.evidence_reference && <a href={proof.evidence_reference} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-black text-emerald-300 hover:text-emerald-200">View supporting reference <ExternalLink className="ml-1 h-3.5 w-3.5" /></a>}</div></article>)}</div> : <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5"><p className="font-black">No verified customer result has been published yet.</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-300">The concept studies below demonstrate strategy and design direction. Real outcomes will appear here only after customer approval and evidence review.</p></div>}
        </div>
        <div className="mb-10 grid gap-4 rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Illustrative concept studies</p>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700">
              These are demonstration builds—not fabricated client claims. They show how Bennie Studio would solve a common conversion problem for each industry.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {["6 complete studies", "6 working demos", "No placeholder links"].map((item) => (
              <span key={item} className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-700 shadow-sm">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {caseStudies.map((item) => (
            <article key={item.title} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative min-h-64 overflow-hidden border-b border-slate-200 bg-slate-100">
                <TemplatePreviewThumbnail templateId={item.templateId} templateName={item.title} className="min-h-64" />
                <Badge className="absolute right-4 top-4 border-0 bg-white/90 text-slate-900 shadow-sm backdrop-blur">Working demonstration</Badge>
              </div>
              <div className="p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-indigo-600">{item.industry}</Badge>
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.type}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-950">{item.title}</h2>
                <div className="mt-5 grid gap-4 text-sm leading-6">
                  <div>
                    <p className="font-black uppercase tracking-[0.14em] text-rose-500">Challenge</p>
                    <p className="mt-1 font-semibold text-slate-600">{item.challenge}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.14em] text-indigo-600">Website strategy</p>
                    <p className="mt-1 font-semibold text-slate-600">{item.strategy}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="font-black uppercase tracking-[0.14em] text-emerald-700">Intended outcome</p>
                    <p className="mt-1 font-semibold text-emerald-950">{item.outcome}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.delivered.map((deliverable) => (
                    <span key={deliverable} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {deliverable}
                    </span>
                  ))}
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link
                    to={item.href}
                    onClick={() => trackPublicEvent({ eventType: "click_view_case_study", label: item.title, target: item.href, metadata: { industry: item.industry, type: item.type } })}
                    className={secondaryCtaClass}
                  >
                    Read Case Study <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    to="/generate-preview"
                    onClick={() => trackPublicEvent({ eventType: "click_generate_similar_preview", label: item.title, target: "/generate-preview", metadata: { industry: item.industry, type: item.type } })}
                    className={primaryCtaClass}
                  >
                    Generate Similar
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-3xl font-black text-slate-950">What every case study now explains</h2>
          <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-600">
            A useful case study should connect the business problem to the website decision—not stop at a decorative screenshot.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["Business challenge", "Buyer journey", "Website strategy", "Conversion CTA", "Delivered sections", "Working demonstration"].map((item) => (
              <div key={item} className="flex gap-2 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const previewIndustries = [
  {
    id: "clinic",
    label: "Clinic / Healthcare",
    template: "Clinic Appointment Website",
    recommendedPlan: "Growth",
    pages: ["Home", "Treatments", "Practitioner Trust", "Patient FAQ", "Contact"],
    sections: ["Appointment hero", "Treatment cards", "Patient trust proof", "FAQ", "Location and WhatsApp CTA"],
    cta: "Book Appointment",
    proof: "Practitioner profile, treatment guidance, patient reviews, opening hours.",
  },
  {
    id: "beauty",
    label: "Beauty Salon / Aesthetic",
    template: "Treatment Booking Website",
    recommendedPlan: "Growth",
    pages: ["Home", "Treatments", "Results / Gallery", "Pricing", "Contact"],
    sections: ["Premium treatment hero", "Service menu", "Before/after proof", "Booking CTA", "WhatsApp follow-up"],
    cta: "Book Consultation",
    proof: "Treatment photos, packages, customer reviews, safety or expertise proof.",
  },
  {
    id: "contractor",
    label: "Renovation / Contractor",
    template: "Quote Request Website",
    recommendedPlan: "Growth",
    pages: ["Home", "Services", "Projects", "Service Areas", "Contact"],
    sections: ["Quote-first hero", "Service categories", "Project gallery", "Process", "Quote form"],
    cta: "Request a Quote",
    proof: "Project photos, before/after examples, service areas, warranty or process notes.",
  },
  {
    id: "consultant",
    label: "Consultant / Coach",
    template: "Authority Booking Website",
    recommendedPlan: "Business",
    pages: ["Home", "Services", "Results", "About", "Contact"],
    sections: ["Problem/solution hero", "Offer blocks", "Results proof", "FAQ", "Book-call CTA"],
    cta: "Book a Call",
    proof: "Case studies, credentials, client outcomes, clear offer positioning.",
  },
  {
    id: "local-service",
    label: "Local Service Business",
    template: "Local Lead Website",
    recommendedPlan: "Business",
    pages: ["Home", "Services", "Areas Served", "Reviews", "Contact"],
    sections: ["Fast enquiry hero", "Service cards", "Reviews", "Service area module", "Call / WhatsApp CTA"],
    cta: "Get Free Quote",
    proof: "Reviews, response time, service areas, guarantees, work photos.",
  },
  {
    id: "education",
    label: "Tuition / Education Centre",
    template: "Trial Class Website",
    recommendedPlan: "Business",
    pages: ["Home", "Programmes", "Results", "FAQ", "Contact"],
    sections: ["Trial-class hero", "Programme levels", "Parent trust proof", "Results", "Enquiry form"],
    cta: "Book Trial Class",
    proof: "Teacher experience, student results, parent testimonials, class levels.",
  },
];

const previewGoals = [
  "Get WhatsApp enquiries",
  "Get phone calls",
  "Get contact form submissions",
  "Get bookings",
  "Generate local service leads",
  "Build more trust before sales calls",
];

function recommendCommercialProduct(input: { goal: string; notes: string; industry: string; requestedPages?: number }) {
  const text = `${input.goal} ${input.notes} ${input.industry}`.toLowerCase();
  if (/ecommerce|e-commerce|membership|wordpress|woocommerce|integration|multilingual|custom software/.test(text)) {
    return { slug: "website-growth", label: "Website Growth", reason: "Your brief needs a more involved managed website and growth plan." };
  }
  if (/seo|search|location|locations|traffic|growth|landing page|multiple services|scale/.test(text) || (input.requestedPages || 0) > 4) {
    return { slug: "website-growth", label: "Website Growth", reason: "Your goals point to ongoing optimisation, local search expansion and new landing pages." };
  }
  return { slug: "managed-website", label: "Managed Website", reason: "A managed website is the clearest starting point for your enquiry journey." };
}

function GeneratePreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialIndustry = initialParams.get("industry") || previewIndustries[0].id;
  const explicitTemplateId = initialParams.get("template");
  const [industryId, setIndustryId] = React.useState(previewIndustries.some((item) => item.id === initialIndustry) ? initialIndustry : previewIndustries[0].id);
  const selectedTemplateId = explicitTemplateId && industryId === initialIndustry
    ? explicitTemplateId
    : ({ clinic: "dental-clinic-v1", contractor: "renovation-contractor-v1", consultant: "law-firm-v1", education: "tuition-centre-v1", beauty: "salon-spa-v1" } as Record<string, string>)[industryId] || "dental-clinic-v1";
  const [goal, setGoal] = React.useState(previewGoals[0]);
  const [generated, setGenerated] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState("");
  const [form, setForm] = React.useState(() => {
    let auditContext: Record<string, any> = {};
    try {
      auditContext = JSON.parse(sessionStorage.getItem("bt_audit_preview_context") || "{}");
    } catch {
      auditContext = {};
    }
    return {
      businessName: String(auditContext.businessName || ""),
      location: "",
      mainService: "",
      websiteUrl: String(auditContext.website || ""),
      phone: "",
      email: String(auditContext.email || ""),
      brandStyle: "Modern professional",
      socialUrl: "",
      reviews: "",
    };
  });

  const industry = previewIndustries.find((item) => item.id === industryId) || previewIndustries[0];
  const businessLabel = form.businessName.trim() || "your business";
  const locationLabel = form.location.trim() || "your service area";
  const serviceLabel = form.mainService.trim() || "your main service";
  const previewTitle = `${industry.template} for ${businessLabel}`;
  const reviewQuality = assessManualReviewInput(form.reviews);
  const reviewStrategy = buildReviewWebsiteStrategy({
    businessName: form.businessName,
    industry: industry.label,
    city: form.location,
    mainServices: form.mainService,
    preferredCta: goal.toLowerCase().includes("whatsapp")
      ? "WhatsApp"
      : goal.toLowerCase().includes("booking")
        ? "booking"
        : goal.toLowerCase().includes("phone")
          ? "call"
          : "form",
    googleBusinessUrl: form.socialUrl,
    reviews: form.reviews,
  });
  const commercialRecommendation = recommendCommercialProduct({ goal, notes: `${form.mainService} ${form.websiteUrl}`, industry: industry.label, requestedPages: industry.pages.length });

  React.useEffect(() => {
    trackPublicEvent({ eventType: "start_preview_flow", label: "Generate Preview Page Loaded", target: "/generate-preview" });
  }, []);

  const selectIndustry = (id: string) => {
    setIndustryId(id);
    setGenerated(false);
    const selected = previewIndustries.find((item) => item.id === id);
    trackPublicEvent({
      eventType: "select_industry",
      label: selected?.label || id,
      target: "/generate-preview",
      metadata: { industryId: id },
    });
  };

  const selectGoal = (value: string) => {
    setGoal(value);
    setGenerated(false);
    trackPublicEvent({ eventType: "select_website_goal", label: value, target: "/generate-preview" });
  };

  const generatePreview = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setGenerating(true);
    trackPublicEvent({
      eventType: "submit_business_details",
      label: businessLabel,
      target: "/generate-preview",
      metadata: { industry: industry.label, goal, location: form.location, hasWebsite: Boolean(form.websiteUrl) },
    });
    try {
      const lead = await submitPlatformLead({
        name: form.businessName,
        email: form.email,
        phone: form.phone,
        businessName: form.businessName,
        industry: industry.label,
        websiteUrl: form.websiteUrl,
        message: `Location: ${form.location}\nServices: ${form.mainService}\nPreferred action: ${goal}\nBrand style: ${form.brandStyle}\nSocial / Google Business: ${form.socialUrl || "Not provided"}\nReview signals:\n${form.reviews || "Not provided"}`,
        formName: "Review-powered website preview generator",
        leadType: "free_website_preview",
        landingPage: window.location.pathname,
        service: form.mainService,
        selectedProduct: "managed-website",
      });
      localStorage.setItem("bt_preview_intent", JSON.stringify({
        ...form,
        industryId,
        industry: industry.label,
        goal,
        recommendedProduct: commercialRecommendation.slug,
        leadId: lead.leadId,
        attribution: getTrackingContext(),
        market: initialParams.get("market") || "INTL",
        source: initialParams.get("source") || "",
        campaign: initialParams.get("campaign") || initialParams.get("utm_campaign") || "",
        templateId: selectedTemplateId,
        reviewSuggestions: reviewQuality.suggestions,
        reviewStrategy: {
          heroHeadline: reviewStrategy.heroHeadline,
          subheadline: reviewStrategy.subheadline,
          primaryCta: reviewStrategy.primaryCta,
          secondaryCta: reviewStrategy.secondaryCta,
          trustSignals: reviewStrategy.trustSignals,
          intelligence: {
            localKeywords: reviewStrategy.intelligence.localKeywords,
            faqs: reviewStrategy.intelligence.faqs,
          },
        },
        createdAt: new Date().toISOString(),
      }));
      setGenerated(true);
      trackPublicEvent({
        eventType: "preview_generated",
        label: previewTitle,
        target: "/generate-preview",
        metadata: { industry: industry.label, recommendedProduct: commercialRecommendation.slug, goal },
      });
    } catch (submissionError: any) {
      setError(submissionError?.message || "The preview could not be prepared. Please retry.");
      trackPublicEvent({ eventType: "preview_failed", label: form.businessName, target: "/generate-preview" });
    } finally {
      setGenerating(false);
    }
  };

  const action = (eventType: string, label: string, target: string) => {
    trackPublicEvent({
      eventType,
      label,
      target,
      metadata: { industry: industry.label, goal, businessName: form.businessName, generated },
    });
    navigate(target);
  };

  return (
    <>
      <Hero
        title="Generate a limited managed website preview"
        copy={`${PUBLIC_PROMISE} The free preview is limited to a homepage concept, core sections, and mobile direction before checkout.`}
        icon={Sparkles}
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Step 1</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">Choose the business type</h2>
          <div className="mt-6 grid gap-3">
            {previewIndustries.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectIndustry(item.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  industryId === item.id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                }`}
              >
                <span className="block text-sm font-black">{item.label}</span>
                <span className="mt-1 block text-xs font-semibold text-slate-500">{item.template}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={generatePreview} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Step 2</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">Add the basic brief</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input
              aria-label="Business name"
              required
              placeholder="Business name"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="h-12 rounded-2xl"
            />
            <Input
              aria-label="City or area served"
              required
              placeholder="City / area served"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="h-12 rounded-2xl"
            />
            <Input
              aria-label="Main services"
              required
              placeholder="Main services"
              value={form.mainService}
              onChange={(e) => setForm({ ...form, mainService: e.target.value })}
              className="h-12 rounded-2xl"
            />
            <Input
              aria-label="Current website URL"
              placeholder="Current website URL optional"
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              className="h-12 rounded-2xl"
            />
            <Input
              aria-label="Email"
              required type="email" placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-12 rounded-2xl"
            />
            <Input aria-label="WhatsApp or phone" placeholder="WhatsApp or phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 rounded-2xl" />
              <select aria-label="Preferred brand style" value={form.brandStyle} onChange={(e) => setForm({ ...form, brandStyle: e.target.value })} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 sm:col-span-2">
              {["Modern professional", "Premium corporate", "Friendly local business", "Bold sales landing page", "Clean minimal", "Luxury premium"].map((style) => <option key={style}>{style}</option>)}
            </select>
            <Input aria-label="Google Business or social profile URL" placeholder="Google Business / social profile URL optional" value={form.socialUrl} onChange={(e) => setForm({ ...form, socialUrl: e.target.value })} className="h-12 rounded-2xl sm:col-span-2" />
            <Textarea
              aria-label="Customer reviews"
              placeholder={`Paste real reviews here, one per line if possible.\n\nExample:\nFast response and easy to contact by WhatsApp.\nThe team was professional and explained every step clearly.\nConvenient location and reasonable price.`}
              value={form.reviews}
              onChange={(e) => {
                setGenerated(false);
                setForm({ ...form, reviews: e.target.value });
              }}
              className="min-h-32 rounded-2xl sm:col-span-2"
            />
          </div>
          <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Review guidance</p>
              <p className="mt-2 text-sm font-bold text-slate-700">
                Real reviews make the preview more specific. Add customer language, concrete service details, and genuine outcomes where available.
              </p>
            </div>
            {reviewQuality.suggestions.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {reviewQuality.suggestions.slice(0, 4).map((suggestion) => (
                  <div key={suggestion} className="rounded-2xl bg-white px-4 py-3 text-xs font-bold leading-5 text-slate-600">
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Website goal</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {previewGoals.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectGoal(item)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                    goal === item ? "border-indigo-500 bg-indigo-50 text-indigo-950" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
          <Button type="submit" disabled={generating} className="mt-7 h-12 w-full rounded-2xl bg-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-500">
            {generating ? "Preparing Preview..." : "Generate My Free Website Preview"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className={`rounded-[2rem] border p-6 shadow-sm ${generated ? "border-indigo-200 bg-white" : "border-dashed border-slate-300 bg-slate-50"}`}>
          {generated ? (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Preview generated</Badge>
                  <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">Limited concept preview</Badge>
                </div>
                <h2 className="text-3xl font-black text-slate-950">{previewTitle}</h2>
                <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
                  Recommended for {serviceLabel} in {locationLabel}. The site should lead with a clear {goal.toLowerCase()} path,
                  then support the buyer with proof, service clarity, FAQs, and local relevance.
                </p>
	                <div className="relative mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
	                  <div className="pointer-events-none absolute right-4 top-14 z-10 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
	                    Preview only
	                  </div>
	                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-rose-400"/><span className="h-2.5 w-2.5 rounded-full bg-amber-400"/><span className="h-2.5 w-2.5 rounded-full bg-emerald-400"/><span className="ml-3 truncate text-xs font-bold text-slate-500">Preview · {businessLabel}</span></div>
                  <div className="bg-slate-950 p-6 text-white sm:p-8">
                    <div className="flex items-center justify-between gap-4"><p className="text-lg font-black">{businessLabel}</p><span className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black">{industry.cta}</span></div>
                    <p className="mt-12 text-xs font-black uppercase tracking-[0.2em] text-indigo-200">{serviceLabel} · {locationLabel}</p>
                    <h3 className="mt-3 max-w-xl text-3xl font-black leading-tight sm:text-5xl">{reviewStrategy.heroHeadline}</h3>
                    <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-slate-300">{reviewStrategy.subheadline}</p>
                    <div className="mt-6 flex flex-wrap gap-3"><span className="rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-950">{reviewStrategy.primaryCta}</span><span className="rounded-xl border border-white/30 px-4 py-3 text-xs font-black">{reviewStrategy.secondaryCta}</span></div>
                  </div>
                  <div className="grid gap-3 p-5 sm:grid-cols-3">{industry.sections.slice(0, 3).map((section) => <div key={section} className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-800">{section}</div>)}</div>
                </div>
	                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Recommended product", commercialRecommendation.label],
                    ["Primary CTA", reviewStrategy.primaryCta],
                    ["Template direction", industry.template],
                    ["Local SEO focus", `${serviceLabel} in ${locationLabel}`],
	                  ].map(([label, value]) => (
	                    <div key={label} className="rounded-2xl bg-slate-50 p-4">
	                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
	                      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
		                </div>
	                  ))}
	                </div>
	                <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
	                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Free preview limit</p>
	                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
	                    {FREE_PREVIEW_LIMITS.map((limit) => (
	                      <div key={limit} className="flex gap-2 text-sm font-bold text-slate-700">
	                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
	                        {limit}
	                      </div>
	                    ))}
	                  </div>
                    <p className="mt-4 text-xs font-bold leading-5 text-amber-800">
	                    Full onboarding, manual production work, publishing, and custom domain setup begin only after payment or an approved commercial commitment.
	                  </p>
	                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl bg-indigo-50 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Trust signals to use</p>
                    <div className="mt-4 space-y-2">
                      {reviewStrategy.trustSignals.map((signal) => (
                        <div key={signal} className="flex gap-2 text-sm font-bold text-slate-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          {signal}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Local keywords</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {reviewStrategy.intelligence.localKeywords.map((keyword) => (
                        <span key={keyword} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">FAQs this website should answer</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {reviewStrategy.intelligence.faqs.map((faq) => (
                      <div key={faq} className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                        {faq}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => {
                      const params = new URLSearchParams({ business: form.businessName, city: form.location, service: form.mainService, cta: reviewStrategy.primaryCta });
                      trackPublicEvent({ eventType: "personalized_template_opened", label: selectedTemplateId, target: `/preview/template/${selectedTemplateId}` });
                      window.open(`/preview/template/${selectedTemplateId}?${params.toString()}`, "_blank", "noopener,noreferrer");
                    }}
                    className="rounded-2xl bg-slate-950 font-black uppercase tracking-widest text-white hover:bg-indigo-600"
                  >
                    Open Live Personalised Preview
                  </Button>
                  <Button onClick={() => action("create_account_after_preview", "Save My Preview", "/signup?redirectTo=%2Fdashboard%2Fonboarding")} className="rounded-2xl bg-indigo-600 font-black uppercase tracking-widest">
                    Create Account & Save
                  </Button>
                  <Button onClick={() => action("click_start_plan", `Start ${commercialRecommendation.label}`, `/pricing?product=${commercialRecommendation.slug}`)} variant="outline" className="rounded-2xl font-black uppercase tracking-widest">
                    Start {commercialRecommendation.label}
                  </Button>
                </div>
              </div>
              <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-200">Recommended structure</p>
                <div className="mt-5 grid gap-3">
                  {industry.pages.map((page, index) => (
                    <div key={page} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black">{index + 1}</span>
                      <span className="text-sm font-bold text-slate-100">{page}</span>
                    </div>
                  ))}
                </div>
	                <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-indigo-200">Trust and enquiry sections</p>
                <div className="mt-4 grid gap-2">
                  {industry.sections.map((section) => (
                    <div key={section} className="flex gap-2 text-sm font-semibold text-slate-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      {section}
                    </div>
                  ))}
                </div>
	                <div className="mt-6 rounded-2xl bg-white p-4 text-slate-950">
	                  <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Proof to collect</p>
	                  <p className="mt-2 text-sm font-bold leading-6">{industry.proof}</p>
	                </div>
	                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
	                  <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">After plan selection</p>
	                  <div className="mt-3 space-y-2">
	                    {SUBSCRIPTION_DELIVERY_FLOW.slice(2, 8).map((step) => (
	                      <p key={step} className="text-xs font-semibold leading-5 text-slate-300">{step}</p>
	                    ))}
	                  </div>
	                </div>
	              </div>
            </div>
          ) : (
            <div className="py-14 text-center">
              <ClipboardCheck className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-white p-3 text-indigo-600 shadow-sm" />
              <h2 className="text-2xl font-black text-slate-950">Your preview recommendation will appear here.</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                The first preview does not require an account. After you see the plan and structure, you can save it, book a call, or start a managed website plan.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

const priorityStyles: Record<AuditPriority, string> = {
  high: "bg-rose-50 text-rose-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

function EnquiryJourneyFlow({ title, steps, recommended = false }: { title: string; steps: string[]; recommended?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 ${recommended ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
      <p className={`text-xs font-black uppercase tracking-[0.2em] ${recommended ? "text-emerald-700" : "text-slate-500"}`}>{title}</p>
      <div className="mt-5 space-y-2">
        {steps.map((step, index) => (
          <React.Fragment key={`${step}-${index}`}>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm">{step}</div>
            {index < steps.length - 1 ? <MoveDown className={`mx-auto h-4 w-4 ${recommended ? "text-emerald-500" : "text-slate-400"}`} /> : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function WebsiteAuditResultView({ report, form }: { report: WebsiteAuditResult; form: { businessName: string; email: string; website: string } }) {
  // Keep the result market-neutral. Pricing is selected on the pricing page so an audit
  // never shows a country's price to the wrong prospect.
  const recommendedPlanKey = String(report.recommendedPlan || "").toLowerCase();
  const recommendedProduct = recommendedPlanKey === "growth" ? "Website Growth" : "Managed Website";
  const savePreviewContext = () => {
    sessionStorage.setItem("bt_audit_preview_context", JSON.stringify({
      businessName: form.businessName,
      email: form.email,
      website: form.website,
      auditSummary: report.summary,
      direction: report.recommendedWebsiteDirection,
      recommendedProduct,
    }));
    trackPublicEvent({
      eventType: "audit_preview_clicked",
      label: "See My Website Preview",
      target: "/generate-preview",
        metadata: { recommendedProduct, findingCount: report.findings.length },
    });
  };

  return (
    <div className="space-y-6 text-slate-950">
      <section className="rounded-[2rem] bg-white p-6 shadow-xl">
        <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Website Growth Review</Badge>
        <h2 className="mt-4 text-3xl font-black leading-tight">{report.summary}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          This review describes observable website and enquiry-journey findings. It does not estimate traffic, rankings, revenue, or conversion performance.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">What we found</p>
        <div className="mt-5 grid gap-4">
          {report.findings.length ? report.findings.map((finding) => (
            <article key={finding.id} className="rounded-3xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">{finding.category}</p>
                  <h3 className="mt-2 text-xl font-black">{finding.title}</h3>
                </div>
                <Badge className={priorityStyles[finding.priority]}>{finding.priority} priority</Badge>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {[
                  ["What we found", finding.whatWeFound],
                  ["Why it matters", finding.whyItMatters],
                  ["Recommended improvement", finding.recommendation],
                ].map(([label, copy]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{copy}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl bg-indigo-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Example direction</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{finding.exampleImprovement}</p>
              </div>
            </article>
          )) : (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">
              No major structural opportunity was detected automatically. Bennie Studio would next review message quality, real proof, and the live enquiry experience manually.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Your enquiry journey</p>
        <h2 className="mt-3 text-2xl font-black">Current vs recommended path</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <EnquiryJourneyFlow title="Current journey" steps={report.enquiryJourney.current} />
          <EnquiryJourneyFlow title="Recommended journey" steps={report.enquiryJourney.recommended} recommended />
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">What we would change</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.whatWeWouldChange.map((change) => (
            <div key={change.area} className="overflow-hidden rounded-3xl border border-slate-200">
              <p className="bg-slate-950 px-5 py-3 text-sm font-black text-white">{change.area}</p>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{change.current}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Recommended</p><p className="mt-2 text-sm font-bold leading-6 text-slate-800">{change.recommended}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200">Recommended website direction</p>
        <div className="mt-5 rounded-3xl bg-white p-5 text-slate-950">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Hero</p>
          <h2 className="mt-3 text-3xl font-black leading-tight">{report.recommendedWebsiteDirection.hero.headline}</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{report.recommendedWebsiteDirection.hero.subheadline}</p>
          <span className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white">{report.recommendedWebsiteDirection.hero.cta}</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            ["Services", report.recommendedWebsiteDirection.services],
            ["Trust", report.recommendedWebsiteDirection.trust],
            ["Local relevance", report.recommendedWebsiteDirection.localRelevance],
            ["Buyer FAQs", report.recommendedWebsiteDirection.faq],
          ].map(([label, items]) => (
            <div key={label as string} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-200">{label as string}</p>
              <div className="mt-4 space-y-2">
                {(items as string[]).map((item) => <p key={item} className="flex gap-2 text-sm font-semibold leading-6 text-slate-200"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />{item}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">What Bennie Studio could build</p>
        <h2 className="mt-3 text-2xl font-black">A managed website built around the recommended enquiry journey</h2>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {["Clearer service positioning", "Service-focused pages", "Stronger review placement", "WhatsApp, call, booking, or quote paths", "Local SEO structure", "Enquiry tracking", "Ongoing monthly improvements"].map((item) => (
            <p key={item} className="flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700"><Check className="h-4 w-4 shrink-0 text-emerald-500" />{item}</p>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-5 rounded-3xl bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Recommended product</p>
            <p className="mt-2 text-2xl font-black">{recommendedProduct}</p>
            <p className="mt-1 text-sm font-bold text-slate-600">View local pricing and the exact setup fee for your market before checkout.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/generate-preview" onClick={savePreviewContext} className={primaryCtaClass}>See My Website Preview</Link>
            <Link to={`/pricing?product=${encodeURIComponent(recommendedProduct.toLowerCase().replaceAll(" ", "-"))}`} onClick={() => trackPublicEvent({ eventType: "recommended_plan_viewed", label: recommendedProduct, target: "/pricing", metadata: { recommendedProduct } })} className={secondaryCtaClass}>View Pricing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function WebsiteAuditPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [auditReport, setAuditReport] = React.useState<WebsiteAuditResult | null>(null);
  const [auditQueued, setAuditQueued] = React.useState(false);
  const [form, setForm] = React.useState({
    email: "",
    businessName: "",
    industry: "",
    website: "",
    phone: "",
    notes: "",
  });

  const submitAudit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setAuditQueued(false);
    setAuditReport(null);
    setSubmitting(true);
    trackPublicEvent({
      eventType: "website_audit_started",
      label: form.businessName || "Website audit request",
      target: "/website-audit",
      metadata: { industry: form.industry, hasWebsite: Boolean(form.website) },
    });

    let leadSaved = false;
    try {
      const savedLead = await submitPlatformLead({
        name: form.businessName,
        email: form.email,
        phone: form.phone,
        businessName: form.businessName,
        industry: form.industry || undefined,
        websiteUrl: form.website,
        message: form.notes || "Free website audit requested.",
        formName: "Free website growth audit request",
        leadType: "website_audit",
      });
      leadSaved = true;
      const auditResponse = await fetch("/api/public/website-audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: /^https?:\/\//i.test(form.website) ? form.website : `https://${form.website}`,
          businessName: form.businessName,
          industry: form.industry || null,
          leadId: savedLead.leadId,
          leadEmail: form.email,
          async: true,
        }),
      });
      const auditPayload = await auditResponse.json().catch(() => ({}));
      if (!auditResponse.ok || !auditPayload?.jobId) {
        throw new Error(auditPayload?.error || "Your request was saved, but the audit could not be queued.");
      }
      setAuditQueued(true);

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
        const statusUrl = `/api/public/website-audit/jobs/${auditPayload.jobId}?leadId=${encodeURIComponent(savedLead.leadId)}&leadEmail=${encodeURIComponent(form.email)}`;
        const statusResponse = await fetch(statusUrl);
        const statusPayload = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) break;
        if (statusPayload.status === "completed" && statusPayload.report) {
          const normalizedReport = normalizeWebsiteAuditResult(statusPayload.report);
          setAuditReport(normalizedReport);
          setAuditQueued(false);
          trackPublicEvent({ eventType: "website_audit_completed", label: form.businessName, target: "/website-audit", metadata: { findingCount: normalizedReport.findings.length, recommendedPlan: normalizedReport.recommendedPlan } });
          break;
        }
        if (statusPayload.status === "failed") {
          throw new Error(statusPayload.error || "The website could not be analysed automatically. Your request was saved for manual follow-up.");
        }
      }
      setSubmitted(true);
    } catch (err: any) {
      setAuditQueued(false);
      setError(err?.message || "Unable to submit audit request right now.");
      if (leadSaved) setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Hero
        title="Get a practical website growth review"
        copy="See what we found, why it matters, what should improve, and what a clearer website and enquiry journey could look like—without arbitrary scores or invented performance claims."
        icon={FileSearch}
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-3xl font-black text-slate-950">What the audit checks</h2>
          <div className="mt-6 grid gap-3">
            {[
              ["Design clarity", "Does the page quickly explain what you offer?"],
              ["Mobile layout", "Can mobile visitors read and contact you easily?"],
              ["Enquiry path", "Are WhatsApp, phone, form, and quote CTAs obvious?"],
              ["SEO basics", "Are titles, headings, service terms, and local intent clear?"],
              ["Trust proof", "Are reviews, credentials, case studies, or photos visible?"],
              ["Speed and friction", "Is the page easy to load, scan, and act on?"],
            ].map(([title, copy]) => (
              <div key={title} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-black text-slate-950">{title}</p>
                  <p className="text-sm font-semibold text-slate-600">{copy}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-[1.5rem] bg-indigo-50 p-6">
            <h3 className="text-2xl font-black text-slate-950">What you’ll receive</h3>
            <div className="mt-5 grid gap-3">
              {[
                "Homepage clarity review",
                "CTA and WhatsApp flow review",
                "Mobile experience notes",
                "Trust signal gaps",
                "Local SEO structure notes",
                "Personalized website and enquiry direction",
              ].map((item) => (
                <div key={item} className="flex gap-2 text-sm font-bold text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <form onSubmit={submitAudit} className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-200">Free audit request</p>
          <h2 className="mt-4 text-3xl font-black text-white">Send your website for review</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            No payment required. Start with your website, business name, and email. Industry, phone, and notes are optional.
          </p>
          {submitted ? (
            <div className="mt-8 rounded-3xl bg-emerald-500/10 p-6 text-emerald-100">
              <Check className="mb-4 h-8 w-8" />
              <p className="text-xl font-black">{auditReport ? "Website audit complete." : "Audit request saved."}</p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {auditReport
                  ? "Your review is based on observable page evidence and practical recommendations—not a numerical rating."
                  : auditQueued
                    ? "Your website audit is queued for background processing. We have saved the request and can follow up with the result."
                    : "The website could not be analysed automatically. Your request is saved for manual follow-up."}
              </p>
              {!auditReport && error && <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-sm font-bold text-amber-100">{error}</p>}
              {!auditReport && <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  to="/book-demo"
                  onClick={() => {
                    trackPublicEvent({ eventType: "click_audit_thank_you_book_call", label: "Audit Thank You Book Call", target: "/book-demo" });
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                >
                  Book a Call
                </Link>
                <Link
                  to="/generate-preview"
                  onClick={() => {
                    trackPublicEvent({ eventType: "click_audit_thank_you_generate_preview", label: "Audit Thank You Generate Preview", target: "/generate-preview" });
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                >
                  See My Website Preview
                </Link>
              </div>}
            </div>
          ) : (
            <div className="mt-8 grid gap-4">
              {error && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                  {error}
                </div>
              )}
              <Input aria-label="Website URL" required placeholder="Website URL" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="h-12 rounded-2xl bg-white text-slate-950" />
              <Input aria-label="Business name" required placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="h-12 rounded-2xl bg-white text-slate-950" />
              <Input aria-label="Email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 rounded-2xl bg-white text-slate-950" />
              <Input aria-label="Industry or business type" placeholder="Industry / business type (optional)" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="h-12 rounded-2xl bg-white text-slate-950" />
              <Input aria-label="WhatsApp or phone" placeholder="WhatsApp / phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 rounded-2xl bg-white text-slate-950" />
              <Textarea aria-label="Website improvement notes" placeholder="What do you want the website to improve? (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-28 rounded-2xl bg-white text-slate-950" />
              <Button type="submit" disabled={submitting} className="h-13 rounded-2xl bg-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-500">
                {submitting ? "Reviewing Website..." : "Start My Website Growth Review"} <Search className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </form>
      </section>
      {auditReport ? (
        <section className="mx-auto max-w-7xl px-5 pb-20">
          <WebsiteAuditResultView report={auditReport} form={form} />
        </section>
      ) : null}
    </>
  );
}

function NicheLandingPage({ page }: { page: (typeof nichePages)[keyof typeof nichePages] }) {
  return (
    <>
      <Hero title={page.title} copy={page.subtitle} icon={FileSearch} />
      <section className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <Badge className="mb-5 bg-indigo-50 px-4 py-1 text-indigo-700 hover:bg-indigo-50">
              {page.label}
            </Badge>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              {page.positioning}
            </h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-rose-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-600">
                  Main pain point
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-rose-950">{page.pain}</p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                  Offer promise
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-emerald-950">{page.promise}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Lead capture method
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{page.leadCapture}</p>
              </div>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/website-audit"
                onClick={() => trackPublicEvent({ eventType: "click_request_audit", label: `${page.title} Audit CTA`, target: "/website-audit", metadata: { niche: page.label } })}
                className={primaryCtaClass}
              >
                {page.cta} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                to="/case-studies"
                className={secondaryCtaClass}
              >
                View Case Studies
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-200">
              Website sections needed
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {page.sections.map((section) => (
                <div key={section} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-sm font-bold leading-6 text-slate-100">{section}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 rounded-3xl bg-white p-5 text-slate-950">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
                Recommended front-end CTA
              </p>
              <p className="mt-2 text-xl font-black">{page.cta}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Use the audit CTA first, then follow up through WhatsApp or a booked call with a specific website improvement plan.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PreviewRequestPanel() {
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    industry: "",
    message: "",
  });

  const submitPreviewRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await submitPlatformLead({
        ...form,
        formName: "Done-for-you website preview request",
        leadType: "done_for_you_preview",
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Unable to submit preview request right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <div className="rounded-[1.5rem] bg-slate-950 p-7 text-white">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-200">Done-for-you preview request</p>
        <h2 className="mt-4 text-3xl font-black leading-tight">Turn a business brief into the first website direction.</h2>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
          Use this when a prospect wants you to prepare the preview for them before selecting a plan.
        </p>
      </div>
      {submitted ? (
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
          <Check className="mb-4 h-8 w-8" />
          <p className="text-xl font-black">Preview request sent to CRM.</p>
          <p className="mt-2 text-sm font-semibold leading-6">
            Follow up with the prospect, confirm their plan fit, and prepare the preview direction.
          </p>
        </div>
      ) : (
        <form onSubmit={submitPreviewRequest} className="grid gap-4">
          {error && <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input aria-label="Name" required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-2xl" />
            <Input aria-label="Email" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 rounded-2xl" />
            <Input aria-label="WhatsApp or phone" placeholder="WhatsApp / phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 rounded-2xl" />
            <Input aria-label="Business name" placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="h-12 rounded-2xl" />
            <Input aria-label="Industry" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="h-12 rounded-2xl sm:col-span-2" />
          </div>
          <Textarea aria-label="Message" placeholder="Main service, city, and what the website should help them get." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="min-h-28 rounded-2xl" />
          <Button type="submit" disabled={submitting} className="h-12 rounded-2xl bg-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-500">
            {submitting ? "Sending Request..." : "Send Preview Request"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

export default function PublicMarketingPages() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageKind = location.pathname.replace("/", "") as PublicPageKind;
  const meta = pageMeta[pageKind] || pageMeta.templates;
  const nichePage = nichePages[pageKind as keyof typeof nichePages];

  const pageContent =
    nichePage
      ? <NicheLandingPage page={nichePage} />
      : pageKind === "pricing"
      ? <PricingPage />
      : pageKind === "how-it-works"
        ? <HowItWorksPage />
        : pageKind === "case-studies"
          ? <CaseStudiesPage />
          : pageKind === "website-audit"
            ? <WebsiteAuditPage />
            : pageKind === "generate-preview"
              ? <GeneratePreviewPage />
              : <TemplatesPage />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
      </Helmet>
      <PublicSiteHeader />
      {pageContent}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-950">Ready to see your website direction?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Generate a free preview first, then choose the managed plan or custom website path that fits.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => {
                trackPublicEvent({ eventType: "click_generate_preview", label: "Final Generate Preview", target: "/generate-preview" });
                navigate("/generate-preview");
              }}
              className="rounded-2xl bg-indigo-600 font-black uppercase tracking-widest"
            >
              Generate Preview <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                trackPublicEvent({ eventType: "click_book_call", label: "Final Ask a Question", target: "/book-demo" });
                navigate("/book-demo");
              }}
              variant="outline"
              className="rounded-2xl font-black uppercase tracking-widest"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Ask a Question
            </Button>
          </div>
        </div>
      </section>
      <PublicSiteFooter />
    </div>
  );
}
