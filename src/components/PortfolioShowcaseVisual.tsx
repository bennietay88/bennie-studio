import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { PortfolioItem } from "../lib/portfolioCatalog";
import { portfolioDemoSlug } from "../lib/studioInteractiveDemos";

/** Real design-study assets already shipped with Bennie Studio. Keep stored CMS
 * media authoritative; use these curated built-in screenshots when empty. */
const bundledDesignScreenshots: Record<string,{full:string;thumbnail:string}> = {
  "dental-clinic": { full:"/images/case-studies/optimized/dental-clinic-desktop.jpg", thumbnail:"/images/case-studies/optimized/dental-clinic-desktop-768.jpg" },
  "renovation-contractor": { full:"/images/case-studies/optimized/renovation-contractor-desktop.jpg", thumbnail:"/images/case-studies/optimized/renovation-contractor-desktop-768.jpg" },
  "professional-advisory": { full:"/images/case-studies/optimized/consultant-desktop.jpg", thumbnail:"/images/case-studies/optimized/consultant-desktop-768.jpg" },
  "tuition-centre": { full:"/images/case-studies/optimized/tuition-centre-desktop.jpg", thumbnail:"/images/case-studies/optimized/tuition-centre-desktop-768.jpg" },
  "beauty-wellness": { full:"/images/case-studies/optimized/beauty-studio-desktop.jpg", thumbnail:"/images/case-studies/optimized/beauty-studio-desktop-768.jpg" },
};

/** A deliberately labelled concept composition is safer than an empty,
 * broken or fabricated client screenshot. Always distinguish it from demos. */
function PortfolioConceptFallback({item}:{item:PortfolioItem}) {
  const category=item.category.toLowerCase();
  const theme=category.includes("health") || category.includes("pet")
    ? "care" : category.includes("property") || category.includes("creative") || category.includes("event")
    ? "editorial" : category.includes("home") || category.includes("automotive")
    ? "service" : category.includes("finance") || category.includes("professional")
    ? "corporate" : "warm";
  return <div className={`portfolio-concept-preview portfolio-concept-${theme}`}
    role="img" aria-label={`Illustrative ${item.category.toLowerCase()} website direction for ${item.title}`}>
    <div className="portfolio-concept-nav"><span>{item.title}</span><span aria-hidden="true">SERVICES &nbsp; · &nbsp; ABOUT &nbsp; · &nbsp; CONTACT</span></div>
    <div className="portfolio-concept-content">
      <div className="portfolio-concept-message">
        <span className="portfolio-concept-kicker">{item.category.toUpperCase()} / DESIGN CONCEPT</span>
        <strong>{item.headline}</strong>
        <span className="portfolio-concept-cta">{item.goal} <ArrowUpRight size={15} aria-hidden="true"/></span>
      </div>
      <div className="portfolio-concept-art" aria-hidden="true">
        <span className="portfolio-concept-orbit"/>
        <span className="portfolio-concept-illustration">{category.includes("property") ? "01" : category.includes("health") ? "+" : category.includes("home") ? "↗" : "B"}</span>
        <span className="portfolio-concept-art-caption">{item.style}</span>
      </div>
    </div>
    <div className="portfolio-concept-footer"><span>EXPLORATORY WEBSITE DIRECTION</span><span>NOT A CLIENT SCREENSHOT</span></div>
  </div>;
}

export function PortfolioShowcaseVisual({ item, compact = false, priority = false }: {
  item: PortfolioItem;
  compact?: boolean;
  priority?: boolean;
}) {
  const bundledImage = bundledDesignScreenshots[item.slug];
  const image = item.coverImage || item.desktopImage || bundledImage?.full || "";
  const bundledSrcSet = !item.coverImage && !item.desktopImage && bundledImage
    ? `${bundledImage.thumbnail} 768w, ${bundledImage.full} 1448w`
    : undefined;
  const [failedImage, setFailedImage] = React.useState(false);
  React.useEffect(() => setFailedImage(false), [image]);
  return <div className="portfolio-motion-image relative min-w-0 overflow-hidden border-b border-slate-200 bg-[#eef2f7]">
    {image && !failedImage ? <img
      src={image}
      srcSet={bundledSrcSet}
      sizes={compact ? "(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 560px" : "(max-width: 768px) 100vw, 50vw"}
      width={1448}
      height={1086}
      alt={item.imageAlt || `${item.title} illustrative website design study`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailedImage(true)}
      className={`block w-full object-cover object-top ${compact ? "aspect-[8/5]" : "aspect-[8/5]"}`}
    /> : <PortfolioConceptFallback item={item}/>}
    {item.featured && <span className="absolute left-3 top-3 rounded bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-900 shadow-sm">Featured concept</span>}
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
        {portfolioDemoSlug(item.slug,item.livePreviewSlug) && <Link to={`/case-studies/showcase/${portfolioDemoSlug(item.slug,item.livePreviewSlug)}/preview`} className="text-slate-700 hover:underline">Live demo ↗</Link>}
      </div>
    </div>
  </article>;
}
