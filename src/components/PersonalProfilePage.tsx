import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Check, Globe2, LayoutTemplate, ShieldCheck } from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { PLAN_DELIVERY_STANDARDS } from "../constants/deliveryStandards";
import { COMMERCIAL_FALLBACK_PRODUCTS, formatCommercialMoney, getCommercialPrice, getMinimumTermMonths } from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import "../styles/publicBrand.css";

const included = [
  { title: "Your professional story", detail: "An introduction, genuine credentials and relevant experience — all easy to understand." },
  { title: "A clear way to connect", detail: "Contact and social links make it simple for people to reach you." },
  { title: "A site that works everywhere", detail: "Responsive pages with essential SEO, hosting, SSL and maintenance handled." },
] as const;

export default function PersonalProfilePage() {
  const { products, loading, error } = usePublicCommercialPricing("INTL");
  const product = products.find((item) => item.slug === "personal-profile")
    || COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "personal-profile");
  const price = product ? getCommercialPrice(product, "INTL") : undefined;
  const priceReady = !loading && !error && price?.monthlyPrice != null;
  const term = getMinimumTermMonths(price);
  const delivery = PLAN_DELIVERY_STANDARDS["personal-profile"];

  return (
    <div className="brand-public min-h-screen bg-white text-[#0F172A]">
      <Helmet>
        <title>Personal Profile Website | Bennie Studio</title>
        <meta name="description" content="An easy-to-manage professional profile website, designed, hosted and maintained by Bennie Studio. Explore the live scope and pricing." />
        <link rel="canonical" href="https://app.bennietay.com/personal-profile" />
      </Helmet>
      <PublicSiteHeader />
      <main>
        <section className="border-b border-[#e2e8f0] bg-[#f8fafc]">
          <div className="brand-shell grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1D4ED8]">PERSONAL PROFILE WEBSITE</p>
              <h1 className="mt-5 max-w-3xl text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-[1.08] tracking-[-.05em] text-[#0F172A]">
                Your work deserves a place of its own.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#475569]">
                Bring your professional story, expertise and contact details together in one considered website. Bennie Studio builds it and looks after the essentials.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/pricing#plan-personal-profile" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#1D4ED8] px-6 text-sm font-semibold text-white hover:bg-[#1741ed]">
                  View pricing & choose plan <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/generate-preview" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-6 text-sm font-semibold text-[#0F172A] hover:border-[#1D4ED8]">
                  Explore a free direction
                </Link>
              </div>
              <p className="mt-5 text-sm text-[#64748b]">For consultants, independent specialists, freelancers and other professionals.</p>
            </div>
            <div className="lg:col-span-5" aria-label="Illustration of a professional profile layout">
              <div className="overflow-hidden rounded-2xl border border-[#dce3ec] bg-white p-4 shadow-[0_24px_65px_-35px_rgba(15,23,42,.35)] sm:p-6">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
                  <span className="text-xs font-bold uppercase tracking-[.16em] text-[#475569]">PROFILE STRUCTURE</span>
                  <span className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-200" /><i className="h-2 w-2 rounded-full bg-slate-200" /><i className="h-2 w-2 rounded-full bg-[#1D4ED8]" /></span>
                </div>
                <div className="mt-6 flex gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#dbeafe] text-[#1D4ED8]"><Globe2 className="h-9 w-9" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-4/5 rounded bg-[#0F172A]" />
                    <div className="mt-3 h-2.5 w-2/3 rounded bg-slate-200" />
                    <div className="mt-2 h-2.5 w-3/4 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-3">
                  {["About", "Expertise", "Selected work", "Contact"].map((label) => (
                    <div key={label} className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                      <LayoutTemplate className="h-5 w-5 text-[#1D4ED8]" />
                      <span className="mt-3 block text-xs font-semibold text-[#334155]">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-5 text-[#64748b]">Illustrative page structure, not a client website or finished design.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="brand-shell py-16 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#1D4ED8]">WHAT YOU GET</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">Everything essential, without the upkeep.</h2>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {included.map((item) => (
              <article key={item.title} className="rounded-xl border border-[#e2e8f0] bg-white p-6">
                <Check className="h-6 w-6 text-[#1D4ED8]" />
                <h3 className="mt-5 text-lg font-semibold text-[#0F172A]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#475569]">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[#e2e8f0] bg-[#f8fafc]">
          <div className="brand-shell grid gap-10 py-16 md:py-20 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#1D4ED8]">THE PERSONAL PROFILE PLAN</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0F172A]">A clear scope. Ongoing care.</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#475569]">Built from your approved biography, experience, images and work examples, with the key pages and services you actually need.</p>
              <ul className="mt-7 grid gap-4 sm:grid-cols-2">
                {[delivery.pages, delivery.revisions, delivery.updates, delivery.seo].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#334155]">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]" />{item}
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-sm leading-6 text-[#64748b]">You provide approved content and credentials. Custom copywriting, advanced integrations and domain registration are outside this standard plan.</p>
            </div>
            <aside className="rounded-xl border border-[#dce3ec] bg-white p-7 shadow-sm lg:col-span-5" aria-label="Personal Profile pricing">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-[#1D4ED8]">PERSONAL PROFILE</p>
              <div aria-live="polite" className="mt-4">
                <p className="text-4xl font-semibold tracking-tight text-[#0F172A]">
                  {priceReady ? formatCommercialMoney(price.monthlyPrice, price.currency) : loading ? "Checking rates…" : "Pricing unavailable"}
                  {priceReady && <span className="text-base font-normal text-[#64748b]"> / month</span>}
                </p>
                <p className="mt-2 text-sm text-[#475569]">{priceReady ? `+ ${formatCommercialMoney(price.setupFee, price.currency)} one-time setup` : "See verified rates before choosing."}</p>
              </div>
              {priceReady && <div className="mt-6 border-t border-[#e2e8f0] pt-5 text-sm leading-6 text-[#475569]">
                <p><strong className="text-[#0F172A]">First payment:</strong> {formatCommercialMoney(price.setupFee + price.monthlyPrice, price.currency)}</p>
                <p className="mt-2">{term}-month initial commitment; {formatCommercialMoney(price.setupFee + term * price.monthlyPrice, price.currency)} total, including setup, before tax. Then month-to-month unless the accepted order states otherwise.</p>
              </div>}
              <div className="mt-6 flex items-start gap-2 border-t border-[#e2e8f0] pt-5 text-sm text-[#475569]">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8]" />
                <p>Managed hosting and maintenance included. You review the finished site before launch.</p>
              </div>
              <Link to="/pricing#plan-personal-profile" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-5 text-sm font-semibold text-white hover:bg-[#1741ed]">
                See full scope & choose plan <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-xs leading-5 text-[#64748b]">Complete order terms and any current offers are confirmed before payment.</p>
            </aside>
          </div>
        </section>
      </main>
      <PublicSiteFooter tagline="Thoughtful, managed websites that help independent professionals build credibility online." />
    </div>
  );
}
