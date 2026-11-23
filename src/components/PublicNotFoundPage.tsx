import React from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Home, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";

export default function PublicNotFoundPage() {
  return (
    <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#15191f]">
      <Helmet>
        <title>Page not found | Bennie Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <PublicSiteHeader />
      <main id="main-content" className="brand-shell flex min-h-[65vh] items-center py-14 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">Error 404 · Page not found</p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">That page isn't here.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#526071]">The link might have changed or the page is no longer available. Find the service or resource you need below.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="inline-flex min-h-12 items-center rounded-lg bg-[#1741ed] px-6 py-3 text-sm font-bold text-white hover:bg-[#1035c2]"><Home className="mr-2 h-4 w-4" /> Go to homepage</Link>
            <Link to="/services" className="inline-flex min-h-12 items-center rounded-lg border border-[#dbe1ea] bg-white px-6 py-3 text-sm font-bold text-[#1741c9] hover:bg-[#eef3ff]">Explore services <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
          <div className="mt-12 border-t border-[#dbe1ea] pt-6">
            <p className="text-sm font-semibold text-[#25364b]">Looking for practical website advice?</p>
            <Link to="/resources" className="mt-3 inline-flex items-center text-sm font-bold text-[#1741c9] underline underline-offset-4 hover:text-[#1035c2]"><Search className="mr-2 h-4 w-4" /> Browse resources</Link>
          </div>
        </div>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
