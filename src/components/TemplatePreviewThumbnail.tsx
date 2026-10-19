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
import { resolveAccessibleThemeColors } from "../lib/colorContrast";

interface TemplatePreviewThumbnailProps {
  templateId: string;
  templateName: string;
  className?: string;
  layoutFamily?: PreviewLayoutFamily;
  showFamilyLabel?: boolean;
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
  | "editorial_b2b"
  | "finance_workflow"
  | "brand_statement"
  | "media_story";

type PreviewModel = {
  family: PreviewLayoutFamily;
  primary: string;
  secondary: string;
  primaryInk: string;
  primaryForeground: string;
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
const FAMILY_LABELS: Record<PreviewLayoutFamily, string> = {
  clinic_trust: "Clinic",
  local_quote: "Local service",
  education_program: "Education",
  editorial_b2b: "Editorial",
  finance_workflow: "Finance",
  brand_statement: "Brand-focused",
  media_story: "Media-focused",
};

function isSerifFamily(fontFamily = "") {
  return /serif|playfair|lora|fraunces|merriweather/i.test(fontFamily);
}

function getPreviewFonts(theme: Record<string, any>, family: PreviewLayoutFamily) {
  const configured = String(theme?.fontFamily || "").trim();
  const sans = '"Geist Variable", Inter, "Helvetica Neue", Arial, sans-serif';
  const serif = 'Georgia, "Times New Roman", serif';
  if (family === "editorial_b2b") {
    return { display: isSerifFamily(configured) ? configured : serif, body: sans };
  }
  return {
    display: configured && !/inter|arial|system-ui|sans-serif/i.test(configured) ? configured : sans,
    body: sans,
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
  if (/accounting|bookkeeping|tax-filing|payroll/.test(value)) {
    return "finance_workflow";
  }
  if (/cleaning|renovation|contractor|pest|plumb|hvac|locksmith|repair|service-pro|home-service/.test(value)) {
    return "local_quote";
  }
  return "editorial_b2b";
}

function getBuiltInTemplateConfig(templateId: string): TemplateConfig | null {
  const cached = configCache.get(templateId);
  if (cached) return cached;

  const builtIn = Object.values(NICHE_TEMPLATES).find((template: any) => template?.id === templateId) as any;
  if (!builtIn) return null;

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

async function resolveTemplateConfig(templateId: string) {
  const cached = configCache.get(templateId);
  if (cached) return cached;

  const builtIn = getBuiltInTemplateConfig(templateId);
  if (builtIn) return builtIn;

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
  layoutFamily?: PreviewLayoutFamily,
): PreviewModel {
  const family = layoutFamily || resolveTemplatePreviewFamily(templateId, templateName);
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
  const contrast = resolveAccessibleThemeColors(primary, secondary);
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
    primaryInk: contrast.primaryInk,
    primaryForeground: contrast.primaryForeground,
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

function MiniBrand({ model, label, inverse = false }: { model: PreviewModel; label: string; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: inverse ? "#ffffff" : model.primary }} />
      <span className={`max-w-28 truncate text-[7px] font-bold ${inverse ? "text-white" : "text-slate-800"}`}>{label}</span>
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
        <div className="flex items-center gap-3 text-[5px] font-semibold uppercase tracking-wide text-slate-600">
          <span>Treatments</span><span>Team</span><span>Contact</span>
        </div>
      </div>

      <div className="grid min-h-[48%] grid-cols-[1.12fr_0.88fr] overflow-hidden">
        <div className="flex flex-col justify-center px-5 py-4">
          <div className="text-[5px] font-bold uppercase tracking-[0.18em]" style={{ color: model.primaryInk }}>Care you can trust</div>
          <div className="mt-2 line-clamp-2 text-[16px] font-semibold leading-[1.02] tracking-[-0.035em] text-slate-950" style={{ fontFamily: model.displayFont }}>
            {model.headline}
          </div>
          {model.subheadline ? <div className="mt-2 line-clamp-2 text-[6px] leading-relaxed text-slate-500">{model.subheadline}</div> : null}
          <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-1.5 text-[6px] font-bold " style={{ backgroundColor: model.primary, color: model.primaryForeground }}>
            <CalendarDays className="h-2.5 w-2.5" /> {model.cta}
          </div>
        </div>

        <div className="relative overflow-hidden bg-emerald-50">
          {model.heroImage ? (
            <img src={model.heroImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <CalendarDays className="h-6 w-6" style={{ color: model.primaryInk }} />
                <div className="mt-3 h-1.5 w-16 rounded-full bg-slate-200" />
                <div className="mt-1.5 h-1.5 w-11 rounded-full bg-slate-100" />
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/94 p-2 shadow-sm backdrop-blur">
            <div className="text-[5px] font-bold uppercase tracking-wide text-slate-600">Quick appointment</div>
            <div className="mt-1 text-[7px] font-semibold text-slate-800">Location · hours · contact</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-emerald-900/10 bg-white">
        {trustItems.slice(0, 3).map((item, index) => (
          <div key={index} className="border-r border-emerald-900/10 px-3 py-2.5 last:border-r-0">
            <div className="text-[8px] font-bold" style={{ color: model.primaryInk }}>{item.value || "✓"}</div>
            <div className="mt-0.5 truncate text-[5px] font-semibold text-slate-600">{item.label || "Trust"}</div>
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 px-4 py-3">
        {(model.serviceItems.length ? model.serviceItems : ["Treatment clarity", "Patient reassurance"]).slice(0, 2).map((item, index) => (
          <div key={index} className="rounded-lg border border-emerald-900/10 bg-white p-2.5">
            <ShieldCheck className="h-3 w-3" style={{ color: model.primaryInk }} />
            <div className="mt-1.5 truncate text-[6px] font-bold text-slate-700">{item}</div>
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
        <MiniBrand model={model} label={name} inverse />
        <span className="rounded-md px-2 py-1 text-[5px] font-bold " style={{ backgroundColor: model.primary, color: model.primaryForeground }}>
          Get quote
        </span>
      </div>

      <div className="grid min-h-[55%] grid-cols-[1.05fr_0.95fr] bg-slate-950 text-white">
        <div className="flex flex-col justify-center px-5 py-4">
          <div className="text-[5px] font-bold uppercase tracking-[0.18em] text-white/55">Local service · fast response</div>
          <div className="mt-2 line-clamp-3 text-[17px] font-semibold leading-[1.02] tracking-[-0.035em]" style={{ fontFamily: model.displayFont }}>
            {model.headline}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[6px] text-white/60">
            <MapPin className="h-2.5 w-2.5" /> Service areas clearly shown
          </div>
        </div>

        <div className="m-3 rounded-xl bg-white p-3 text-slate-900 shadow-lg">
          <div className="text-[6px] font-bold uppercase tracking-wide" style={{ color: model.primaryInk }}>Request a quote</div>
          <div className="mt-2 space-y-1.5">
            {["Service needed", "Postcode / area", "Preferred date"].map((field) => (
              <div key={field} className="flex h-5 items-center rounded-md border border-slate-200 px-2 text-[5px] text-slate-600">{field}</div>
            ))}
          </div>
          <div className="mt-2 rounded-md py-1.5 text-center text-[5px] font-bold " style={{ backgroundColor: model.primary, color: model.primaryForeground }}>
            {model.cta}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {services.slice(0, 3).map((service, index) => (
          <div key={index} className="flex items-center gap-1.5 border-r border-slate-200 px-2 last:border-r-0">
            <Check className="h-2.5 w-2.5" style={{ color: model.primaryInk }} />
            <span className="truncate text-[5.5px] font-semibold text-slate-600">{service}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 items-center justify-between px-5 py-3">
        <div>
          <div className="text-[5px] font-bold uppercase tracking-wide text-slate-600">Coverage</div>
          <div className="mt-1 text-[7px] font-bold text-slate-800">Service area + proof + clear next step</div>
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
        <div className="flex gap-3 text-[5px] font-semibold text-slate-600"><span>Programs</span><span>Teachers</span><span>Trial class</span></div>
      </div>

      <div className="relative grid min-h-[46%] grid-cols-[1.08fr_0.92fr] overflow-hidden bg-indigo-50">
        <div className="flex flex-col justify-center px-5 py-4">
          <div className="text-[5px] font-bold uppercase tracking-[0.18em]" style={{ color: model.primaryInk }}>Learning path</div>
          <div className="mt-2 line-clamp-3 text-[16px] font-semibold leading-[1.04] tracking-[-0.03em] text-slate-950" style={{ fontFamily: model.displayFont }}>
            {model.headline}
          </div>
          <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-1.5 text-[6px] font-bold " style={{ backgroundColor: model.primary, color: model.primaryForeground }}>
            <BookOpen className="h-2.5 w-2.5" /> {model.cta}
          </div>
        </div>

        {model.heroImage ? (
          <img src={model.heroImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="m-4 flex items-center justify-center rounded-2xl bg-white shadow-sm">
            <BookOpen className="h-10 w-10" style={{ color: model.primaryInk }} />
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[6px] font-bold text-slate-800">Choose a program</div>
          <span className="text-[5px] font-semibold" style={{ color: model.primaryInk }}>Age · level · goal</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {programs.slice(0, 3).map((program, index) => (
            <div key={index} className="rounded-lg border border-indigo-100 bg-white p-2.5">
              <div className="grid h-5 w-5 place-items-center rounded-md bg-indigo-50 text-[6px] font-bold" style={{ color: model.primaryInk }}>
                {index + 1}
              </div>
              <div className="mt-2 line-clamp-2 text-[6px] font-bold text-slate-700">{program}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mb-3 flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2 text-white">
        <div>
          <div className="text-[5px] text-white/50">Parent next step</div>
          <div className="mt-0.5 text-[6px] font-bold">Trial class enquiry</div>
        </div>
        <MessageCircle className="h-4 w-4" />
      </div>
    </div>
  );
}

function EditorialB2BPreview({ model, name }: { model: PreviewModel; name: string }) {
  const services = model.serviceItems.length ? model.serviceItems : ["Advisory", "Research", "Consultation"];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f4f0e8] text-[#171717]" style={{ fontFamily: model.bodyFont }}>
      <div className="grid h-full grid-rows-[34px_1fr_48px]">
        <div className="flex items-center justify-between border-b border-black/15 px-4">
          <MiniBrand model={{ ...model, primary: "#171717" }} label={name} />
          <div className="flex items-center gap-3 text-[5px] font-semibold uppercase tracking-[0.08em] text-black/60">
            <span>Perspective</span><span>Services</span><span>Contact</span>
          </div>
        </div>

        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_64px]">
          <div className="grid min-h-0 grid-cols-[1.55fr_0.45fr] border-b border-black/15">
            <div className="flex min-h-0 flex-col justify-between px-5 py-4">
              <div>
                <div className="text-[5px] font-semibold uppercase tracking-[0.12em] text-black/60">Editorial point of view</div>
                <div
                  className="mt-3 line-clamp-3 max-w-[18ch] text-[20px] font-medium leading-[1.02] tracking-[-0.03em] text-[#171717]"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {model.headline}
                </div>
              </div>
              <div className="mt-3 grid shrink-0 grid-cols-[1fr_auto] items-end gap-4">
                <div className="line-clamp-2 max-w-[38ch] text-[6px] leading-[1.65] text-black/55">
                  {model.subheadline || "A considered editorial structure for businesses that need room to explain expertise, evidence and perspective."}
                </div>
                <div className="border-b border-black pb-0.5 text-[6px] font-semibold">{model.cta}</div>
              </div>
            </div>

            <div className="flex flex-col justify-between border-l border-black/15 bg-[#d9d0bf] p-4">
              <div className="text-[5px] font-semibold uppercase tracking-[0.1em] text-black/60">Issue 01</div>
              <div className="text-[11px] font-medium leading-[1.1]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Insight before interface.
              </div>
              <div className="text-[5px] font-semibold text-black/60">{name}</div>
            </div>
          </div>

          <div className="grid grid-cols-[0.7fr_1.3fr]">
            <div className="border-r border-black/15 px-4 py-3">
              <div className="text-[5px] uppercase tracking-[0.08em] text-black/60">Reading path</div>
              <div className="mt-2 text-[7px] font-semibold leading-[1.35]">Point of view → evidence → action</div>
            </div>
            <div className="grid grid-cols-3">
              {services.slice(0, 3).map((service, index) => (
                <div key={service} className="border-r border-black/15 px-3 py-3 last:border-r-0">
                  <div className="text-[5px] font-semibold text-black/60">0{index + 1}</div>
                  <div className="mt-2 line-clamp-2 text-[6px] font-semibold leading-[1.35]">{service}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-black/15 bg-[#171717] px-4 text-white">
          <div>
            <div className="text-[5px] uppercase tracking-[0.08em] text-white/55">Best for</div>
            <div className="mt-1 text-[6px] font-semibold">Consulting, legal and complex B2B services</div>
          </div>
          <div className="text-[6px] font-semibold text-white/70">Editorial direction</div>
        </div>
      </div>
    </div>
  );
}

function FinanceWorkflowPreview({ model, name }: { model: PreviewModel; name: string }) {
  const services = model.serviceItems.length ? model.serviceItems : ["Tax filing", "Bookkeeping", "Payroll"];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f7f9fc] text-[#15233c]" style={{ fontFamily: model.bodyFont }}>
      <div className="grid h-full grid-rows-[38px_minmax(0,1fr)_104px]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5">
          <MiniBrand model={{ ...model, primary: "#1741ed" }} label={name} />
          <div className="flex items-center gap-4 text-[5px] font-semibold text-slate-600">
            <span>Services</span><span>Who we help</span><span>Insights</span><span>Contact</span>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[1.12fr_0.88fr] gap-3 bg-[#edf3ff] px-5 py-4">
          <div className="flex min-h-0 flex-col justify-center">
            <div className="text-[5px] font-bold uppercase tracking-[0.14em] text-blue-700">FINANCIAL CLARITY FOR GROWING TEAMS</div>
            <div className="mt-2 line-clamp-3 max-w-[18ch] text-[22px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#14213b]">
              {model.headline}
            </div>
            <div className="mt-2 line-clamp-2 max-w-[34ch] text-[6px] leading-[1.5] text-slate-600">
              {model.subheadline || "Clear financial support for confident business decisions."}
            </div>
            <div className="mt-3 inline-flex w-fit items-center rounded-md bg-[#1741ed] px-3 py-1.5 text-[6px] font-bold text-white">
              {model.cta}
            </div>
          </div>

          <div className="flex min-h-0 items-center justify-center">
            <div className="w-full rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="text-[6px] font-bold text-slate-800">Finance workspace</div>
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-2 gap-y-2 text-[5px] text-slate-500">
                <span>MONTHLY CLOSE</span><span className="font-semibold text-emerald-700">On track</span>
                <span className="border-t border-slate-100 pt-2">TAX RECORDS</span><span className="border-t border-slate-100 pt-2 font-semibold text-blue-700">Organised</span>
              </div>
              <div className="mt-3 flex h-8 items-end gap-1 rounded-md bg-blue-50 px-2 pt-2" aria-hidden="true">
                {[35, 55, 42, 78, 60, 92, 70, 100].map((height, index) => (
                  <span key={index} className="flex-1 rounded-t-sm bg-blue-500/75" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[7px] font-bold text-slate-900">Support for every stage</div>
            <div className="text-[5px] font-semibold uppercase tracking-[0.1em] text-blue-700">A clearer view of the numbers</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {services.slice(0, 3).map((service, index) => (
              <div key={service} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                <div className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-blue-100 text-[6px] font-bold text-blue-700">0{index + 1}</div>
                <div className="line-clamp-2 text-[6px] font-semibold leading-[1.2] text-slate-700">{service}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandStatementPreview({ model, name }: { model: PreviewModel; name: string }) {
  const services = model.serviceItems.length ? model.serviceItems : ["Positioning", "Credibility", "Conversion"];

  return (
    <div className="absolute inset-0 overflow-hidden bg-white text-[#0f172a]" style={{ fontFamily: model.bodyFont }}>
      <div className="grid h-full grid-rows-[34px_1fr_60px]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4">
          <MiniBrand model={model} label={name} />
          <div className="flex gap-3 text-[5px] font-semibold uppercase tracking-[0.1em] text-slate-600">
            <span>Services</span><span>Work</span><span>Contact</span>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[1.02fr_0.98fr]">
          <div className="flex min-h-0 flex-col justify-between px-5 py-4">
            <div>
              <div className="text-[5px] font-semibold uppercase tracking-[0.16em]" style={{ color: model.primaryInk }}>Professional services</div>
              <div className="mt-3 line-clamp-3 max-w-[12ch] text-[23px] font-semibold leading-[0.98] tracking-[-0.04em] text-slate-950">{model.headline}</div>
              <div className="mt-3 line-clamp-2 max-w-[34ch] text-[6px] leading-[1.6] text-slate-500">{model.subheadline || "A crisp, confident website built around a clear offer, credible proof and one useful next step."}</div>
            </div>
            <div className="inline-flex w-fit border-b border-slate-900 pb-1 text-[6px] font-semibold">{model.cta}</div>
          </div>

          <div className="m-3 ml-0 grid min-h-0 grid-rows-[1fr_auto] overflow-hidden bg-[#1d4ed8] text-white">
            <div className="flex flex-col justify-between p-4">
              <div className="flex items-center justify-between">
                <span className="text-[5px] font-semibold uppercase tracking-[0.16em] text-white/60">Core proposition</span>
                <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
              </div>
              <div>
                <div className="max-w-[15ch] text-[13px] font-semibold leading-[1.08]">Clear positioning. Strong proof. Direct enquiry.</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {services.slice(0, 2).map((service, index) => (
                    <div key={service} className="border-t border-white/25 pt-2">
                      <div className="text-[5px] text-white/50">0{index + 1}</div>
                      <div className="mt-1 text-[6px] font-semibold">{service}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/20 bg-[#173ea8]">
              <div className="border-r border-white/20 px-3 py-2 text-[5.5px] font-semibold">Trust</div>
              <div className="px-3 py-2 text-[5.5px] font-semibold">Action</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-slate-200 bg-[#f1f5f9]">
          {["Positioning", "Credibility", "Conversion"].map((item, index) => (
            <div key={item} className="border-r border-slate-200 px-4 py-2 last:border-r-0">
              <div className="text-[5px] font-semibold" style={{ color: model.primaryInk }}>0{index + 1}</div>
              <div className="mt-1 text-[6px] font-semibold text-slate-700">{item}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaStoryPreview({ model, name }: { model: PreviewModel; name: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-950 text-white" style={{ fontFamily: model.bodyFont }}>
      {model.heroImage ? (
        <img src={model.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,#172554_0%,#1e3a8a_44%,#0f172a_100%)]">
          <div className="absolute -right-8 top-5 h-28 w-28 rounded-full border border-white/15" />
          <div className="absolute right-7 top-10 h-20 w-20 rounded-full border border-white/10" />
          <div className="absolute bottom-8 right-8 grid h-14 w-14 place-items-center border border-white/20 bg-white/10 backdrop-blur">
            <FileText className="h-5 w-5 text-white/80" />
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,15,30,.86)_0%,rgba(7,15,30,.58)_44%,rgba(7,15,30,.08)_78%,rgba(7,15,30,.2)_100%)]" />

      <div className="relative z-10 grid h-full grid-rows-[38px_1fr_66px]">
        <div className="flex items-center justify-between border-b border-white/15 px-4">
          <MiniBrand model={{ ...model, primary: "#ffffff" }} label={name} inverse />
          <div className="flex gap-3 text-[5px] font-semibold uppercase tracking-[0.12em] text-white/65">
            <span>Story</span><span>Services</span><span>Contact</span>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-end px-5 pb-5">
            <div className="text-[5px] font-semibold uppercase tracking-[0.2em] text-white/65">Media-led brand story</div>
            <div className="mt-3 max-w-[12ch] text-[24px] font-semibold leading-[0.95] tracking-[-0.045em] text-white">
              {model.headline}
            </div>
            <div className="mt-3 line-clamp-2 max-w-[34ch] text-[6px] leading-[1.6] text-white/72">
              {model.subheadline || "Use customer photography, people and place to make the business feel real before explaining every detail."}
            </div>
            <div className="mt-4 inline-flex w-fit bg-white px-3 py-1.5 text-[6px] font-semibold text-slate-950">{model.cta}</div>
          </div>

          <div className="flex items-end justify-end p-4">
            <div className="w-[76%] border border-white/20 bg-white/12 p-3 backdrop-blur-md">
              <div className="text-[5px] uppercase tracking-[0.15em] text-white/55">Customer story</div>
              <div className="mt-2 text-[9px] font-semibold leading-tight">People, place and proof become part of the design.</div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/20 pt-2">
                <div><div className="text-[5px] text-white/50">01</div><div className="mt-1 text-[6px] font-semibold">Real imagery</div></div>
                <div><div className="text-[5px] text-white/50">02</div><div className="mt-1 text-[6px] font-semibold">Human trust</div></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-white/15 bg-slate-950/72 backdrop-blur">
          {["People", "Place", "Experience"].map((item, index) => (
            <div key={item} className="border-r border-white/15 px-4 py-2 last:border-r-0">
              <div className="text-[5px] text-white/55">0{index + 1}</div>
              <div className="mt-1 text-[6px] font-semibold text-white">{item}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FamilyPreview({ model, name }: { model: PreviewModel; name: string }) {
  switch (model.family) {
    case "brand_statement":
      return <BrandStatementPreview model={model} name={name} />;
    case "media_story":
      return <MediaStoryPreview model={model} name={name} />;
    case "clinic_trust":
      return <ClinicTrustPreview model={model} name={name} />;
    case "local_quote":
      return <LocalQuotePreview model={model} name={name} />;
    case "education_program":
      return <EducationProgramPreview model={model} name={name} />;
    case "finance_workflow":
      return <FinanceWorkflowPreview model={model} name={name} />;
    default:
      return <EditorialB2BPreview model={model} name={name} />;
  }
}

export function TemplatePreviewThumbnail({
  templateId,
  templateName,
  className = "",
  layoutFamily,
  showFamilyLabel = false,
}: TemplatePreviewThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setPreviewSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const [config, setConfig] = useState<TemplateConfig | null>(() => configCache.get(templateId) || getBuiltInTemplateConfig(templateId));
  const [failed, setFailed] = useState(false);

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
    () => createPreviewModel(config, templateId, templateName, layoutFamily),
    [config, templateId, templateName, layoutFamily],
  );

  const showPreview = Boolean(config) || failed;

  return (
    <div
      ref={containerRef}
      className={`bt-template-preview not-prose isolate relative overflow-hidden border border-slate-200 bg-white text-slate-900 ${className}`}
      style={{ aspectRatio: "16 / 10", contain: "layout paint style", fontSize: "6px", lineHeight: 1.2 }}
      role="img"
      aria-label={`${templateName} ${FAMILY_LABELS[model.family]} website layout preview`}
      data-layout-family={model.family}
    >
      {!showPreview ? (
        <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#f8fafc,#eef2ff)]">
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <LayoutTemplate className="h-8 w-8" aria-hidden="true" />
            <span className="text-[9px] font-bold uppercase tracking-[0.1em]">Building preview</span>
          </div>
        </div>
      ) : (
        <div
          className="bt-template-canvas absolute"
          style={{
            width: 480,
            height: 360,
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${Math.min(previewSize.width / 480, previewSize.height / 360)})`,
            transformOrigin: "center",
          }}
        >
          <FamilyPreview model={model} name={config?.name || templateName} />
        </div>
      )}

      {showFamilyLabel ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/15 to-transparent" />
          <span className="pointer-events-none absolute bottom-2 left-2 bg-white/94 px-2 py-1 text-[6px] font-bold uppercase tracking-[0.08em] text-slate-600 shadow-sm backdrop-blur">
            {failed ? "Preview" : FAMILY_LABELS[model.family]}
          </span>
        </>
      ) : null}
    </div>
  );
}
