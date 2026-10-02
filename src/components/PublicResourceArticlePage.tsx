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
    return <main className="brand-public flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6 text-center text-[#141821]"><div><p className="brand-kicker">Resource</p><h1 className="mt-4">This resource is not available.</h1><Link to="/resources" className="mt-7 inline-flex items-center font-semibold text-[#6252f4]">Back to resources<ArrowRight className="ml-2 h-4 w-4" /></Link></div></main>;
  }

  return (
    <div className="brand-public min-h-screen bg-[#f6f7fb] text-[#141821]">
      <Helmet><title>{article.title} | Bennie Studio</title><meta name="description" content={article.excerpt} /></Helmet>
      <PublicSiteHeader />
      <main>
        <section className="bs3-dark bs3-grid border-b border-white/10">
          <div className="brand-shell grid gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:items-center lg:py-24">
            <div className="lg:col-span-7">
              <Link to="/resources" className="inline-flex items-center text-sm font-semibold text-white/60 transition hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" />Back to resources</Link>
              <p className="brand-kicker mt-9 !text-[#9f93ff]">{article.category}</p>
              <h1 className="mt-4 !max-w-[17ch] !text-white">{article.title}</h1>
              <p className="brand-copy mt-6 !max-w-2xl !text-white/68">{article.excerpt}</p>
              <div className="mt-7 flex flex-wrap gap-5 text-xs font-semibold text-white/55"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#9f93ff]" />{article.readTime}</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#9f93ff]" />Bennie Studio editorial</span></div>
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
            <div className="mt-12 rounded-2xl border border-[#dfe3eb] bg-white p-6 sm:p-8"><p className="brand-kicker">Put it into practice</p><h2 className="mt-3 text-2xl">Want to see what this means for your website?</h2><p className="brand-copy mt-3">Start with a guided brief and get a concrete direction shaped around your business.</p><Link to="/website-audit" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6252f4] px-6 py-3 text-sm font-semibold text-white">Get a website review<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
          </div>
          <aside className="lg:pt-2"><div className="sticky top-28 rounded-2xl border border-[#dfe3eb] bg-white p-5"><p className="brand-kicker">More from Bennie Studio</p><div className="mt-5 space-y-4"><Link to="/resources" className="flex items-center justify-between gap-3 text-sm font-semibold text-[#172033]">Browse all resources<ArrowRight className="h-4 w-4 text-[#6252f4]" /></Link><Link to="/website-audit" className="flex items-center justify-between gap-3 text-sm font-semibold text-[#172033]">Run a website audit<ArrowRight className="h-4 w-4 text-[#6252f4]" /></Link><Link to="/case-studies" className="flex items-center justify-between gap-3 text-sm font-semibold text-[#172033]">See the work<ArrowRight className="h-4 w-4 text-[#6252f4]" /></Link></div></div></aside>
        </article>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
