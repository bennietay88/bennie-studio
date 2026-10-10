import React from "react";
import { ArrowUpRight, CalendarDays, Check, Menu, Phone, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Editorial-quality, responsive *concept* website previews.
 * These are design demonstrations, not client projects or fabricated results.
 * Prefer real finished customer work when approval is available.
 *
 * Photography: third-party Unsplash images; not photographs of actual clients.
 */
type Concept = {
  brand: string;
  eyebrow: string;
  headline: string;
  emphasis: string;
  description: string;
  primary: string;
  secondary: string;
  categories: [string, string, string];
  image: string;
  alt: string;
  ink: string;
  soft: string;
  accent: string;
  accentText: string;
  label: string;
};

const concepts: Concept[] = [
  {
    brand: "Alder & Co.",
    eyebrow: "Independent business advisory",
    headline: "Clarity for the decisions",
    emphasis: "that matter.",
    description: "Practical financial and business guidance for leaders building what comes next.",
    primary: "Arrange a consultation",
    secondary: "Explore expertise",
    categories: ["Strategic planning", "Business advisory", "Financial clarity"],
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1100&q=82",
    alt: "Sunlit contemporary professional office used as illustrative concept photography",
    ink: "#19312c", soft: "#f2f0e9", accent: "#315e4c", accentText: "#ffffff",
    label: "Professional services"
  },
  {
    brand: "Atelier Dental",
    eyebrow: "Calm, considered dental care",
    headline: "A healthier smile",
    emphasis: "starts here.",
    description: "Thoughtful modern dentistry, explained clearly and delivered with care.",
    primary: "Book an appointment",
    secondary: "Our treatments",
    categories: ["General dentistry", "Smile consultations", "Patient care"],
    image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1100&q=82",
    alt: "Dental practice photography illustrating a fictional clinic website",
    ink: "#163e3c", soft: "#eaf3f0", accent: "#1e6c63", accentText: "#ffffff",
    label: "Clinic and healthcare"
  },
  {
    brand: "Luma Wellness",
    eyebrow: "Your space to feel restored",
    headline: "Make space",
    emphasis: "for yourself.",
    description: "Skin, body and wellbeing treatments built around genuine care.",
    primary: "View treatments",
    secondary: "Book your visit",
    categories: ["Skin treatments", "Body therapy", "Wellness rituals"],
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1100&q=82",
    alt: "Wellness spa treatment space used as illustrative concept photography",
    ink: "#3d323a", soft: "#f6eee9", accent: "#8d686f", accentText: "#ffffff",
    label: "Beauty and wellness"
  },
  {
    brand: "Form & Field",
    eyebrow: "Renovation and considered living",
    headline: "Make room for",
    emphasis: "better living.",
    description: "Residential renovations guided by clear communication and care for every detail.",
    primary: "Discuss your project",
    secondary: "View our services",
    categories: ["Home renovations", "Interior fit-outs", "Project planning"],
    image: "https://images.unsplash.com/photo-1721134111286-b3c4a5772ea9?auto=format&fit=crop&w=1100&q=82",
    alt: "Modern residential interior used as illustrative renovation website imagery",
    ink: "#342d27", soft: "#f4f0e9", accent: "#725e48", accentText: "#ffffff",
    label: "Home services"
  },
  {
    brand: "Brightpath",
    eyebrow: "Learning with confidence",
    headline: "A brighter future",
    emphasis: "begins today.",
    description: "Supportive tuition and enrichment programmes for curious young minds.",
    primary: "Explore programmes",
    secondary: "Book a visit",
    categories: ["Small classes", "Patient teachers", "Confident learners"],
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1100&q=82",
    alt: "Learning environment image used for a fictional education website concept",
    ink: "#293953", soft: "#eef2fa", accent: "#3866a0", accentText: "#ffffff",
    label: "Education"
  },
];

export function WebsiteConceptVisual({
  title,
  eyebrow = "Website design concept",
  index = 0,
  className,
  hero = false,
}: {
  title: string;
  eyebrow?: string;
  index?: number;
  className?: string;
  hero?: boolean;
}) {
  const concept = concepts[((index % concepts.length) + concepts.length) % concepts.length];
  return (
    <div className={cn("relative overflow-hidden rounded-[1.15rem] bg-[#e6e8ed] p-2 text-[#18202d] shadow-[0_30px_90px_-50px_rgba(11,17,34,.72)] sm:p-3", className)}>
      <div className="overflow-hidden rounded-[.8rem] border border-black/10 bg-white">
        <div className="flex h-8 items-center justify-between border-b border-slate-200 bg-[#f7f8fa] px-3 sm:h-9 sm:px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#e7a3a0]" />
            <span className="h-2 w-2 rounded-full bg-[#e2c68e]" />
            <span className="h-2 w-2 rounded-full bg-[#9dc4aa]" />
          </div>
          <span className="truncate rounded bg-white px-3 py-1 text-[9px] font-medium text-slate-500">
            Bennie Studio / {concept.label} concept
          </span>
          <span className="w-7" />
        </div>
        <div style={{backgroundColor:concept.soft, color:concept.ink}}>
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-black/[.08] px-5 py-3 sm:px-7">
            <span className="whitespace-nowrap font-serif text-base font-bold tracking-[-.035em] sm:text-lg">{concept.brand}</span>
            <div className="hidden items-center gap-4 text-[10px] font-semibold md:flex"><span>About</span><span>Services</span><span>Our approach</span></div>
            <span style={{backgroundColor:concept.accent,color:concept.accentText}} className="hidden items-center gap-2 rounded-sm px-3 py-2 text-[10px] font-semibold sm:inline-flex">{concept.primary}<ArrowUpRight className="h-3 w-3" /></span>
            <Menu className="h-4 w-4 md:hidden" aria-hidden="true" />
          </div>
          <div className={cn("grid grid-cols-[1.06fr_.94fr] gap-0",hero?"min-h-[20rem] sm:min-h-[23rem]":"min-h-[13rem] sm:min-h-[17rem]")}>
            <div className="flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-10 lg:px-10">
              <p className="text-[8px] font-semibold uppercase tracking-[.16em] opacity-65 sm:text-[10px]">{concept.eyebrow}</p>
              <p className={cn("mt-3 font-serif font-medium leading-[1.06] tracking-[-.045em]",hero?"text-[clamp(1.35rem,2.4vw,2.9rem)]":"text-[clamp(1rem,2vw,2.1rem)]")}>
                {concept.headline}<br /><span className="italic">{concept.emphasis}</span>
              </p>
              <p className={cn("mt-3 max-w-[18rem] leading-[1.5] opacity-75",hero?"text-[10px] sm:text-xs":"text-[9px] sm:text-[11px]")}>{concept.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span style={{backgroundColor:concept.accent,color:concept.accentText}} className="inline-flex items-center gap-1 px-3 py-2 text-[9px] font-semibold">{concept.primary}<ArrowUpRight className="h-3 w-3" /></span>
                <span className="hidden items-center gap-1 border border-current/20 px-3 py-2 text-[9px] font-semibold sm:inline-flex">{concept.secondary}</span>
              </div>
            </div>
            <div className="relative min-h-full overflow-hidden" style={{backgroundColor:concept.accent}}>
              <img src={concept.image} alt={concept.alt} className="absolute inset-0 h-full w-full object-cover" loading={hero?"eager":"lazy"} decoding="async" referrerPolicy="no-referrer" />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px border-t border-black/[.07] bg-black/[.08]">
            {concept.categories.map((item,i) => (
              <div key={item} style={{backgroundColor:concept.soft}} className="flex min-h-12 items-center gap-2 px-2 py-3 text-[9px] font-semibold sm:min-h-14 sm:px-5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current/15 text-[9px]">{i+1}</span><span className="leading-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-1 pt-2 text-[9px] font-semibold text-slate-600 sm:px-2">
        <span>{eyebrow} · {title}</span>
        <span className="shrink-0 rounded bg-white px-2 py-1 text-[9px] text-slate-600">Illustrative concept</span>
      </div>
    </div>
  );
}

export default WebsiteConceptVisual;
