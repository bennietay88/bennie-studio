import React from "react";
import { ArrowRight, Check, Eye, MonitorSmartphone, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import { Badge } from "./ui/badge";
import { trackPublicEvent } from "../lib/publicTracking";

export type FlagshipTemplate = {
  id: string;
  name: string;
  family: string;
  promise: string;
  goal: string;
  direction: string;
  pages: string[];
  proof: string[];
  previewIndustry: string;
};

export const FLAGSHIP_TEMPLATES: FlagshipTemplate[] = [
  {
    id: "dental-clinic-v1",
    name: "Calm Patient Journey",
    family: "Clinic & healthcare",
    promise: "A reassuring appointment path built around practitioner trust, treatment clarity and location details.",
    goal: "Book appointments",
    direction: "Clinical calm",
    pages: ["Home", "Treatments", "Practitioners", "Patient FAQ", "Contact"],
    proof: ["Credentials", "Approved patient reviews", "Opening hours"],
    previewIndustry: "clinic",
  },
  {
    id: "renovation-contractor-v1",
    name: "Project-Led Quote Journey",
    family: "Renovation & home services",
    promise: "A confident quotation journey with services, project work, process and service-area proof.",
    goal: "Request quotations",
    direction: "Architectural confidence",
    pages: ["Home", "Services", "Projects", "Areas", "Quote"],
    proof: ["Project images", "Before and after", "Warranty or process"],
    previewIndustry: "contractor",
  },
  {
    id: "law-firm-v1",
    name: "Authority Consultation",
    family: "Professional services",
    promise: "An editorial consultation journey for firms that sell expertise, discretion and considered advice.",
    goal: "Book consultations",
    direction: "Editorial authority",
    pages: ["Home", "Expertise", "People", "Case studies", "Consultation"],
    proof: ["Credentials", "Approved case studies", "Professional memberships"],
    previewIndustry: "consultant",
  },
  {
    id: "tuition-centre-v1",
    name: "Parent-to-Trial Journey",
    family: "Tuition & education",
    promise: "A clear programme and trial-class path designed around parent questions and teacher credibility.",
    goal: "Book trial classes",
    direction: "Optimistic clarity",
    pages: ["Home", "Programmes", "Levels", "Results", "Trial class"],
    proof: ["Teacher profiles", "Approved parent reviews", "Programme information"],
    previewIndustry: "education",
  },
  {
    id: "salon-spa-v1",
    name: "Immersive Booking Journey",
    family: "Beauty & hospitality",
    promise: "A sensory, treatment-led experience with visual proof and a direct booking or WhatsApp path.",
    goal: "Book treatments",
    direction: "Tactile immersion",
    pages: ["Home", "Treatments", "Gallery", "About", "Booking"],
    proof: ["Original treatment images", "Approved reviews", "Practitioner details"],
    previewIndustry: "beauty",
  },
  {
    id: "electrician-v1",
    name: "Urgent Service Quote",
    family: "Trades & emergency services",
    promise: "A fast mobile-first route from urgent problem to call, WhatsApp message or quote request.",
    goal: "Get qualified calls",
    direction: "Clear and dependable",
    pages: ["Home", "Services", "Emergency", "Areas", "Quote"],
    proof: ["Licences", "Response promise", "Local reviews"],
    previewIndustry: "electrician",
  },
  {
    id: "mortgage-advisor-v1",
    name: "Trust-Led Advice",
    family: "Finance & professional services",
    promise: "A calm consultation journey that answers buyer questions and makes the next step obvious.",
    goal: "Book consultations",
    direction: "Confident and reassuring",
    pages: ["Home", "Services", "Guides", "FAQs", "Book a call"],
    proof: ["Qualifications", "Client outcomes", "Compliance notes"],
    previewIndustry: "mortgage advisor",
  },
  {
    id: "catering-v1",
    name: "Event Enquiry Menu",
    family: "Hospitality & events",
    promise: "A visual menu and event enquiry flow that helps prospects choose a package and request a quote.",
    goal: "Generate event enquiries",
    direction: "Warm and visual",
    pages: ["Home", "Menus", "Events", "Gallery", "Enquire"],
    proof: ["Event galleries", "Menus", "Client reviews"],
    previewIndustry: "catering",
  },
  {
    id: "photographer-v1",
    name: "Portfolio to Enquiry",
    family: "Creative services",
    promise: "A portfolio-led site that turns visual proof into clear package and session enquiries.",
    goal: "Generate session enquiries",
    direction: "Editorial and personal",
    pages: ["Home", "Portfolio", "Packages", "About", "Enquire"],
    proof: ["Selected work", "Testimonials", "Package details"],
    previewIndustry: "photographer",
  },
];

export function FlagshipTemplateGallery() {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = React.useState(FLAGSHIP_TEMPLATES[0].id);
  const active = FLAGSHIP_TEMPLATES.find((template) => template.id === activeId) || FLAGSHIP_TEMPLATES[0];

  return (
    <div className="space-y-10">
      <div data-testid="template-family-scroller" role="group" aria-label="Choose an industry website concept" className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
        {FLAGSHIP_TEMPLATES.map((template, index) => (
          <button
            key={template.id}
            type="button"
            aria-pressed={active.id === template.id}
            aria-controls="template-detail"
            onClick={() => setActiveId(template.id)}
            className={`group min-w-0 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] focus-visible:ring-offset-2 sm:p-4 ${
              active.id === template.id
                ? "border-[#1741ed] bg-[#eff4ff] text-slate-950 shadow-[inset_0_0_0_1px_#1741ed]"
                : "border-[#dbe1ea] bg-white text-slate-800 hover:border-[#1741ed] hover:bg-[#f8faff]"
            }`}
          >
            <span className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#52617a]">
              <span>0{index + 1}</span><span aria-hidden="true" className={active.id === template.id ? "h-2 w-2 rounded-full bg-[#1741ed]" : "h-2 w-2 rounded-full bg-[#d4dbe6]"} />
            </span>
            <span className="mt-2 block break-words text-sm font-bold leading-5 sm:text-base">{template.family}</span>
            <span className="mt-1 block break-words text-xs leading-5 text-[#52617a]">{template.goal}</span>
          </button>
        ))}
      </div>

      <motion.article
        key={active.id}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        id="template-detail"
        aria-label={`Selected concept: ${active.name}`}
        className="overflow-hidden rounded-2xl border border-[#dbe1ea] bg-white shadow-[0_24px_65px_-45px_rgba(15,23,42,0.35)]"
      >
        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="relative min-h-[280px] overflow-hidden border-b border-[#dbe1ea] bg-[#edf1f7] sm:min-h-[360px] lg:min-h-[530px] lg:border-b-0 lg:border-r">
            <TemplatePreviewThumbnail
              templateId={active.id}
              templateName={active.name}
              className="h-full min-h-[280px] sm:min-h-[360px] lg:aspect-auto lg:min-h-[530px]"
            />
            <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
              <Badge className="border-0 bg-white/95 text-slate-900 shadow-sm backdrop-blur">Illustrative concept</Badge>
              <Badge className="border-0 bg-slate-950/90 text-white">Responsive design</Badge>
            </div>
          </div>

          <div className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-9">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">{active.direction}</p>
              <h2 className="mt-3 break-words text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">{active.name}</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{active.promise}</p>
            </div>

            <div className="mt-7 grid gap-5 border-t border-slate-200 pt-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Primary enquiry goal</p>
                <p className="mt-2 font-black text-slate-900">{active.goal}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Suggested page structure</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {active.pages.map((page) => <span key={page} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{page}</span>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Real evidence to provide</p>
                <div className="mt-3 space-y-2">
                  {active.proof.map((item) => <p key={item} className="flex gap-2 text-sm font-medium leading-6 text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{item}</p>)}
                </div>
              </div>
            </div>

            <div className="mt-auto grid gap-3 pt-7">
              <a
                href={`/preview/template/${active.id}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackPublicEvent({ eventType: "template_preview_opened", label: active.name, target: `/preview/template/${active.id}` })}
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1741ed] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#1035c2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] focus-visible:ring-offset-2"
              >
                <Eye className="mr-2 h-4 w-4" /> Preview full website
              </a>
              <Link
                to={`/generate-preview?template=${encodeURIComponent(active.id)}&industry=${encodeURIComponent(active.previewIndustry)}`}
                onClick={() => trackPublicEvent({ eventType: "template_personalize_clicked", label: active.name, target: "/generate-preview", metadata: { templateId: active.id } })}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#c4d2ef] bg-[#eff4ff] px-5 py-3 text-center text-sm font-bold text-[#1741c9] transition hover:border-[#1741ed] hover:bg-[#e4edff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] focus-visible:ring-offset-2"
              >
                <Sparkles className="mr-2 h-4 w-4" /> Personalise this template <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </motion.article>

      <p className="text-sm leading-6 text-[#52617a]">These are illustrative website directions, not commissioned customer projects. Content, reviews, certifications and results must be supplied and approved for each real business.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          [MonitorSmartphone, "Designed as a system", "Desktop and mobile share one intentional hierarchy instead of shrinking a desktop mockup."],
          [Sparkles, "Motion with restraint", "Entrances and feedback support the enquiry path and respect reduced-motion preferences."],
          [ArrowRight, "Built around the next action", "Each family changes its structure around appointment, quotation, consultation or booking intent."],
        ].map(([Icon, title, copy]: any) => (
          <div key={title} className="rounded-xl border border-[#dbe1ea] bg-white p-5 sm:p-6">
            <Icon className="h-5 w-5 text-indigo-600" />
            <p className="mt-4 font-bold text-slate-950">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
