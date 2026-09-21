import { recommendCommercialProduct } from "../lib/recommendCommercialProduct";
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
import {
  buildPagesFromBlueprint,
  getBlueprintSeo,
  getBlueprintTheme,
  type BlueprintBusinessInput,
} from "../constants/pageBlueprints";
import { evaluateGeneratedDesign } from "../lib/designQa";
import type {
  BrandPersonality,
  BusinessMaturity,
  Website,
  WebsiteGenerationMode,
} from "../types";
import { FocusIndustries } from "./FocusIndustries";
import { Pricing as CommercialPricing } from "./Pricing";
import { trackPinterestLead } from "../lib/pinterestTracking";
import { trackPublicEvent } from "../lib/publicTracking";
import { FREE_PREVIEW_LIMITS, PUBLIC_PROMISE, SUBSCRIPTION_DELIVERY_FLOW } from "../constants/salesFlow";
import {
  DELIVERY_PIPELINE,
  PUBLIC_DELIVERY_PROMISES,
  DELIVERY_STANDARD_VERSION,
} from "../constants/deliveryStandards";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { normalizeCommercialMarket } from "../lib/commercialPricing";
import { FlagshipTemplateGallery } from "./FlagshipTemplateGallery";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import { TurnstileWidget } from "./TurnstileWidget";
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
  | "dental-clinics"
  | "clinic-website-design-malaysia"
  | "renovation-contractor-website-design"
  | "beauty-salon-website-design"
  | "tuition-centre-website-design"
  | "consultant-website-design"
  | "professional-services-website-design"
  | "accounting-firm-website-design"
  | "local-service-website-design";
type PricingMarket = "MY" | "SG" | "GB" | "US";

const PublicWebsiteRenderer = React.lazy(() =>
  import("./WebsiteRenderer").then((module) => ({ default: module.WebsiteRenderer })),
);

const pageMeta: Record<PublicPageKind, { title: string; description: string }> = {
  templates: {
    title: "Website Templates by Industry | Bennie Studio",
    description:
      "Browse focused website templates for clinics, wellness providers, renovation companies, home service businesses, beauty salons, and aesthetic services.",
  },
  pricing: {
    title: "Website Growth Pricing | Bennie Studio",
    description:
      "Premium Website Growth System and Website Growth Partner engagements for service businesses in Malaysia, Singapore, the United Kingdom, and internationally.",
  },
  "how-it-works": {
    title: "How It Works | Bennie Studio",
    description:
      "See how Bennie Studio takes you from signup and business brief to website build, review, launch, and ongoing support.",
  },
  "case-studies": {
    title: "Website Examples by Industry | Bennie Studio",
    description:
      "Explore working website examples showing the challenge, strategy, enquiry path, and page structure for cleaning, education, and accounting businesses.",
  },
  "website-audit": {
    title: "Free Website Growth Audit | Bennie Studio",
    description:
      "Request a free website audit to identify design, mobile, SEO, enquiry, speed, content, and trust issues on your current website.",
  },
  "generate-preview": {
    title: "Free Website Preview | Bennie Studio",
    description:
      "See a tailored managed website direction based on your business type, location, services, reviews, and preferred enquiry goal.",
  },
  "dental-clinics": {
    title: "Dental Clinic Website Design Malaysia | More Patient Enquiries",
    description:
      "Dental clinic websites built around treatment pages, patient trust, Google visibility, WhatsApp enquiries, calls, and appointment requests.",
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
  "professional-services-website-design": {
    title: "Professional Services Website Design | Trust and Enquiry Websites",
    description:
      "Professional services websites for firms that need clearer positioning, credible expertise, structured services, and qualified enquiry paths.",
  },
  "accounting-firm-website-design": {
    title: "Accounting Firm Website Design | Consultation Enquiry Websites",
    description:
      "Accounting and finance websites that clarify services, client fit, credentials, compliance-sensitive proof, and consultation enquiries.",
  },
  "local-service-website-design": {
    title: "Local Service Website Design | Quote and Lead Generation Websites",
    description:
      "Local service websites built around service areas, clear scope, real proof, quote requests, calls, and WhatsApp enquiries.",
  },
};

const primaryCtaClass =
  "inline-flex min-h-12 max-w-full items-center justify-center whitespace-normal rounded-xl bg-[#5746e8] px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_16px_34px_-20px_rgba(87,70,232,.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4938db] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:translate-y-0";
const secondaryCtaClass =
  "inline-flex min-h-12 max-w-full items-center justify-center whitespace-normal rounded-xl border border-[#dfe2ea] bg-white px-6 py-3 text-center text-sm font-semibold text-[#141821] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b9b1ff] hover:bg-[#f8f8ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 active:translate-y-0";

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
    title: "Dental clinic appointment website", templateId: "dental-clinic-v1", industryId: "clinic", industry: "Dental clinics", type: "Patient enquiries", image: "/brand-template-preview.svg",
    challenge: "Patients need to compare treatments, trust, location, reviews, and the next appointment step before contacting a clinic.",
    strategy: "Lead with treatment intent, show clinic and practitioner trust early, answer common questions, and keep WhatsApp, call, and appointment CTAs visible.",
    outcome: "An illustrative patient journey designed to move high-intent visitors into an appointment conversation.",
    delivered: ["Treatment structure", "Trust sections", "Local SEO direction", "Appointment CTA"], href: "/preview/template/dental-clinic-v1",
  },
  {
    title: "Cleaning quote website", templateId: "cleaning-company-v1", industryId: "cleaning", industry: "Cleaning companies", type: "Quote requests", image: "/brand-template-preview.svg",
    challenge: "Customers need to know whether you cover their area and type of cleaning before requesting a quote.",
    strategy: "Explain service scope, show real reviews, and ask for property type, location, frequency and preferred date.",
    outcome: "An illustrative enquiry journey designed to help the team assess a cleaning request.",
    delivered: ["Service scope", "Areas served", "Review sections", "Quote enquiry"], href: "/preview/template/cleaning-company-v1",
  },
  {
    title: "Tuition and education website", templateId: "tuition-centre-v1", industryId: "education", industry: "Education", type: "Trial-class enquiries", image: "/brand-template-preview.svg",
    challenge: "Parents need clear programmes, age groups, schedules and teacher information before making contact.",
    strategy: "Make programmes easy to compare and guide parents to an enquiry about a suitable class.",
    outcome: "An illustrative parent journey designed to support trial-class conversations.",
    delivered: ["Programme sections", "Teacher profiles", "Parent FAQ", "Trial-class CTA"], href: "/preview/template/tuition-centre-v1",
  },
  {
    title: "Accounting and bookkeeping website", templateId: "accounting-firm-v1", industryId: "accounting", industry: "Accounting and bookkeeping", type: "Consultation enquiries", image: "/brand-template-preview.svg",
    challenge: "Business owners need to understand whether the firm handles their business type and required services.",
    strategy: "Explain client fit and service scope, show verified credentials, and offer an initial consultation.",
    outcome: "An illustrative business enquiry journey designed to start relevant client conversations.",
    delivered: ["Who we help", "Service scope", "Team credentials", "Consultation CTA"], href: "/preview/template/accounting-firm-v1",
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
    | "dental-clinics"
    | "clinic-website-design-malaysia"
    | "renovation-contractor-website-design"
    | "beauty-salon-website-design"
    | "tuition-centre-website-design"
    | "consultant-website-design"
    | "professional-services-website-design"
    | "accounting-firm-website-design"
    | "local-service-website-design"
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
  "dental-clinics": {
    label: "Dental clinic lead websites",
    title: "Dental Websites Built to Turn Google Visitors Into Patient Enquiries",
    subtitle:
      "For dental clinics that want clearer treatment pages, stronger patient trust, local search visibility, and a faster path into WhatsApp, calls, or appointment requests.",
    positioning: "Patient-enquiry websites for dental clinics in Malaysia.",
    pain: "Patients compare treatments, reviews, dentist credibility, location, pricing confidence, and booking convenience before choosing a clinic.",
    promise: "We structure your dental website around the treatments you want to grow, the proof patients need, and the shortest path from Google search to an appointment conversation.",
    cta: "Get My Free Dental Website Preview",
    leadCapture: "WhatsApp enquiry, appointment form, phone call, treatment-specific CTA, and local SEO landing pages.",
    sections: ["Appointment-focused hero", "Treatment pages", "Dentist and clinic trust", "Patient reviews", "Treatment FAQs", "Location and map", "WhatsApp and appointment CTAs"],
  },
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
  "professional-services-website-design": {
    label: "Professional services websites",
    title: "Professional Services Websites Built Around Trust, Expertise, and Qualified Enquiries",
    subtitle:
      "For legal, advisory, insurance, recruitment, IT, and other B2B service firms that need clearer positioning and a credible path to contact.",
    positioning: "Trust-led websites for professional service firms.",
    pain: "Buyers need to understand expertise, service fit, credibility, and what happens after they make contact.",
    promise: "We organise the offer, expertise, evidence, service pages, and enquiry path so prospects can assess fit without wading through generic corporate copy.",
    cta: "Get a Free Professional Services Website Review",
    leadCapture: "Consultation form, book-call CTA, phone or email enquiry, and service-specific contact paths.",
    sections: ["Positioning-led hero", "Service architecture", "Expertise and credentials", "Who we help", "Case-study proof", "FAQ", "Consultation CTA"],
  },
  "accounting-firm-website-design": {
    label: "Accounting and finance websites",
    title: "Accounting Firm Websites That Make Services Clear and Start Better Client Conversations",
    subtitle:
      "For accountants, bookkeepers, tax advisers, payroll providers, and finance firms that need stronger client-fit messaging and consultation enquiries.",
    positioning: "Credibility-first websites for accounting and finance firms.",
    pain: "Business owners need to know whether you understand their business type, provide the right services, and can handle the work professionally.",
    promise: "We structure services, client fit, credentials, process, FAQs, and consultation CTAs so prospects can decide whether to start a conversation.",
    cta: "Get a Free Accounting Website Review",
    leadCapture: "Consultation form, book-call CTA, phone or email enquiry, and service-specific contact paths.",
    sections: ["Professional hero", "Who we help", "Service scope", "Credentials", "Process", "FAQ", "Consultation CTA"],
  },
  "local-service-website-design": {
    label: "Local service lead websites",
    title: "Local Service Websites Built to Turn Nearby Searchers Into Quote Requests",
    subtitle:
      "For cleaning, repair, maintenance, pest control, trades, and home-service businesses that need faster quote enquiries from local customers.",
    positioning: "Quote-focused websites for local service businesses.",
    pain: "Customers need to confirm service scope, coverage area, availability, proof, and how quickly they can request help.",
    promise: "We make services, areas served, real proof, response expectations, FAQs, and quote CTAs easy to scan on mobile.",
    cta: "Get a Free Local Service Website Review",
    leadCapture: "Quote form, WhatsApp enquiry, call button, postcode or service-area prompt, and service-specific CTA.",
    sections: ["Quote-focused hero", "Service categories", "Areas served", "Real reviews/proof", "Process", "FAQ", "Quote form"],
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
  previewId?: string;
  market?: string;
  turnstileToken?: string;
  website?: string;
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

function Hero({
  title,
  copy,
  icon: Icon,
  primaryLabel = "Generate My Website Preview",
  primaryHref = "/generate-preview",
  secondaryLabel,
  secondaryHref,
}: {
  title: string;
  copy: string;
  icon: React.ElementType;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  const primaryContent = <>{primaryLabel} <ArrowRight className="ml-2 h-4 w-4" /></>;
  return (
    <section className="brand-grid-bg relative overflow-hidden border-b border-white/10 bg-[#0b1020] text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#5746e8]/20 blur-3xl" />
      <div className="brand-shell relative grid gap-12 py-16 lg:grid-cols-12 lg:items-center lg:py-24">
        <div className="lg:col-span-5">
          <div className="brand-kicker flex items-center gap-3 !text-[#b9b1ff]"><span className="grid h-9 w-9 place-items-center border border-white/15 bg-white/[0.04]"><Icon className="h-4 w-4" /></span> Bennie Studio</div>
          <h1 className="mt-6 !max-w-[13ch] !text-white">{title}</h1>
          <p className="brand-copy brand-muted-on-dark mt-6">{copy}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {primaryHref.startsWith("#") ? (
              <a href={primaryHref} onClick={() => trackPublicEvent({ eventType: "click_generate_preview", label: primaryLabel, target: primaryHref })} className="inline-flex min-h-12 items-center justify-center bg-white px-6 text-sm font-semibold text-[#141821] hover:-translate-y-0.5 hover:bg-[#eeebff]">{primaryContent}</a>
            ) : (
              <Link to={primaryHref} onClick={() => trackPublicEvent({ eventType: "click_primary_cta", label: primaryLabel, target: primaryHref })} className="inline-flex min-h-12 items-center justify-center bg-white px-6 text-sm font-semibold text-[#141821] hover:-translate-y-0.5 hover:bg-[#eeebff]">{primaryContent}</Link>
            )}
            {secondaryLabel && secondaryHref ? <Link to={secondaryHref} className="inline-flex min-h-12 items-center justify-center border border-white/25 bg-white/[0.03] px-6 text-sm font-semibold text-white hover:bg-white/[0.08]">{secondaryLabel}</Link> : null}
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold !text-white/60">
            <span>Tailored structure</span><span>Desktop + mobile</span><span>Managed after launch</span>
          </div>
        </div>
        <div className="relative lg:col-span-7 lg:-mr-8 xl:-mr-14">
          <div className="pointer-events-none absolute -inset-8 bg-[#5746e8]/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#080b15] shadow-[0_55px_140px_-55px_rgba(0,0,0,.95)]">
            <img src="/images/bennie-studio-hero.webp" alt="" className="aspect-[16/9] w-full object-cover" loading="eager" decoding="async" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080b15] via-[#080b15]/75 to-transparent px-5 pb-5 pt-16">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] !text-[#b9b1ff]">Managed website direction</p>
              <p className="mt-2 max-w-md text-sm font-semibold !text-white">The visual direction changes. The operating system underneath stays disciplined.</p>
            </div>
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
        title="Website directions organised around the business, not a theme gallery."
        copy="Start with the buyer journey, the evidence available, the main enquiry action and the business category. The design direction follows those decisions."
        icon={LayoutTemplate}
      />
      <section className="brand-shell brand-section">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="brand-kicker">Flagship directions</p>
            <h2 className="mt-4">Inspect working design families.</h2>
            <p className="brand-copy mt-5">These examples are for composition and enquiry strategy. They are starting directions, not rigid skins that every customer inherits.</p>
          </div>
          <div className="lg:col-span-8">
            <FlagshipTemplateGallery />
          </div>
        </div>
      </section>

      <section className="border-y border-[#dfe2ea] bg-white">
        <div className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="brand-kicker">Niche planning</p>
              <h2 className="mt-4">The same design system adapts to different buying behaviour.</h2>
            </div>
            <div className="lg:col-span-8">
              <div className="brand-rule-list">
                {WAAS_TEMPLATE_PACKS.map((pack) => (
                  <div key={pack.id} className="brand-rule-row">
                    <div>
                      <h3>{pack.name}</h3>
                      <p className="mt-2 text-sm text-[#5f6673]">{pack.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {pack.niches.map((niche) => <span key={niche} className="text-sm font-semibold text-[#5f6673]">{niche}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0b1020] text-white">
        <div className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#aaa0ff]">Industry paths</p>
              <h2 className="mt-4 text-white">Start with the business type, then choose the right direction.</h2>
              <p className="mt-5 text-base leading-7 text-white/60">Each route explains the offer, evidence and enquiry structure that matters for that market.</p>
            </div>
            <div className="border-t border-white/15 lg:col-span-8">
              {industrySalesStarts.map((item) => (
                <Link key={item.industry} to={item.path} className="grid gap-3 border-b border-white/15 py-6 transition hover:bg-white/[0.03] sm:grid-cols-[1fr_1.5fr_auto] sm:items-center sm:px-3">
                  <h3 className="text-white">{item.industry}</h3>
                  <p className="text-sm leading-6 text-white/60">{item.promise}</p>
                  <ArrowRight className="h-4 w-4 text-[#aaa0ff]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PricingPage() {
  const location = useLocation();
  const requestedMarket = new URLSearchParams(location.search).get("market");
  const marketOverride = requestedMarket ? normalizeCommercialMarket(requestedMarket) : undefined;
  return (
    <>
      <Hero
        title="Managed website plans built around how much support you need."
        copy="Start with a serious managed website. Add deeper conversion, local SEO and growth support when the commercial need is there."
        icon={Sparkles}
        primaryLabel="Generate my preview"
        primaryHref="/generate-preview"
        secondaryLabel="See how it works"
        secondaryHref="/how-it-works"
      />
      <CommercialPricing marketOverride={marketOverride} hideIntro />
    </>
  );
}

function HowItWorksPage() {
  return (
    <>
      <Hero
        title="A managed website operating model, not a project handoff."
        copy="You provide accurate business information and approvals. Bennie Studio handles strategy, production, hosting, maintenance and the improvement included in your plan."
        icon={Rocket}
      />
      <section className="brand-shell brand-section">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="brand-kicker">Working agreement</p>
            <h2 className="mt-4">One clear owner on each side.</h2>
            <p className="brand-copy mt-5">No mystery workflow. Each stage has an input, a studio responsibility and a clear outcome.</p>
          </div>
          <div className="brand-rule-list lg:col-span-8">
            {deliveryStages.map((stage, index) => (
              <article key={stage.title} className="border-b border-[#dfe2ea] py-7">
                <div className="grid gap-5 md:grid-cols-[5rem_1fr]">
                  <div>
                    <p className="text-xs font-bold text-[#5b4bff]">0{index + 1}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#777d87]">{stage.timing}</p>
                  </div>
                  <div>
                    <h2 className="text-2xl">{stage.title}</h2>
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#777d87]">You provide</p>
                        <p className="mt-2 text-sm leading-6 text-[#5f6673]">{stage.customer}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#5b4bff]">Bennie Studio handles</p>
                        <p className="mt-2 text-sm leading-6 text-[#5f6673]">{stage.studio}</p>
                      </div>
                    </div>
                    <p className="mt-5 flex gap-2 text-sm font-semibold text-emerald-700"><Check className="mt-0.5 h-4 w-4 shrink-0" />{stage.outcome}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#dfe2ea] bg-[#0b1020] text-white">
        <div className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#b9b1ff]">Delivery standard {DELIVERY_STANDARD_VERSION}</p>
              <h2 className="mt-4 !text-white">Generation starts the work. It does not approve the work.</h2>
              <p className="mt-5 text-base leading-7 !text-white/65">
                Every paid site moves through a human-reviewed delivery pipeline before it can be published.
              </p>
            </div>
            <div className="lg:col-span-8">
              <div className="grid gap-px overflow-hidden border border-white/15 bg-white/15 sm:grid-cols-2">
                {DELIVERY_PIPELINE.map((stage, index) => (
                  <div key={stage} className="bg-[#101827] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] !text-[#b9b1ff]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 text-sm font-semibold !text-white">{stage}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3">
                {PUBLIC_DELIVERY_PROMISES.map((promise) => (
                  <p key={promise} className="flex gap-3 text-sm leading-6 !text-white/75">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                    {promise}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dfe2ea] bg-white">
        <div className="brand-shell grid gap-8 py-12 md:grid-cols-3">
          {[
            ["Before launch", "You review the prepared website and approve the final direction before it goes live."],
            ["After launch", "Hosting, SSL, maintenance, tracking and the included update allowance remain managed."],
            ["When needs change", "Upgrade the plan or scope CMS, ecommerce, integrations or deeper growth work separately."],
          ].map(([title, copy]) => (
            <div key={title} className="border-t border-[#dfe2ea] pt-4">
              <h3>{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#5f6673]">{copy}</p>
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
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-4">
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
      <div className="pointer-events-none absolute bottom-6 left-6 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-lg">{title} · wireframe direction</div>
    </div>
  );
}

function CaseStudiesPage() {
  const [verifiedProof, setVerifiedProof] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const loadCuratedProof = async () => {
      try {
        const configResponse = await fetch("/api/public/site-config");
        const configPayload = configResponse.ok ? await configResponse.json() : null;
        const approvedIds = Array.isArray(configPayload?.platform?.publicProofTestimonialIds)
          ? configPayload.platform.publicProofTestimonialIds.filter(Boolean)
          : [];
        if (!approvedIds.length) {
          if (!cancelled) setVerifiedProof([]);
          return;
        }
        const { data } = await supabase
          .from("customer_testimonials")
          .select("id,slug,title,customer_name,company,testimonial,result_summary,evidence_reference,date_approved,before_summary,changes,result_metrics,before_image_url,after_image_url")
          .in("id", approvedIds)
          .eq("publish_status", "published")
          .eq("consent_status", "approved")
          .order("date_approved", { ascending: false });
        if (!cancelled) setVerifiedProof(data || []);
      } catch {
        if (!cancelled) setVerifiedProof([]);
      }
    };
    void loadCuratedProof();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Hero
        title="See how the website system is applied to different buyer journeys."
        copy="Verified customer proof is shown separately from demonstration builds so you can tell the difference between measured evidence and a design example."
        icon={Sparkles}
      />

      {verifiedProof.length ? (
        <section className="bg-[#0b1020] text-white">
          <div className="brand-shell brand-section">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#aaa0ff]">Verified customer proof</p>
                <h2 className="mt-4 text-white">Published only with customer approval.</h2>
                <p className="mt-5 text-base leading-7 text-white/60">Testimonials and evidence references in this section come from approved customer records.</p>
              </div>
              <div className="border-t border-white/15 lg:col-span-8">
                {verifiedProof.map((proof) => (
                  <article key={proof.id} className="border-b border-white/15 py-7">
                    <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
                      <div>
                        <h3 className="text-white">{proof.title || proof.result_summary || "Customer outcome"}</h3>
                        <p className="mt-2 text-sm font-semibold text-[#aaa0ff]">{proof.customer_name}{proof.company ? ` · ${proof.company}` : ""}</p>
                        {proof.evidence_reference ? <a href={proof.evidence_reference} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center text-sm font-semibold text-white/70 hover:text-white">Supporting reference <ExternalLink className="ml-2 h-4 w-4" /></a> : null}
                      </div>
                      <div>
                        {proof.before_summary ? <p className="text-sm leading-6 text-white/55">{proof.before_summary}</p> : null}
                        <p className="mt-4 text-base leading-7 text-white/80">“{proof.testimonial}”</p>
                        {Array.isArray(proof.result_metrics) && proof.result_metrics.length ? (
                          <div className="mt-5 flex flex-wrap gap-4">
                            {proof.result_metrics.map((metric: any) => <span key={`${metric.metric}-${metric.value}`} className="text-sm font-bold text-emerald-300">{metric.metric}: {metric.value}</span>)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="brand-shell brand-section">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="brand-kicker">Working demonstrations</p>
            <h2 className="mt-4">Examples of structure and conversion strategy.</h2>
            <p className="brand-copy mt-5">These are demonstrations, not claimed customer results. Use them to inspect hierarchy, service presentation, proof placement and enquiry flow.</p>
            <a href="https://portfolio.bennietay.com" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center text-sm font-bold text-[#141821]">Open live portfolio <ExternalLink className="ml-2 h-4 w-4" /></a>
          </div>
          <div className="border-t border-[#dfe2ea] lg:col-span-8">
            {caseStudies.map((item) => (
              <article key={item.title} className="grid gap-6 border-b border-[#dfe2ea] py-7 md:grid-cols-[1.05fr_1fr]">
                <TemplatePreviewThumbnail templateId={item.templateId} templateName={item.title} className="min-h-56" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#5b4bff]">{item.industry} · demonstration</p>
                  <h3 className="mt-3">{item.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-[#5f6673]"><strong className="text-[#141821]">Challenge:</strong> {item.challenge}</p>
                  <p className="mt-3 text-sm leading-6 text-[#5f6673]"><strong className="text-[#141821]">Strategy:</strong> {item.strategy}</p>
                  <p className="mt-3 text-sm leading-6 text-[#5f6673]"><strong className="text-[#141821]">Intended outcome:</strong> {item.outcome}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link to={item.href} className={secondaryCtaClass}>Explore demo</Link>
                    <Link to={`/generate-preview?industry=${item.industryId}&template=${item.templateId}`} className={primaryCtaClass}>Generate similar</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const previewIndustries = [
  {
    id: "cleaning", label: "Cleaning Company", template: "Cleaning Quote Website", recommendedPlan: "Managed Website",
    pages: ["Home", "Services", "Areas Served", "Reviews", "Contact"],
    sections: ["Cleaning services and coverage", "One-off and recurring options", "Customer reviews", "Pricing factors", "Quote request with property type and preferred date"],
    cta: "Request a Cleaning Quote", proof: "Genuine customer reviews, team photos, service scope and insurance details where applicable.",
  },
  {
    id: "accounting", label: "Accounting / Bookkeeping Firm", template: "Consultation Website", recommendedPlan: "Managed Website",
    pages: ["Home", "Services", "Who We Help", "About", "Contact"],
    sections: ["Clients you serve", "Bookkeeping and accounting scope", "Genuine credentials", "How consultations work", "Consultation request"],
    cta: "Request a Consultation", proof: "Verified qualifications, team profiles, client-approved testimonials and clear service boundaries.",
  },
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

const previewProblems = [
  "No website", "Outdated design", "Not generating enquiries", "Hard to update",
  "Poor mobile experience", "Slow website", "Services are unclear", "Low local visibility",
  "No clear CTA", "Other",
];

const previewTemplateIds: Record<string, string> = {
  cleaning: "cleaning-company-v1",
  accounting: "accounting-firm-v1",
  "local-service": "service-pro-v1",
  clinic: "dental-clinic-v1",
  contractor: "renovation-contractor-v1",
  consultant: "corporate-v1",
  education: "tuition-centre-v1",
  beauty: "salon-spa-v1",
};

const previewTargetCustomers: Record<string, string> = {
  cleaning: "homes and businesses",
  accounting: "business owners",
  "local-service": "local customers",
  clinic: "patients",
  contractor: "homeowners and property teams",
  consultant: "businesses ready to move forward",
  education: "parents and students",
  beauty: "clients",
};

const resolvePreviewBrandPersonality = (brandStyle: string): BrandPersonality => {
  const value = brandStyle.toLowerCase();
  if (value.includes("luxury")) return "elegant";
  if (value.includes("bold")) return "bold";
  if (value.includes("friendly")) return "friendly";
  if (value.includes("premium") || value.includes("corporate")) return "premium";
  if (value.includes("minimal")) return "professional";
  return "professional";
};

const resolvePreviewGenerationMode = (
  industryId: string,
  brandStyle: string,
  websiteStatus: string,
): WebsiteGenerationMode => {
  if (
    ["consultant", "accounting"].includes(industryId) ||
    websiteStatus === "yes" ||
    /premium|corporate|luxury|bold/i.test(brandStyle)
  ) {
    return "brand_led";
  }
  return "premium";
};

const resolvePreviewCta = (goal: string) => {
  const value = goal.toLowerCase();
  if (value.includes("whatsapp")) return "WhatsApp Us";
  if (value.includes("phone")) return "Call Us";
  if (value.includes("booking")) return "Book a Consultation";
  if (value.includes("quote") || value.includes("local service leads")) return "Request a Quote";
  return "Request a Consultation";
};

const inferPreviewIndustryId = (service: string): string | null => {
  const value = service.toLowerCase();
  if (/dent|tooth|teeth|extraction|implant|orthodont|braces|clinic|medical|health|physio|chiro/.test(value)) return "clinic";
  if (/tuition|school|class|student|education|course|lesson|learning|tutor/.test(value)) return "education";
  if (/clean|maid|housekeep|janitor/.test(value)) return "cleaning";
  if (/renov|contractor|roof|plumb|electric|build|construction|repair/.test(value)) return "contractor";
  if (/account|bookkeep|tax|audit|payroll|finance/.test(value)) return "accounting";
  if (/salon|beauty|aesthetic|spa|facial|hair|skin/.test(value)) return "beauty";
  if (/consult|coach|advis|strategy/.test(value)) return "consultant";
  return null;
};


function GeneratePreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialIndustry = initialParams.get("industry") || previewIndustries[0].id;
  const explicitTemplateId = initialParams.get("template");
  const [industryId, setIndustryId] = React.useState(previewIndustries.some((item) => item.id === initialIndustry) ? initialIndustry : previewIndustries[0].id);
  const initialGoal = initialParams.get("goal") || previewGoals[0];
  const [goal, setGoal] = React.useState(previewGoals.includes(initialGoal) ? initialGoal : previewGoals[0]);
  const [generated, setGenerated] = React.useState(false);
  const [generatedWebsite, setGeneratedWebsite] = React.useState<Website | null>(null);
  const [previewExpanded, setPreviewExpanded] = React.useState(false);
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [previewMode, setPreviewMode] = React.useState<"website" | "business">(
    initialParams.get("website") ? "website" : "website",
  );
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");
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
      contactName: String(auditContext.contactName || initialParams.get("name") || ""),
      businessName: String(auditContext.businessName || initialParams.get("business") || ""),
      location: String(initialParams.get("city") || ""),
      mainService: String(initialParams.get("service") || ""),
      websiteUrl: String(auditContext.website || initialParams.get("website") || ""),
      websiteStatus: String(initialParams.get("websiteStatus") || (auditContext.website ? "yes" : "no")),
      phone: "",
      email: String(auditContext.email || initialParams.get("email") || ""),
      brandStyle: "Modern professional",
      socialUrl: "",
      reviews: "",
      biggestProblem: String(initialParams.get("problem") || ""),
    };
  });
  const inferredIndustryId = inferPreviewIndustryId(form.mainService);
  const effectiveIndustryId = inferredIndustryId || industryId;
  const selectedTemplateId = explicitTemplateId && effectiveIndustryId === initialIndustry
    ? explicitTemplateId
    : previewTemplateIds[effectiveIndustryId] || "service-pro-v1";

  React.useEffect(() => {
    setGenerated(false);
    setGeneratedWebsite(null);
    setPreviewExpanded(false);
  }, [
    form.businessName,
    form.location,
    form.mainService,
    form.websiteUrl,
    form.websiteStatus,
    form.phone,
    form.email,
    form.brandStyle,
    form.socialUrl,
    form.reviews,
    form.biggestProblem,
  ]);

  const industry = previewIndustries.find((item) => item.id === effectiveIndustryId) || previewIndustries[0];
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
  const commercialRecommendation = recommendCommercialProduct({ goal, notes: form.mainService, industry: industry.label });
  const previewGenerationMode = resolvePreviewGenerationMode(effectiveIndustryId, form.brandStyle, form.websiteStatus);
  const previewBrandPersonality = resolvePreviewBrandPersonality(form.brandStyle);
  const previewBusinessMaturity: BusinessMaturity = form.websiteStatus === "yes" ? "established" : "growing";
  const generatedDesignQuality = React.useMemo(
    () => (generatedWebsite ? evaluateGeneratedDesign(generatedWebsite) : null),
    [generatedWebsite],
  );

  React.useEffect(() => {
    trackPublicEvent({ eventType: "start_preview_flow", label: "Generate Preview Page Loaded", target: "/generate-preview" });
  }, []);

  const selectIndustry = (id: string) => {
    setIndustryId(id);
    setGenerated(false);
    setGeneratedWebsite(null);
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
    setGeneratedWebsite(null);
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
      let existingPreview: Record<string, unknown> = {};
      try { existingPreview = JSON.parse(localStorage.getItem("bt_preview_intent") || "{}"); } catch { /* start a fresh preview */ }
      const previewId = typeof existingPreview.previewId === "string" && existingPreview.previewId
        ? existingPreview.previewId
        : `preview_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

      const previewTestimonials = form.reviews
        .split(/\n+/)
        .map((review) => review.trim())
        .filter(Boolean)
        .slice(0, 4);
      const previewServices = form.mainService
        .split(/[,/\n]+/)
        .map((service) => service.trim())
        .filter(Boolean);
      const targetCustomer = previewTargetCustomers[effectiveIndustryId] || "customers";
      const previewCta = resolvePreviewCta(goal);
      const blueprintInput: BlueprintBusinessInput = {
        businessName: form.businessName.trim(),
        nicheId: selectedTemplateId,
        nicheName: industry.label,
        plan: "business",
        maxPages: 5,
        mainService: form.mainService.trim(),
        targetCustomer,
        location: form.location.trim(),
        ctaPreference: previewCta,
        tone: form.brandStyle,
        services: previewServices.length ? previewServices : [form.mainService.trim()],
        description: reviewStrategy.subheadline,
        contactEmail: form.email.trim(),
        contactPhone: form.phone.trim(),
        whatsappNumber: goal.toLowerCase().includes("whatsapp") ? form.phone.trim() : undefined,
        faqs: reviewStrategy.intelligence.faqs,
        testimonials: previewTestimonials,
        generationMode: previewGenerationMode,
        brandPersonality: previewBrandPersonality,
        businessMaturity: previewBusinessMaturity,
        assetReadiness: "pending",
      };

      const previewTheme = getBlueprintTheme(selectedTemplateId, previewGenerationMode, {
        brandPersonality: previewBrandPersonality,
        businessMaturity: previewBusinessMaturity,
        assetReadiness: "pending",
      });
      const previewSeo = getBlueprintSeo(blueprintInput);
      const previewCandidates = [0, 1].map((compositionSeed) => {
        const pages = buildPagesFromBlueprint({ ...blueprintInput, compositionSeed });
        const website: Website = {
          id: "preview",
          businessId: "preview",
          theme: previewTheme,
          pages,
          seo: previewSeo,
          status: "draft",
          updatedAt: Date.now(),
        };
        const quality = evaluateGeneratedDesign(website);
        const rank =
          quality.score +
          quality.metrics.visualVariety * 0.25 +
          quality.metrics.hierarchy * 0.15 +
          quality.metrics.conversionClarity * 0.15 -
          quality.metrics.aiTemplateRisk * 0.4;
        return { website, quality, rank };
      });
      const selectedPreview = previewCandidates.sort((a, b) => b.rank - a.rank)[0];

      localStorage.setItem("bt_preview_intent", JSON.stringify({
        ...form,
        previewId,
        industryId: effectiveIndustryId,
        industry: industry.label,
        goal,
        recommendedProduct: commercialRecommendation.slug,
        leadId: null,
        attribution: getTrackingContext(),
        market: initialParams.get("market") || "INTL",
        source: initialParams.get("source") || "",
        campaign: initialParams.get("campaign") || initialParams.get("utm_campaign") || "",
        templateId: selectedTemplateId,
        generationMode: previewGenerationMode,
        brandPersonality: previewBrandPersonality,
        businessMaturity: previewBusinessMaturity,
        designScore: selectedPreview.quality.score,
        designMetrics: selectedPreview.quality.metrics,
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
      // Capture the prospect before revealing the full recommendation. The
      // preview id makes retries idempotent, while attribution is carried into
      // the CRM record for follow-up and checkout continuity.
      const leadResult = await submitPlatformLead({
        name: form.contactName || form.businessName,
        email: form.email,
        phone: form.phone,
        businessName: form.businessName,
        industry: industry.label,
        websiteUrl: form.websiteUrl,
        service: form.mainService,
        selectedProduct: commercialRecommendation.slug,
        message: `Preview brief: ${form.mainService} in ${form.location}. Goal: ${goal}. Biggest problem: ${form.biggestProblem || "Not specified"}. Website status: ${form.websiteStatus}. Brand style: ${form.brandStyle}.`,
        formName: "Personalized website preview",
        leadType: "free_website_preview",
        previewId,
        market: initialParams.get("market") || "INTL",
      });
      localStorage.setItem("bt_preview_intent", JSON.stringify({
        ...JSON.parse(localStorage.getItem("bt_preview_intent") || "{}"),
        leadId: leadResult?.leadId || null,
      }));
      trackPublicEvent({ eventType: "preview_lead_captured", label: previewTitle, target: "/generate-preview", metadata: { previewId, leadId: leadResult?.leadId || null } });
      setGeneratedWebsite(selectedPreview.website);
      setPreviewExpanded(false);
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
      <section className="border-b border-[#dfe2ea] bg-[#f6f7fb]">
        <div className="brand-shell grid gap-10 py-14 sm:py-16 lg:grid-cols-12 lg:items-center lg:py-20">
          <div className="lg:col-span-7">
            <p className="brand-kicker flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Free website preview
            </p>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.8rem,6vw,5.8rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-[#141821]">
              See the website direction before you spend on the build.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#5f6673] sm:text-lg">
              Give us the essentials. We turn them into a tailored website direction built around your service, location, trust signals and preferred enquiry action.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["No card required", "Nothing is published", "Uses your real business details"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-[#dfe2ea] bg-white px-4 py-2 text-sm font-semibold text-[#374151]">
                  <Check className="h-4 w-4 text-[#5746e8]" /> {item}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="overflow-hidden border border-[#dfe2ea] bg-white shadow-[0_28px_80px_-50px_rgba(15,23,42,0.55)]">
              <div className="bg-[#141821] px-6 py-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b9b1ff]">Your preview blueprint</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{businessLabel === "your business" ? "Your business, made clearer." : businessLabel}</h2>
              </div>
              <div className="divide-y divide-[#e4e2dc] px-6">
                {[
                  ["Business", industry.label],
                  ["Main service", serviceLabel],
                  ["Location", locationLabel],
                  ["Primary action", resolvePreviewCta(goal)],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-4 py-4 text-sm">
                    <span className="font-semibold text-[#7b8491]">{label}</span>
                    <span className="font-semibold text-[#141821]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#e4e2dc] bg-[#eeebff] px-6 py-5">
                <p className="text-sm font-semibold text-[#5746e8]">We use this brief to choose structure, messaging hierarchy and the enquiry path.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="preview-brief" className="bg-white">
        <div className="brand-shell py-12 sm:py-16">
          <div className="mb-10 max-w-3xl">
            <p className="brand-kicker">Build your direction</p>
            <h2 className="mt-4">A useful preview needs a sharp brief, not a 27-field interrogation.</h2>
            <p className="brand-copy mt-4">Complete the essentials below. Optional proof and brand details can improve the direction, but they are not required to get started.</p>
          </div>

          <form onSubmit={generatePreview} className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <div className="space-y-6 lg:col-span-8">
              <section className="border border-[#dfe2ea] bg-[#f9f8f4] p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 border-b border-[#dfe2ea] pb-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141821] text-sm font-bold text-white">1</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Business essentials</p>
                    <h3 className="mt-1 text-2xl font-semibold text-[#141821]">What are we building around?</h3>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preview-industry" className="mb-2 block text-sm font-semibold text-[#374151]">Business type</label>
                    <select id="preview-industry" value={industryId} onChange={(e) => selectIndustry(e.target.value)} className="h-12 w-full border border-[#dfe2ea] bg-white px-4 text-[#141821] outline-none transition focus:border-[#5746e8] focus:ring-4 focus:ring-[#5746e8]/10">
                      {previewIndustries.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="preview-service" className="mb-2 block text-sm font-semibold text-[#374151]">Main service</label>
                    <Input id="preview-service" required value={form.mainService} onChange={(e) => setForm({...form, mainService:e.target.value})} placeholder="e.g. Invisalign, bookkeeping, renovation" className="h-12 rounded-none border-[#dfe2ea] bg-white" />
                    {inferredIndustryId && inferredIndustryId !== industryId ? <p className="mt-2 text-xs font-semibold text-[#5746e8]">Detected: {previewIndustries.find((item) => item.id === inferredIndustryId)?.label}. We will use that website family.</p> : null}
                  </div>
                  <div>
                    <label htmlFor="preview-business" className="mb-2 block text-sm font-semibold text-[#374151]">Business name</label>
                    <Input id="preview-business" required value={form.businessName} onChange={(e) => setForm({...form, businessName:e.target.value})} placeholder="Business name" className="h-12 rounded-none border-[#dfe2ea] bg-white" />
                  </div>
                  <div>
                    <label htmlFor="preview-location" className="mb-2 block text-sm font-semibold text-[#374151]">Location / service area</label>
                    <Input id="preview-location" required value={form.location} onChange={(e) => setForm({...form, location:e.target.value})} placeholder="City or area served" className="h-12 rounded-none border-[#dfe2ea] bg-white" />
                  </div>
                </div>
              </section>

              <section className="border border-[#dfe2ea] bg-white p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 border-b border-[#dfe2ea] pb-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141821] text-sm font-bold text-white">2</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Customer action</p>
                    <h3 className="mt-1 text-2xl font-semibold text-[#141821]">What should a good visitor do next?</h3>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {previewGoals.map((item) => {
                    const selected = goal === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => selectGoal(item)}
                        className={selected
                          ? "flex min-h-20 items-center justify-between border-2 border-[#5746e8] bg-[#eeebff] px-4 py-4 text-left text-sm font-semibold text-[#141821]"
                          : "flex min-h-20 items-center justify-between border border-[#dfe2ea] bg-[#f9f8f4] px-4 py-4 text-left text-sm font-semibold text-[#374151] transition hover:border-[#aaa4dc] hover:bg-white"}
                      >
                        <span>{item}</span>
                        <span className={selected ? "grid h-6 w-6 place-items-center rounded-full bg-[#5746e8] text-white" : "grid h-6 w-6 place-items-center rounded-full border border-[#c8cad0] bg-white text-transparent"}>
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preview-site-status" className="mb-2 block text-sm font-semibold text-[#374151]">Current website</label>
                    <select id="preview-site-status" value={form.websiteStatus} onChange={(e) => setForm({...form, websiteStatus:e.target.value, websiteUrl:e.target.value==="no"?"":form.websiteUrl})} className="h-12 w-full border border-[#dfe2ea] bg-white px-4 text-[#141821] outline-none transition focus:border-[#5746e8] focus:ring-4 focus:ring-[#5746e8]/10">
                      <option value="yes">I have a website</option>
                      <option value="no">No website yet</option>
                    </select>
                  </div>
                  {form.websiteStatus === "yes" ? (
                    <div>
                      <label htmlFor="preview-url" className="mb-2 block text-sm font-semibold text-[#374151]">Current website URL</label>
                      <Input id="preview-url" required type="url" value={form.websiteUrl} onChange={(e) => setForm({...form, websiteUrl:e.target.value})} placeholder="https://..." className="h-12 rounded-none border-[#dfe2ea]" />
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <div className="w-full border border-[#dfe2ea] bg-[#f9f8f4] px-4 py-3 text-sm font-semibold text-[#687386]">We will start from your business brief instead.</div>
                    </div>
                  )}
                </div>
              </section>

              <section className="border border-[#dfe2ea] bg-[#f9f8f4] p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 border-b border-[#dfe2ea] pb-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141821] text-sm font-bold text-white">3</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Design direction</p>
                    <h3 className="mt-1 text-2xl font-semibold text-[#141821]">Choose the personality, not a template colour.</h3>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ["Modern professional", "Clear, credible, balanced", "Structured service businesses"],
                    ["Premium corporate", "Sharper authority and hierarchy", "Higher-trust or B2B offers"],
                    ["Friendly local business", "Warm, accessible and direct", "Local service enquiries"],
                  ].map(([style, description, fit]) => {
                    const selected = form.brandStyle === style;
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setForm({...form, brandStyle: style})}
                        className={selected
                          ? "border-2 border-[#5746e8] bg-white p-5 text-left shadow-[0_16px_36px_-28px_rgba(87,70,232,0.8)]"
                          : "border border-[#dfe2ea] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#aaa4dc]"}
                      >
                        <div className="mb-5 flex gap-1">
                          <span className={style === "Premium corporate" ? "h-7 w-7 bg-[#141821]" : style === "Friendly local business" ? "h-7 w-7 rounded-full bg-[#d4f5e7]" : "h-7 w-7 bg-[#5746e8]"} />
                          <span className={style === "Premium corporate" ? "h-7 w-10 bg-[#dfe2ea]" : style === "Friendly local business" ? "h-7 w-10 rounded-full bg-[#fde7c7]" : "h-7 w-10 bg-[#eeebff]"} />
                        </div>
                        <p className="font-semibold text-[#141821]">{style}</p>
                        <p className="mt-2 text-sm leading-5 text-[#687386]">{description}</p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#8b93a0]">{fit}</p>
                      </button>
                    );
                  })}
                </div>

                <details className="mt-5 border-t border-[#dfe2ea] pt-5">
                  <summary className="cursor-pointer text-sm font-semibold text-[#5746e8]">Add proof or extra brand context (optional)</summary>
                  <div className="mt-5 grid gap-4">
                    <Input value={form.socialUrl} onChange={(e)=>setForm({...form,socialUrl:e.target.value})} placeholder="Google Business / social URL" className="h-12 rounded-none border-[#dfe2ea] bg-white" />
                    <Textarea value={form.reviews} onChange={(e)=>setForm({...form,reviews:e.target.value})} placeholder="Paste real customer reviews, one per line." className="min-h-28 rounded-none border-[#dfe2ea] bg-white" />
                    <select value={form.biggestProblem} onChange={(e)=>setForm({...form,biggestProblem:e.target.value})} className="h-12 border border-[#dfe2ea] bg-white px-4 text-[#141821]">
                      <option value="">Biggest website problem (optional)</option>
                      {previewProblems.map((problem)=><option key={problem}>{problem}</option>)}
                    </select>
                  </div>
                </details>
              </section>

              <section className="border border-[#dfe2ea] bg-[#141821] p-5 text-white sm:p-7">
                <div className="mb-6 flex items-start gap-4 border-b border-white/15 pb-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-[#141821]">4</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b9b1ff]">Send the preview</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">Where should we connect this direction?</h3>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preview-name" className="mb-2 block text-sm font-semibold text-slate-200">Your name <span className="font-normal text-slate-400">optional</span></label>
                    <Input id="preview-name" autoComplete="name" value={form.contactName} onChange={(e) => setForm({...form, contactName:e.target.value})} placeholder="Your name" className="h-12 rounded-none border-white/15 bg-white text-[#141821]" />
                  </div>
                  <div>
                    <label htmlFor="preview-email" className="mb-2 block text-sm font-semibold text-slate-200">Email</label>
                    <Input id="preview-email" required autoComplete="email" type="email" value={form.email} onChange={(e) => setForm({...form, email:e.target.value})} placeholder="you@business.com" className="h-12 rounded-none border-white/15 bg-white text-[#141821]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="preview-phone" className="mb-2 block text-sm font-semibold text-slate-200">
                      WhatsApp / phone {goal.toLowerCase().includes("whatsapp") ? null : <span className="font-normal text-slate-400">optional</span>}
                    </label>
                    <Input id="preview-phone" required={goal.toLowerCase().includes("whatsapp")} autoComplete="tel" value={form.phone} onChange={(e) => setForm({...form, phone:e.target.value})} placeholder="Phone or WhatsApp number" className="h-12 rounded-none border-white/15 bg-white text-[#141821]" />
                  </div>
                </div>

                {error ? <div className="mt-5 border border-rose-300/40 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">{error}</div> : null}

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Button type="submit" disabled={generating} className="min-h-14 rounded-none bg-[#6758ff] px-7 text-base font-bold text-white hover:bg-[#7a6cff]">
                    {generating ? "Building your website direction..." : "Build my free website preview"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="max-w-md text-xs leading-5 text-slate-400">No card required. Your details are used to prepare and follow up on the preview. Nothing is published without your approval.</p>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:col-span-4">
              <div className="border border-[#dfe2ea] bg-[#f6f7fb] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <LayoutTemplate className="h-5 w-5 text-[#5746e8]" />
                  <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#5746e8]">Live brief</p>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[#141821]">{businessLabel === "your business" ? "Your preview will adapt as you fill this in." : businessLabel}</h3>
                <div className="mt-6 divide-y divide-[#dfe2ea] border-y border-[#dfe2ea]">
                  {[
                    ["Industry", industry.label],
                    ["Service", serviceLabel],
                    ["Location", locationLabel],
                    ["Goal", goal],
                    ["Style", form.brandStyle],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[82px_1fr] gap-3 py-3 text-sm">
                      <span className="font-semibold text-[#8b93a0]">{label}</span>
                      <span className="font-semibold text-[#141821]">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b93a0]">Likely homepage structure</p>
                  <div className="mt-3 space-y-2">
                    {industry.sections.slice(0, 5).map((sectionName, index) => (
                      <div key={sectionName} className="flex items-center gap-3 bg-white px-3 py-3 text-sm font-semibold text-[#374151]">
                        <span className="text-xs font-bold text-[#5746e8]">0{index + 1}</span>
                        {sectionName}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 border-t border-[#dfe2ea] pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b93a0]">Recommended after preview</p>
                  <p className="mt-2 font-semibold text-[#141821]">{commercialRecommendation.name}</p>
                  <p className="mt-1 text-sm leading-5 text-[#687386]">The recommendation is based on the website goal and business brief, not a forced upsell.</p>
                </div>
              </div>
            </aside>
          </form>
        </div>
      </section>

      {generating ? (
        <section className="border-y border-[#dfe2ea] bg-white">
          <div className="brand-shell py-12">
            <p className="brand-kicker">Building your website direction</p>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {["Understanding the business","Selecting the layout family","Structuring the buyer journey","Preparing the preview"].map((step,index)=>(
                <div key={step} className="border-t border-[#dfe2ea] pt-4">
                  <span className="text-sm font-semibold text-[#5746e8]">0{index+1}</span>
                  <p className="mt-2 font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {generated && generatedWebsite ? (
        <section className="border-y border-[#dfe2ea] bg-white">
          <div className="brand-shell py-10">
            <div className="flex flex-col gap-5 border-b border-[#dfe2ea] pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="brand-kicker">Generated website</p>
                <h2 className="mt-2">{businessLabel}</h2>
                <p className="mt-2 text-[#526071]">{industry.label} · {locationLabel} · {previewGenerationMode === "brand_led" ? "Brand-led direction" : "Premium direction"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["desktop","mobile"] as const).map((device)=>(
                  <button key={device} type="button" onClick={()=>setPreviewDevice(device)} className={previewDevice===device ? "border border-[#5746e8] bg-[#5746e8] px-4 py-2 text-sm font-semibold text-white" : "border border-[#dfe2ea] bg-white px-4 py-2 text-sm font-semibold"}>{device==="desktop"?"Desktop":"Mobile"}</button>
                ))}
                <button type="button" onClick={()=>setPreviewExpanded((value)=>!value)} className="border border-[#dfe2ea] bg-white px-4 py-2 text-sm font-semibold">{previewExpanded?"Compact":"Expand preview"}</button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-[0.12em] text-[#8b93a0]">Interactive {generatedWebsite.pages.length}-page preview</span>
              {generatedWebsite.pages.map((page, index) => (
                <span key={page.id || page.slug || page.title} className="border border-[#dfe2ea] bg-[#f6f7fb] px-3 py-1.5 text-xs font-semibold text-[#374151]">
                  {String(index + 1).padStart(2, "0")} {page.title}
                </span>
              ))}
              <span className="text-xs text-[#687386]">Use the navigation inside the preview to inspect every page.</span>
            </div>

            <div className="mt-4 border border-[#dfe2ea] bg-[#f6f7fb] p-2 sm:p-3">
              <div className="mb-2 flex items-center gap-2 border-b border-[#dfe2ea] bg-white px-3 py-2 text-[11px] font-semibold text-[#687386]">
                <span className="h-2 w-2 rounded-full bg-[#dfe2ea]" />
                <span className="h-2 w-2 rounded-full bg-[#dfe2ea]" />
                <span className="h-2 w-2 rounded-full bg-[#dfe2ea]" />
                <span className="ml-2 truncate">Preview · {businessLabel}</span>
              </div>
              <div className={(previewDevice==="mobile" ? "max-w-[430px] " : "max-w-full ") + (previewExpanded ? "max-h-[90vh] " : "max-h-[900px] ") + "bt-static-preview mx-auto overflow-y-auto border border-[#dfe2ea] bg-white shadow-[0_20px_60px_-45px_rgba(15,23,42,.55)] transition-all"}>
                <React.Suspense fallback={<div className="grid min-h-[40rem] place-items-center text-[#526071]">Rendering website…</div>}>
                  <PublicWebsiteRenderer initialData={generatedWebsite} />
                </React.Suspense>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-[#dfe2ea] pt-6 sm:flex-row">
              <Button onClick={() => action("click_book_call_after_preview","Book Website Review","/book-demo")} className="min-h-12 bg-[#141821] px-6 font-semibold text-white hover:bg-[#5746e8]">Book 30-minute review</Button>
              <Button variant="outline" onClick={() => navigate("/pricing?market=" + (initialParams.get("market") || "INTL") + "#plan-" + commercialRecommendation.slug)} className="min-h-12 rounded-xl px-6 font-semibold">View recommended plan</Button>
            </div>
          </div>
        </section>
      ) : !generating ? (
        <section className="border-y border-slate-200 bg-white">
          <div className="brand-shell py-12 sm:py-14">
            <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 lg:grid-cols-12">
              <div className="p-6 sm:p-8 lg:col-span-5">
                <p className="brand-kicker">What you will see</p>
                <h2 className="mt-4">A website direction, not a generic template screenshot.</h2>
                <p className="brand-copy mt-4">The preview uses your service, location, business family and enquiry goal to choose the page structure and design direction.</p>
                <div className="mt-6 space-y-3">
                  {["Page structure around the buyer journey","Desktop and mobile preview","Recommended next plan based on your goal"].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /> {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-200 bg-white p-4 sm:p-6 lg:col-span-7 lg:border-l lg:border-t-0">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  </div>
                  <div className="p-5 sm:p-7">
                    <div className="h-3 w-24 rounded-full bg-indigo-100" />
                    <div className="mt-4 h-8 w-4/5 rounded-lg bg-slate-900" />
                    <div className="mt-3 h-3 w-full rounded-full bg-slate-200" />
                    <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-200" />
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {industry.sections.slice(0, 3).map((sectionName) => (
                        <div key={sectionName} className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="h-7 w-7 rounded-lg bg-indigo-100" />
                          <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{sectionName}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 h-11 w-40 rounded-lg bg-indigo-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
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
      <p className={`text-xs font-bold uppercase tracking-[0.2em] ${recommended ? "text-emerald-700" : "text-slate-500"}`}>{title}</p>
      <div className="mt-5 space-y-2">
        {steps.map((step, index) => (
          <React.Fragment key={`${step}-${index}`}>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm">{step}</div>
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
      <section className="rounded-xl bg-white p-6 shadow-xl">
        <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Website Growth Review</Badge>
        <h2 className="mt-4 text-3xl font-bold leading-tight">{report.summary}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          This review describes observable website and enquiry-journey findings. It does not estimate traffic, rankings, revenue, or conversion performance.
        </p>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">What we found</p>
        <div className="mt-5 grid gap-4">
          {report.findings.length ? report.findings.map((finding) => (
            <article key={finding.id} className="rounded-3xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{finding.category}</p>
                  <h3 className="mt-2 text-xl font-bold">{finding.title}</h3>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{copy}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl bg-indigo-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Example direction</p>
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

      <section className="rounded-xl bg-white p-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Your enquiry journey</p>
        <h2 className="mt-3 text-2xl font-bold">Current vs recommended path</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <EnquiryJourneyFlow title="Current journey" steps={report.enquiryJourney.current} />
          <EnquiryJourneyFlow title="Recommended journey" steps={report.enquiryJourney.recommended} recommended />
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">What we would change</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.whatWeWouldChange.map((change) => (
            <div key={change.area} className="overflow-hidden rounded-3xl border border-slate-200">
              <p className="bg-slate-950 px-5 py-3 text-sm font-bold text-white">{change.area}</p>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{change.current}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Recommended</p><p className="mt-2 text-sm font-bold leading-6 text-slate-800">{change.recommended}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-slate-950 p-6 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Recommended website direction</p>
        <div className="mt-5 rounded-3xl bg-white p-5 text-slate-950">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Hero</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight">{report.recommendedWebsiteDirection.hero.headline}</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{report.recommendedWebsiteDirection.hero.subheadline}</p>
          <span className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white">{report.recommendedWebsiteDirection.hero.cta}</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            ["Services", report.recommendedWebsiteDirection.services],
            ["Trust", report.recommendedWebsiteDirection.trust],
            ["Local relevance", report.recommendedWebsiteDirection.localRelevance],
            ["Buyer FAQs", report.recommendedWebsiteDirection.faq],
          ].map(([label, items]) => (
            <div key={label as string} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">{label as string}</p>
              <div className="mt-4 space-y-2">
                {(items as string[]).map((item) => <p key={item} className="flex gap-2 text-sm font-semibold leading-6 text-slate-200"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />{item}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">What Bennie Studio could build</p>
        <h2 className="mt-3 text-2xl font-bold">A managed website built around the recommended enquiry journey</h2>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {["Clearer service positioning", "Service-focused pages", "Stronger review placement", "WhatsApp, call, booking, or quote paths", "Local SEO structure", "Enquiry tracking", "Ongoing monthly improvements"].map((item) => (
            <p key={item} className="flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700"><Check className="h-4 w-4 shrink-0 text-emerald-500" />{item}</p>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-5 rounded-3xl bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Recommended product</p>
            <p className="mt-2 text-2xl font-bold">{recommendedProduct}</p>
            <p className="mt-1 text-sm font-bold text-slate-600">View local pricing and the exact setup fee for your market before checkout.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/generate-preview" onClick={savePreviewContext} className={primaryCtaClass}>See My Website Preview</Link>
            <Link to="/pricing#plans" onClick={() => trackPublicEvent({ eventType: "recommended_plan_viewed", label: recommendedProduct, target: "/pricing", metadata: { recommendedProduct } })} className={secondaryCtaClass}>View Pricing</Link>
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
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-3xl font-bold text-slate-950">What the audit checks</h2>
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
                  <p className="font-bold text-slate-950">{title}</p>
                  <p className="text-sm font-semibold text-slate-600">{copy}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl bg-indigo-50 p-6">
            <h3 className="text-2xl font-bold text-slate-950">What you’ll receive</h3>
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
        <form onSubmit={submitAudit} className="rounded-xl border border-slate-200 bg-slate-950 p-7 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-200">Free audit request</p>
          <h2 className="mt-4 text-3xl font-bold text-white">Send your website for review</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            No payment required. Start with your website, business name, and email. Industry, phone, and notes are optional.
          </p>
          {submitted ? (
            <div className="mt-8 rounded-3xl bg-emerald-500/10 p-6 text-emerald-100">
              <Check className="mb-4 h-8 w-8" />
              <p className="text-xl font-bold">{auditReport ? "Website audit complete." : "Audit request saved."}</p>
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
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                >
                  Book a Call
                </Link>
                <Link
                  to="/generate-preview"
                  onClick={() => {
                    trackPublicEvent({ eventType: "click_audit_thank_you_generate_preview", label: "Audit Thank You Generate Preview", target: "/generate-preview" });
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
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
              <Button type="submit" disabled={submitting} className="h-13 rounded-2xl bg-indigo-600 font-bold uppercase tracking-widest hover:bg-indigo-500">
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
      <section className="brand-shell brand-section">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="brand-kicker">{page.label}</p>
            <h2 className="mt-4">{page.positioning}</h2>
            <p className="brand-copy mt-6">{page.promise}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/website-audit" className={primaryCtaClass}>{page.cta} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              <Link to="/case-studies" className={secondaryCtaClass}>View examples</Link>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="mb-6 overflow-hidden rounded-[1rem] border border-[#dfe2ea] bg-[#0b1020] p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-[1.1fr_.9fr]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] !text-[#b9b1ff]">Buyer journey</p>
                  <h3 className="mt-3 !text-white">The structure follows the buying decision, not a fixed page recipe.</h3>
                  <p className="mt-3 text-sm leading-6 !text-white/60">{page.pain}</p>
                </div>
                <div className="grid gap-2">
                  {["Offer clarity", "Relevant proof", "Clear next action"].map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
                      <span className="text-xs font-semibold !text-white/70">0{index + 1}</span>
                      <span className="text-sm font-semibold !text-white">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="brand-rule-list">
              <div className="brand-rule-row">
                <strong>Main buyer concern</strong>
                <span className="text-[#5f6673]">{page.pain}</span>
              </div>
              <div className="brand-rule-row">
                <strong>Lead capture</strong>
                <span className="text-[#5f6673]">{page.leadCapture}</span>
              </div>
              <div className="brand-rule-row">
                <strong>Recommended sections</strong>
                <div className="grid gap-2 sm:grid-cols-2">
                  {page.sections.map((section) => <span key={section} className="flex items-start gap-2 text-sm text-[#5f6673]"><Check className="mt-1 h-4 w-4 shrink-0 text-[#5b4bff]" />{section}</span>)}
                </div>
              </div>
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
    websiteUrl: "",
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
    <div className="mt-12 grid gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <div className="rounded-xl bg-slate-950 p-7 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-200">Done-for-you preview request</p>
        <h2 className="mt-4 text-3xl font-bold leading-tight">Turn a business brief into the first website direction.</h2>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
          Use this when a prospect wants you to prepare the preview for them before selecting a plan.
        </p>
      </div>
      {submitted ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
          <Check className="mb-4 h-8 w-8" />
          <p className="text-xl font-bold">Preview request sent to CRM.</p>
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
            <Input aria-label="WhatsApp or phone" required placeholder="WhatsApp / phone (required)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 rounded-2xl" />
            <Input aria-label="Business name" placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="h-12 rounded-2xl" />
            <Input aria-label="Current website URL" placeholder="Current website URL (optional if you do not have one)" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className="h-12 rounded-2xl sm:col-span-2" />
            <Input aria-label="Industry" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="h-12 rounded-2xl sm:col-span-2" />
          </div>
          <Textarea aria-label="Message" placeholder="Main service, city, and what the website should help them get." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="min-h-28 rounded-2xl" />
          <Button type="submit" disabled={submitting} className="h-12 rounded-2xl bg-indigo-600 font-bold uppercase tracking-widest hover:bg-indigo-500">
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
    <div className="brand-public min-h-screen bg-[#f6f7fb] text-[#141821]">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={`https://app.bennietay.com${location.pathname === "/" ? "/" : location.pathname.replace(/\/$/, "")}`} />
      </Helmet>
      <PublicSiteHeader />
      {pageContent}
      <section className="brand-grid-bg relative overflow-hidden border-t border-white/10 bg-[#5746e8] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="brand-shell relative grid gap-8 py-16 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] !text-white/65">Next step</p>
            <h2 className="mt-3 max-w-2xl !text-white">See the website system applied to your business.</h2>
            <p className="mt-4 max-w-2xl text-base !text-white/75">Generate a real website direction first. Use the 30-minute review when you want help confirming scope and fit.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Button onClick={() => navigate("/generate-preview")} className="min-h-12 bg-white px-6 font-semibold text-[#141821] hover:bg-[#ece9ff]">Generate free preview <ArrowRight className="ml-2 h-4 w-4" /></Button>
            <Button onClick={() => navigate("/book-demo")} variant="outline" className="min-h-12 border-white/30 bg-white/[0.04] px-6 font-semibold text-white hover:bg-white/10 hover:text-white">Book 30-minute review</Button>
          </div>
        </div>
      </section>
      <PublicSiteFooter />
    </div>
  );
}
