import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronRight, Clock3, FileText, Globe2, LayoutTemplate, MessageCircle, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { PLAN_DELIVERY_STANDARDS } from "../constants/deliveryStandards";
import { COMMERCIAL_FALLBACK_PRODUCTS, formatCommercialMoney, getCommercialPrice, getMinimumTermMonths } from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import "../styles/publicBrand.css";

const audiences = [
  { number: "01", title: "Consultants & advisors", detail: "Give potential clients a considered introduction to your expertise, background and approach." },
  { number: "02", title: "Independent specialists", detail: "Make your services, experience and ways to get in touch easier to find in one place." },
  { number: "03", title: "Freelancers & creatives", detail: "Bring your work highlights, professional story and contact details under your own domain." },
] as const;

const contentBlocks = [
  { title: "A clear introduction", detail: "What you do, who you work with and why someone should reach out.", icon: BadgeCheck },
  { title: "Your professional background", detail: "Approved biography, expertise and credentials presented with clarity.", icon: FileText },
  { title: "Selected work & experience", detail: "A focused space for genuine examples, projects or professional highlights.", icon: LayoutTemplate },
  { title: "A direct contact path", detail: "A contact form and links to the channels you already use, where supplied.", icon: MessageCircle },
] as const;

const process = [
  { number: "01", title: "Share your story", detail: "Provide your biography, services, credentials, photos and preferred contact details. We'll confirm what is needed." },
  { number: "02", title: "We shape your pages", detail: "Your information is organised into the agreed fixed-format profile structure, then checked for mobile usability and clarity." },
  { number: "03", title: "Review and approve", detail: "See the draft, request one consolidated pre-launch revision and approve the final version before publishing." },
  { number: "04", title: "Stay supported", detail: "Hosting, SSL and maintenance continue after launch, with the included small monthly content-edit allowance." },
] as const;

const questions = [
  { question: "Is this a fully custom website?", answer: "No. Personal Profile uses a streamlined fixed-format layout and 3–5 professional pages. Bespoke design, complex integrations and advanced functionality require a separate scope." },
  { question: "Do I need to write the content?", answer: "You provide accurate approved information, credentials, imagery and selected work examples. We organise that material into the standard page structure. Bespoke copywriting is not included." },
  { question: "Can I use my own domain?", answer: "Yes. We support connecting a customer-owned domain. Domain registration or renewal fees are separate, and ownership remains with you." },
  { question: "What can I update after launch?", answer: "The plan includes one small content-edit request per month, up to 15 minutes. Larger content changes, redesigns and additional features are separately scoped." },
  { question: "What happens after the initial commitment?", answer: "The standard term is three months, then month-to-month unless your accepted order specifies otherwise. Review the terms and cancellation provisions before paying." },
] as const;

function ProfilePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[490px] lg:ml-auto" aria-label="Illustrative professional profile website layout">
      <div className="absolute -left-5 top-14 h-48 w-48 rounded-full bg-[#c9d8ff]/65 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-7 bottom-10 h-48 w-48 rounded-full bg-[#ffdcbf]/60 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[18px] border border-[#d8e1ed] bg-white shadow-[0_32px_88px_-32px_rgba(15,23,42,.34)]">
        <div className="flex h-11 items-center justify-between border-b border-[#e9edf4] bg-[#fcfcfd] px-5">
          <span className="flex items-center gap-1.5" aria-hidden="true"><i className="h-2 w-2 rounded-full bg-[#d6deeb]" /><i className="h-2 w-2 rounded-full bg-[#d6deeb]" /><i className="h-2 w-2 rounded-full bg-[#d6deeb]" /></span>
          <span className="text-[10px] font-semibold tracking-[.13em] text-[#67758b]">PROFILE WEBSITE PREVIEW</span>
          <Globe2 className="h-3.5 w-3.5 text-[#8995a8]" aria-hidden="true" />
        </div>
        <div className="border-b border-[#e2e8f0] px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold tracking-[-.03em] text-[#15233b]">ALEX MORGAN<span className="text-[#2656da]">.</span></span>
            <span className="text-[10px] font-medium text-[#69778c]">About · Work · Contact</span>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_116px] items-center gap-3 px-6 pb-8 pt-9 sm:grid-cols-[1fr_148px] sm:px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#2258d5]">INDEPENDENT CONSULTANT</p>
            <h3 className="mt-3 !text-[clamp(1.7rem,3vw,2.35rem)] !font-semibold !leading-[1.1] !tracking-[-.05em] !text-[#14213a]">Helping good ideas become clear decisions.</h3>
            <p className="mt-3 !text-xs !leading-5 !text-[#69778c]">Strategy, research and practical support for growing teams.</p>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#2154d4] px-3 py-2 text-[11px] font-semibold text-white">Get in touch <ArrowUpRight className="h-3 w-3" /></span>
          </div>
          <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-t-[65px] rounded-b-lg bg-gradient-to-br from-[#d7e4f3] via-[#c3d4e8] to-[#789bc4]">
            <div className="absolute -right-5 -top-4 h-24 w-24 rounded-full border border-white/40" />
            <div className="absolute bottom-0 h-24 w-28 rounded-t-[62px] bg-[#264b77]" />
            <div className="absolute bottom-[78px] h-[55px] w-[53px] rounded-[50%] bg-[#e5c7ad] shadow-[0_7px_0_0_#1c3349]" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-0 border-t border-[#e7ebf3] bg-[#f8fafc] px-6 py-5 sm:px-8">
          {[["01","About"],["02","Expertise"],["03","Selected work"]].map(([n,t]) => (
            <div key={n} className="border-l border-[#d9e0eb] pl-3 first:border-l-0 first:pl-0">
              <span className="block text-[10px] font-semibold text-[#2459db]">{n}</span>
              <span className="mt-1 block text-[11px] font-semibold text-[#22304a]">{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-5 -left-4 hidden rounded-lg border border-[#e0e6f0] bg-white px-4 py-3 shadow-[0_16px_35px_-18px_rgba(15,23,42,.3)] sm:block">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#1b2942]"><MonitorSmartphone className="h-4 w-4 text-[#1d4ed8]" /> Designed for every screen</span>
      </div>
      <p className="relative mt-9 text-center text-[11px] text-[#748095]">Illustrative concept only — not a real client or a guaranteed design.</p>
    </div>
  );
}

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
        <title>Personal Profile Websites for Professionals | Bennie Studio</title>
        <meta name="description" content="A professional website built around your expertise. Explore Bennie Studio's Personal Profile service: 3–5 managed pages, contact links, hosting and ongoing care." />
        <link rel="canonical" href="https://app.bennietay.com/personal-profile" />
      </Helmet>
      <PublicSiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-[#e2e8f0] bg-[#f6f8fd]">
          <div className="pointer-events-none absolute -right-16 -top-32 h-[480px] w-[480px] rounded-full border border-[#dce5f4]" aria-hidden="true" />
          <div className="brand-shell relative grid gap-14 py-16 md:py-24 lg:grid-cols-12 lg:items-center lg:py-28">
            <div className="lg:col-span-6">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#2153cc]"><span className="h-1.5 w-1.5 rounded-full bg-[#2153cc]" /> PERSONAL PROFILE BY BENNIE STUDIO</p>
              <h1 className="mt-6 max-w-[12ch] !text-[clamp(2.8rem,5.2vw,4.8rem)] !leading-[1.05] !tracking-[-.055em] !text-[#10203b]">Be known for what you do. <span className="text-[#2459d8]">Not just where you post.</span></h1>
              <p className="mt-7 max-w-xl !text-lg !leading-8 text-[#506078]">
                A polished home for your expertise, experience and contact details. Built for independent professionals who want a more credible online presence without running a website themselves.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/pricing#plan-personal-profile" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2052d3] px-6 text-sm font-semibold text-white transition hover:bg-[#143eb1]">Explore the plan <ArrowRight className="h-4 w-4" /></Link>
                <a href="#profile-includes" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#c7d3e6] bg-white px-6 text-sm font-semibold text-[#20304a] transition hover:border-[#2459d8]">See what is included <ChevronRight className="h-4 w-4" /></a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#d9e2ef] pt-6 text-sm text-[#52627c]">
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#2256ce]" /> 3–5 profile pages</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#2256ce]" /> Hosting managed</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#2256ce]" /> Monthly content care</span>
              </div>
            </div>
            <div className="lg:col-span-6"><ProfilePreview /></div>
          </div>
        </section>

        <section className="brand-shell py-16 md:py-24">
          <div className="grid gap-7 md:grid-cols-[.8fr_1.2fr] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2153cc]">WHO IT'S FOR</p>
              <h2 className="mt-4 max-w-[14ch] !text-[clamp(2.1rem,3.5vw,3.4rem)] !leading-[1.1] !text-[#10203b]">A better first impression, wherever people discover you.</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#52627c]">Social accounts and directory listings are useful, but they rarely tell your full professional story. A dedicated profile gives someone one clear place to understand your work and make an enquiry.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {audiences.map((item) => (
              <article key={item.number} className="flex min-h-[255px] flex-col rounded-xl border border-[#dce3ec] bg-white p-7 transition-shadow hover:shadow-[0_18px_38px_-28px_rgba(15,23,42,.3)]">
                <p className="text-xs font-bold tracking-[.12em] text-[#2458ce]">{item.number} / PROFESSIONAL PROFILE</p>
                <h3 className="mt-9 !text-xl !text-[#172640]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#57677f]">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="profile-includes" className="scroll-mt-24 bg-[#0f1b31] text-white">
          <div className="brand-shell grid gap-12 py-20 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5">
              <p className="text-xs font-bold uppercase tracking-[.15em] !text-[#a9c2ff]">THE WEBSITE</p>
              <h2 className="mt-4 !text-[clamp(2.2rem,3.5vw,3.65rem)] !leading-[1.1] !text-white">More than an online business card.</h2>
              <p className="mt-5 max-w-md text-base leading-8 !text-[#bac8dc]">Each section has a job: introduce you, establish credibility, give context to your work and help the right person connect. Your approved content is the foundation.</p>
              <div className="mt-8 rounded-lg border border-white/15 bg-white/[.06] p-5">
                <p className="text-xs font-bold uppercase tracking-[.12em] !text-[#a9c2ff]">DELIVERY FORMAT</p>
                <p className="mt-2 text-base font-semibold !text-white">{delivery.pages}</p>
                <p className="mt-2 text-sm !text-[#b9c7dc]">A tailored arrangement of standard profile sections, not a bespoke multi-feature web application.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
              {contentBlocks.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-xl border border-white/15 bg-white/[.065] p-6">
                    <Icon className="h-6 w-6 text-[#a9c2ff]" aria-hidden="true" />
                    <h3 className="mt-7 !text-xl !text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 !text-[#bbcae0]">{item.detail}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="brand-shell grid gap-12 py-20 md:py-24 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2052d3]">BUILT & MAINTAINED</p>
            <h2 className="mt-4 !text-[clamp(2.1rem,3.4vw,3.5rem)] !leading-[1.1] !text-[#10203b]">A simple process. A site you don't have to manage alone.</h2>
            <p className="mt-5 max-w-md text-base leading-8 text-[#52627c]">We handle the website production and ongoing essentials. You remain in control of the information that represents you.</p>
            <div className="mt-7 flex items-center gap-3 rounded-lg border border-[#dbe4f0] bg-[#f5f8fe] p-4 text-sm text-[#344560]"><Clock3 className="h-5 w-5 shrink-0 text-[#2259d7]" /><span>{delivery.targetFirstDraft}.</span></div>
          </div>
          <ol className="relative space-y-0 border-l border-[#dce3ec] pl-6 sm:pl-10 lg:col-span-7">
            {process.map((step) => (
              <li key={step.number} className="relative border-b border-[#e4e9f1] py-6 first:pt-0 last:border-b-0 last:pb-0">
                <span className="absolute -left-[36px] top-6 flex h-7 w-7 items-center justify-center rounded-full border border-[#c7d5ed] bg-white text-[10px] font-bold text-[#2052d3] first:top-0 sm:-left-[52px]">{step.number}</span>
                <h3 className="!text-lg !text-[#172640]">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#52627c]">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-[#e0e7f1] bg-[#f6f8fc]">
          <div className="brand-shell grid gap-12 py-20 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-6">
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2052d3]">CLEAR SCOPE & PRICING</p>
              <h2 className="mt-4 !text-[clamp(2.15rem,3.6vw,3.65rem)] !leading-[1.1] !text-[#10203b]">Everything necessary. Nothing hidden in a long feature list.</h2>
              <p className="mt-5 max-w-lg text-base leading-8 text-[#52627c]">Personal Profile is a streamlined managed service for a professional web presence. The following allowances are included in its standard scope.</p>
              <ul className="mt-8 space-y-4">
                {[delivery.pages, delivery.revisions, delivery.updates, delivery.seo, "Managed hosting, SSL and routine maintenance", "Customer-owned domain connection support"].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-7 text-[#34445e]">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-[#2052d3]" /> {item}
                  </li>
                ))}
              </ul>
              <p className="mt-7 max-w-lg text-sm leading-7 text-[#6b7890]">Your biography, professional credentials, images and work examples must be supplied or approved by you. Custom copywriting, integrations, new domain registration and major redesigns are outside this standard service.</p>
            </div>
            <aside className="overflow-hidden rounded-2xl border border-[#d6e0ed] bg-white shadow-[0_24px_65px_-35px_rgba(15,23,42,.23)] lg:col-span-6" aria-label="Personal Profile plan pricing">
              <div className="border-b border-[#e6ebf2] px-7 py-7 sm:px-9">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-[#2255cc]">PERSONAL PROFILE PLAN</p>
                  <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-[11px] font-semibold text-[#2755b4]">Managed service</span>
                </div>
                <div className="mt-6 flex items-baseline gap-2" aria-live="polite">
                  <p className="!text-[clamp(2.45rem,4.6vw,3.5rem)] !font-semibold !leading-none !tracking-[-.06em] !text-[#11213b]">{priceReady ? formatCommercialMoney(price!.monthlyPrice!, price!.currency) : loading ? "Checking…" : "Price unavailable"}</p>
                  {priceReady && <span className="text-base text-[#68778d]">/month</span>}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#57677e]">{priceReady ? `+ ${formatCommercialMoney(price!.setupFee, price!.currency)} one-time setup` : "Live rate confirmation is required before checkout."}</p>
              </div>
              <div className="px-7 py-7 sm:px-9">
                {priceReady && (
                  <dl className="space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4"><dt className="text-[#617086]">First payment</dt><dd className="font-semibold text-[#10203b]">{formatCommercialMoney(price!.setupFee + price!.monthlyPrice!, price!.currency)}</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt className="text-[#617086]">Standard initial term</dt><dd className="font-semibold text-[#10203b]">{term} months</dd></div>
                    <div className="flex items-center justify-between gap-4 border-t border-[#e7ebf1] pt-4"><dt className="text-[#617086]">Initial term total, before tax</dt><dd className="font-semibold text-[#10203b]">{formatCommercialMoney(price!.setupFee + term * price!.monthlyPrice!, price!.currency)}</dd></div>
                  </dl>
                )}
                <div className="mt-6 flex items-start gap-3 rounded-lg bg-[#f3f7ff] p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2255cc]" />
                  <p className="text-sm leading-6 text-[#41526b]">Hosting and maintenance continue after launch. You approve the finished website before it is published.</p>
                </div>
                <Link to="/pricing#plan-personal-profile" className="mt-7 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2052d3] px-5 text-sm font-semibold text-white transition hover:bg-[#143eb1]">Review full scope & choose <ArrowRight className="h-4 w-4" /></Link>
                <p className="mt-4 text-center text-xs leading-6 text-[#6b7890]">Then month-to-month unless the accepted order states otherwise. Complete terms and any offers are reviewed before payment.</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="brand-shell grid gap-10 py-20 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2052d3]">GOOD TO KNOW</p>
            <h2 className="mt-4 !text-[clamp(2.1rem,3.4vw,3.35rem)] !leading-[1.1] !text-[#10203b]">The details that make the decision easier.</h2>
            <p className="mt-5 text-base leading-8 text-[#52627c]">A straightforward plan works best when expectations are clear from the start.</p>
          </div>
          <div className="border-t border-[#dce3ec] lg:col-span-8">
            {questions.map((item) => (
              <details key={item.question} className="group border-b border-[#dce3ec] px-5 py-5 sm:px-8">
                <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-[#10203b] outline-none focus-visible:ring-2 focus-visible:ring-[#2052d3] focus-visible:ring-offset-4">
                  {item.question}<span className="shrink-0 text-xl font-medium text-[#2052d3] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-2xl pb-2 pt-3 text-sm leading-7 text-[#52627c]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-[#1740a5] text-white">
          <div className="brand-shell grid gap-8 py-16 md:grid-cols-[1.2fr_.8fr] md:items-center md:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] !text-[#c7d7ff]">YOUR NEXT STEP</p>
              <h2 className="mt-4 max-w-[16ch] !text-[clamp(2.2rem,4vw,3.8rem)] !leading-[1.09] !text-white">Give your professional story a better home.</h2>
              <p className="mt-5 max-w-xl text-base leading-8 !text-[#dce6ff]">Choose the Personal Profile plan or explore a preliminary direction before deciding. Your profile should be clear, credible and easy to contact.</p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link to="/pricing#plan-personal-profile" className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-[#1740a5] transition hover:bg-[#eaf0ff]">Explore Personal Profile <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/generate-preview" className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-lg border border-white/45 px-6 text-sm font-semibold text-white transition hover:bg-white/10">Try a free website direction <Sparkles className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>
      </main>
      <PublicSiteFooter tagline="Managed professional websites that introduce your work clearly and make it easier for clients to connect." />
    </div>
  );
}
