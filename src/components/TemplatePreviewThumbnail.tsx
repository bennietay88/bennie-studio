import React, { useEffect, useRef, useState } from "react";
import { ImageIcon, LayoutTemplate } from "lucide-react";
import { supabase } from "../lib/supabase";

interface TemplatePreviewThumbnailProps {
  templateId: string;
  templateName: string;
  className?: string;
}

const FALLBACK_PREVIEW = "/brand-template-preview.svg";
const previewCache = new Map<string, string>();

function normalizePreviewSource(value: unknown) {
  if (typeof value !== "string") return "";
  const source = value.trim();
  if (!source) return "";
  if (
    source.startsWith("/") ||
    source.startsWith("data:image/") ||
    source.startsWith("blob:") ||
    /^https?:\/\//i.test(source)
  ) {
    return source;
  }
  return `/${source.replace(/^\/+/, "")}`;
}

async function resolveTemplatePreview(templateId: string) {
  const cached = previewCache.get(templateId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("templates")
    .select("preview_image,thumbnail,config")
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw error;

  const configPreview =
    data?.config?.commercial?.previewImage ||
    data?.config?.commercial?.preview_image ||
    data?.config?.metadata?.previewImage ||
    data?.config?.metadata?.preview_image;

  const resolved =
    normalizePreviewSource(data?.preview_image) ||
    normalizePreviewSource(configPreview) ||
    normalizePreviewSource(data?.thumbnail) ||
    FALLBACK_PREVIEW;

  previewCache.set(templateId, resolved);
  return resolved;
}

export function TemplatePreviewThumbnail({
  templateId,
  templateName,
  className = "",
}: TemplatePreviewThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(() => previewCache.get(templateId) || "");
  const [isLoaded, setIsLoaded] = useState(false);
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
    if (!isVisible) return;
    let cancelled = false;

    setIsLoaded(false);
    setFailed(false);

    resolveTemplatePreview(templateId)
      .then((source) => {
        if (!cancelled) setPreviewSrc(source);
      })
      .catch(() => {
        if (!cancelled) setPreviewSrc(FALLBACK_PREVIEW);
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, templateId]);

  const handleImageError = () => {
    if (previewSrc !== FALLBACK_PREVIEW) {
      previewCache.set(templateId, FALLBACK_PREVIEW);
      setPreviewSrc(FALLBACK_PREVIEW);
      setIsLoaded(false);
      return;
    }
    setFailed(true);
    setIsLoaded(true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video overflow-hidden bg-slate-100 ${className}`}
      role="img"
      aria-label={`${templateName} website layout preview`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#f8fafc,#eef2ff)]">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <LayoutTemplate className="h-8 w-8" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              Loading preview
            </span>
          </div>
        </div>
      )}

      {isVisible && previewSrc && !failed && (
        <img
          src={previewSrc}
          alt={`${templateName} website preview`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          referrerPolicy="no-referrer"
        />
      )}

      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-slate-50 text-slate-400">
          <div className="flex flex-col items-center gap-2 text-center">
            <ImageIcon className="h-8 w-8" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">
              Preview unavailable
            </span>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/35 to-transparent" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/50 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm backdrop-blur">
        Template preview
      </span>
    </div>
  );
}
