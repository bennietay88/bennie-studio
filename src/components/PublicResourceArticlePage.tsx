import React from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getResourceArticle } from "../content/resources";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";

export default function PublicResourceArticlePage() {
  const { slug } = useParams();
  const article = getResourceArticle(slug);

  if (!article) {
    return <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#15191f]"><Helmet><title>Resource unavailable | Bennie Studio</title><meta name="robots" content="noindex" /></Helmet><PublicSiteHeader /><main id="main-content" className="brand-shell flex min-h-[60vh] items-center py-16"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">Bennie Studio · Resources</p><h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">This resource is no longer available.</h1><p className="mt-4 text-base leading-7 text-[#526071]">Explore the current website guides and practical tools instead.</p><Link to="/resources" className="mt-7 inline-flex min-h-12 items-center rounded-lg bg-[#1741ed] px-6 py-3 text-sm font-bold text-white hover:bg-[#1035c2]">Browse resources<ArrowRight className="ml-2 h-4 w-4" /></Link></div></main><PublicSiteFooter /></div>;
  }

  return (
    <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#141821]">
      <Helmet><title>{article.title} | Bennie Studio</title><meta name="description" content={article.excerpt} /><link rel="canonical" href={`https://app.bennietay.com/resources/${article.slug}`} /></Helmet>
      <PublicSiteHeader />
      <main id="main-content">
        <section className="border-b border-[#dce2e8] bg-[#f8f8f5]">
          <div className="brand-shell grid gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:items-center lg:py-24">
            <div className="lg:col-span-7">
              <Link to="/resources" className="inline-flex items-center text-sm font-semibold text-[#657181] transition hover:text-[#1741ed]"><ArrowLeft className="mr-2 h-4 w-4" />Back to resources</Link>
              <p className="brand-kicker mt-9 !text-[#1741ed]">{article.category}</p>
              <h1 className="mt-4 !max-w-[17ch] !text-[#15191f]">{article.title}</h1>
              <p className="brand-copy mt-6 !max-w-2xl !text-[#5b6775]">{article.excerpt}</p>
              <div className="mt-7 flex flex-wrap gap-5 text-xs font-semibold text-[#526071]"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#9f93ff]" />{article.readTime}</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#9f93ff]" />Bennie Studio editorial</span></div>
            </div>
            <div className="lg:col-span-5"><div className="bs3-image-card !border-white/10"><img src={article.image} alt="" className="aspect-[4/3] w-full object-cover" /></div></div>
          </div>
        </section>
        <article className="brand-shell grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="max-w-3xl">
            <p className="text-xl font-medium leading-9 text-[#344054]">{article.intro}</p>
            <div className="mt-12 space-y-10">
              {article.sections.map((section, index) => <section key={section.heading} className="border-t border-[#dfe3eb] pt-7"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6252f4]">0{index + 1}</p><h2 className="mt-3 text-3xl">{section.heading}</h2><p className="mt-4 text-base leading-8 text-[#526071]">{section.body}</p></section>)}
            </div>
            <div className="mt-12 rounded-2xl border border-[#dfe3eb] bg-white p-6 sm:p-8"><h2 className="mt-3 text-2xl">Want to see what this means for your website?</h2><p className="brand-copy mt-3">Start with a guided brief and get a concrete direction shaped around your business.</p><Link to="/generate-preview" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1741ed] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1035c2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1741ed] focus-visible:ring-offset-2">Get a free website preview<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
          </div>
          <aside className="lg:pt-2"><div className="sticky top-28 rounded-2xl border border-[#dfe3eb] bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Explore more</p><div className="mt-5 space-y-4"><Link to="/resources" className="flex items-center justify-between gap-3 text-sm font-semibold text-[#172033]">Browse all resources<ArrowRight className="h-4 w-4 text-[#6252f4]" /></Link><Link to="/website-audit" className="flex items-center justify-between gap-3 text-sm font-semibold text-[#172033]">Run a website audit<ArrowRight className="h-4 w-4 text-[#6252f4]" /></Link><Link to="/case-studies" className="flex items-center justify-between gap-3 text-sm font-semibold text-[#172033]">See the work<ArrowRight className="h-4 w-4 text-[#6252f4]" /></Link></div></div></aside>
        </article>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
