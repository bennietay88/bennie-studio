import React from "react";
import { ArrowRight, Check, Eye, MonitorSmartphone, Sparkles } from "lucide-react";
import { motion } from "motion/react";
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
];

export function FlagshipTemplateGallery() {
  const [activeId, setActiveId] = React.useState(FLAGSHIP_TEMPLATES[0].id);
  const active = FLAGSHIP_TEMPLATES.find((template) => template.id === activeId) || FLAGSHIP_TEMPLATES[0];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-2" aria-label="Template family selector">
        {FLAGSHIP_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => setActiveId(template.id)}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-black transition ${
              active.id === template.id
                ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            {template.family}
          </button>
        ))}
      </div>

      <motion.article
        key={active.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)]"
      >
        <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
          <div className="relative min-h-[320px] overflow-hidden border-b border-slate-200 bg-slate-100 lg:min-h-[560px] lg:border-b-0 lg:border-r">
            <TemplatePreviewThumbnail
              templateId={active.id}
              templateName={active.name}
              className="h-full min-h-[320px] lg:aspect-auto lg:min-h-[560px]"
            />
            <div className="absolute right-4 top-4 flex gap-2">
              <Badge className="border-0 bg-white/90 text-slate-900 shadow-sm backdrop-blur">Live rendered preview</Badge>
              <Badge className="border-0 bg-emerald-500 text-white">Responsive</Badge>
            </div>
          </div>

          <div className="flex flex-col p-6 sm:p-8 lg:p-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600">{active.direction}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{active.name}</h2>
              <p className="mt-4 text-base font-semibold leading-7 text-slate-600">{active.promise}</p>
            </div>

            <div className="mt-7 grid gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Primary action</p>
                <p className="mt-2 font-black text-slate-900">{active.goal}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Recommended pages</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {active.pages.map((page) => <span key={page} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{page}</span>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Proof to prepare</p>
                <div className="mt-3 space-y-2">
                  {active.proof.map((item) => <p key={item} className="flex gap-2 text-sm font-bold text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{item}</p>)}
                </div>
              </div>
            </div>

            <div className="mt-auto grid gap-3 pt-8">
              <a
                href={`/preview/template/${active.id}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackPublicEvent({ eventType: "template_preview_opened", label: active.name, target: `/preview/template/${active.id}` })}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-600"
              >
                <Eye className="mr-2 h-4 w-4" /> Preview full website
              </a>
              <Link
                to={`/generate-preview?template=${encodeURIComponent(active.id)}&industry=${encodeURIComponent(active.previewIndustry)}`}
                onClick={() => trackPublicEvent({ eventType: "template_personalize_clicked", label: active.name, target: "/generate-preview", metadata: { templateId: active.id } })}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100"
              >
                <Sparkles className="mr-2 h-4 w-4" /> Personalise this template <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </motion.article>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          [MonitorSmartphone, "Designed as a system", "Desktop and mobile share one intentional hierarchy instead of shrinking a desktop mockup."],
          [Sparkles, "Motion with restraint", "Entrances and feedback support the enquiry path and respect reduced-motion preferences."],
          [ArrowRight, "Built around the next action", "Each family changes its structure around appointment, quotation, consultation or booking intent."],
        ].map(([Icon, title, copy]: any) => (
          <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6">
            <Icon className="h-5 w-5 text-indigo-600" />
            <p className="mt-5 font-black text-slate-950">{title}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
