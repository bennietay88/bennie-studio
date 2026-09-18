import React, { useEffect, useMemo, useRef, useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { supabase } from "../lib/supabase";
import { NICHE_TEMPLATES } from "../constants/nicheTemplates";

interface TemplatePreviewThumbnailProps {
  templateId: string;
  templateName: string;
  className?: string;
}

type TemplateConfig = {
  theme?: Record<string, any>;
  pages?: Array<{
    title?: string;
    slug?: string;
    sections?: Array<Record<string, any>>;
  }>;
};

const configCache = new Map<string, TemplateConfig>();
const PREVIEW_FONT_STYLESHEET_ID = "bt-template-preview-fonts";

function ensurePreviewFonts() {
  if (typeof document === "undefined" || document.getElementById(PREVIEW_FONT_STYLESHEET_ID)) return;
  const link = document.createElement("link");
  link.id = PREVIEW_FONT_STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500..800&family=Lora:wght@500..700&family=Playfair+Display:wght@500..800&family=Plus+Jakarta+Sans:wght@400..800&family=Space+Grotesk:wght@500..700&display=swap";
  document.head.appendChild(link);
}

function isSerifFamily(fontFamily = "") {
  return /serif|playfair|lora|fraunces|merriweather/i.test(fontFamily);
}

function isLegacyGenericFamily(fontFamily = "") {
  return /(^|['"\s])(inter|geist sans|arial|system-ui)(['",\s]|$)/i.test(fontFamily);
}

function getPreviewFonts(theme: Record<string, any>) {
  const configured = String(theme?.fontFamily || "").trim();
  const style = String(theme?.style || theme?.defaultStyle || "modern").toLowerCase();
  const editorial = /editorial|prestige|immersive|luxury/.test(style);

  if (isSerifFamily(configured)) {
    return {
      display: configured,
      body: "'Plus Jakarta Sans', sans-serif",
    };
  }

  return {
    display: editorial ? "'Fraunces', serif" : "'Space Grotesk', sans-serif",
    body:
      !configured || isLegacyGenericFamily(configured)
        ? "'Plus Jakarta Sans', sans-serif"
        : configured,
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

function readableTextColor(background: string) {
  const hex = String(background || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.66 ? "#0f172a" : "#ffffff";
}

async function resolveTemplateConfig(templateId: string) {
  const cached = configCache.get(templateId);
  if (cached) return cached;

  const builtIn = Object.values(NICHE_TEMPLATES).find((template: any) => template?.id === templateId) as any;
  if (builtIn) {
    const localConfig: TemplateConfig = {
      theme: builtIn.theme || {},
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

function MiniSection({
  section,
  primary,
  displayFont,
}: {
  section: Record<string, any>;
  primary: string;
  displayFont: string;
}) {
  const type = String(section?.type || "").toLowerCase();
  const content = section?.content || {};
  const items = Array.isArray(content.items) ? content.items.slice(0, 3) : [];
  const stats = Array.isArray(content.stats) ? content.stats.slice(0, 3) : [];

  if (type === "proof" && stats.length) {
    return (
      <div className="grid grid-cols-3 gap-2 px-5 py-4">
        {stats.map((stat: any, index: number) => (
          <div key={index} className="rounded-lg border border-slate-100 bg-white p-2 text-center shadow-sm">
            <div className="text-[11px] font-extrabold" style={{ color: primary, fontFamily: displayFont }}>
              {textFrom(stat?.value, "•")}
            </div>
            <div className="mt-1 truncate text-[6px] font-semibold uppercase tracking-wide text-slate-400">
              {textFrom(stat?.label, "Proof")}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (["services", "features", "benefits", "process"].includes(type) && items.length) {
    return (
      <div className="px-5 py-4">
        <div className="mb-2 truncate text-[9px] font-bold text-slate-800" style={{ fontFamily: displayFont }}>
          {sectionTitle(section)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {items.map((item: any, index: number) => (
            <div key={index} className="min-h-12 rounded-lg border border-slate-100 bg-slate-50 p-2">
              <div className="truncate text-[7px] font-bold text-slate-700">
                {typeof item === "string" ? item : textFrom(item?.title, `Item ${index + 1}`)}
              </div>
              <div className="mt-1 h-1.5 w-4/5 rounded-full bg-slate-200" />
              <div className="mt-1 h-1.5 w-3/5 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "cta") {
    return (
      <div className="mx-5 my-4 flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: primary }}>
        <div className="max-w-[68%] truncate text-[8px] font-bold text-white" style={{ fontFamily: displayFont }}>
          {sectionTitle(section)}
        </div>
        <div className="rounded-md bg-white px-3 py-1.5 text-[6px] font-extrabold" style={{ color: primary }}>
          {textFrom(content.buttonText || content.ctaText, "Contact")}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="truncate text-[9px] font-bold text-slate-800" style={{ fontFamily: displayFont }}>
        {sectionTitle(section)}
      </div>
      <div className="mt-2 h-1.5 w-4/5 rounded-full bg-slate-200" />
      <div className="mt-1.5 h-1.5 w-3/5 rounded-full bg-slate-100" />
    </div>
  );
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
        if (!cancelled) setConfig(nextConfig);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [config, isVisible, templateId]);

  const preview = useMemo(() => {
    if (!config) return null;
    const theme = config.theme || {};
    const pages = Array.isArray(config.pages) ? config.pages : [];
    const firstPage = pages.find((page) => page.slug === "" || page.slug === "home") || pages[0];
    const sections = (firstPage?.sections || []).filter((section: any) => section?.isVisible !== false);
    const hero = sections.find((section: any) => section?.type === "hero") || sections[0] || {};
    const heroContent = hero?.content || {};
    const heroSettings = hero?.settings || {};
    const primary = textFrom(theme.primaryColor, "#4f46e5");
    const secondary = textFrom(theme.secondaryColor, "#f8fafc");
    const heroBackground = textFrom(heroSettings.backgroundColor || heroSettings.bgColor, primary);
    const heroText = textFrom(heroSettings.textColor, readableTextColor(heroBackground));
    const heroImage = textFrom(
      heroSettings.backgroundImage || heroContent.backgroundImage || heroContent.imageUrl || heroContent.image,
    );
    const fonts = getPreviewFonts(theme);
    const followingSections = sections.filter((section: any) => section !== hero).slice(0, 3);

    return {
      theme,
      primary,
      secondary,
      hero,
      heroContent,
      heroBackground,
      heroText,
      heroImage,
      fonts,
      followingSections,
      headline: textFrom(heroContent.headline || heroContent.title || heroContent.heading, templateName),
      subheadline: textFrom(heroContent.subheadline || heroContent.description),
      cta: textFrom(heroContent.ctaText || heroContent.buttonText || heroContent.primaryCta, "Contact us"),
    };
  }, [config, templateName]);

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video overflow-hidden bg-white ${className}`}
      role="img"
      aria-label={`${templateName} website layout preview`}
    >
      {!preview && !failed && (
        <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#f8fafc,#eef2ff)]">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <LayoutTemplate className="h-8 w-8" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">Building preview</span>
          </div>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-slate-50">
          <div className="max-w-[80%] text-center">
            <LayoutTemplate className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
            <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Template configuration unavailable
            </p>
          </div>
        </div>
      )}

      {preview && (
        <div className="absolute inset-0 flex flex-col bg-white" style={{ fontFamily: preview.fonts.body }}>
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: preview.primary }} />
              <div className="h-1.5 w-14 rounded-full bg-slate-800" />
            </div>
            <div className="flex gap-2">
              <div className="h-1 w-7 rounded-full bg-slate-200" />
              <div className="h-1 w-7 rounded-full bg-slate-200" />
              <div className="h-1 w-7 rounded-full bg-slate-200" />
            </div>
          </div>

          <div
            className="relative min-h-[46%] overflow-hidden px-6 py-5"
            style={{
              backgroundColor: preview.heroBackground,
              color: preview.heroText,
              backgroundImage: preview.heroImage
                ? `linear-gradient(90deg, ${preview.heroBackground}ee 0%, ${preview.heroBackground}b8 58%, ${preview.heroBackground}55 100%), url(${JSON.stringify(preview.heroImage).slice(1, -1)})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="relative z-10 max-w-[72%]">
              <div className="line-clamp-2 text-[18px] font-bold leading-[1.08] tracking-[-0.04em]" style={{ fontFamily: preview.fonts.display }}>
                {preview.headline}
              </div>
              {preview.subheadline && (
                <div className="mt-2 line-clamp-2 max-w-[90%] text-[7px] font-medium leading-relaxed opacity-80">
                  {preview.subheadline}
                </div>
              )}
              <div
                className="mt-3 inline-flex rounded-md px-3 py-1.5 text-[6px] font-extrabold shadow-sm"
                style={{ backgroundColor: preview.heroText, color: preview.heroBackground }}
              >
                {preview.cta}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-white">
            {preview.followingSections.length ? (
              preview.followingSections.map((section: any, index: number) => (
                <MiniSection
                  key={`${section?.id || section?.type || "section"}-${index}`}
                  section={section}
                  primary={preview.primary}
                  displayFont={preview.fonts.display}
                />
              ))
            ) : (
              <div className="grid grid-cols-3 gap-2 px-5 py-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <div className="h-1.5 w-4/5 rounded-full bg-slate-300" />
                    <div className="mt-2 h-1 w-full rounded-full bg-slate-200" />
                    <div className="mt-1 h-1 w-2/3 rounded-full bg-slate-200" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/20 to-transparent" />
      <span className="pointer-events-none absolute bottom-2.5 left-3 rounded-full border border-white/70 bg-white/92 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.13em] text-slate-700 shadow-sm backdrop-blur">
        Live template miniature
      </span>
    </div>
  );
}
