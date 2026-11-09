import React from "react";
import { Link } from "react-router-dom";
import { Image as ImageIcon } from "lucide-react";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import type { PortfolioItem } from "../lib/portfolioCatalog";

/** Static image first; the legacy in-app template preview is only a fallback until screenshots are uploaded. */
export function PortfolioShowcaseVisual({ item, compact = false, priority = false }: {
  item: PortfolioItem;
  compact?: boolean;
  priority?: boolean;
}) {
  const image = item.coverImage || item.desktopImage;
  return <div className="relative min-w-0 overflow-hidden border-b border-slate-200 bg-[#e9edf1]">
    {image ? <img
      src={image}
      alt={item.imageAlt || `${item.title} website design concept`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={`block w-full object-cover object-top ${compact ? "aspect-[8/5]" : "aspect-[8/5]"}`}
    /> : item.livePreviewSlug ? (
      <div className="relative aspect-[8/5] overflow-hidden bg-slate-100 p-3 sm:p-5">
        <div className="h-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
          <TemplatePreviewThumbnail templateId={
            ({
              "dental-clinic": "dental-clinic-v1",
              "renovation-contractor": "renovation-contractor-v1",
              "professional-advisory": "law-firm-v1",
              "tuition-centre": "tuition-centre-v1",
              "beauty-wellness": "salon-spa-v1",
              "accounting-firm": "accounting-firm-v1"
            } as Record<string, string>)[item.livePreviewSlug] || "dental-clinic-v1"
          } templateName={item.title} className="h-full"/>
        </div>
      </div>
    ) : <div className="flex aspect-[8/5] flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-slate-200 text-slate-500">
      <ImageIcon size={30} strokeWidth={1.2} />
      <span className="text-xs font-semibold">Screenshot to be added</span>
    </div>}
    {item.featured && <span className="absolute left-3 top-3 rounded-sm bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">Featured concept</span>}
  </div>;
}

export function PortfolioShowcaseCard({ item }: { item: PortfolioItem }) {
  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#dce2e8] bg-white shadow-[0_12px_28px_-25px_rgba(20,24,33,.25)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-25px_rgba(20,24,33,.32)]" data-testid="portfolio-card">
    <Link to={`/case-studies/showcase/${item.slug}`} aria-label={`View ${item.title} design study`}>
      <PortfolioShowcaseVisual item={item} compact />
    </Link>
    <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#526073]"><span>{item.category}</span><span aria-hidden="true">·</span><span>{item.style}</span></div>
      <h3 className="mt-3 text-xl font-bold leading-tight tracking-tight text-[#141821]">{item.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.headline}</p>
      <p className="mt-3 text-xs text-slate-500">Illustrative design concept · {item.goal}</p>
      <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-5 text-sm font-semibold">
        <Link to={`/case-studies/showcase/${item.slug}`} className="text-[#1741ed] hover:underline">Explore design study →</Link>
        {item.livePreviewSlug && <Link to={`/case-studies/showcase/${item.livePreviewSlug}/preview`} className="text-slate-700 hover:underline">Live demo ↗</Link>}
      </div>
    </div>
  </article>;
}
