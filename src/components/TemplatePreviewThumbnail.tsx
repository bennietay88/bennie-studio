import React, { useEffect, useRef, useState } from "react";
import { LayoutTemplate } from "lucide-react";

interface TemplatePreviewThumbnailProps {
  templateId: string;
  templateName: string;
  className?: string;
}

const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 720;

export function TemplatePreviewThumbnail({
  templateId,
  templateName,
  className = "",
}: TemplatePreviewThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scale, setScale] = useState(0.25);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => setScale(container.clientWidth / PREVIEW_WIDTH);
    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          intersectionObserver.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    intersectionObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

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
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">Rendering layout</span>
          </div>
        </div>
      )}
      {isVisible && (
        <iframe
          src={`/preview/template/${encodeURIComponent(templateId)}?thumbnail=1`}
          title={`${templateName} website preview`}
          loading="lazy"
          tabIndex={-1}
          onLoad={() => setIsLoaded(true)}
          className={`pointer-events-none absolute left-0 top-0 border-0 transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/35 to-transparent" />
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/50 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm backdrop-blur">
        Live layout preview
      </span>
    </div>
  );
}
