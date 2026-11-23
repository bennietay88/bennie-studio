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
import { trackPinterestLead } from "../lib/pinterestTracking";
import { trackPublicEvent } from "../lib/publicTracking";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import {
  AboutStudioPage,
  ContactStudioPage,
  ProcessStudioPage,
  ResourcesStudioPage,
  WorkStudioPage,
} from "./PublicStudioPagesV3";
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
  }
> = {
  "dental-clinics": {
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
    throw new Error(data?.message || "Unable to submit request right now.");
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
  variant = "default",
}: {
  title:string;copy:string;icon:React.ElementType;primaryLabel?:string;primaryHref?:string;
  secondaryLabel?:string;secondaryHref?:string;imageSrc?:string;variant?:"default"|"audit";
}) {
  const lower = (title+" "+imageSrc).toLowerCase();
  const isAuditPage=variant==="audit";
  const isClinic=/clinic|dental|health/.test(lower);
  const isHome=/contractor|renovat|repair|local service|home/.test(lower);
  const isEducation=/tuition|education|school/.test(lower);
  const isBeauty=/beauty|salon|wellness/.test(lower);
  const isAccounting=/account|finance|tax/.test(lower);
  const isTemplate=/direction|template/.test(lower);
  const templateId=isClinic?"dental-clinic-v1":isHome?"renovation-contractor-v1":isEducation?"tuition-centre-v1":isBeauty?"salon-spa-v1":isAccounting?"accounting-firm-v1":"law-firm-v1";
  const label=isClinic?"Clinic website":isHome?"Home-service website":isEducation?"Tuition centre":isBeauty?"Beauty studio":isAccounting?"Accounting firm":"Professional services";
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
        title={cmsPage?.heroTitle || "Website directions that fit the buyer."}
        copy={cmsPage?.heroDescription || "Start with the buyer journey, the evidence available, the main enquiry action and the business category. The design direction follows those decisions."}
        icon={LayoutTemplate}
        primaryLabel={cmsPage?.primaryCtaLabel || "Get my free website preview"}
        primaryHref={cmsPage?.primaryCtaHref || "/generate-preview"}
      />
      <section className="brand-shell brand-section">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            
            <h2 className="mt-4">Explore the design families.</h2>
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
              
              <h2 className="mt-4">One system, adapted to each buyer.</h2>
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

      <section className="border-y border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
        <div className="brand-shell brand-section">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#1D4ED8]">Industry paths</p>
              <h2 className="mt-4 text-[#0F172A]">Start with the buyer journey.</h2>
              <p className="mt-5 text-base leading-7 text-[#475569]">Each route explains the offer, evidence and enquiry structure that matters for that market.</p>
            </div>
            <div className="border-t border-[#E2E8F0] lg:col-span-8">
              {industrySalesStarts.map((item) => (
                <Link key={item.industry} to={item.path} className="grid gap-3 border-b border-[#E2E8F0] py-6 transition hover:bg-white sm:grid-cols-[1fr_1.5fr_auto] sm:items-center sm:px-3">
                  <h3 className="text-[#0F172A]">{item.industry}</h3>
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
    setGenerated(false);
    setGeneratedWebsite(null);
    setShareablePreviewUrl("");
    setPreviewExpanded(false);
    trackPublicEvent({
      eventType: "select_business_type",
      label: selected?.label || id,
      target: "/generate-preview",
      metadata: {
        businessTypeId: id,
        industryId: selected?.industryId || null,
        templateId: selected?.templateId || null,
      },
    });
  };

  const selectGoal = (value: string) => {
    setGoal(value);
    setGenerated(false);
    setGeneratedWebsite(null);
    trackPublicEvent({ eventType: "select_website_goal", label: value, target: "/generate-preview" });
  };

  // Zero-contact concept browsing: creates a local illustration only. No lead,
  // account, analytics payload containing business details, or saved URL.
  const createQuickConcept = () => {
    if (!selectedBusinessType || !form.businessName.trim()) {
      setError("Select a business type and enter your business name to explore a direction.");
      return;
    }
    const mainService = form.mainService.trim() || selectedBusinessType.label;
    const location = form.location.trim() || "Service area to be confirmed";
    const input: BlueprintBusinessInput = {
      businessName: form.businessName.trim(),
      nicheId: selectedTemplateId,
      nicheName: selectedBusinessType.label,
      plan: "business",
      maxPages: 3,
      mainService,
      targetCustomer: selectedBusinessType.targetCustomer || "local customers",
      location,
      ctaPreference: resolvePreviewCta(goal),
      generationMode: "brand_led",
      brandPersonality: "professional",
      assetReadiness: "pending",
    };
    const website: Website = {
      id: "illustrative-local-concept",
      businessId: "illustrative-local-concept",
      theme: {
        ...getBlueprintTheme(selectedTemplateId, "brand_led", { brandPersonality: "professional", assetReadiness: "pending" }),
        previewPurpose: "generated_preview",
      },
      pages: buildPagesFromBlueprint(input),
      seo: getBlueprintSeo(input),
      status: "draft",
      updatedAt: Date.now(),
    };
    setError("");
    setQuickConcept(true);
    setGeneratedWebsite(website);
    setGenerated(true);
    setShareablePreviewUrl("");
    window.setTimeout(() => document.getElementById("generated-preview")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const generatePreview = async (event: React.FormEvent) => {
    event.preventDefault();
    trackPublicEvent({eventType:"preview_started",label:"Website preview form",target:"/generate-preview",metadata:{mode:previewMode,industry:selectedBusinessType||"unspecified"}});
    setError("");
    setQuickConcept(false);

    if (!salesMode && !form.email.trim()) {
      setError("Enter an email so we can connect the preview to your enquiry.");
      return;
    }
    if (!selectedBusinessType) {
      setError("Select your business type so we can use the right website structure.");
      return;
    }
    if (previewMode === "website" && !form.websiteUrl.trim()) {
      setError("Paste your existing website URL first.");
      return;
    }
    if (previewMode === "business" && (!form.businessName.trim() || !form.mainService.trim() || !form.location.trim())) {
      setError("Add your business name, main service and location.");
      return;
    }

    setGenerating(true);
    trackPublicEvent({
      eventType: "submit_business_details",
      label: form.businessName || form.websiteUrl || "Website preview",
      target: "/generate-preview",
      metadata: {
        previewMode,
        industry: businessTypeLabel,
        businessTypeId: selectedBusinessType.id,
        templateId: selectedTemplateId,
        goal,
        location: form.location,
        hasWebsite: Boolean(form.websiteUrl),
      },
    });

    try {
      let existingPreview: Record<string, unknown> = {};
      try { existingPreview = JSON.parse(sessionStorage.getItem("bt_preview_intent") || "{}"); } catch { /* start a fresh preview */ }
      const previewId = !(salesMode && initialParams.get("prospectId"))
        && typeof existingPreview.previewId === "string" && existingPreview.previewId
        ? existingPreview.previewId
        : `preview_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;

      // Public previews attach to the prospect's verified enquiry. Authenticated
      // sales previews create an internal prospect record without asking the prospect
      // for an email address first.
      let leadResult: { leadId: string; reused?: boolean; leadEmail?: string };
      let intake: any;
      if (salesMode) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sign in as Bennie Studio staff to use sales preview mode.");
        const response = await fetch("/api/admin/sales-preview-intake", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            mode: previewMode,
            previewId,
            prospectId: initialParams.get("prospectId") || undefined,
            websiteUrl: previewMode === "website" ? form.websiteUrl : null,
            businessName: form.businessName || null,
            industry: selectedBusinessType.label,
            businessTypeId: selectedBusinessType.id,
            templateId: selectedTemplateId,
            location: form.location || null,
            mainService: form.mainService || null,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.profile || !payload?.leadId || !payload?.leadEmail) {
          throw new Error(payload?.error || "Sales preview could not be prepared.");
        }
        leadResult = { leadId: payload.leadId, leadEmail: payload.leadEmail };
        intake = payload;
      } else {
        // A session-scoped leadId can become stale after admin cleanup or data reset.
        // Revalidate the preview through the lead-intake endpoint every time.
        // The endpoint deduplicates by previewId + email when the lead still exists.
        leadResult = await submitPlatformLead({
          name: form.contactName || form.businessName || form.email.split("@")[0] || "Website preview lead",
          email: form.email,
          phone: form.phone,
          businessName: form.businessName,
          industry: selectedBusinessType.label,
          websiteUrl: form.websiteUrl,
          service: form.mainService,
          message: previewMode === "website"
            ? `URL-first website preview requested for ${form.websiteUrl}.`
            : `Business-info preview: ${form.mainService} in ${form.location}. Goal: ${goal}.`,
          formName: "Personalized website preview",
          leadType: previewMode === "website" ? "free_website_rebuild_preview" : "free_website_preview",
          previewId,
          market: "INTL",
          turnstileToken,
          website: honeypot,
          marketingConsent: marketingOptIn,
        });
        if (!leadResult?.leadId) throw new Error("We could not connect this preview to your enquiry. Please retry.");
        leadResult.leadEmail = form.email;

        const intakeResponse = await fetch("/api/public/preview-intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: previewMode,
            previewId,
            leadId: leadResult.leadId,
            leadEmail: form.email,
            websiteUrl: previewMode === "website" ? form.websiteUrl : null,
            businessName: form.businessName || null,
            industry: selectedBusinessType.label,
            businessTypeId: selectedBusinessType.id,
            templateId: selectedTemplateId,
            location: form.location || null,
            mainService: form.mainService || null,
          }),
        });
        intake = await intakeResponse.json().catch(() => null);
        if (!intakeResponse.ok || !intake?.profile) {
          const canContinueWithBusinessDetails =
            previewMode === "website"
            && intakeResponse.status === 422
            && intake?.fallbackMode === "business";
          if (canContinueWithBusinessDetails) {
            setPreviewMode("business");
            setForm((current) => ({ ...current, websiteStatus: "no" }));
            setError("We could not read that website. Continue with the business details below to build the preview.");
            return;
          }
          throw new Error(intake?.error || "We could not prepare that preview. Try business information instead.");
        }
      }
      const effectiveLeadEmail = leadResult.leadEmail || form.email;

      const profile = intake.profile as {
        sourceUrl?: string;
        businessName?: string;
        description?: string;
        location?: string;
        contactEmail?: string;
        contactPhone?: string;
        services?: string[];
        serviceDetails?: Array<{ title: string; description: string }>;
        serviceAreas?: string[];
        heroImage?: string;
        secondaryImage?: string;
        logoUrl?: string;
        brandColor?: string;
        accentColor?: string;
        heroHeadline?: string;
        heroSubheadline?: string;
        testimonials?: string[];
        faqs?: string[];
        faqItems?: Array<{ question: string; answer: string }>;
        aboutText?: string;
        credentials?: string[];
        yearsInBusiness?: string;
        guarantees?: string[];
        primaryCta?: string;
        people?: Array<{ name: string; role?: string; bio?: string; imageUrl?: string }>;
        historyItems?: string[];
        pressItems?: string[];
        imageCandidates?: string[];
        businessDNA?: {
          humanLed?: boolean;
          heritageRich?: boolean;
          proofRich?: boolean;
          imageRich?: boolean;
          identityScore?: number;
          typographyStyle?: "heritage" | "humanist" | "modern";
        };
      };

      const resolvedBusinessName = String(profile.businessName || form.businessName || "Your Business").trim();
      const resolvedLocation = String(
        profile.location
        || form.location
        || (previewMode === "website" ? "" : "Local area"),
      ).trim();
      const sourceServiceValues = Array.isArray(profile.services) ? profile.services : [];
      const resolvedServices = previewMode === "website"
        ? resolveSourceServices(
            sourceServiceValues,
            selectedBusinessType.id,
          )
        : form.mainService.split(/[,/\n]+/).map((service) => service.trim()).filter(Boolean).slice(0, 8);
      const resolvedMainService = String(resolvedServices[0] || form.mainService.trim() || selectedBusinessType.label || "Professional services")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 96);
      const detectedIndustryId = inferPreviewIndustryId(resolvedMainService);
      const resolvedBusinessType = selectedBusinessType;
      const resolvedIndustryId = resolvedBusinessType.industryId;
      const resolvedIndustry = previewIndustries.find((item) => item.id === resolvedIndustryId)
        || previewIndustries.find((item) => item.id === "local-service")
        || previewIndustries[0];
      const resolvedTemplateId = resolvedBusinessType.templateId;
      const resolvedGenerationMode = resolvePreviewGenerationMode(
        resolvedIndustryId,
        form.brandStyle,
        previewMode === "website" ? "yes" : form.websiteStatus,
      );
      const resolvedBrandPersonality = resolvePreviewBrandPersonality(form.brandStyle);
      const resolvedBusinessMaturity: BusinessMaturity = previewMode === "website" ? "established" : "growing";
      const resolvedGoal = previewMode === "website"
        ? resolvedBusinessType.websiteGoal
        : goal;
      const resolvedCta = previewMode === "website" && profile.primaryCta
        ? String(profile.primaryCta).trim().slice(0, 48)
        : resolvePreviewCta(resolvedGoal);
      const resolvedReviewStrategy = buildReviewWebsiteStrategy({
        businessName: resolvedBusinessName,
        industry: resolvedBusinessType.label,
        city: resolvedLocation,
        mainServices: resolvedMainService,
        preferredCta: resolvedGoal.toLowerCase().includes("whatsapp")
          ? "WhatsApp"
          : resolvedGoal.toLowerCase().includes("booking")
            ? "booking"
            : resolvedGoal.toLowerCase().includes("phone")
              ? "call"
              : "form",
        googleBusinessUrl: form.socialUrl,
        reviews: form.reviews,
      });
      const previewTestimonials = [
        ...(Array.isArray(profile.testimonials) ? profile.testimonials : []),
        ...form.reviews.split(/\n+/).map((review) => review.trim()).filter(Boolean),
      ].filter((review, index, values) => values.indexOf(review) === index).slice(0, 4);
      const sourceProofItems = previewMode === "website"
        ? [
            String(profile.yearsInBusiness || "").trim(),
            ...(Array.isArray(profile.credentials) ? profile.credentials : []),
            ...(Array.isArray(profile.guarantees) ? profile.guarantees : []),
            ...(Array.isArray(profile.serviceAreas) && profile.serviceAreas.length
              ? [`Serves ${profile.serviceAreas.slice(0, 3).join(", ")}`]
              : []),
          ].filter(Boolean).slice(0, 6)
        : [];
      const previewStockImage = resolvePreviewStockAsset({
        businessTypeId: resolvedBusinessType.id,
        industryId: resolvedIndustryId,
        service: resolvedMainService,
      });
      const sourcePeople = previewMode === "website" && Array.isArray(profile.people)
        ? profile.people.filter((person) => person?.name).slice(0, 6)
        : [];
      const sourceImages = previewMode === "website" && Array.isArray(profile.imageCandidates)
        ? profile.imageCandidates.filter(Boolean)
        : [];
      const sourceHeroImage = previewMode === "website"
        ? (profile.heroImage || sourceImages[0] || "")
        : previewStockImage;
      const personImageUrls = new Set(sourcePeople.map((person) => person.imageUrl).filter(Boolean));
      const sourceSupportingImages = sourceImages.filter((url) =>
        url !== sourceHeroImage
        && url !== profile.logoUrl
        && !personImageUrls.has(url)
        && !/(?:logo|icon|avatar|badge|sprite|favicon|illustration|vector|drawing|placeholder|symbol|clipart|process|step|diagram|graphic)/i.test(url),
      ).slice(0, 6);
      const sourceStoryImage = previewMode === "website"
        ? (
            (profile.secondaryImage && sourceSupportingImages.includes(profile.secondaryImage) ? profile.secondaryImage : "")
            || sourceSupportingImages[0]
            || ""
          )
        : previewStockImage;

      const blueprintInput: BlueprintBusinessInput = {
        businessName: resolvedBusinessName,
        nicheId: resolvedTemplateId,
        nicheName: resolvedBusinessType.id === "other-local-service"
          ? `${resolvedBusinessType.label} ${resolvedMainService}`
          : resolvedBusinessType.label,
        plan: "business",
        maxPages: 5,
        mainService: resolvedMainService,
        targetCustomer: resolvedBusinessType.targetCustomer || previewTargetCustomers[resolvedIndustryId] || "customers",
        location: resolvedLocation,
        ctaPreference: resolvedCta,
        tone: form.brandStyle,
        services: resolvedServices.length ? resolvedServices : [resolvedMainService],
        serviceDetails: previewMode === "website" && Array.isArray(profile.serviceDetails)
          ? profile.serviceDetails
          : undefined,
        serviceImageUrls: previewMode === "website" ? sourceSupportingImages : undefined,
        localProof: sourceProofItems.length ? sourceProofItems.join(" • ") : undefined,
        description: previewMode === "website"
          ? String(profile.description || "").trim()
          : profile.description || resolvedReviewStrategy.subheadline,
        aboutText: previewMode === "website" ? String(profile.aboutText || "").trim() : undefined,
        sourceDriven: previewMode === "website",
        contactEmail: previewMode === "website"
          ? String(profile.contactEmail || "").trim()
          : String(profile.contactEmail || form.email || "").trim(),
        contactPhone: previewMode === "website"
          ? String(profile.contactPhone || "").trim()
          : String(profile.contactPhone || form.phone || "").trim(),
        whatsappNumber: resolvedGoal.toLowerCase().includes("whatsapp")
          ? String(previewMode === "website" ? profile.contactPhone || "" : profile.contactPhone || form.phone || "").trim()
          : undefined,
        faqs: previewMode === "website"
          ? (Array.isArray(profile.faqs) ? profile.faqs : [])
          : resolvedReviewStrategy.intelligence.faqs,
        faqItems: previewMode === "website" && Array.isArray(profile.faqItems)
          ? profile.faqItems
          : undefined,
        testimonials: previewTestimonials,
        teamMembers: sourcePeople,
        historyItems: previewMode === "website" && Array.isArray(profile.historyItems) ? profile.historyItems : undefined,
        pressItems: previewMode === "website" && Array.isArray(profile.pressItems) ? profile.pressItems : undefined,
        businessDNA: previewMode === "website" ? profile.businessDNA : undefined,
        generationMode: resolvedGenerationMode,
        brandPersonality: resolvedBrandPersonality,
        businessMaturity: resolvedBusinessMaturity,
        assetReadiness: previewMode === "website" && profile.businessDNA?.imageRich ? "professional" : "some",
        heroImageUrl: sourceHeroImage,
        heroFallbackImageUrl: previewMode === "website" ? undefined : previewStockImage,
        storyImageUrl: sourceStoryImage || undefined,
        storyFallbackImageUrl: previewMode === "website" ? undefined : previewStockImage,
        heroHeadline: previewMode === "website" ? profile.heroHeadline || undefined : undefined,
        heroSubheadline: previewMode === "website" ? profile.heroSubheadline || undefined : undefined,
        heroTrustItems: previewMode === "website"
          ? [
              ...sourceProofItems,
              ...(previewTestimonials.length ? ["Customer reviews"] : []),
            ].filter(Boolean).slice(0, 3)
          : [],
        preferredHeroVariant: previewMode === "website" ? "source_brand_hero" : undefined,
        compactSubpageHeroes: previewMode === "website",
      };

      const basePreviewTheme = getBlueprintTheme(resolvedTemplateId, resolvedGenerationMode, {
        brandPersonality: resolvedBrandPersonality,
        businessMaturity: resolvedBusinessMaturity,
        assetReadiness: "some",
      });
      const customBrandColours = form.brandColorMode === "custom";
      const sourceTypographyStyle = previewMode === "website" ? profile.businessDNA?.typographyStyle : undefined;
      const sourceTypography =
        sourceTypographyStyle === "heritage"
          ? { displayFont: "'Source Serif 4', serif", bodyFont: "'Source Sans 3', sans-serif", fontFamily: "'Source Sans 3', sans-serif" }
          : sourceTypographyStyle === "humanist"
            ? { displayFont: "Fraunces, serif", bodyFont: "'Source Sans 3', sans-serif", fontFamily: "'Source Sans 3', sans-serif" }
            : {};
      const previewTheme: Website["theme"] = {
        ...basePreviewTheme,
        ...sourceTypography,
        previewPurpose: salesMode ? "sales_preview" : "generated_preview",
        sourceDriven: previewMode === "website",
        ...(previewMode === "website" ? {
          sourceIdentity: {
            peopleCount: sourcePeople.length,
            historyCount: Array.isArray(profile.historyItems) ? profile.historyItems.length : 0,
            pressCount: Array.isArray(profile.pressItems) ? profile.pressItems.length : 0,
            testimonialCount: previewTestimonials.length,
            serviceCount: resolvedServices.length,
            faqCount: Array.isArray(profile.faqItems) ? profile.faqItems.length : 0,
            realImageCount: sourceImages.length,
            hasLogo: Boolean(profile.logoUrl),
            identityScore: Number(profile.businessDNA?.identityScore || 0),
            typographyStyle: profile.businessDNA?.typographyStyle || "modern",
          },
        } : {}),
        ...(customBrandColours
          ? {
              primaryColor: form.brandPrimaryColor,
              secondaryColor: form.brandAccentColor,
            }
          : {
              ...(previewMode === "website" && profile.brandColor ? { primaryColor: profile.brandColor } : {}),
              ...(previewMode === "website" && profile.accentColor ? { secondaryColor: profile.accentColor } : {}),
            }),
        ...(previewMode === "website" && profile.logoUrl ? { logoUrl: profile.logoUrl } : {}),
      };
      const previewSeo = getBlueprintSeo(blueprintInput);
      const previewCandidates = [0, 1, 2, 3].map((compositionSeed) => {
        const pages = buildPagesFromBlueprint({ ...blueprintInput, compositionSeed });
        if (profile.heroImage) {
          const home = pages.find((page) => page.slug === "" || page.slug === "home") || pages[0];
          const hero = home?.sections?.find((section) => section.type === "hero");
          if (hero) {
            hero.content = {
              ...hero.content,
              imageUrl: hero.content?.imageUrl || profile.heroImage,
              imageAlt: hero.content?.imageAlt || resolvedBusinessName,
            };
          }
        }
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
        const sourceDirectionBonus = previewMode === "website"
          ? (
              (profile.businessDNA?.humanLed && compositionSeed === 2 ? 16 : 0)
              + (profile.businessDNA?.heritageRich && compositionSeed === 3 ? 10 : 0)
              + (profile.businessDNA?.proofRich && compositionSeed === 1 ? 7 : 0)
            )
          : 0;
        const rank =
          quality.score +
          quality.metrics.visualVariety * 0.2 +
          quality.metrics.hierarchy * 0.15 +
          quality.metrics.conversionClarity * 0.15 +
          quality.metrics.identityPreservation * 0.3 +
          quality.metrics.redesignAdvantage * 0.25 +
          sourceDirectionBonus -
          quality.metrics.aiTemplateRisk * 0.45;
        return { website, quality, rank, compositionSeed, sourceDirectionBonus };
      });
      const selectedPreview = previewCandidates.sort((a, b) => b.rank - a.rank)[0];
      if (previewMode === "website") {
        const salesBlockingChecks = new Set([
          "source_preview_language",
          "source_preview_availability",
          "source_preview_contact",
          "source_preview_hero",
          "source_identity_people",
          "source_identity_testimonials",
          "source_identity_heritage",
          "source_identity_logo",
          "source_redesign_advantage",
          "placeholders",
          "proof_integrity",
        ]);
        const blockingFailures = selectedPreview.quality.checks.filter(
          (check) => salesBlockingChecks.has(check.key) && !check.pass,
        );
        if (blockingFailures.length) {
          const issueSummary = blockingFailures
            .map((check) => check.label)
            .slice(0, 3)
            .join(", ");
          console.warn("[Preview QA] Blocking checks failed", blockingFailures);
          throw new Error(
            issueSummary
              ? `The preview needs one more automatic quality pass (${issueSummary}). Please rebuild it.`
              : "The preview needs one more automatic quality pass. Please rebuild it.",
          );
        }
      }

      const resolvedRecommendation = recommendCommercialProduct({
        goal: resolvedGoal,
        notes: `${resolvedMainService} ${form.biggestProblem}`,
        industry: resolvedBusinessType.label,
        requestedPages: 5,
        serviceCount: resolvedServices.length,
        locationCount: Array.isArray(profile.serviceAreas) ? profile.serviceAreas.length : 0,
        seoIntent: /seo|search|google|organic/i.test(`${resolvedGoal} ${form.biggestProblem}`),
        landingPageNeeds: /landing|campaign|service page|location page/i.test(form.biggestProblem),
        customFunctionality: /portal|membership|e-?commerce|custom function|booking engine/i.test(`${form.biggestProblem} ${resolvedMainService}`),
        integrations: /integration|crm|api|hubspot|salesforce|shopify|woocommerce/i.test(`${form.biggestProblem} ${resolvedMainService}`),
        ongoingGrowth: /growth|scale|ongoing|monthly|continuous/i.test(`${resolvedGoal} ${form.biggestProblem}`),
      });

      const resolvedForm = {
        ...form,
        businessName: resolvedBusinessName,
        location: resolvedLocation,
        mainService: resolvedMainService,
        websiteStatus: previewMode === "website" ? "yes" : form.websiteStatus,
        websiteUrl: profile.sourceUrl || form.websiteUrl,
      };
      const hydratedFormChanged =
        resolvedForm.businessName !== form.businessName ||
        resolvedForm.location !== form.location ||
        resolvedForm.mainService !== form.mainService ||
        resolvedForm.websiteStatus !== form.websiteStatus ||
        resolvedForm.websiteUrl !== form.websiteUrl;
      if (hydratedFormChanged) skipNextPreviewInvalidation.current = true;
      setForm(resolvedForm);
      setGoal(resolvedGoal);
      setIndustryId(resolvedIndustryId);
      setBusinessTypeId(resolvedBusinessType.id);

      let persistedPreview: { shareUrl?: string; businessId?: string; websiteId?: string } = {};
      try {
        const salesProofSignals = [
          String(profile.yearsInBusiness || "").trim(),
          ...(Array.isArray(profile.credentials) ? profile.credentials : []),
          ...(Array.isArray(profile.guarantees) ? profile.guarantees : []),
          ...(Array.isArray(profile.serviceAreas) && profile.serviceAreas.length ? [`Serves ${profile.serviceAreas.slice(0, 3).join(", ")}`] : []),
          ...(previewTestimonials.length ? ["Customer review evidence found"] : []),
        ].filter(Boolean).slice(0, 6);
        const persistHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (salesMode) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) throw new Error("Sign in as Bennie Studio staff to save a prospect preview.");
          persistHeaders.Authorization = `Bearer ${session.access_token}`;
        }
        const persistResponse = await fetch(salesMode ? "/api/admin/sales-preview-site" : "/api/public/preview-site", {
          method: "POST",
          headers: persistHeaders,
          body: JSON.stringify({
            previewId,
            leadId: leadResult.leadId,
            ...(salesMode ? {
              summary: {
                headline: `${resolvedBusinessName}, presented with a clearer website direction`,
                opportunitySummary: previewMode === "website"
                  ? "Your business is stronger than the current website communicates. This direction makes the services, proof and next action easier for a prospective customer to understand."
                  : "This direction turns the business brief into a clearer service story, trust path and next action for prospective customers.",
                proposedStructure: selectedPreview.website.pages.map((page) => page.title).slice(0, 5),
                proofSignals: salesProofSignals,
                primaryConversionPath: profile.primaryCta || resolvedCta,
                recommendedProduct: {
                  slug: resolvedRecommendation.slug,
                  label: resolvedRecommendation.label,
                  reason: resolvedRecommendation.reason,
                  salesMotion: resolvedRecommendation.salesMotion,
                },
              },
            } : { email: effectiveLeadEmail }),
            website: {
              theme: selectedPreview.website.theme,
              pages: selectedPreview.website.pages,
              seo: selectedPreview.website.seo,
            },
          }),
        });
        const persistPayload = await persistResponse.json().catch(() => null);
        if (persistResponse.ok && persistPayload?.success) {
          persistedPreview = {
            shareUrl: persistPayload.shareUrl,
            businessId: persistPayload.businessId,
            websiteId: persistPayload.websiteId,
          };
          setShareablePreviewUrl(String(persistPayload.shareUrl || ""));
        }
      } catch {
        // The in-browser preview remains usable if share-link persistence is unavailable.
      }

      sessionStorage.setItem("bt_preview_intent", JSON.stringify({
        ...resolvedForm,
        previewMode,
        previewId,
        leadId: leadResult.leadId,
        email: effectiveLeadEmail,
        salesMode,
        industryId: resolvedIndustryId,
        industry: resolvedIndustry.label,
        businessTypeId: resolvedBusinessType.id,
        businessType: resolvedBusinessType.label,
        goal: resolvedGoal,
        recommendedProduct: resolvedRecommendation.slug,
        attribution: getTrackingContext(),
        market: "INTL",
        source: initialParams.get("source") || "",
        campaign: initialParams.get("campaign") || initialParams.get("utm_campaign") || "",
        templateId: resolvedTemplateId,
        generationMode: resolvedGenerationMode,
        brandPersonality: resolvedBrandPersonality,
        businessMaturity: resolvedBusinessMaturity,
        designScore: selectedPreview.quality.score,
        designMetrics: selectedPreview.quality.metrics,
        previewProfile: profile,
        generatedWebsite: selectedPreview.website,
        previewGenerationVersion: PREVIEW_GENERATION_VERSION,
        previewGenerationMethod: "deterministic",
        previewAiCostUsd: 0,
        shareablePreviewUrl: persistedPreview.shareUrl || "",
        previewBusinessId: persistedPreview.businessId || "",
        previewWebsiteId: persistedPreview.websiteId || "",
        reviewSuggestions: assessManualReviewInput(form.reviews).suggestions,
        reviewStrategy: {
          heroHeadline: resolvedReviewStrategy.heroHeadline,
          subheadline: resolvedReviewStrategy.subheadline,
          primaryCta: resolvedReviewStrategy.primaryCta,
          secondaryCta: resolvedReviewStrategy.secondaryCta,
          trustSignals: resolvedReviewStrategy.trustSignals,
          intelligence: {
            localKeywords: resolvedReviewStrategy.intelligence.localKeywords,
            faqs: resolvedReviewStrategy.intelligence.faqs,
          },
        },
        createdAt: new Date().toISOString(),
      }));

      trackPublicEvent({
        eventType: "preview_lead_captured",
        label: resolvedBusinessName,
        target: "/generate-preview",
        metadata: { previewId, leadId: leadResult.leadId, previewMode, aiCostUsd: 0 },
      });
      setGeneratedWebsite(selectedPreview.website);
      setPreviewExpanded(false);
      setGenerated(true);
      window.setTimeout(() => {
        document.getElementById("generated-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      trackPublicEvent({
        eventType: "preview_complete",
        label: resolvedBusinessName,
        target: "/generate-preview",
        metadata: {
          industry: resolvedIndustry.label,
          businessType: resolvedBusinessType.label,
          detectedIndustryId,
          recommendedProduct: resolvedRecommendation.slug,
          goal: resolvedGoal,
          previewMode,
          generationMethod: "deterministic",
          aiCostUsd: 0,
        },
      });
    } catch (submissionError: any) {
      setError(submissionError?.message || "The preview could not be prepared. Please retry.");
      trackPublicEvent({ eventType: "preview_failed", label: form.businessName || form.websiteUrl, target: "/generate-preview" });
    } finally {
      setGenerating(false);
    }
  };

  const action = (eventType: string, label: string, target: string) => {
    trackPublicEvent({
      eventType,
      label,
      target,
      metadata: { industry: industry.label, businessType: businessTypeLabel, goal, businessName: form.businessName, generated },
    });
    navigate(target);
  };

  return (
    <>
      <section className="c27-marketing-hero">
        <div className="brand-shell grid gap-12 py-16 lg:grid-cols-12 lg:items-center lg:py-24">
          <div className="lg:col-span-7">
            {salesMode ? <p className="text-xs font-semibold text-[#1741ed]">Internal studio preview</p> : null}
            {salesMode?<p className="mt-3 text-sm text-[#1741ed]">Internal sales mode · prospect email not required</p>:null}
            <h1 className="mt-6 !max-w-[16ch]">{cmsPage?.heroTitle || <>See what your business <em className="font-serif italic font-normal text-[#1741ed]">could look like online.</em></>}</h1>
            <p className="brand-copy mt-6">{cmsPage?.heroDescription || "Already have a website? Paste its URL. Starting from scratch? Tell us a little about your business. Get a preliminary website direction before deciding on any paid plan."}</p>
            {cmsPage?.primaryCtaHref ? <Link to={cmsPage.primaryCtaHref} className="c27-button mt-8">{cmsPage.primaryCtaLabel || "Start my free website preview"} <ArrowRight className="h-4 w-4"/></Link> : <a href="#preview-brief" className="c27-button mt-8">{cmsPage?.primaryCtaLabel || "Start my free website preview"} <ArrowRight className="h-4 w-4"/></a>}
            <p className="mt-4 text-sm text-[#5b6775]">No card required · No obligation · Your email connects the preview to your enquiry</p>
          </div>
          <div className="lg:col-span-5"><div className="bg-[#1741ed] p-8 text-white sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[.16em] !text-white/75">From your details to a direction</p>
            <h2 className="mt-5 !text-[clamp(2.2rem,3.5vw,3.8rem)] !leading-[1.04] !text-white">Your business. <span className="font-serif italic font-normal">Not a generic page.</span></h2>
            <div className="mt-8">{[["01","Your business","Industry, service, location and customer goal"],["02","Your direction","A responsive website layout with an enquiry path"],["03","Your next step","Review scope and pricing only when ready"]].map(([n,t,d])=><div key={n} className="grid grid-cols-[2.25rem_1fr] gap-4 border-t border-white/30 py-5"><span className="font-serif text-2xl italic text-white">{n}</span><div><p className="font-semibold !text-white">{t}</p><p className="mt-1 text-sm !text-white/75">{d}</p></div></div>)}</div>
            <p className="mt-4 text-xs !text-white/65">The preliminary direction is not a completed paid website or guaranteed outcome.</p>
          </div></div>
        </div>
      </section>

      <section className="border-b border-[#dfe2ea] bg-white" aria-label="See a website preview example before sharing details">
        <div className="brand-shell flex flex-col gap-6 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#5746e8]">Preview an example first</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#141821]">See the format before you share your business details.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526071]">Explore an illustrative dental clinic website on desktop or mobile. It is a fictional demonstration, not a commissioned client project. No email is needed to view it.</p>
          </div>
          <Link to="/portfolio/sample/dental" onClick={() => trackPublicEvent({ eventType: "sales_cta_clicked", label: "Preview sample before lead form", target: "/portfolio/sample/dental" })} className="inline-flex min-h-12 shrink-0 items-center justify-center bg-[#141821] px-6 text-sm font-semibold text-white hover:bg-[#5746e8]">View sample website <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </div>
      </section>

      <section id="preview-brief" className="bt-section-soft">
        <div className="brand-shell py-14 sm:py-20">
          <div className="mb-10 max-w-3xl">
            <p className="brand-kicker">Business brief</p>
            <h2 className="mt-4">Just the essentials to get your direction started.</h2>
            <p className="brand-copy mt-4">The brief helps us understand the goal and choose the right structure. If there is already a website, the redesign uses that site as source material instead of replacing the business identity.</p>
          </div>

          <div className="mb-8 flex flex-col gap-3 rounded-xl border border-[#d9e3f6] bg-[#edf4ff] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1946c3]">Start with the essentials</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#2a4569]">Choose your website starting point. For a new business, enter a business name and category to explore an illustrative concept without an email; add scope, style and contact details later for a personalized request.</p>
            </div>
            {previewMode === "business" && !salesMode ? <a href="#instant-concept" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-[#1946c3] bg-white px-4 text-sm font-semibold text-[#1946c3]">Jump to instant concept</a> : null}
          </div>

          <form onSubmit={generatePreview} className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <div className="space-y-6 lg:col-span-8">
              <section className="bt-premium-card p-5 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Start with what you already have</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode("website");
                      setError("");
                      setForm((current) => ({ ...current, websiteStatus: "yes" }));
                      setGenerated(false);
                      setGeneratedWebsite(null);
                    }}
                    className={previewMode === "website"
                      ? "border-2 border-[#5746e8] bg-[#eeebff] p-5 text-left"
                      : "border border-[#dfe2ea] bg-[#f9f8f4] p-5 text-left hover:border-[#aaa4dc]"}
                  >
                    <p className="font-semibold text-[#141821]">I already have a website</p>
                    <p className="mt-2 text-sm leading-5 text-[#5f6673]">Paste one URL. We use the current website as source material and rebuild the presentation around a stronger buyer journey.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode("business");
                      setError("");
                      setForm((current) => ({ ...current, websiteStatus: "no" }));
                      setGenerated(false);
                      setGeneratedWebsite(null);
                    }}
                    className={previewMode === "business"
                      ? "border-2 border-[#5746e8] bg-[#eeebff] p-5 text-left"
                      : "border border-[#dfe2ea] bg-[#f9f8f4] p-5 text-left hover:border-[#aaa4dc]"}
                  >
                    <p className="font-semibold text-[#141821]">I need a website from scratch</p>
                    <p className="mt-2 text-sm leading-5 text-[#5f6673]">Tell us the business, service and location. No existing site required.</p>
                  </button>
                </div>
              </section>

              <section className="bt-premium-card p-5 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Preview scope</p>
                <h3 className="mt-1 text-xl font-semibold text-[#141821]">A focused direction for up to 5 core pages.</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f6673]">The free preview demonstrates structure, messaging and conversion direction. The Managed Website plan includes up to five core pages. Additional service, location or campaign pages belong in a broader growth scope.</p>
              </section>

              {previewMode === "website" ? (
                <section className="bt-premium-card bg-[#fbfbfe] p-5 sm:p-7">
                  <div className="mb-6 flex items-start gap-4 border-b border-[#dfe2ea] pb-5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141821] text-sm font-bold text-white">1</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Existing website</p>
                      <h3 className="mt-1 text-2xl font-semibold text-[#141821]">Paste your website URL.</h3>
                    </div>
                  </div>
                  {salesMode ? (
                    <div className="mb-5">
                      <label htmlFor="preview-sales-business" className="mb-2 block text-sm font-semibold text-[#374151]">Company name</label>
                      <Input id="preview-sales-business" required value={form.businessName} onChange={(e) => setForm({...form, businessName:e.target.value})} placeholder="Prospect company name" className="h-12 rounded-xl border-[#dfe2ea] bg-white" />
                    </div>
                  ) : null}
                  <label htmlFor="preview-url-first" className="mb-2 block text-sm font-semibold text-[#374151]">Website URL</label>
                  <Input id="preview-url-first" required type="url" value={form.websiteUrl} onChange={(e) => setForm({...form, websiteUrl:e.target.value})} placeholder="https://yourbusiness.com" className="h-14 rounded-xl border-[#dfe2ea] bg-white text-base" />
                  <div className="mt-5">
                    <label htmlFor="preview-url-business-type" className="mb-2 block text-sm font-semibold text-[#374151]">Business type</label>
                    <select
                      id="preview-url-business-type"
                      required
                      value={businessTypeId}
                      onChange={(e) => selectBusinessType(e.target.value)}
                      className="h-14 w-full border border-[#dfe2ea] bg-white px-4 text-[#141821] outline-none transition focus:border-[#5746e8] focus:ring-4 focus:ring-[#5746e8]/10"
                    >
                      <option value="" disabled>Select the closest business type</option>
                      {Array.from(new Set(previewBusinessTypes.map((item) => item.group))).map((group) => (
                        <optgroup key={group} label={group}>
                          {previewBusinessTypes.filter((item) => item.group === group).map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-[#5f6673]">Your business type chooses the website structure and template family. The URL supplies the real services, proof and contact details.</p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#5f6673]">We keep useful business facts, brand assets and proof from the current site, then improve the hierarchy, page structure and path to enquiry.</p>
                </section>
              ) : (
              <section className="bt-premium-card bg-[#fbfbfe] p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 border-b border-[#dfe2ea] pb-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141821] text-sm font-bold text-white">1</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Business essentials</p>
                    <h3 className="mt-1 text-2xl font-semibold text-[#141821]">What are we building around?</h3>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preview-business-type" className="mb-2 block text-sm font-semibold text-[#374151]">Business type</label>
                    <select
                      id="preview-business-type"
                      required
                      value={businessTypeId}
                      onChange={(e) => selectBusinessType(e.target.value)}
                      className="h-12 w-full border border-[#dfe2ea] bg-white px-4 text-[#141821] outline-none transition focus:border-[#5746e8] focus:ring-4 focus:ring-[#5746e8]/10"
                    >
                      <option value="" disabled>Select the closest business type</option>
                      {Array.from(new Set(previewBusinessTypes.map((item) => item.group))).map((group) => (
                        <optgroup key={group} label={group}>
                          {previewBusinessTypes.filter((item) => item.group === group).map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="preview-service" className="mb-2 block text-sm font-semibold text-[#374151]">Main service</label>
                    <Input id="preview-service" required value={form.mainService} onChange={(e) => setForm({...form, mainService:e.target.value})} placeholder="e.g. Invisalign, bookkeeping, renovation" className="h-12 rounded-xl border-[#dfe2ea] bg-white" />
                    {inferredIndustryId && selectedBusinessType && inferredIndustryId !== selectedBusinessType.industryId ? <p className="mt-2 text-xs font-semibold text-[#5746e8]">The service wording looks like {previewIndustries.find((item) => item.id === inferredIndustryId)?.label}, but your selected business type stays authoritative.</p> : null}
                  </div>
                  <div>
                    <label htmlFor="preview-business" className="mb-2 block text-sm font-semibold text-[#374151]">Business name</label>
                    <Input id="preview-business" required value={form.businessName} onChange={(e) => setForm({...form, businessName:e.target.value})} placeholder="Business name" className="h-12 rounded-xl border-[#dfe2ea] bg-white" />
                  </div>
                  <div>
                    <label htmlFor="preview-location" className="mb-2 block text-sm font-semibold text-[#374151]">Location / service area</label>
                    <Input id="preview-location" required value={form.location} onChange={(e) => setForm({...form, location:e.target.value})} placeholder="City or area served" className="h-12 rounded-xl border-[#dfe2ea] bg-white" />
                  </div>
                </div>
              </section>
              )}

              {previewMode === "business" && !salesMode ? (
                <section id="instant-concept" className="scroll-mt-24 rounded-xl border border-[#b7c6de] bg-[#edf4ff] p-5 sm:p-6" aria-label="Instant local concept without signup">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#1846a8]">Quick first look · no email needed</p>
                  <h3 className="mt-2 text-xl font-semibold text-[#15263c]">See a preliminary direction now.</h3>
                  <p className="mt-2 text-sm leading-6 text-[#38506c]">Enter a business name and select a business type above. Main service and location can be added later. This illustrative local preview is not saved, sent or based on verified customer data.</p>
                  <button type="button" onClick={createQuickConcept} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1946c3] px-5 py-3 text-sm font-bold text-white hover:bg-[#10338e]">Show instant concept <ArrowRight size={17} aria-hidden="true"/></button>
                </section>
              ) : null}

              <section className="bt-premium-card p-5 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-xl">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Brand colours</p>
                    <h3 className="mt-1 text-xl font-semibold text-[#141821]">Match the customer brand.</h3>
                    <p className="mt-2 text-sm leading-6 text-[#5f6673]">
                      Auto mode uses colours detected from the current website when available. Choose custom to override them for the preview.
                    </p>
                  </div>
                  <select
                    aria-label="Brand colour mode"
                    value={form.brandColorMode}
                    onChange={(event) => setForm({ ...form, brandColorMode: event.target.value })}
                    className="h-11 min-w-44 border border-[#dfe2ea] bg-white px-3 text-sm font-semibold text-[#141821] outline-none focus:border-[#5746e8]"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="custom">Custom colours</option>
                  </select>
                </div>

                {form.brandColorMode === "custom" ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="flex items-center gap-3 border border-[#dfe2ea] bg-[#f9f8f4] p-3">
                      <input
                        type="color"
                        value={form.brandPrimaryColor}
                        onChange={(event) => setForm({ ...form, brandPrimaryColor: event.target.value })}
                        className="h-11 w-14 cursor-pointer border-0 bg-transparent p-0"
                        aria-label="Primary brand colour"
                      />
                      <span>
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#687083]">Primary</span>
                        <span className="mt-1 block font-mono text-sm font-semibold text-[#141821]">{form.brandPrimaryColor.toUpperCase()}</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-3 border border-[#dfe2ea] bg-[#f9f8f4] p-3">
                      <input
                        type="color"
                        value={form.brandAccentColor}
                        onChange={(event) => setForm({ ...form, brandAccentColor: event.target.value })}
                        className="h-11 w-14 cursor-pointer border-0 bg-transparent p-0"
                        aria-label="Accent brand colour"
                      />
                      <span>
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#687083]">Accent</span>
                        <span className="mt-1 block font-mono text-sm font-semibold text-[#141821]">{form.brandAccentColor.toUpperCase()}</span>
                      </span>
                    </label>
                  </div>
                ) : null}
              </section>

              <section className={previewMode === "website" ? "hidden" : "border border-[#dfe2ea] bg-white p-5 sm:p-7"}>
                <div className="mb-6 flex items-start gap-4 border-b border-[#dfe2ea] pb-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141821] text-sm font-bold text-white">2</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Customer action</p>
                    <h3 className="mt-1 text-2xl font-semibold text-[#141821]">Choose the next action.</h3>
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
                      <Input id="preview-url" required type="url" value={form.websiteUrl} onChange={(e) => setForm({...form, websiteUrl:e.target.value})} placeholder="https://..." className="h-12 rounded-xl border-[#dfe2ea]" />
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <div className="w-full border border-[#dfe2ea] bg-[#f9f8f4] px-4 py-3 text-sm font-semibold text-[#5f6673]">We will start from your business brief instead.</div>
                    </div>
                  )}
                </div>
              </section>

              <section className={previewMode === "website" ? "hidden" : "border border-[#dfe2ea] bg-[#f9f8f4] p-5 sm:p-7"}>
                <div className="mb-6 flex items-start gap-4 border-b border-[#dfe2ea] pb-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#141821] text-sm font-bold text-white">3</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5746e8]">Design direction</p>
                    <h3 className="mt-1 text-2xl font-semibold text-[#141821]">Choose the brand personality.</h3>
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
                        <p className="mt-2 text-sm leading-5 text-[#5f6673]">{description}</p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#526071]">{fit}</p>
                      </button>
                    );
                  })}
                </div>

                <details className="mt-5 border-t border-[#dfe2ea] pt-5">
                  <summary className="cursor-pointer text-sm font-semibold text-[#5746e8]">Add proof or extra brand context (optional)</summary>
                  <div className="mt-5 grid gap-4">
                    <Input value={form.socialUrl} onChange={(e)=>setForm({...form,socialUrl:e.target.value})} placeholder="Google Business / social URL" className="h-12 rounded-xl border-[#dfe2ea] bg-white" />
                    <Textarea value={form.reviews} onChange={(e)=>setForm({...form,reviews:e.target.value})} placeholder="Paste real customer reviews, one per line." className="min-h-28 rounded-xl border-[#dfe2ea] bg-white" />
                    <select value={form.biggestProblem} onChange={(e)=>setForm({...form,biggestProblem:e.target.value})} className="h-12 border border-[#dfe2ea] bg-white px-4 text-[#141821]">
                      <option value="">Biggest website problem (optional)</option>
                      {previewProblems.map((problem)=><option key={problem}>{problem}</option>)}
                    </select>
                  </div>
                </details>
              </section>

              <section className="border border-[#dfe2ea] bg-[#141821] p-5 text-white sm:p-7">
                <div className="mb-6 flex items-start gap-4 border-b border-white/15 pb-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-[#141821]">{previewMode === "website" ? "2" : "4"}</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b9b1ff]">{salesMode ? "Build prospect preview" : "Send the preview"}</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">{salesMode ? "Generate a shareable direction." : "Where should we connect your preview?"}</h3>
                  </div>
                </div>

                <div className={salesMode ? "hidden" : "grid gap-5 sm:grid-cols-2"}>
                  <div>
                    <label htmlFor="preview-name" className="mb-2 block text-sm font-semibold text-slate-200">Your name <span className="font-normal text-slate-400">optional</span></label>
                    <Input id="preview-name" autoComplete="name" value={form.contactName} onChange={(e) => setForm({...form, contactName:e.target.value})} placeholder="Your name" className="h-12 rounded-xl border-white/15 bg-white text-[#141821]" />
                  </div>
                  <div>
                    <label htmlFor="preview-email" className="mb-2 block text-sm font-semibold text-slate-200">Email <span className="font-normal text-slate-400">(required to connect this request)</span></label>
                    <Input id="preview-email" required={!salesMode} autoComplete="email" type="email" value={form.email} onChange={(e) => setForm({...form, email:e.target.value})} placeholder="you@business.com" className="h-12 rounded-xl border-white/15 bg-white text-[#141821]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="preview-phone" className="mb-2 block text-sm font-semibold text-slate-200">
                      WhatsApp / phone {goal.toLowerCase().includes("whatsapp") ? null : <span className="font-normal text-slate-400">optional</span>}
                    </label>
                    <Input id="preview-phone" required={!salesMode && goal.toLowerCase().includes("whatsapp")} autoComplete="tel" value={form.phone} onChange={(e) => setForm({...form, phone:e.target.value})} placeholder="Phone or WhatsApp number" className="h-12 rounded-xl border-white/15 bg-white text-[#141821]" />
                  </div>
                </div>

                {!salesMode && <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-200">
                  <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-1.5 h-4 w-4 accent-[#b9b1ff]" />
                  <span>Optional: email me occasional website-improvement tips and relevant Bennie Studio offers. I can unsubscribe at any time. This is not required for my free preview.</span>
                </label>}

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="preview-company-website">Company website</label>
                  <input id="preview-company-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
                </div>

                <div className={salesMode ? "hidden" : "mt-5"}>
                  <TurnstileWidget
                    siteKey={String(import.meta.env.VITE_TURNSTILE_SITE_KEY || "")}
                    onToken={setTurnstileToken}
                    onExpire={() => setTurnstileToken("")}
                  />
                </div>

                {error ? <div role="alert" className="mt-5 border border-rose-300/40 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">{error}</div> : null}

                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Button type="submit" disabled={generating} className="min-h-14 rounded-xl bg-[#6758ff] px-7 text-base font-bold text-white shadow-[0_18px_35px_-22px_rgba(103,88,255,.85)] hover:bg-[#7a6cff]">
                    {generating ? "Building your website preview..." : previewMode === "website" ? "Build preview from my URL" : "Build preview from business details"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="max-w-md text-xs leading-5 text-slate-400">Free to explore—no card required. We use this email to connect your preview request; marketing updates are optional below. See our privacy policy.</p>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:col-span-4">
              <div className="bt-premium-card overflow-hidden bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <LayoutTemplate className="h-5 w-5 text-[#5746e8]" />
                  <div><p className="text-sm font-bold text-[#172033]">Your recommended website direction</p><p className="mt-1 text-xs text-[#657186]">Based on your answers, Bennie Studio prepares a tailored direction.</p></div>
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-[#e5e8ef] bg-[#0b1020] p-2">
                  <img src="/images/studio-insights-v3.jpg" alt="" className="block aspect-[16/10] w-full min-w-0 max-w-full rounded-lg object-cover" style={{ width: "100%", maxWidth: "100%" }} />
                </div>
                <div className="mt-5 space-y-4">
                  {[
                    ["1","Strategy & recommendations","The brief shapes the structure, pages and features."],
                    ["2","Custom design direction","The direction adapts to the business instead of a generic template."],
                    ["3","Live website preview","You get something concrete to review and respond to."],
                    ["4","Human review & next steps","A real person reviews the direction before the next step."],
                  ].map(([number,title,copy])=>(
                    <div key={number} className="grid grid-cols-[30px_1fr] gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#eeebff] text-xs font-bold text-[#6252f4]">{number}</span>
                      <div><p className="text-sm font-semibold text-[#172033]">{title}</p><p className="mt-1 text-xs leading-5 text-[#657186]">{copy}</p></div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border-t border-[#e5e8ef] pt-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-[#6252f4]">Live brief</p>
                  <h3 className="mt-2 text-xl font-semibold text-[#141821]">{businessLabel === "your business" ? "Your preview adapts live." : businessLabel}</h3>
                <div className="mt-6 divide-y divide-[#dfe2ea] border-y border-[#dfe2ea]">
                  {[
                    ["Business", businessTypeLabel],
                    ["Service", serviceLabel],
                    ["Location", locationLabel],
                    ["Scope", "Up to 5 core pages"],
                    ["Goal", goal],
                    ["Style", form.brandStyle],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[82px_1fr] gap-3 py-3 text-sm">
                      <span className="font-semibold text-[#526071]">{label}</span>
                      <span className="font-semibold text-[#141821]">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#526071]">Likely homepage structure</p>
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
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#526071]">Recommended after preview</p>
                  <p className="mt-2 font-semibold text-[#141821]">{commercialRecommendation.label}</p>
                  <p className="mt-1 text-sm leading-5 text-[#5f6673]">The recommendation is based on the website goal and business brief, not a forced upsell.</p>
                </div>
                </div>
              </div>
            </aside>
          </form>
        </div>
      </section>

      <section className="bg-white border-y border-[#e6e8ef]">
        <div className="brand-shell py-14 sm:py-16">
          <div className="grid gap-7 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6"><h2 className="mt-4">From your answers to a practical website direction.</h2></div>
            <p className="brand-copy lg:col-span-6">The brief becomes a practical plan and an interactive website direction, so you can see the decision before committing to a build.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-4">
            {[
              ["1","We analyse your brief","The business, offer and goals determine the right structure."],
              ["2","We design your preview","A tailored visual direction and key page layouts are created."],
              ["3","You review and provide feedback","Tell us what feels right and what you would change."],
              ["4","We share next steps","If the direction fits, the build scope becomes clear."],
            ].map(([n,t,c])=><article key={n} className="bs3-card p-5"><span className="text-xs font-bold text-[#6252f4]">{n}</span><h3 className="mt-4">{t}</h3><p className="mt-3 text-sm leading-6 text-[#657186]">{c}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bs3-dark">
        <div className="brand-shell brand-section grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5"><h2 className="mt-4 !text-white">A human-guided process, from start to finish.</h2><p className="mt-5 text-base leading-8 text-white/62">Modern tools speed up preparation, but Bennie Studio reviews the business context, design quality and next-step logic before launch.</p><Link to="/how-it-works" className={`${primaryCtaClass} mt-7`}>See how it works<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
          <div className="lg:col-span-7"><div className="rounded-[1.2rem] border border-white/12 bg-white/[0.04] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9f93ff]">Studio review before launch</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{["Business context","Message clarity","Responsive design","Forms and primary actions","Customer approval","Launch QA"].map((item)=><div key={item} className="border border-white/10 bg-white/[0.035] p-4 text-sm font-semibold text-white/72"><Check className="mb-3 h-4 w-4 text-[#9f93ff]" />{item}</div>)}</div></div></div>
        </div>
      </section>

      <section className="brand-shell brand-section">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
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
                <div className="mt-6 max-w-3xl"><StudioEmailOptIn sourcePage="/generate-preview" title="Want more ideas for your website?" description="Get the 7-point website conversion checklist and optional follow-up tips. Your unsaved instant design is not emailed or stored by this signup." /></div>
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
      {linkedJobId && <Helmet><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>}
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
      <section className="brand-shell grid min-w-0 gap-8 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="order-2 min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:order-1">
          <h2 className="text-3xl font-bold text-slate-950">What we review</h2>
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
            <h3 className="text-2xl font-bold text-slate-950">Your review includes</h3>
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
        <form id="review-form" onSubmit={submitAudit} className="order-1 min-w-0 scroll-mt-28 rounded-2xl border border-[#E2E8F0] bg-white p-8 text-[#0F172A] shadow-sm sm:p-10 lg:order-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700">Free website review</p>
          <h2 className="mt-4 text-3xl font-bold text-[#0F172A]">Enter your website. See what to improve.</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#475569]">
            Get a free, automated assessment using publicly accessible page evidence. We need your website, business name and email to send your private report.
          </p>
          <Link to="/generate-preview?mode=business" className="mt-4 inline-flex text-sm font-semibold text-blue-700 underline decoration-indigo-300/40 underline-offset-4 hover:text-white">
            No website yet? Start with a business brief instead.
          </Link>
          {loadingSharedReport ? <p role="status" className="mt-8 text-sm font-semibold text-blue-700">Loading your private website review…</p> : submitted ? (
            <div className="mt-8 rounded-3xl bg-emerald-50 p-6 text-emerald-800">
              <Check className="mb-4 h-8 w-8" />
              <p className="text-xl font-bold">{auditReport ? "Website audit complete." : "Audit request saved."}</p>
              <p className="mt-2 text-sm font-semibold leading-6">
                {auditReport
                  ? "Your review is based on observable page evidence and practical recommendations—not a numerical rating."
                  : auditQueued
                    ? "Your audit is processing. We will email the review if transactional email is configured. You can also save the private link below."
                    : "The website could not be analysed automatically. Your request is saved for manual follow-up."}
              </p>
              {!auditReport && error && <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-sm font-bold text-amber-800">{error}</p>}
              {reportLink && <div className="mt-4 rounded-xl border border-emerald-300/20 bg-white p-4">
                <p className="text-xs font-semibold text-emerald-800">Your private report link</p>
                <p className="mt-1 text-xs leading-5 text-emerald-800">Save this link. Anyone with it can view the business website review once processing completes.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a href={reportLink} rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-indigo-50">Open report</a>
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
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#1D4ED8] px-6 py-3 text-base font-bold text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-100 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                >
                  Book a Call
                </Link>
                <Link
                  to="/generate-preview"
                  onClick={() => {
                    trackPublicEvent({ eventType: "click_audit_thank_you_direction", label: "Audit Thank You Website Direction", target: "/generate-preview" });
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white px-6 py-3 text-base font-bold text-blue-700 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
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
      {error && !submitted && linkedJobId && <p role="alert" className="brand-shell text-sm font-semibold text-rose-700">{error}</p>}
      {auditReport ? (
        <section className="brand-shell pb-20">
          <WebsiteAuditResultView report={auditReport} form={form} />
        </section>
      ) : null}
    </>
  );
}

function NicheLandingPage({ page, cmsPage }: { page: (typeof nichePages)[keyof typeof nichePages]; cmsPage?: PlatformCmsPage }) {
  return (
    <>
      <Hero title={cmsPage?.heroTitle || page.title} copy={cmsPage?.heroDescription || page.subtitle} icon={FileSearch} primaryLabel={cmsPage?.primaryCtaLabel || "Get my free website preview"} primaryHref={cmsPage?.primaryCtaHref || "/generate-preview"} />
      <section className="brand-shell brand-section">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            
            <h2 className="mt-4">{page.positioning}</h2>
            <p className="brand-copy mt-6">{page.promise}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/generate-preview" className={primaryCtaClass}>Get a free website preview <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
      {!pageCms?.replacePageContent && (pageKind === "services" || pageKind === "pricing")
        ? pageContent
        : <main id="main-content">{pageContent}</main>}
      {!pageCms?.replacePageContent && <PlatformCmsSections path={cmsPagePath} />}
      {pageKind !== "pricing" && <section className="c27-footer-cta relative overflow-hidden border-t border-white/10 bg-[#1741dd] text-white">
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
