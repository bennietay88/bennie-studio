Warning: truncated output (original token count: 47620)
Total output lines: 3128

import { recommendCommercialProduct } from "../lib/recommendCommercialProduct";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Check,
  ExternalLink,
  FileSearch,
  LayoutTemplate,
  MoveDown,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
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
import { trackPinterestLead } from "../lib/pinterestTracking";
import { trackPublicEvent } from "../lib/publicTracking";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import {
  ContactStudioPage,
  ResourcesStudioPage,
} from "./PublicStudioPagesV3";
import { AboutStudioPage, ProcessStudioPage, WorkStudioPage } from "./StudioEditorialRound3";
import { FlagshipTemplateGallery } from "./FlagshipTemplateGallery";
import { ServicesSalesPage, PricingSalesPage } from "./StudioSalesPages";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import "../styles/studioCaseStudies.css";
import { TurnstileWidget } from "./TurnstileWidget";
import { PreviewOrderPage } from "./PreviewOrderPage";
import { StudioEmailOptIn } from "./StudioEmailOptIn";
import { supabase } from "../lib/supabase";
import { CMS_REPLACEABLE_PATHS, usePublishedPlatformCms, type PlatformCmsPage } from "../lib/platformSiteCms";
import { PlatformCmsPageBody, PlatformCmsSections } from "./PlatformCmsSections";
import {
  normalizeWebsiteAuditResult,
  type AuditPriority,
  type WebsiteAuditResult,
} from "../lib/websiteAudit";

type PublicPageKind =
  | "services"
  | "about"
  | "resources"
  | "contact"
  | "templates"
  | "pricing"
  | "how-it-works"
  | "case-studies"
  | "website-audit"
  | "generate-preview"
  | "preview-order"
  | "dental-clinics"
  | "clinic-website-design"
  | "renovation-contractor-website-design"
  | "beauty-salon-website-design"
  | "tuition-centre-website-design"
  | "consultant-website-design"
  | "professional-services-website-design"
  | "accounting-firm-website-design"
  | "local-service-website-design";

const PublicWebsiteRenderer = React.lazy(() =>
  import("./WebsiteRenderer").then((module) => ({ default: module.WebsiteRenderer })),
);

const pageMeta: Record<PublicPageKind, { title: string; description: string }> = {
  services: {
    title: "Managed Website Design, Build & Support | Bennie Studio",
    description: "Bennie Studio designs, builds and manages distinctive websites for service businesses. Explore the work, see how it works and start with a free website preview.",
  },
  about: {
    title: "About Bennie Studio | Managed Website Studio",
    description: "Learn how Bennie Studio plans, designs, reviews, launches and manages websites for service businesses.",
  },
  resources: {
    title: "Website Resources | Bennie Studio",
    description: "Practical website resources, audits, examples and planning tools for businesses improving their online presence.",
  },
  contact: {
    title: "Contact Bennie Studio | Talk About Your Website",
    description: "Start with a free website preview or book a focused review call with Bennie Studio.",
  },
  templates: {
    title: "Website Templates by Industry | Bennie Studio",
    description:
      "Browse focused website templates for clinics, wellness providers, renovation companies, home service businesses, beauty salons, and aesthetic services.",
  },
  pricing: {
    title: "Managed Website Pricing, Setup & Monthly Plans | Bennie Studio",
    description:
      "Compare transparent monthly website plans, one-time setup fees, month-to-month billing and delivery scope. Free website preview before you buy.",
  },
  "how-it-works": {
    title: "How It Works | Bennie Studio",
    description:
      "See how Bennie Studio takes you from signup and business brief to website build, review, launch, and ongoing support.",
  },
  "case-studies": {
    title: "Case Studies | In-House & Studio Website Showcases | Bennie Studio",
    description:
      "Browse illustrated website design concepts across service industries. Explore image-led case studies, optional interactive demos and tailored managed website directions.",
  },
  "website-audit": {
    title: "Free Website Growth Audit | Bennie Studio",
    description:
      "Request a free website audit to identify design, mobile, SEO, enquiry, speed, content, and trust issues on your current website.",
  },
  "generate-preview": {
    title: "Free Website Preview | Bennie Studio",
    description:
      "See a tailored managed website direction from your existing website URL or a short business brief.",
  },
  "preview-order": {
    title: "Launch Your Website | Bennie Studio",
    description:
      "Turn your Bennie Studio website preview into a managed website with a clear setup fee, monthly service, and the current plan commitment shown before payment.",
  },
  "dental-clinics": {
    title: "Dental Clinic Website Design | More Patient Enquiries",
    description:
      "Dental clinic websites built around treatment pages, patient trust, Google visibility, WhatsApp enquiries, calls, and appointment requests.",
  },
  "clinic-website-design": {
    title: "Clinic Website Design | Appointment Enquiry Websites",
    description:
      "Lead-generation clinic websites with treatment pages, patient trust, local SEO structure and appointment CTAs.",
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

const industrySalesStarts = [
  {
    industry: "Dental and clinics",
    path: "/clinic-website-design",
    promise: "Appointment-ready pages with treatment sections, location trust, FAQ, and WhatsApp or booking CTAs.",
  },
  {
    industry: "Local services",
    path: "/local-service-website-design",
    promise: "Quote-request websites for cleaning, pest control, contractors, home repair, and emergency services.",
  },
  {
    industry: "Consultants and coaches",
    path: "/consultant-website-design",
    promise: "Authority-led pages with services, proof, book-a-call flow, and professional positioning.",
  },
  {
    industry: "Real estate",
    path: "/generate-preview?industry=consultant&template=real-estate-v1",
    promise: "Property lead capture, buyer/seller enquiry paths, listing sections, and local area positioning.",
  },
  {
    industry: "Restaurants and lifestyle",
    path: "/generate-preview?industry=local-service&template=restaurant-v1",
    promise: "Menu, reservations, gallery, location, promotions, and contact-ready mobile layouts.",
  },
  {
    industry: "Professional services",
    path: "/professional-services-website-design",
    promise: "Trust-first structures for law, accounting, insurance, IT support, recruitment, and B2B services.",
  },
];

const nichePages: Record<
  Extract<
    PublicPageKind,
    | "dental-clinics"
    | "clinic-website-design"
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
    templateId: string;
    previewIndustry: string;
  }
> = {
  "dental-clinics": {
    templateId: "dental-clinic-v1",
    previewIndustry: "clinic",
    label: "Dental clinic lead websites",
    title: "Dental Websites Built for Patient Enquiries",
    subtitle:
      "For dental clinics that want clearer treatment pages, stronger patient trust, local search visibility, and a faster path into WhatsApp, calls, or appointment requests.",
    positioning: "Patient-enquiry websites for dental clinics.",
    pain: "Patients compare treatments, reviews, dentist credibility, location, pricing confidence, and booking convenience before choosing a clinic.",
    promise: "We structure your dental website around the treatments you want to grow, the proof patients need, and the shortest path from Google search to an appointment conversation.",
    cta: "Get My Free Dental Website Preview",
    leadCapture: "WhatsApp enquiry, appointment form, phone call, treatment-specific CTA, and local SEO landing pages.",
    sections: ["Appointment-focused hero", "Treatment pages", "Dentist and clinic trust", "Patient reviews", "Treatment FAQs", "Location and map", "WhatsApp and appointment CTAs"],
  },
  "clinic-website-design": {
    templateId: "aesthetic-clinic-v1",
    previewIndustry: "clinic",
    label: "Clinic lead websites",
    title: "Clinic Websites Built for Patient Enquiries",
    subtitle:
      "For dental, aesthetic, wellness, and healthcare clinics that need treatment pages, doctor trust, local visibility, and appointment CTAs.",
    positioning: "Appointment-focused websites for clinics.",
    pain: "Patients compare treatments, trust, reviews, location, and booking convenience before contacting a clinic.",
    promise: "We structure your website so treatments are clear, trust is visible, FAQs reduce hesitation, and WhatsApp or appointment CTAs are easy to act on.",
    cta: "Get a Free Clinic Website Audit",
    leadCapture: "WhatsApp enquiry, appointment form, phone call, and treatment-specific CTA.",
    sections: ["Hero with appointment CTA", "Treatment categories", "Practitioner trust", "Patient FAQs", "Reviews/proof", "Location/map", "Appointment form"],
  },
  "renovation-contractor-website-design": {
    templateId: "renovation-contractor-v1",
    previewIndustry: "contractor",
    label: "Contractor quote websites",
    title: "Renovation Websites Built for Quote Requests",
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
    templateId: "salon-spa-v1",
    previewIndustry: "beauty",
    label: "Salon booking websites",
    title: "Salon Websites Built for Bookings",
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
    templateId: "tuition-centre-v1",
    previewIndustry: "education",
    label: "Tuition enquiry websites",
    title: "Tuition Websites Built for Parent Enquiries",
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
    templateId: "corporate-v1",
    previewIndustry: "consultant",
    label: "Consultant authority websites",
    title: "Consultant Websites Built to Win Calls",
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
    templateId: "law-firm-v1",
    previewIndustry: "consultant",
    label: "Professional services websites",
    title: "Professional Websites Built for Qualified Enquiries",
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
    templateId: "accounting-firm-v1",
    previewIndustry: "accounting",
    label: "Accounting and finance websites",
    title: "Accounting Websites Built for Better Enquiries",
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
    templateId: "service-pro-v1",
    previewIndustry: "local-service",
    label: "Local service lead websites",
    title: "Local Service Websites Built for Quote Requests",
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
    referralCode: params.get("ref") || params.get("referral") || localStorage.getItem("bt_platform_affiliate_ref") || localStorage.getItem("ref_platform") || "",
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
  marketingConsent?: boolean;
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
    throw new Error(data?.message || data?.error || "Unable to submit request right now.");
  }

  trackPinterestLead(input.leadType, {
    form_name: input.formName,
    source_page: window.location.pathname,
  });

  return data;
}

function Hero({
  title, copy, icon: Icon,
  primaryLabel = "Get my free website preview",
  primaryHref = "/generate-preview",
  secondaryLabel, secondaryHref, imageSrc = "",
  variant = "default", templateIdOverride, templateNameOverride,
}: {
  title:string;copy:string;icon:React.ElementType;primaryLabel?:string;primaryHref?:string;
  secondaryLabel?:string;secondaryHref?:string;imageSrc?:string;variant?:"default"|"audit";
  templateIdOverride?:string;templateNameOverride?:string;
}) {
  const lower = (title+" "+imageSrc).toLowerCase();
  const isAuditPage=variant==="audit";
  const isClinic=/clinic|dental|health/.test(lower);
  const isHome=/contractor|renovat|repair|local service|home/.test(lower);
  const isEducation=/tuition|education|school/.test(lower);
  const isBeauty=/beauty|salon|wellness/.test(lower);
  const isAccounting=/account|finance|tax/.test(lower);
  const isTemplate=/direction|template/.test(lower);
  const templateId=templateIdOverride || (isClinic?"dental-clinic-v1":isHome?"renovation-contractor-v1":isEducation?"tuition-centre-v1":isBeauty?"salon-spa-v1":isAccounting?"accounting-firm-v1":"law-firm-v1");
  const label=templateNameOverride || (isClinic?"Clinic website":isHome?"Home-service website":isEducation?"Tuition centre":isBeauty?"Beauty studio":isAccounting?"Accounting firm":"Professional services");
  const promise=isClinic?"Appointments":isHome?"Quotes":isEducation?"Trial classes":isBeauty?"Bookings":isAccounting?"Consultations":"Enquiries";
  const track=()=>trackPublicEvent({eventType:isAuditPage?"website_audit_cta_clicked":"public_section_cta_clicked",label:primaryLabel,target:primaryHref});
  const content=<>{primaryLabel} <ArrowRight className="ml-2 h-4 w-4"/></>;
  return <section className="c27-marketing-hero">
    <div className="brand-shell grid gap-10 py-16 lg:grid-cols-12 lg:items-center lg:py-24">
      <div className="lg:col-span-6">
        
        <h1 className="mt-6 !max-w-[16ch]">{title}</h1>
        <p className="brand-copy mt-6">{copy}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {primaryHref.startsWith("#")?<a href={primaryHref} onClick={track} className="c27-button">{content}</a>:<Link to={primaryHref} onClick={track} className="c27-button">{content}</Link>}
          {secondaryLabel&&secondaryHref?<Link className="c27-quiet" to={secondaryHref}>{secondaryLabel} <ArrowRight size={16}/></Link>:<Link className="c27-quiet" to="/case-studies">View case studies <ArrowRight size={16}/></Link>}
        </div>
        <p className="mt-6 text-xs font-semibold text-[#697484]">Mobile-first layouts · Clear scope · Human review before launch</p>
      </div>
      <div className="lg:col-span-6">
        {isAuditPage?<div className="border border-[#dce1e6] bg-white p-7 sm:p-9">
          <h2 className="mt-4 !text-[clamp(1.9rem,3vw,3rem)] !leading-[1.1]">Know what to improve <span className="font-serif italic font-normal text-[#1741ed]">before spending.</span></h2>
          <div className="mt-6">{[["01","First impression","Is the core service clear?"],["02","Enquiry path","Can a visitor request a quote or booking?"],["03","Trust evidence","Is credible proof easy to find?"],["04","Mobile experience","Can customers use the site on a phone?"]].map(([n,t,b])=><div key={n} className="grid grid-cols-[2rem_1fr] gap-4 border-t border-[#d8dde4] py-4"><span className="font-serif text-xl italic text-[#1741ed]">{n}</span><div><p className="font-semibold text-[#15191f]">{t}</p><p className="mt-1 text-sm text-[#596573]">{b}</p></div></div>)}</div>
          <p className="text-xs text-[#68727f]">Sample report framework only. Findings are based on the site you submit.</p>
        </div>:<div className="c27-visual" style={{background:isClinic?"#17645e":isHome?"#654938":isEducation?"#bc7b22":isBeauty?"#875964":"#1741ed"}}>
          <div className="c27-rendered"><TemplatePreviewThumbnail templateId={templateId} templateName={label} className="min-h-[320px] lg:min-h-[405px]"/></div>
          <div className="mt-6 flex items-center justify-between gap-4 text-xs font-semibold text-white"><span>App-rendered {label.toLowerCase()} layout</span><span>Goal: {promise}</span></div>
          <p className="mt-2 text-[10px] !text-white/80">Studio showcase from a built-in template · not a commissioned client website</p>
        </div>}
      </div>
    </div>
  </section>;
}

function TemplatesPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  return (
    <>
      <Hero
        title={cmsPage?.heroTitle || "A clearer direction for your website."}
        copy={cmsPage?.heroDescription || "Explore website concepts built around real buying decisions: what visitors need to understand, what proof they should see and which action they should take next."}
        icon={LayoutTemplate}
        primaryLabel={cmsPage?.primaryCtaLabel || "Create my free website preview"}
        primaryHref={cmsPage?.primaryCtaHref || "/generate-preview"}
        secondaryLabel="See website examples"
        secondaryHref="/case-studies"
      />

      <section id="design-families" className="brand-shell scroll-mt-24 py-14 sm:py-20">
        <div className="mb-9 grid min-w-0 gap-6 border-b border-[#dbe1ea] pb-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Design directions · 01—09</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-[#15191f] sm:text-4xl">Find the structure that fits your business.</h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-[#526071]">Select an industry below to see its visual direction, recommended pages and the authentic proof you would need to supply. Every example is a starting point, not a generic design imposed on your business.</p>
        </div>
        <FlagshipTemplateGallery />
      </section>

      <section className="border-y border-[#dbe1ea] bg-white py-14 sm:py-20">
        <div className="brand-shell grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Industry pathways</p>
            <h2 className="mt-4 max-w-md text-3xl font-bold leading-tight tracking-tight text-[#15191f] sm:text-4xl">Different buyers need different answers.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[#526071]">Explore the key questions, proof and enquiry structure for your market before requesting a personalised website direction.</p>
          </div>
          <div className="min-w-0 border-t border-[#dbe1ea]">
            {industrySalesStarts.map((item) => (
              <Link
                key={item.industry}
                to={item.path}
                className="group grid min-w-0 gap-2 border-b border-[#dbe1ea] px-1 py-5 transition-colors hover:bg-[#f6f8fd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-5 sm:px-4"
              >
                <h3 className="min-w-0 text-base font-bold leading-6 text-[#15191f]">{item.industry}</h3>
                <p className="min-w-0 text-sm leading-6 text-[#526071]">{item.promise}</p>
                <ArrowRight aria-hidden="true" className="h-5 w-5 text-[#1741ed] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="brand-shell py-14 sm:py-20">
        <div className="grid gap-7 rounded-2xl bg-[#eef3ff] p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Make it your own</p>
            <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight text-[#15191f] sm:text-3xl">See a direction built around your actual business.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526071]">Tell us about your offer and preferred enquiry path. You can explore a free illustrative preview without committing to a plan.</p>
          </div>
          <Link to="/generate-preview" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1741ed] px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-[#1035c2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] focus-visible:ring-offset-2">
            Get my free website preview <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

const PREVIEW_GENERATION_VERSION = 17;

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
    id: "agency", label: "Web / Marketing Agency", template: "Managed Website Studio", recommendedPlan: "Business",
    pages: ["Home", "Services", "Work", "About", "Contact"],
    sections: ["Managed website proposition", "Website and lead-generation services", "Selected work", "Managed delivery process", "Consultation CTA"],
    cta: "Book a Consultation", proof: "Real client work, delivery process, customer-supplied reviews, service scope and clear commercial positioning.",
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
  agency: "managed-website-agency-v1",
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
  agency: "service businesses and growing teams",
  "local-service": "local customers",
  clinic: "patients",
  contractor: "homeowners and property teams",
  consultant: "businesses ready to move forward",
  education: "parents and students",
  beauty: "clients",
};

type PreviewBusinessType = {
  id: string;
  label: string;
  group: string;
  industryId: string;
  templateId: string;
  targetCustomer: string;
  websiteGoal: string;
};

const previewBusinessTypes: PreviewBusinessType[] = [
  { id: "dental-clinic", label: "Dental Clinic", group: "Health & Wellness", industryId: "clinic", templateId: "dental-clinic-v1", targetCustomer: "patients", websiteGoal: "Get bookings" },
  { id: "aesthetic-clinic", label: "Aesthetic Clinic", group: "Health & Wellness", industryId: "clinic", templateId: "aesthetic-clinic-v1", targetCustomer: "patients and aesthetic clients", websiteGoal: "Get bookings" },
  { id: "physiotherapy-clinic", label: "Physiotherapy Clinic", group: "Health & Wellness", industryId: "clinic", templateId: "physiotherapy-clinic-v1", targetCustomer: "patients", websiteGoal: "Get bookings" },
  { id: "chiropractor", label: "Chiropractor", group: "Health & Wellness", industryId: "clinic", templateId: "chiropractor-v1", targetCustomer: "patients", websiteGoal: "Get bookings" },
  { id: "medical-clinic", label: "Medical / General Clinic", group: "Health & Wellness", industryId: "clinic", templateId: "wellness-v1", targetCustomer: "patients", websiteGoal: "Get bookings" },
  { id: "wellness-spa", label: "Wellness / Spa", group: "Health & Wellness", industryId: "beauty", templateId: "wellness-v1", targetCustomer: "clients", websiteGoal: "Get bookings" },
  { id: "salon-spa", label: "Beauty Salon / Spa", group: "Health & Wellness", industryId: "beauty", templateId: "salon-spa-v1", targetCustomer: "clients", websiteGoal: "Get bookings" },

  { id: "cleaning-company", label: "Cleaning Company", group: "Local Services", industryId: "cleaning", templateId: "cleaning-company-v1", targetCustomer: "homes and businesses", websiteGoal: "Generate local service leads" },
  { id: "renovation-contractor", label: "Renovation Contractor", group: "Local Services", industryId: "contractor", templateId: "renovation-contractor-v1", targetCustomer: "homeowners and property teams", websiteGoal: "Generate local service leads" },
  { id: "pest-control", label: "Pest Control", group: "Local Services", industryId: "local-service", templateId: "pest-control-v1", targetCustomer: "local homeowners and businesses", websiteGoal: "Generate local service leads" },
  { id: "electrician", label: "Electrician", group: "Local Services", industryId: "local-service", templateId: "electrician-v1", targetCustomer: "local homeowners and businesses", websiteGoal: "Generate local service leads" },
  { id: "roofing", label: "Roofing Company", group: "Local Services", industryId: "local-service", templateId: "roofing-v1", targetCustomer: "property owners", websiteGoal: "Generate local service leads" },
  { id: "interior-designer", label: "Interior Designer", group: "Local Services", industryId: "contractor", templateId: "interior-designer-v1", targetCustomer: "homeowners and property teams", websiteGoal: "Generate local service leads" },
  { id: "other-local-service", label: "Other Local Service Business", group: "Local Services", industryId: "local-service", templateId: "service-pro-v1", targetCustomer: "local customers", websiteGoal: "Generate local service leads" },

  { id: "accounting-firm", label: "Accounting / Bookkeeping Firm", group: "Professional Services", industryId: "accounting", templateId: "accounting-firm-v1", targetCustomer: "business owners", websiteGoal: "Get bookings" },
  { id: "law-firm", label: "Law Firm", group: "Professional Services", industryId: "consultant", templateId: "law-firm-v1", targetCustomer: "clients seeking legal help", websiteGoal: "Get bookings" },
  { id: "consultant-coach", label: "Consultant / Coach", group: "Professional Services", industryId: "consultant", templateId: "corporate-v1", targetCustomer: "businesses ready to move forward", websiteGoal: "Get bookings" },
  { id: "real-estate-agent", label: "Real Estate Agent", group: "Professional Services", industryId: "consultant", templateId: "real-estate-v1", targetCustomer: "property buyers and sellers", websiteGoal: "Get contact form submissions" },
  { id: "mortgage-advisor", label: "Mortgage Advisor", group: "Professional Services", industryId: "consultant", templateId: "mortgage-advisor-v1", targetCustomer: "home buyers and property owners", websiteGoal: "Get bookings" },
  { id: "insurance-agent", label: "Insurance Agent", group: "Professional Services", industryId: "consultant", templateId: "insurance-agent-v1", targetCustomer: "people and businesses comparing cover", websiteGoal: "Get contact form submissions" },
  { id: "recruitment-agency", label: "Recruitment Agency", group: "Professional Services", industryId: "consultant", templateId: "recruitment-agency-v1", targetCustomer: "employers and candidates", websiteGoal: "Get contact form submissions" },
  { id: "it-support-company", label: "IT Support Company", group: "Professional Services", industryId: "consultant", templateId: "it-support-company-v1", targetCustomer: "businesses needing reliable IT support", websiteGoal: "Get contact form submissions" },
  { id: "web-marketing-agency", label: "Web / Marketing Agency", group: "Professional Services", industryId: "agency", templateId: "managed-website-agency-v1", targetCustomer: "service businesses and growing teams", websiteGoal: "Get bookings" },
  { id: "other-professional-service", label: "Other Professional Service", group: "Professional Services", industryId: "consultant", templateId: "corporate-v1", targetCustomer: "prospective clients", websiteGoal: "Get contact form submissions" },

  { id: "tuition-centre", label: "Tuition / Education Centre", group: "Education", industryId: "education", templateId: "tuition-centre-v1", targetCustomer: "parents and students", websiteGoal: "Get bookings" },
  { id: "childcare-centre", label: "Childcare Centre", group: "Education", industryId: "education", templateId: "childcare-centre-v1", targetCustomer: "parents and families", websiteGoal: "Get contact form submissions" },

  { id: "restaurant", label: "Restaurant / Cafe", group: "Hospitality & Lifestyle", industryId: "local-service", templateId: "restaurant-v1", targetCustomer: "diners and local customers", websiteGoal: "Get bookings" },
  { id: "catering", label: "Catering Business", group: "Hospitality & Lifestyle", industryId: "local-service", templateId: "catering-v1", targetCustomer: "event organisers and local customers", websiteGoal: "Get contact form submissions" },
  { id: "boutique", label: "Boutique / Retail Shop", group: "Hospitality & Lifestyle", industryId: "local-service", templateId: "boutique-v1", targetCustomer: "shoppers", websiteGoal: "Get WhatsApp enquiries" },
  { id: "local-shop", label: "Local Shop", group: "Hospitality & Lifestyle", industryId: "local-service", templateId: "local-shop-v1", targetCustomer: "local shoppers", websiteGoal: "Get WhatsApp enquiries" },
  { id: "florist", label: "Florist", group: "Hospitality & Lifestyle", industryId: "local-service", templateId: "florist-v1", targetCustomer: "gift and event customers", websiteGoal: "Get WhatsApp enquiries" },
  { id: "photographer", label: "Photographer", group: "Hospitality & Lifestyle", industryId: "consultant", templateId: "photographer-v1", targetCustomer: "people and businesses planning a shoot", websiteGoal: "Get contact form submissions" },
  { id: "personal-brand", label: "Personal Brand / Creator", group: "Hospitality & Lifestyle", industryId: "consultant", templateId: "personal-brand-v1", targetCustomer: "followers, clients and partners", websiteGoal: "Get contact form submissions" },
];

const resolvePreviewStockAsset = (input: {
  businessTypeId: string;
  industryId: string;
  service: string;
}) => {
  const key = `${input.businessTypeId} ${input.industryId} ${input.service}`.toLowerCase();

  // Every preview niche resolves to a local bundled fallback. We intentionally
  // use broad visual families instead of hot-linking a third-party stock API.
  if (/clinic|dental|dentist|medical|physio|therapy|health/.test(key)) {
    return "/template-assets/concept-clinic-v2.jpg";
  }
  if (/beauty|salon|spa|aesthetic|wellness/.test(key)) {
    return "/template-assets/concept-beauty-v2.jpg";
  }
  if (/tuition|education|childcare|school|learning/.test(key)) {
    return "/template-assets/concept-education-v2.jpg";
  }
  if (/renovation|contractor|local-service|local service|handyman|plumb|electric|roof|hvac|air[ -]?con|cleaning|pest|builder|construction|locksmith|landscap|garden|painting|flooring|carpentr|repair|interior/.test(key)) {
    return "/template-assets/concept-renovation-v2.jpg";
  }
  if (/restaurant|catering|boutique|retail|florist|photograph|personal-brand|creator/.test(key)) {
    return "/template-assets/concept-professional-v2.jpg";
  }
  if (/account|bookkeep|law|consult|coach|real-estate|mortgage|insurance|recruit|it-support|agency|professional/.test(key)) {
    return "/template-assets/concept-professional-v2.jpg";
  }
  return "/template-assets/concept-professional-v2.jpg";
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
  if (/website|web design|web development|seo|lead generation|digital marketing|marketing agency/.test(value)) return "agency";
  if (/dent|tooth|teeth|extraction|implant|orthodont|braces|clinic|medical|health|physio|chiro/.test(value)) return "clinic";
  if (/tuition|school|class|student|education|course|lesson|learning|tutor/.test(value)) return "education";
  if (/clean|maid|housekeep|janitor/.test(value)) return "cleaning";
  if (/renov|contractor|roof|plumb|electric|build|construction|repair/.test(value)) return "contractor";
  if (/account|bookkeep|tax|audit|payroll|finance/.test(value)) return "accounting";
  if (/salon|beauty|aesthetic|spa|facial|hair|skin/.test(value)) return "beauty";
  if (/consult|coach|advis|strategy/.test(value)) return "consultant";
  return null;
};


const cleanPreviewLabel = (value: string) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

const SOURCE_SERVICE_RULES: Record<string, { signal: RegExp; fallback: string }> = {
  "dental-clinic": { signal: /dent|teeth|tooth|whiten|implant|veneer|brace|orthodont|root canal|crown|bridge|filling|extraction|scaling|polish/i, fallback: "Dental care" },
  "aesthetic-clinic": { signal: /aesthetic|skin|facial|laser|inject|botox|filler|treatment/i, fallback: "Aesthetic treatments" },
  "physiotherapy-clinic": { signal: /physio|rehab|pain|injury|mobility|therapy|sports/i, fallback: "Physiotherapy" },
  chiropractor: { signal: /chiro|spine|back|neck|adjustment|pain/i, fallback: "Chiropractic care" },
  "medical-clinic": { signal: /medical|doctor|clinic|screening|health|consult|vaccin|treatment/i, fallback: "Medical care" },
  "cleaning-company": { signal: /clean|housekeep|janitor|deep clean|office|residential|commercial/i, fallback: "Cleaning services" },
  "renovation-contractor": { signal: /renov|build|contract|construction|remodel|interior|extension/i, fallback: "Renovation services" },
  "pest-control": { signal: /pest|termite|rodent|cockroach|mosquito|control/i, fallback: "Pest control" },
  electrician: { signal: /electric|wiring|power|lighting|socket|rewire/i, fallback: "Electrical services" },
  roofing: { signal: /roof|gutter|leak|tile|repair/i, fallback: "Roofing services" },
  "accounting-firm": { signal: /account|bookkeep|tax|audit|payroll|company secretary|finance/i, fallback: "Accounting services" },
  "law-firm": { signal: /law|legal|litigation|convey|corporate|family law|criminal|solicitor|attorney/i, fallback: "Legal services" },
  "consultant-coach": { signal: /consult|coach|advis|strategy|training|workshop/i, fallback: "Consulting services" },
  "tuition-centre": { signal: /tuition|class|course|lesson|learning|exam|subject|student/i, fallback: "Tuition programmes" },
  "childcare-centre": { signal: /childcare|preschool|kindergarten|nursery|early learning/i, fallback: "Childcare programmes" },
  restaurant: { signal: /menu|dining|restaurant|food|lunch|dinner|dish|cuisine/i, fallback: "Dining" },
  catering: { signal: /cater|event|buffet|menu|food/i, fallback: "Catering services" },
  "salon-spa": { signal: /salon|spa|hair|beauty|facial|nail|massage/i, fallback: "Salon services" },
  florist: { signal: /flower|floral|bouquet|wedding|arrangement/i, fallback: "Floral services" },
  photographer: { signal: /photo|portrait|wedding|shoot|photography/i, fallback: "Photography" },
};

const resolveSourceServices = (
  values: unknown[],
  businessTypeId: string,
  extraCandidates: unknown[] = [],
) => {
  const rule = SOURCE_SERVICE_RULES[businessTypeId];
  const generic = /^(?:treatment process|process|surface cleaning|services?|our services|about|patient info|practitioners?|appointment|contact|faq|home)$/i;
  const candidates = [...values, ...extraCandidates]
    .map((value) => cleanPreviewLabel(String(value || "")))
    .filter((value) => {
      const wordCount = value.split(/\s+/).filter(Boolean).length;
      const sentenceLike = /[.!?]$/.test(value) || /\b(?:we|our|you|your|patients?|customers?|clients?)\b/i.test(value) && wordCount > 7;
      return value.length >= 3
        && value.length <= 72
        && wordCount <= 8
        && !sentenceLike
        && !generic.test(value);
    });

  const unique = candidates.filter((value, index, all) =>
    all.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index
  );
  const matched = rule ? unique.filter((value) => rule.signal.test(value)) : unique;
  const selected = (rule ? matched : unique).slice(0, 5);

  return selected.length ? selected : [rule?.fallback || "Professional services"];
};


function GeneratePreviewPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initialParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const salesMode = initialParams.get("sales") === "1";
  const savedPreviewIntent = React.useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("bt_preview_intent") || "{}") as Record<string, any>; }
    catch { return {} as Record<string, any>; }
  }, []);
  const savedPreviewIsCurrent = Number(savedPreviewIntent.previewGenerationVersion || 0) === PREVIEW_GENERATION_VERSION
    && !(salesMode && Boolean(initialParams.get("prospectId")));
  const explicitTemplateId = initialParams.get("template");
  const requestedBusinessTypeId = initialParams.get("businessType")
    || (savedPreviewIsCurrent ? String(savedPreviewIntent.businessTypeId || "") : "")
    || previewBusinessTypes.find((item) => item.templateId === explicitTemplateId)?.id
    || "";
  const initialBusinessType = previewBusinessTypes.find((item) => item.id === requestedBusinessTypeId) || null;
  const [businessTypeId, setBusinessTypeId] = React.useState(initialBusinessType?.id || "");
  const initialIndustry = initialParams.get("industry")
    || initialBusinessType?.industryId
    || (savedPreviewIsCurrent ? savedPreviewIntent.industryId : "")
    || "local-service";
  const [industryId, setIndustryId] = React.useState(previewIndustries.some((item) => item.id === initialIndustry) ? initialIndustry : "local-service");
  const initialGoal = initialParams.get("goal") || savedPreviewIntent.goal || previewGoals[0];
  const [goal, setGoal] = React.useState(previewGoals.includes(initialGoal) ? initialGoal : previewGoals[0]);
  const [generated, setGenerated] = React.useState(savedPreviewIsCurrent && Boolean(savedPreviewIntent.generatedWebsite));
  const [quickConcept, setQuickConcept] = React.useState(false);
  const [generatedWebsite, setGeneratedWebsite] = React.useState<Website | null>(
    savedPreviewIsCurrent ? savedPreviewIntent.generatedWebsite || null : null,
  );
  const [shareablePreviewUrl, setShareablePreviewUrl] = React.useState(
    savedPreviewIsCurrent ? String(savedPreviewIntent.shareablePreviewUrl || "") : "",
  );
  const [previewExpanded, setPreviewExpanded] = React.useState(false);
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const requestedPreviewMode = initialParams.get("mode");
  const [previewMode, setPreviewMode] = React.useState<"website" | "business">(
    requestedPreviewMode === "website" || (!requestedPreviewMode && Boolean(initialParams.get("website"))) || (!requestedPreviewMode && savedPreviewIsCurrent && savedPreviewIntent.previewMode === "website") ? "website" : "business",
  );
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");
  const [marketingOptIn, setMarketingOptIn] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState("");
  const [form, setForm] = React.useState(() => {
    let auditContext: Record<string, any> = {};
    try {
      auditContext = JSON.parse(sessionStorage.getItem("bt_audit_preview_context") || "{}");
    } catch {
      auditContext = {};
    }
    let initialBrief: Record<string, string> = {};
    if (initialParams.get("source") === "contact") {
      try {
        initialBrief = JSON.parse(sessionStorage.getItem("bt_contact_brief") || "{}");
        sessionStorage.removeItem("bt_contact_brief");
      } catch { initialBrief = {}; }
    }
    return {
      contactName: String(initialBrief.name || savedPreviewIntent.contactName || auditContext.contactName || ""),
      businessName: String(initialBrief.company || (savedPreviewIsCurrent ? savedPreviewIntent.businessName : "") || auditContext.businessName || ""),
      location: String(initialParams.get("location") || initialParams.get("city") || (savedPreviewIsCurrent ? savedPreviewIntent.location : "") || ""),
      mainService: String((savedPreviewIsCurrent ? savedPreviewIntent.mainService : "") || initialParams.get("service") || ""),
      websiteUrl: String(initialParams.get("website") || (savedPreviewIsCurrent ? savedPreviewIntent.websiteUrl : "") || auditContext.website || ""),
      websiteStatus: String(savedPreviewIntent.websiteStatus || initialParams.get("websiteStatus") || (auditContext.website ? "yes" : "no")),
      phone: String(savedPreviewIntent.phone || ""),
      email: String(initialBrief.email || savedPreviewIntent.email || auditContext.email || ""),
      brandStyle: String(savedPreviewIntent.brandStyle || "Modern professional"),
      brandColorMode: String(savedPreviewIntent.brandColorMode || "auto"),
      brandPrimaryColor: String(savedPreviewIntent.brandPrimaryColor || "#5746e8"),
      brandAccentColor: String(savedPreviewIntent.brandAccentColor || "#141821"),
      socialUrl: String(savedPreviewIntent.socialUrl || ""),
      reviews: String(savedPreviewIntent.reviews || ""),
      biggestProblem: String(initialBrief.details || savedPreviewIntent.biggestProblem || ""),
      pageCount: 5,
    };
  });
  const inferredIndustryId = inferPreviewIndustryId(form.mainService);
  const selectedBusinessType = previewBusinessTypes.find((item) => item.id === businessTypeId) || null;
  const effectiveIndustryId = selectedBusinessType?.industryId || industryId;
  const selectedTemplateId = selectedBusinessType?.templateId
    || (explicitTemplateId && effectiveIndustryId === initialIndustry ? explicitTemplateId : "")
    || previewTemplateIds[effectiveIndustryId]
    || "service-pro-v1";

  const previewFormMounted = React.useRef(false);
  const skipNextPreviewInvalidation = React.useRef(false);
  React.useEffect(() => {
    if (!previewFormMounted.current) {
      previewFormMounted.current = true;
      return;
    }
    if (skipNextPreviewInvalidation.current) {
      skipNextPreviewInvalidation.current = false;
      return;
    }
    setGenerated(false);
    setQuickConcept(false);
    setGeneratedWebsite(null);
    setShareablePreviewUrl("");
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
    form.brandColorMode,
    form.brandPrimaryColor,
    form.brandAccentColor,
    form.socialUrl,
    form.reviews,
    form.biggestProblem,
    form.pageCount,
  ]);

  const businessTypeLabel = selectedBusinessType?.label || "Select business type";
  const businessLabel = form.businessName.trim() || "your business";
  const locationLabel = form.location.trim() || "your service area";
  const serviceLabel = form.mainService.trim() || "your main service";
  const industry = previewIndustries.find((item) => item.id === effectiveIndustryId) || previewIndustries.find((item) => item.id === "local-service") || previewIndustries[0];
  const commercialRecommendation = recommendCommercialProduct({
    goal,
    notes: `${form.mainService} ${form.biggestProblem}`,
    industry: businessTypeLabel,
    requestedPages: 5,
    serviceCount: form.mainService.split(/[,/\n]+/).map((item) => item.trim()).filter(Boolean).length,
    locationCount: form.location.split(/[,/\n]+/).map((item) => item.trim()).filter(Boolean).length,
    seoIntent: /seo|search|google|organic/i.test(`${goal} ${form.biggestProblem}`),
    landingPageNeeds: /landing|campaign|service page|location page/i.test(form.biggestProblem),
    ongoingGrowth: /growth|scale|ongoing|monthly/i.test(`${goal} ${form.biggestProblem}`),
  });
  const generatedPrimaryCta = React.useMemo(() => {
    const home = generatedWebsite?.pages?.find((page) => page.slug === "" || page.slug === "home") || generatedWebsite?.pages?.[0];
    const hero = home?.sections?.find((section) => section.type === "hero");
    return String(hero?.content?.ctaText || resolvePreviewCta(goal) || "Contact the business");
  }, [generatedWebsite, goal]);

  React.useEffect(() => {
    trackPublicEvent({ eventType: "start_preview_flow", label: "Generate Preview Page Loaded", target: "/generate-preview" });
    trackPublicEvent({ eventType: "preview_start", label: "Free website direction opened", target: "/generate-preview" });
  }, []);

  const selectBusinessType = (id: string) => {
    const selected = previewBusinessTypes.find((item) => item.id === id) || null;
    setBusinessTypeId(id);
    if (selected) setIndustryId(selected.industryId);
    setGenerated(fal…17620 tokens truncated…lg:items-start">
          <div className="lg:col-span-4"><h2 className="mt-4">Questions before you get started?</h2><p className="brand-copy mt-5">A few quick answers before you review the direction.</p></div>
          <div className="lg:col-span-8 divide-y divide-[#e5e8ef] overflow-hidden rounded-2xl border border-[#e5e8ef] bg-white">
            {[
              ["Is there a commitment to see a website direction?","No. The direction is designed to give you something concrete to evaluate before deciding what to do next."],
              ["How long does it take to prepare the direction?","The form itself is short. Preparation time depends on whether we are reading an existing website and how much source material is available."],
              ["Can I request changes to the direction?","Yes. The direction is a starting point to review, not a locked final design."],
              ["Do you work with businesses in my industry?","The studio supports several service-business categories and adapts page structure to the selected business type."],
              ["What happens after I approve the direction?","The next step is to confirm the appropriate commercial scope, delivery plan and launch requirements."],
            ].map(([q,a])=><details key={q} className="px-5"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-[#172033]">{q}<span className="text-[#6252f4]">+</span></summary><p className="pb-5 text-sm leading-7 text-[#657186]">{a}</p></details>)}
          </div>
        </div>
      </section>

      {generating ? (
        <section className="border-y border-[#dfe2ea] bg-white">
          <div className="brand-shell py-12">
            <p className="brand-kicker">Preparing the website direction</p>
            <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.025em] text-[#141821] sm:text-3xl">
              {previewMode === "website"
                ? "Keeping the useful parts of the current site and rebuilding the weak ones."
                : "Turning the business brief into a focused website direction."}
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-4">
              {(previewMode === "website"
                ? [
                    "Reading the current website",
                    "Preserving useful brand assets",
                    `Applying the ${businessTypeLabel} structure`,
                    "Checking the enquiry path",
                  ]
                : [
                    "Understanding the business",
                    `Applying the ${businessTypeLabel} structure`,
                    "Building the buyer journey",
                    "Checking the enquiry path",
                  ]
              ).map((step,index)=>(
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
        <section id="generated-preview" className="scroll-mt-16 border-y border-[#dfe2ea] bg-[#0b1020] text-white">
          <div className="brand-shell py-10 sm:py-12">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#c9c4ff]">
                    <Sparkles className="h-3.5 w-3.5" /> Website direction ready
                  </span>
                  {quickConcept ? <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300">Unsaved illustrative concept · no email collected</span> : previewMode === "website" ? (
                    <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                      Built from the current website
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                    {businessTypeLabel}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                    {generatedWebsite.pages.length}-page website concept
                  </span>
                </div>
                <h2 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
                  {businessLabel}, redesigned to make the next step clearer.
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  {quickConcept
                    ? "This browser-only illustration uses your selected business type and details. It does not verify claims or replace a tailored studio review. Complete the full brief below if you want a saved, personalized preview."
                    : previewMode === "website"
                    ? "The preview keeps useful brand assets and verified business content, then applies a stronger page hierarchy and enquiry path for the selected business type."
                    : "The preview turns the business brief into a focused page structure, clear offer and conversion path."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                {shareablePreviewUrl ? (
                  <Button
                    onClick={() => {
                      trackPublicEvent({
                        eventType: "open_preview_new_tab",
                        label: businessLabel,
                        target: shareablePreviewUrl,
                        metadata: { salesMode, businessType: businessTypeLabel },
                      });
                      window.open(shareablePreviewUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="min-h-12 bg-white px-5 font-semibold text-[#141821] hover:bg-[#eceafe]"
                  >
                    {salesMode ? "Open prospect preview" : "Open full preview"} <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                ) : null}
                {previewMode === "website" && form.websiteUrl ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      trackPublicEvent({
                        eventType: "open_original_website",
                        label: businessLabel,
                        target: form.websiteUrl,
                      });
                      window.open(form.websiteUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="min-h-12 border-white/20 bg-transparent px-5 font-semibold text-white hover:bg-white/10 hover:text-white"
                  >
                    Current website <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#f6f7fb] shadow-[0_30px_90px_-45px_rgba(0,0,0,.85)]">
              <div className="flex flex-col gap-3 border-b border-[#dfe2ea] bg-white px-4 py-3 text-[#141821] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex shrink-0 gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  </div>
                  <span className="truncate text-xs font-semibold text-[#526071]">Preview · {businessLabel}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["desktop","tablet","mobile"] as const).map((device)=>(
                    <button
                      key={device}
                      type="button"
                      aria-pressed={previewDevice === device}
                      onClick={()=>setPreviewDevice(device)}
                      className={previewDevice===device
                        ? "rounded-md bg-[#141821] px-3 py-2 text-xs font-semibold text-white"
                        : "rounded-md border border-[#dfe2ea] bg-white px-3 py-2 text-xs font-semibold text-[#374151]"}
                    >
                      {device==="desktop" ? "Desktop" : device==="tablet" ? "Tablet" : "Mobile"}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-expanded={previewExpanded}
                    onClick={()=>setPreviewExpanded((value)=>!value)}
                    className="rounded-md border border-[#dfe2ea] bg-white px-3 py-2 text-xs font-semibold text-[#374151]"
                  >
                    {previewExpanded ? "Compact" : "Expand"}
                  </button>
                </div>
              </div>

              <div className="bg-[#edf0f5] p-2 sm:p-4">
                <div className={(previewDevice==="mobile" ? "max-w-[430px] " : previewDevice==="tablet" ? "max-w-[820px] " : "max-w-full ") + (previewExpanded ? "max-h-[92vh] " : "max-h-[980px] ") + "bt-static-preview mx-auto overflow-y-auto bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,.5)] transition-all"}>
                  <React.Suspense fallback={<div className="grid min-h-[40rem] place-items-center text-[#526071]">Preparing website…</div>}>
                    <PublicWebsiteRenderer initialData={generatedWebsite} />
                  </React.Suspense>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                ["01", previewMode === "website" ? "Keep what is already working" : "Start with the right structure", previewMode === "website" ? "Useful branding, photography and verified content are preserved rather than discarded." : "The selected business type drives the page architecture instead of a one-size-fits-all template."],
                ["02", "Remove template noise", "Unsupported claims, fake availability, filler sections and internal design language are kept out of the prospect-facing site."],
                ["03", "Make action obvious", `The website is organised around the primary next step: ${generatedPrimaryCta || "contact the business"}.`],
              ].map(([number,title,copy])=>(
                <div key={number} className="border-t border-white/15 pt-4">
                  <p className="text-[10px] font-black tracking-[0.22em] text-[#c9c4ff]">{number}</p>
                  <p className="mt-2 font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
                </div>
              ))}
            </div>

            {!salesMode ? (
              <>
                <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.06] p-5 sm:p-7" aria-label="Recommended next steps for your business">
                  <p className="text-xs font-bold uppercase tracking-[0.13em] text-indigo-200">Your opportunity brief · suggested review priorities</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Turn this design direction into a practical business website.</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-200">This is a design concept based on your brief, not a measured website audit or a forecast of leads. Before quoting, Bennie Studio should confirm your real content, target audience, main enquiry action and final page scope.</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ["Customer action", generatedPrimaryCta || "A clear enquiry or booking path"],
                      ["Website scope", `${generatedWebsite.pages.length} concept pages to review and prioritise`],
                      ["Human validation", "Check proof, content accuracy, delivery scope and budget"],
                    ].map(([label, detail]) => <div key={label} className="rounded-xl border border-white/10 bg-[#0b1020]/60 p-4"><p className="text-xs font-semibold text-indigo-200">{label}</p><p className="mt-2 text-sm leading-6 text-white">{detail}</p></div>)}
                  </div>
                </div>
                <div className="sticky bottom-4 z-20 mt-5 flex flex-col gap-4 rounded-2xl border border-indigo-300/20 bg-[#08101f]/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">Like this direction? Discuss the next step with us.</p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">{quickConcept ? "Ask for a human review and explore verified plans. Checkout requires a personalized, saved preview." : "Ask for a human review and clear scope before committing, or continue to your preview-linked order."}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Button onClick={() => action("preview_consultation_clicked", "Preview website review", "/book-demo")} className="min-h-12 bg-white px-5 font-semibold text-slate-950 hover:bg-indigo-100">
                      Request a website review <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => action(quickConcept ? "quick_concept_pricing_clicked" : "click_launch_after_preview",quickConcept ? "Compare verified plans" : "Continue with website",quickConcept ? "/pricing" : "/preview-order")} className="min-h-12 border-white/30 bg-transparent px-5 font-semibold text-white hover:bg-white/10 hover:text-white">
                      {quickConcept ? "Explore plans & pricing" : "Review plan & payment"}
                    </Button>
                  </div>
                </div>
                <details className="s33-preview-optional-newsletter mt-6 max-w-3xl"><summary>Optional: receive website improvement tips and a checklist <span aria-hidden="true">+</span></summary><div><StudioEmailOptIn sourcePage="/generate-preview" title="Want more ideas for your website?" description="Get the 7-point website conversion checklist and optional follow-up tips. Your unsaved instant design is not emailed or stored by this signup." /></div></details>
              </>
            ) : null}
          </div>
        </section>
      ) : !generating ? (
        <section className="border-y border-slate-200 bg-white">
          <div className="brand-shell py-12 sm:py-14">
            <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 lg:grid-cols-12">
              <div className="p-6 sm:p-8 lg:col-span-5">
                
                <h2 className="mt-4">A prospect-ready redesign, not a template with your logo pasted on it.</h2>
                <p className="brand-copy mt-4">
                  {previewMode === "website"
                    ? "Your URL supplies the useful brand, content and proof. Your selected business type supplies the right page architecture. The preview combines both without inventing claims or fake functionality."
                    : "Your selected business type supplies the page architecture, while your business brief drives the offer, content hierarchy and enquiry path."}
                </p>
                <div className="mt-6 space-y-3">
                  {(previewMode === "website"
                    ? ["Current brand and real business content retained where useful","Business-type-specific page structure","Desktop, tablet and mobile preview with a clear enquiry path"]
                    : ["Business-type-specific page structure","Desktop, tablet and mobile preview","Clear primary enquiry path"]
                  ).map((item) => (
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
      label: "See recommended website direction",
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
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-600">{finding.category}</p>
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
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
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
                <div><p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Current</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{change.current}</p></div>
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
            <p className="mt-1 text-sm font-bold text-slate-600">Choose your billing currency during checkout.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/book-demo" onClick={() => { savePreviewContext(); trackPublicEvent({ eventType: "audit_review_consultation_requested", label: recommendedProduct, target: "/book-demo", metadata: { findingCount: report.findings.length } }); }} className={primaryCtaClass}>Discuss my website review <ArrowRight className="ml-2 h-4 w-4" /></Link>
            <Link to="/generate-preview" onClick={savePreviewContext} className={secondaryCtaClass}>See a website direction</Link>
            <Link to="/pricing#plans" onClick={() => trackPublicEvent({ eventType: "recommended_plan_viewed", label: recommendedProduct, target: "/pricing", metadata: { recommendedProduct } })} className={secondaryCtaClass}>Compare pricing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function WebsiteAuditPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const location = useLocation();
  const reportQuery = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const linkedJobId = reportQuery.get("report") || "";
  const linkedAccessKey = reportQuery.get("key") || "";
  const shortReviewRoute = location.pathname.startsWith("/review/");
  const linkedShareCode = shortReviewRoute ? location.pathname.split("/")[2] || "" : "";
  const [loadingSharedReport, setLoadingSharedReport] = React.useState(shortReviewRoute || Boolean(linkedJobId && linkedAccessKey));
  const [reportLink, setReportLink] = React.useState("");
  const [deliveryStatus, setDeliveryStatus] = React.useState("");
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

  React.useEffect(() => {
    if (!shortReviewRoute && (!linkedJobId || !linkedAccessKey)) return;
    if (shortReviewRoute ? !/^[A-Za-z0-9_-]{22}$/.test(linkedShareCode) :
      (!/^[0-9a-f-]{36}$/i.test(linkedJobId) || !/^[0-9a-f]{64}$/i.test(linkedAccessKey))) {
      setLoadingSharedReport(false);
      setError("This report link is incomplete or invalid.");
      return;
    }
    let cancelled = false;
    const loadReport = async () => {
      try {
        const endpoint = shortReviewRoute
          ? `/api/public/website-audit/shares/${encodeURIComponent(linkedShareCode)}`
          : `/api/public/website-audit/jobs/${encodeURIComponent(linkedJobId)}?key=${encodeURIComponent(linkedAccessKey)}`;
        const response = await fetch(endpoint, { cache: "no-store", referrerPolicy: "no-referrer" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "The website report could not be loaded.");
        if (cancelled) return;
        if (payload.businessName) setForm((prev) => ({ ...prev, businessName: payload.businessName }));
        setDeliveryStatus(payload.deliveryStatus || "");
        setReportLink(shortReviewRoute
          ? `/review/${linkedShareCode}`
          : `/website-audit?report=${encodeURIComponent(linkedJobId)}&key=${encodeURIComponent(linkedAccessKey)}`);
        setSubmitted(true);
        setAuditQueued(["queued", "processing"].includes(payload.status));
        if (payload.status === "completed" && payload.report) {
          setAuditReport(normalizeWebsiteAuditResult(payload.report));
        } else if (payload.status === "failed") {
          setError("The automatic review could not be completed. Your original request remains with Bennie Studio.");
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Unable to load this report.");
      } finally {
        if (!cancelled) setLoadingSharedReport(false);
      }
    };
    void loadReport();
    return () => { cancelled = true; };
  }, [shortReviewRoute, linkedShareCode, linkedJobId, linkedAccessKey]);

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
      trackPublicEvent({
        eventType: "website_audit_requested",
        label: form.businessName,
        target: "/website-audit",
        metadata: { industry: form.industry || null },
      });
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
      if (auditPayload.reportUrl) setReportLink(auditPayload.reportUrl);
      if (auditPayload.deliveryStatus) setDeliveryStatus(auditPayload.deliveryStatus);

      if (auditPayload.status === "failed") {
        throw new Error(auditPayload.error || "The website could not be analysed automatically. Your request was saved for manual follow-up.");
      }

      if (auditPayload.report) {
        const normalizedReport = normalizeWebsiteAuditResult(auditPayload.report);
        setAuditReport(normalizedReport);
        setAuditQueued(false);
        setSubmitted(true);
        trackPublicEvent({
          eventType: "website_audit_completed",
          label: form.businessName,
          target: "/website-audit",
          metadata: {
            findingCount: normalizedReport.findings.length,
            recommendedPlan: normalizedReport.recommendedPlan,
          },
        });
        return;
      }

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
          setDeliveryStatus(statusPayload.deliveryStatus || "");
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
      {(linkedJobId || shortReviewRoute) && <Helmet><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>}
      <Hero
        title={cmsPage?.heroTitle || "Find out what your website could improve."}
        variant="audit"
        copy={cmsPage?.heroDescription || "Start with your website address. Get an automated, evidence-based review of your messaging, trust signals and enquiry journey — then see practical next steps."}
        icon={FileSearch}
        primaryLabel={cmsPage?.primaryCtaLabel || "Start my free review"}
        primaryHref={cmsPage?.primaryCtaHref || "#review-form"}
        secondaryLabel="I don't have a website yet"
        secondaryHref="/generate-preview?mode=business"
      />
      <section className="brand-shell grid min-w-0 gap-8 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-12">
        <div className="order-2 min-w-0 rounded-2xl border border-[#dbe1ea] bg-white p-6 sm:p-8 lg:order-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Six review dimensions</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950">What the review covers</h2>
          <div className="mt-6 grid gap-3">
            {[
              ["Design clarity", "Does the page quickly explain what you offer?"],
              ["Mobile layout", "Can mobile visitors read and contact you easily?"],
              ["Enquiry path", "Are WhatsApp, phone, form, and quote CTAs obvious?"],
              ["SEO basics", "Are titles, headings, service terms, and local intent clear?"],
              ["Trust proof", "Are reviews, credentials, case studies, or photos visible?"],
              ["Speed and friction", "Is the page easy to load, scan, and act on?"],
            ].map(([title, copy]) => (
              <div key={title} className="flex gap-3 border-b border-[#e3e8ef] py-4 last:border-b-0">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-bold text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 rounded-xl border border-[#dbe1ea] bg-[#f2f6fc] p-5">
            <p className="text-sm font-bold text-[#15191f]">What you receive</p>
            <p className="mt-2 text-sm leading-6 text-[#526071]">A private, evidence-based report with prioritised observations and suggested improvements. Automated checks can miss issues; this is not a manual accessibility or performance certification.</p>
          </div>
        </div>
        <form id="review-form" onSubmit={submitAudit} className="order-1 min-w-0 scroll-mt-28 rounded-2xl border border-[#dbe1ea] bg-white p-6 text-[#0F172A] shadow-[0_20px_65px_-45px_rgba(15,23,42,0.32)] sm:p-9 lg:order-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Free website review</p>
          <h2 className="mt-4 text-3xl font-bold text-[#0F172A]">Enter your website. See what to improve.</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#475569]">
            Get a free, automated assessment using publicly accessible page evidence. We need your website, business name and email to send your private report.
          </p>
          <Link to="/generate-preview?mode=business" className="mt-4 inline-flex text-sm font-semibold text-[#1741c9] underline underline-offset-4 transition hover:text-[#1035a2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed]">
            No website yet? Start with a business brief instead.
          </Link>
          {loadingSharedReport ? <p role="status" className="mt-8 text-sm font-semibold text-blue-700">Loading your private website review…</p> : submitted ? (
            <div role="status" className={`mt-8 rounded-xl border p-5 sm:p-6 ${error && !auditReport ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
              {error && !auditReport ? <FileSearch className="mb-4 h-7 w-7" /> : <Check className="mb-4 h-7 w-7" />}
              <p className="text-xl font-bold">{auditReport ? "Website review complete" : error ? "Automatic review unavailable" : auditQueued ? "Your review is processing" : "Review request received"}</p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {auditReport
                  ? "Your review is based on observable page evidence and practical recommendations—not a numerical rating."
                  : auditQueued
                    ? "Your audit is processing. Save the private report link if available. Email delivery depends on the configured notification service."
                    : "The website could not be analysed automatically. Your request is saved for manual follow-up."}
              </p>
              {!auditReport && error && <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-sm font-bold text-amber-800">{error}</p>}
              {reportLink && <div className="mt-4 rounded-xl border border-emerald-300/20 bg-white p-4">
                <p className="text-xs font-semibold text-emerald-800">Your private report link</p>
                <p className="mt-1 text-xs leading-5 text-emerald-800">Save this link. Anyone with it can view the business website review once processing completes.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a href={reportLink} rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-[#c7d5eb] bg-white px-4 text-sm font-semibold text-[#1741c9] hover:bg-[#eff4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed]">Open report</a>
                  <button type="button" onClick={() => { void navigator.clipboard.writeText(new URL(reportLink, window.location.origin).href); }} className="min-h-10 rounded-lg border border-[#E2E8F0] px-4 text-base font-semibold text-blue-700">Copy private link</button>
                </div>
                {["not_configured","failed"].includes(deliveryStatus) && <p className="mt-3 text-xs text-amber-800">Email delivery was not confirmed. Save this link or contact the studio.</p>}
              </div>}
              {!auditReport && <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  to="/book-demo"
                  onClick={() => {
                    trackPublicEvent({ eventType: "click_audit_thank_you_book_call", label: "Audit Thank You Book Call", target: "/book-demo" });
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1741ed] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#1035c2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] focus-visible:ring-offset-2"
                >
                  Book a Call
                </Link>
                <Link
                  to="/generate-preview"
                  onClick={() => {
                    trackPublicEvent({ eventType: "click_audit_thank_you_direction", label: "Audit Thank You Website Direction", target: "/generate-preview" });
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#c7d5eb] bg-white px-5 py-3 text-center text-sm font-bold text-[#1741c9] transition hover:bg-[#eff4ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] focus-visible:ring-offset-2"
                >
                  See recommended website direction
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
              <label className="space-y-2 text-base font-semibold text-[#0F172A]">Your website URL
                <Input aria-label="Website URL" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" required placeholder="https://yourbusiness.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="h-13 rounded-xl border-indigo-100 bg-white text-slate-950" />
              </label>
              <label className="space-y-2 text-base font-semibold text-[#0F172A]">Business name
                <Input aria-label="Business name" required placeholder="Your business or company" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="h-12 rounded-xl bg-white text-slate-950" />
              </label>
              <label className="space-y-2 text-base font-semibold text-[#0F172A]">Where should we email the review?
                <Input aria-label="Email" required type="email" placeholder="you@yourbusiness.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 rounded-xl bg-white text-slate-950" />
              </label>
              <details className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                <summary className="cursor-pointer text-base font-semibold text-[#0F172A]">Optional: tell us more about your business</summary>
                <div className="mt-4 grid gap-3">
                  <Input aria-label="Industry or business type" placeholder="Industry or business type" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="h-12 rounded-xl bg-white text-slate-950" />
                  <Input aria-label="WhatsApp or phone" placeholder="WhatsApp / phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 rounded-xl bg-white text-slate-950" />
                  <Textarea aria-label="Website improvement notes" placeholder="What would you like to improve?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-24 rounded-xl bg-white text-slate-950" />
                </div>
              </details>
              <Button type="submit" disabled={submitting} className="min-h-13 rounded-xl bg-[#1D4ED8] px-6 font-semibold text-white hover:bg-[#2563EB]">
                {submitting ? "Starting your review..." : "Get my free website review"} <Search className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs leading-6 text-[#475569]">No payment card required. Findings are based on accessible site evidence, not a full human usability test. Your email is used to deliver the requested report.</p>
            </div>
          )}
        </form>
      </section>
      {error && !submitted && (linkedJobId || shortReviewRoute) && <p role="alert" className="brand-shell text-sm font-semibold text-rose-700">{error}</p>}
      {auditReport ? (
        <section className="brand-shell pb-20">
          <WebsiteAuditResultView report={auditReport} form={form} />
        </section>
      ) : null}
    </>
  );
}

function NicheLandingPage({ page, cmsPage }: { page: (typeof nichePages)[keyof typeof nichePages]; cmsPage?: PlatformCmsPage }) {
  const previewHref = `/generate-preview?industry=${encodeURIComponent(page.previewIndustry)}&template=${encodeURIComponent(page.templateId)}`;

  return (
    <>
      <Hero
        title={cmsPage?.heroTitle || page.title}
        copy={cmsPage?.heroDescription || page.subtitle}
        icon={FileSearch}
        primaryLabel={cmsPage?.primaryCtaLabel || "See a free website direction"}
        primaryHref={cmsPage?.primaryCtaHref || previewHref}
        secondaryLabel="Browse website examples"
        secondaryHref="/case-studies"
        templateIdOverride={page.templateId}
        templateNameOverride={page.label}
      />
      <section className="brand-shell py-14 sm:py-20" aria-labelledby="niche-buyer-title">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">01 · Understand the buyer</p>
            <h2 id="niche-buyer-title" className="mt-4 max-w-lg text-3xl font-bold leading-tight tracking-tight text-[#15191f] sm:text-4xl">
              What visitors need to know before they enquire.
            </h2>
          </div>
          <div className="min-w-0">
            <p className="text-lg leading-8 text-[#25364b]">{page.pain}</p>
            <p className="mt-5 text-base leading-8 text-[#526071]">{page.promise}</p>
            <div className="mt-8 grid gap-3 border-t border-[#dbe1ea] pt-6 sm:grid-cols-3">
              {[
                ["Clarity", "Explain the offer and the fit."],
                ["Evidence", "Show genuine work and credentials."],
                ["Next step", "Make the enquiry route obvious."],
              ].map(([label, detail], index) => (
                <div key={label} className="border-l-2 border-[#1741ed] pl-4">
                  <span className="text-xs font-bold text-[#1741ed]">0{index + 1}</span>
                  <h3 className="mt-2 text-base font-bold text-[#15191f]">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#526071]">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-[#dbe1ea] bg-white py-14 sm:py-20" aria-labelledby="niche-structure-title">
        <div className="brand-shell grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">02 · Plan the structure</p>
            <h2 id="niche-structure-title" className="mt-4 text-3xl font-bold leading-tight tracking-tight text-[#15191f] sm:text-4xl">
              A site built for the decision, not a generic template.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#526071]">{page.positioning} These are suggested sections to tailor to your actual services and content.</p>
            <ol className="mt-7 grid min-w-0 gap-0 border-t border-[#dbe1ea] sm:grid-cols-2 sm:gap-x-8">
              {page.sections.map((section, index) => (
                <li key={section} className="flex min-w-0 items-start gap-4 border-b border-[#dbe1ea] py-4">
                  <span className="shrink-0 text-sm font-bold text-[#1741ed]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-semibold leading-6 text-[#25364b]">{section}</span>
                </li>
              ))}
            </ol>
          </div>
          <aside className="min-w-0 self-start rounded-2xl border border-[#dbe1ea] bg-[#f4f7fc] p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">03 · Make contacting easy</p>
            <h3 className="mt-4 text-2xl font-bold leading-tight text-[#15191f]">The enquiry path</h3>
            <p className="mt-4 text-base leading-7 text-[#526071]">{page.leadCapture}</p>
            <div className="mt-6 border-t border-[#dbe1ea] pt-6">
              <h4 className="text-sm font-bold text-[#15191f]">Real proof, not placeholders</h4>
              <p className="mt-2 text-sm leading-7 text-[#526071]">Photos, testimonials, credentials and results appear only when the business can provide and approve the evidence. This design is an illustrative starting point.</p>
            </div>
          </aside>
        </div>
      </section>
      <section className="brand-shell py-14 sm:py-20" aria-labelledby="niche-next-step-title">
        <div className="grid min-w-0 gap-7 rounded-2xl bg-[#eef3ff] p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">See it for your business</p>
            <h2 id="niche-next-step-title" className="mt-3 max-w-2xl text-2xl font-bold leading-tight text-[#15191f] sm:text-3xl">Review a tailored direction before you commit.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#526071]">Start with a short business brief. The preview is illustrative; plans and delivery scope are explained separately.</p>
          </div>
          <Link to={previewHref} onClick={() => trackPublicEvent({ eventType: "niche_preview_clicked", label: page.label, target: previewHref })} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1741ed] px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-[#1035c2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] focus-visible:ring-offset-2">
            See my free website preview <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

export default function PublicMarketingPages() {
  const location = useLocation();
  const navigate = useNavigate();
  const cms = usePublishedPlatformCms();
  const isPrivateReview = location.pathname.startsWith("/review/");
  const pageKind = (isPrivateReview ? "website-audit" : location.pathname.split("/").filter(Boolean).join("/")) as PublicPageKind;
  const cmsPagePath = `/${pageKind}`;
  const pageCms = cms.pages[cmsPagePath];
  const meta = pageMeta[pageKind] || pageMeta.templates;
  const nichePage = nichePages[pageKind as keyof typeof nichePages];

  const finalCta = ({
    services: ["Let's build a website that moves your business forward.", "A clear website, human guidance and a managed path from strategy to launch."],
    about: ["Your better website starts here.", "See how Bennie Studio would translate your business into a clearer, more credible website direction."],
    resources: ["Turn insights into results.", "Apply the ideas to your own business with a tailored website preview."],
    contact: ["Let's build something great.", "Start with a call or a project brief and get a clear next step."],
    pricing: ["Let's build a website that grows your business.", "Choose the right scope after you have seen what a stronger direction can look like."],
    "how-it-works": ["Let's build a website that moves your business forward.", "A clear process, expert guidance and a reviewed launch."],
    "case-studies": ["Let's build a website that works for you.", "Modern design, better structure and a direction grounded in the business."],
    "generate-preview": ["See your website before you commit.", "Complete the brief, review the direction and decide what you want to do next."],
  } as Record<string, [string, string]>)[pageKind] || ["See it applied to your business.", "Start with a free website preview and decide the right next step."];

  const finalPrimary = pageKind === "contact"
    ? { label: "Book a website consultation", href: "/book-demo" }
    : { label: "Get my free website preview", href: "/generate-preview" };
  const finalSecondary = { label: "See case studies", href: "/case-studies" };

  const templatePageContent =
    nichePage
      ? <NicheLandingPage page={nichePage} cmsPage={pageCms} />
      : pageKind === "services"
      ? <ServicesSalesPage cmsPage={pageCms} />
      : pageKind === "about"
        ? <AboutStudioPage cmsPage={pageCms} />
        : pageKind === "resources"
          ? <ResourcesStudioPage cmsPage={pageCms} />
          : pageKind === "contact"
            ? <ContactStudioPage cmsPage={pageCms} />
      : pageKind === "pricing"
      ? <PricingSalesPage cmsPage={pageCms} />
      : pageKind === "how-it-works"
        ? <ProcessStudioPage cmsPage={pageCms} />
        : pageKind === "case-studies"
          ? <WorkStudioPage cmsPage={pageCms} />
          : pageKind === "website-audit"
            ? <WebsiteAuditPage cmsPage={pageCms} />
            : pageKind === "generate-preview"
              ? <GeneratePreviewPage cmsPage={pageCms} />
              : pageKind === "preview-order"
                ? <PreviewOrderPage />
                : <TemplatesPage cmsPage={pageCms} />;
  const pageContent = !isPrivateReview && pageCms?.replacePageContent && CMS_REPLACEABLE_PATHS.has(cmsPagePath)
    ? <PlatformCmsPageBody path={cmsPagePath}/>
    : templatePageContent;

  return (
    <div className="brand-public c27-no-template-look min-h-screen bg-[#f8f8f5] text-[#141821]">
      <Helmet>
        <title>{pageCms?.seoTitle || meta.title}</title>
        <meta name="description" content={pageCms?.seoDescription || meta.description} />
        <link rel="canonical" href={isPrivateReview ? "https://app.bennietay.com/website-audit" : (pageCms?.canonicalUrl || `https://app.bennietay.com${location.pathname === "/" ? "/" : location.pathname.replace(/\/$/, "")}`)} />
        {(isPrivateReview || pageCms?.noIndex) && <meta name="robots" content="noindex,nofollow" />}
        {isPrivateReview && <meta name="referrer" content="no-referrer" />}
        <meta property="og:title" content={pageCms?.seoTitle || meta.title} />
        <meta property="og:description" content={pageCms?.seoDescription || meta.description} />
        {pageCms?.ogImage && <meta property="og:image" content={pageCms.ogImage} />}
      </Helmet>
      <PublicSiteHeader />
      {/*
        Services and pricing already render their own semantic <main>.
        Other public page bodies render fragments; give them a single
        main landmark so screen readers and browser QA find the real H1.
      */}
      {!pageCms?.replacePageContent && (pageKind === "services" || pageKind === "pricing" || pageKind === "preview-order")
        ? pageContent
        : <main id="main-content">{pageContent}</main>}
      {!pageCms?.replacePageContent && <PlatformCmsSections path={cmsPagePath} />}
      {!nichePage && !["pricing","services","resources","contact","generate-preview","preview-order","templates","website-audit"].includes(pageKind) && <section className="c27-footer-cta relative overflow-hidden border-t border-white/10 bg-[#1741dd] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="brand-shell relative grid gap-8 py-14 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            
            <h2 className="mt-3 max-w-3xl !text-white">{pageCms?.finalCtaTitle || finalCta[0]}</h2>
            <p className="mt-4 max-w-2xl text-base !text-white/75">{pageCms?.finalCtaDescription || finalCta[1]}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Button onClick={() => navigate(pageCms?.primaryCtaHref || finalPrimary.href)} className="min-h-12 bg-white px-6 font-semibold text-[#141821] hover:bg-[#ece9ff]">{pageCms?.primaryCtaLabel || finalPrimary.label} <ArrowRight className="ml-2 h-4 w-4" /></Button>
            <Button onClick={() => navigate(finalSecondary.href)} variant="outline" className="min-h-12 border-white/30 bg-white/[0.04] px-6 font-semibold text-white hover:bg-white/10 hover:text-white">{finalSecondary.label}</Button>
          </div>
        </div>
      </section>}
      <PublicSiteFooter showMobileCta={pageKind !== "generate-preview" && pageKind !== "preview-order"} />
    </div>
  );
}
