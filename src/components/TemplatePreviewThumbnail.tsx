import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  FileText,
  LayoutTemplate,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { NICHE_TEMPLATES } from "../constants/nicheTemplates";

interface TemplatePreviewThumbnailProps {
  templateId: string;
  templateName: string;
  className?: string;
}

type TemplateConfig = {
  theme?: Record<string, any>;
  thumbnail?: string;
  name?: string;
  category?: string;
  ctaType?: string;
  pages?: Array<{
    title?: string;
    slug?: string;
    sections?: Array<Record<string, any>>;
  }>;
};

export type PreviewLayoutFamily =
  | "clinic_trust"
  | "local_quote"
  | "education_program"
  | "editorial_b2b";

type PreviewModel = {
  family: PreviewLayoutFamily;
  primary: string;
  secondary: string;
  displayFont: string;
  bodyFont: string;
  headline: string;
  subheadline: string;
  cta: string;
  heroImage: string;
  sectionTitles: string[];
  serviceItems: string[];
  proofStats: Array<{ label: string; value: string }>;
};

const configCache = new Map<string, TemplateConfig>();
const PREVIEW_FONT_STYLESHEET_ID = "bt-template-preview-fonts";

const FAMILY_LABELS: Record<PreviewLayoutFamily, string> = {
  clinic_trust: "Trust-led clinic",
  local_quote: "Quote-led local service",
  education_program: "Program-led education",
  editorial_b2b: "Editorial B2B",
};

function ensurePreviewFonts() {
  if (typeof document === "undefined" || document.getElementById(PREVIEW_FONT_STYLESHEET_ID)) return;
  const link = document.createElement("link");
  link.id = PREVIEW_FONT_STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..700&family=Plus+Jakarta+Sans:wght@400..700&family=Space+Grotesk:wght@500..700&display=swap";
  document.head.appendChild(link);
}

function isSerifFamily(fontFamily = "") {
  return /serif|playfair|lora|fraunces|merriweather/i.test(fontFamily);
}

function getPreviewFonts(theme: Record<string, any>, family: PreviewLayoutFamily) {
  const configured = String(theme?.fontFamily || "").trim();
  if (family === "editorial_b2b" && isSerifFamily(configured)) {
    return { display: configured, body: "'Plus Jakarta Sans', sans-serif" };
  }
  if (family === "education_program") {
    return { display: "'Plus Jakarta Sans', sans-serif", body: "'Plus Jakarta Sans', sans-serif" };
  }
  if (family === "local_quote") {
    return { display: "'Space Grotesk', sans-serif", body: "'Plus Jakarta Sans', sans-serif" };
  }
  return {
    display: configured && !/inter|arial|system-ui/i.test(configured)
      ? configured
      : "'Plus Jakarta Sans', sans-serif",
    body: "'Plus Jakarta Sans', sans-serif",
  };
}

function textFrom(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function sectionTitle(section: Record<string, any>) {
  const content = section?.content || {};
  return (
    textFrom(content.title) ||
    textFrom(content.headline) ||
    textFrom(content.heading) ||
    textFrom(section?.type, "Section").replace(/_/g, " ")
  );
}

function itemTitles(section: Record<string, any> | undefined) {
  const items = Array.isArray(section?.content?.items) ? section?.content?.items : [];
  return items
    .map((item: any) => (typeof item === "string" ? item : textFrom(item?.title)))
    .filter(Boolean)
    .slice(0, 4);
}

export function resolveTemplatePreviewFamily(templateId: string, templateName = ""): PreviewLayoutFamily {
  const value = `${templateId} ${templateName}`.toLowerCase();

  if (/dental|clinic|medical|physio|wellness|salon|spa|aesthetic/.test(value)) {
    return "clinic_trust";
  }
  if (/tuition|education|school|academy|learning|training|class/.test(value)) {
    return "education_program";
  }
  if (/cleaning|renovation|contractor|pest|plumb|hvac|locksmith|repair|service-pro|home-service/.test(value)) {
    return "local_quote";
  }
  return "editorial_b2b";
}

async function resolveTemplateConfig(templateId: string) {
  const cached = configCache.get(templateId);
  if (cached) return cached;

  const builtIn = Object.values(NICHE_TEMPLATES).find((template: any) => template?.id === templateId) as any;
  if (builtIn) {
    const localConfig: TemplateConfig = {
      theme: builtIn.theme || {},
      thumbnail: builtIn.thumbnail,
      name: builtIn.name,
      category: builtIn.category,
      ctaType: builtIn.ctaType,
      pages: Array.isArray(builtIn.pages) ? builtIn.pages : [],
    };
    configCache.set(templateId, localConfig);
    return localConfig;
  }

  const { data, error } = await supabase
    .from("templates")
    .select("config")
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw error;

  const config = ((data as any)?.config || {}) as TemplateConfig;
  if (!config.pages?.length) throw new Error("Template configuration unavailable");
  configCache.set(templateId, config);
  return config;
}

function createPreviewModel(
  config: TemplateConfig | null,
  templateId: string,
  templateName: string,
): PreviewModel {
  const family = resolveTemplatePreviewFamily(templateId, templateName);
  const theme = config?.theme || {};
  const pages = Array.isArray(config?.pages) ? config?.pages || [] : [];
  const firstPage = pages.find((page) => page.slug === "" || page.slug === "home") || pages[0];
  const sections = (firstPage?.sections || []).filter((section: any) => section?.isVisible !== false);
  const hero = sections.find((section: any) => section?.type === "hero") || sections[0] || {};
  const heroContent = hero?.content || {};
  const serviceSection = sections.find((section: any) =>
    ["services", "features", "benefits"].includes(String(section?.type || "").toLowerCase()),
  );
  const proofSection = sections.find((section: any) => String(section?.type || "").toLowerCase() === "proof");
  const rawStats = Array.isArray(proofSection?.content?.stats) ? proofSection?.content?.stats : [];

  const primary = textFrom(
    theme.primaryColor,
    family === "clinic_trust"
      ? "#0f766e"
      : family === "local_quote"
        ? "#0f172a"
        : family === "education_program"
          ? "#4f46e5"
          : "#1e3a8a",
  );
  const secondary = textFrom(theme.secondaryColor, "#f8fafc");
  const fonts = getPreviewFonts(theme, family);
  const configuredThumbnail = textFrom(config?.thumbnail);
  const heroImage = textFrom(
    heroContent.imageUrl ||
      heroContent.image ||
      heroContent.backgroundImage ||
      (/brand-template-preview\.svg/i.test(configuredThumbnail) ? "" : configuredThumbnail),
  );

  return {
    family,
    primary,
    secondary,
    displayFont: fonts.display,
    bodyFont: fonts.body,
    headline: textFrom(heroContent.headline || heroContent.title || heroContent.heading, templateName),
    subheadline: textFrom(heroContent.subheadline || heroContent.description, ""),
    cta: textFrom(heroContent.ctaText || heroContent.buttonText || heroContent.primaryCta || config?.ctaType, "Contact us"),
    heroImage,
    sectionTitles: sections.filter((section: any) => section !== hero).map(sectionTitle).filter(Boolean).slice(0, 4),
    serviceItems: itemTitles(serviceSection),
    proofStats: rawStats
      .map((stat: any) => ({ label: textFrom(stat?.label), value: textFrom(stat?.value) }))
      .filter((stat: any) => stat.label || stat.value)
      .slice(0, 3),
  };
}

function MiniBrand({ model, label }: { model: PreviewModel; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: model.primary }} />
      <span className="max-w-28 truncate text-[7px] font-bold text-slate-800">{label}</span>
    </div>
  );
}

function ClinicTrustPreview({ model, name }: { model: PreviewModel; name: string }) {
  const trustItems = model.proofStats.length
    ? model.proofStats
    : [
        { value: "Care", label: "Patient-first" },
        { value: "Clear", label: "Treatment info" },
        { value: "Easy", label: "Booking path" },
      ];

  return (
    <div className="absolute inset-0 flex flex-col bg-[#f8fbfa]" style={{ fontFamily: model.bodyFont }}>
      <div className="flex h-8 items-center justify-between border-b border-emerald-900/10 bg-white px-4">
        <MiniBrand model={model} label={name} />
        <div className="flex items-center gap-3 text-[5px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Treatments</span><span>Team</span><span>Contact</span>
        </div>
      </div>

      <div className="grid min-h-[48%] grid-cols-[1.12fr_0.88fr] overflow-hidden">
        <div className="flex flex-col justify-center px-5 py-4">
          <p className="text-[5px] font-bold uppercase tracking-[0.18em]" style={{ color: model.primary }}>Care you can trust</p>
          <h4 className="mt-2 line-clamp-2 text-[16px] font-semibold leading-[1.02] tracking-[-0.035em] text-slate-950" style={{ fontFamily: model.displayFont }}>
            {model.headline}
          </h4>
          {model.subheadline ? <p className="mt-2 line-clamp-2 text-[6px] leading-relaxed text-slate-500">{model.subheadline}</p> : null}
          <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-1.5 text-[6px] font-bold text-white" style={{ backgroundColor: model.primary }}>
            <CalendarDays className="h-2.5 w-2.5" /> {model.cta}
          </div>
        </div>

        <div className="relative overflow-hidden bg-emerald-50">
          {model.heroImage ? (
            <img src={model.heroImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <CalendarDays className="h-6 w-6" style={{ color: model.primary }} />
                <div className="mt-3 h-1.5 w-16 rounded-full bg-slate-200" />
                <div className="mt-1.5 h-1.5 w-11 rounded-full bg-slate-100" />
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/94 p-2 shadow-sm backdrop-blur">
            <p className="text-[5px] font-bold uppercase tracking-wide text-slate-400">Quick appointment</p>
            <p className="mt-1 text-[7px] font-semibold text-slate-800">Location · hours · contact</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-emerald-900/10 bg-white">
        {trustItems.slice(0, 3).map((item, index) => (
          <div key={index} className="border-r border-emerald-900/10 px-3 py-2.5 last:border-r-0">
            <p className="text-[8px] font-bold" style={{ color: model.primary }}>{item.value || "✓"}</p>
            <p className="mt-0.5 truncate text-[5px] font-semibold text-slate-400">{item.label || "Trust"}</p>
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 px-4 py-3">
        {(model.serviceItems.length ? model.serviceItems : ["Treatment clarity", "Patient reassurance"]).slice(0, 2).map((item, index) => (
          <div key={index} className="rounded-lg border border-emerald-900/10 bg-white p-2.5">
            <ShieldCheck className="h-3 w-3" style={{ color: model.primary }} />
            <p className="mt-1.5 truncate text-[6px] font-bold text-slate-700">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocalQuotePreview({ model, name }: { model: PreviewModel; name: string }) {
  const services = model.serviceItems.length
    ? model.serviceItems
    : ["Core service", "Service area", "Fast quote"];

  return (
    <div className="absolute inset-0 flex flex-col bg-white" style={{ fontFamily: model.bodyFont }}>
      <div className="flex h-8 items-center justify-between bg-slate-950 px-4 text-white">
        <MiniBrand model={{ ...model, primary: "#ffffff" }} label={name} />
        <span className="rounded-md px-2 py-1 text-[5px] font-bold text-white" style={{ backgroundColor: model.primary }}>
          Get quote
        </span>
      </div>

      <div className="grid min-h-[55%] grid-cols-[1.05fr_0.95fr] bg-slate-950 text-white">
        <div className="flex flex-col justify-center px-5 py-4">
          <p className="text-[5px] font-bold uppercase tracking-[0.18em] text-white/45">Local service · fast response</p>
          <h4 className="mt-2 line-clamp-3 text-[17px] font-semibold leading-[1.02] tracking-[-0.035em]" style={{ fontFamily: model.displayFont }}>
            {model.headline}
          </h4>
          <div className="mt-3 flex items-center gap-2 text-[6px] text-white/60">
            <MapPin className="h-2.5 w-2.5" /> Service areas clearly shown
          </div>
        </div>

        <div className="m-3 rounded-xl bg-white p-3 text-slate-900 shadow-lg">
          <p className="text-[6px] font-bold uppercase tracking-wide" style={{ color: model.primary }}>Request a quote</p>
          <div className="mt-2 space-y-1.5">
            {["Service needed", "Postcode / area", "Preferred date"].map((field) => (
              <div key={field} className="flex h-5 items-center rounded-md border border-slate-200 px-2 text-[5px] text-slate-400">{field}</div>
            ))}
          </div>
          <div className="mt-2 rounded-md py-1.5 text-center text-[5px] font-bold text-white" style={{ backgroundColor: model.primary }}>
            {model.cta}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {services.slice(0, 3).map((service, index) => (
          <div key={index} className="flex items-center gap-1.5 border-r border-slate-200 px-2 last:border-r-0">
            <Check className="h-2.5 w-2.5" style={{ color: model.primary }} />
            <span className="truncate text-[5.5px] font-semibold text-slate-600">{service}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 items-center justify-between px-5 py-3">
        <div>
          <p className="text-[5px] font-bold uppercase tracking-wide text-slate-400">Coverage</p>
          <p className="mt-1 text-[7px] font-bold text-slate-800">Service area + proof + clear next step</p>
        </div>
        <Search className="h-5 w-5 text-slate-300" />
      </div>
    </div>
  );
}

function EducationProgramPreview({ model, name }: { model: PreviewModel; name: string }) {
  const programs = model.serviceItems.length
    ? model.serviceItems
    : ["Primary", "Secondary", "Exam preparation"];

  return (
    <div className="absolute inset-0 flex flex-col bg-[#fffdf7]" style={{ fontFamily: model.bodyFont }}>
      <div className="flex h-8 items-center justify-between border-b border-indigo-100 bg-white px-4">
        <MiniBrand model={model} label={name} />
        <div className="flex gap-3 text-[5px] font-semibold text-slate-400"><span>Programs</span><span>Teachers</span><span>Trial class</span></div>
      </div>

      <div className="relative grid min-h-[46%] grid-cols-[1.08fr_0.92fr] overflow-hidden bg-indigo-50">
        <div className="flex flex-col justify-center px-5 py-4">
          <p className="text-[5px] font-bold uppercase tracking-[0.18em]" style={{ color: model.primary }}>Learning path</p>
          <h4 className="mt-2 line-clamp-3 text-[16px] font-semibold leading-[1.04] tracking-[-0.03em] text-slate-950" style={{ fontFamily: model.displayFont }}>
            {model.headline}
          </h4>
          <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-1.5 text-[6px] font-bold text-white" style={{ backgroundColor: model.primary }}>
            <BookOpen className="h-2.5 w-2.5" /> {model.cta}
          </div>
        </div>

        {model.heroImage ? (
          <img src={model.heroImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="m-4 flex items-center justify-center rounded-2xl bg-white shadow-sm">
            <BookOpen className="h-10 w-10" style={{ color: model.primary }} />
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[6px] font-bold text-slate-800">Choose a program</p>
          <span className="text-[5px] font-semibold" style={{ color: model.primary }}>Age · level · goal</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {programs.slice(0, 3).map((program, index) => (
            <div key={index} className="rounded-lg border border-indigo-100 bg-white p-2.5">
              <div className="grid h-5 w-5 place-items-center rounded-md bg-indigo-50 text-[6px] font-bold" style={{ color: model.primary }}>
                {index + 1}
              </div>
              <p className="mt-2 line-clamp-2 text-[6px] font-bold text-slate-700">{program}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mb-3 flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2 text-white">
        <div>
          <p className="text-[5px] text-white/50">Parent next step</p>
          <p className="mt-0.5 text-[6px] font-bold">Trial class enquiry</p>
        </div>
        <MessageCircle className="h-4 w-4" />
      </div>
    </div>
  );
}

function EditorialB2BPreview({ model, name }: { model: PreviewModel; name: string }) {
  const services = model.serviceItems.length
    ? model.serviceItems
    : ["Advisory", "Core services", "Consultation"];

  return (
    <div className="absolute inset-0 flex flex-col bg-[#f8f7f3]" style={{ fontFamily: model.bodyFont }}>
      <div className="grid h-9 grid-cols-[1fr_auto] items-center border-b border-slate-300 px-4">
        <MiniBrand model={model} label={name} />
        <div className="flex items-center gap-3 text-[5px] font-semibold text-slate-400">
          <span>Services</span><span>Insights</span><span>Contact</span>
        </div>
      </div>

      <div className="grid min-h-[53%] grid-cols-[1.28fr_0.72fr]">
        <div className="flex flex-col justify-center border-r border-slate-300 px-5 py-4">
          <p className="text-[5px] font-bold uppercase tracking-[0.18em]" style={{ color: model.primary }}>Professional services</p>
          <h4 className="mt-3 line-clamp-3 text-[18px] font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950" style={{ fontFamily: model.displayFont }}>
            {model.headline}
          </h4>
          {model.subheadline ? <p className="mt-2 line-clamp-2 text-[6px] leading-relaxed text-slate-500">{model.subheadline}</p> : null}
          <p className="mt-4 inline-flex w-fit border-b border-slate-900 pb-1 text-[6px] font-bold text-slate-900">{model.cta}</p>
        </div>

        <div className="flex flex-col justify-between bg-slate-950 p-4 text-white">
          <FileText className="h-5 w-5 text-white/40" />
          <div>
            <p className="text-[5px] font-semibold uppercase tracking-wide text-white/40">Capability</p>
            <div className="mt-2 space-y-2">
              {services.slice(0, 3).map((service, index) => (
                <div key={index} className="border-t border-white/15 pt-1.5 text-[6px] font-semibold text-white/85">{service}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-[0.8fr_1.2fr] border-t border-slate-300">
        <div className="border-r border-slate-300 px-4 py-3">
          <p className="text-[5px] font-bold uppercase tracking-wide text-slate-400">Who we help</p>
          <p className="mt-1.5 text-[7px] font-semibold text-slate-800">Businesses that value clarity and expertise.</p>
        </div>
        <div className="grid grid-cols-2">
          {(model.sectionTitles.length ? model.sectionTitles : ["Services", "Process"]).slice(0, 2).map((title, index) => (
            <div key={index} className="border-r border-slate-300 px-3 py-3 last:border-r-0">
              <p className="text-[5px] font-bold" style={{ color: model.primary }}>0{index + 1}</p>
              <p className="mt-1.5 truncate text-[6px] font-semibold text-slate-700">{title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FamilyPreview({ model, name }: { model: PreviewModel; name: string }) {
  switch (model.family) {
    case "clinic_trust":
      return <ClinicTrustPreview model={model} name={name} />;
    case "local_quote":
      return <LocalQuotePreview model={model} name={name} />;
    case "education_program":
      return <EducationProgramPreview model={model} name={name} />;
    default:
      return <EditorialB2BPreview model={model} name={name} />;
  }
}

export function TemplatePreviewThumbnail({
  templateId,
  templateName,
  className = "",
}: TemplatePreviewThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<TemplateConfig | null>(() => configCache.get(templateId) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    ensurePreviewFonts();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || config) return;
    let cancelled = false;

    resolveTemplateConfig(templateId)
      .then((nextConfig) => {
        if (!cancelled) {
          setConfig(nextConfig);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [config, isVisible, templateId]);

  const model = useMemo(
    () => createPreviewModel(config, templateId, templateName),
    [config, templateId, templateName],
  );

  const showPreview = Boolean(config) || failed;

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video overflow-hidden border border-slate-200 bg-white ${className}`}
      role="img"
      aria-label={`${templateName} ${FAMILY_LABELS[model.family]} website layout preview`}
      data-layout-family={model.family}
    >
      {!showPreview ? (
        <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#f8fafc,#eef2ff)]">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <LayoutTemplate className="h-8 w-8" aria-hidden="true" />
            <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Building preview</span>
          </div>
        </div>
      ) : (
        <FamilyPreview model={model} name={config?.name || templateName} />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/15 to-transparent" />
      <span className="pointer-events-none absolute bottom-2 left-2 bg-white/94 px-2 py-1 text-[6px] font-bold uppercase tracking-[0.08em] text-slate-600 shadow-sm backdrop-blur">
        {failed ? `${FAMILY_LABELS[model.family]} direction` : FAMILY_LABELS[model.family]}
      </span>
    </div>
  );
}
