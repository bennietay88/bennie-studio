import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PLATFORM_CMS_PAGES, usePublishedPlatformCms } from "../lib/platformSiteCms";

function Action({ href, children }: { href: string; children: React.ReactNode }) {
  if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1741ed] px-5 text-sm font-semibold text-white">{children}<ArrowUpRight size={16}/></a>;
  if (href.startsWith("/")) return <Link to={href} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1741ed] px-5 text-sm font-semibold text-white">{children}<ArrowUpRight size={16}/></Link>;
  return null;
}

export function PlatformCmsSections({ path }: { path: string }) {
  const cms = usePublishedPlatformCms();
  const sections = cms.pages[path]?.sections || [];
  if (!sections.length) return null;
  return <div className="space-y-0" data-platform-cms-sections={path}>
    {sections.map((section) => <section key={section.id} className={section.type === "cta" ? "border-y border-[#dfe2ea] bg-[#101827] text-white" : "border-y border-[#e5e7eb] bg-white text-[#101827]"}>
      <div className="mx-auto max-w-[88rem] px-6 py-14 sm:px-10 sm:py-18 lg:px-12 lg:py-20">
        {section.type === "image_text" ? <div className="grid items-center gap-8 lg:grid-cols-2">{section.imageUrl ? <img src={section.imageUrl} alt="" loading="lazy" className="max-h-[34rem] w-full rounded-2xl object-cover"/> : <div className="min-h-48 rounded-2xl bg-slate-100"/>}<div><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{section.title}</h2><p className="mt-4 whitespace-pre-line text-base leading-7 text-slate-600">{section.body}</p></div></div>
          : <div className={section.type === "cta" ? "mx-auto max-w-4xl text-center" : ""}>
            {section.title ? <h2 className="max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl">{section.title}</h2> : null}
            {section.body ? <p className={`mt-4 max-w-3xl whitespace-pre-line text-base leading-7 ${section.type === "cta" ? "mx-auto text-white/75" : "text-slate-600"}`}>{section.body}</p> : null}
            {section.imageUrl ? <img src={section.imageUrl} alt="" loading="lazy" className="mt-7 max-h-[34rem] w-full rounded-2xl object-cover"/> : null}
            {section.type === "feature_grid" && section.items.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{section.items.map((item, index) => <article key={`${section.id}-${index}`} className="rounded-2xl border border-slate-200 bg-[#f8f9fb] p-5">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="mb-4 aspect-[16/9] w-full rounded-xl object-cover"/> : null}<h3 className="text-lg font-bold">{item.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{item.body}</p></article>)}</div> : null}
            {section.type === "faq" && section.items.length ? <div className="mt-8 max-w-4xl border-t border-slate-200">{section.items.map((item, index) => <details key={`${section.id}-${index}`} className="border-b border-slate-200 py-4"><summary className="cursor-pointer text-base font-semibold">{item.title}</summary><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{item.body}</p></details>)}</div> : null}
            {section.type === "cta" && section.ctaLabel && section.ctaHref ? <Action href={section.ctaHref}>{section.ctaLabel}</Action> : null}
          </div>}
      </div>
    </section>)}
  </div>;
}

export function PlatformCmsPageBody({ path }: { path: string }) {
  const cms = usePublishedPlatformCms();
  const page = cms.pages[path];
  const pageLabel = PLATFORM_CMS_PAGES.find((entry) => entry.path === path)?.label || "Website";
  const href = page?.primaryCtaHref?.startsWith("/") && !page.primaryCtaHref.startsWith("//") ? page.primaryCtaHref : "/generate-preview";
  return <main data-platform-cms-page={path}>
    <section className="border-b border-[#dfe2ea] bg-[#f8f8f5]">
      <div className="mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-20 lg:px-12 lg:py-24">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1741ed]">Bennie Studio</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-[#101827] sm:text-5xl lg:text-6xl">{page?.heroTitle || pageLabel}</h1>
        {page?.heroDescription ? <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-8 text-slate-600">{page.heroDescription}</p> : null}
        <Link to={href} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1741ed] px-6 text-sm font-bold text-white">{page?.primaryCtaLabel || "Get a free website preview"}<ArrowUpRight size={17}/></Link>
      </div>
    </section>
    <PlatformCmsSections path={path}/>
  </main>;
}

export function PlatformCmsFinalCta({ path, fallbackTitle = "", fallbackBody = "", fallbackLabel = "Get a free website preview", fallbackHref = "/generate-preview" }: { path: string; fallbackTitle?: string; fallbackBody?: string; fallbackLabel?: string; fallbackHref?: string }) {
  const cms = usePublishedPlatformCms();
  const page = cms.pages[path];
  const title = page?.finalCtaTitle || fallbackTitle;
  const body = page?.finalCtaDescription || fallbackBody;
  if (!title && !body) return null;
  const href = page?.primaryCtaHref?.startsWith("/") && !page.primaryCtaHref.startsWith("//") ? page.primaryCtaHref : fallbackHref;
  return <section className="border-y border-white/10 bg-[#1741dd] text-white"><div className="mx-auto grid max-w-[88rem] gap-7 px-6 py-12 sm:px-10 md:grid-cols-[1fr_auto] md:items-center lg:px-12"><div>{title ? <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2> : null}{body ? <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">{body}</p> : null}</div><Link to={href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-slate-950">{page?.primaryCtaLabel || fallbackLabel}<ArrowUpRight size={17}/></Link></div></section>;
}
