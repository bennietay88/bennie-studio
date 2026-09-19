/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  ClipboardList,
  ExternalLink,
  FileText,
  Globe,
  LayoutTemplate,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Store,
  Target,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { WebsiteConceptVisual } from "./WebsiteConceptVisual";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";

const featuredBuilds = [
  {
    title: "Dental Clinic Website",
    niche: "Clinic / Healthcare",
    plan: "Growth-style build",
    image:
      "/brand-template-preview.svg",
    summary:
      "A patient-friendly clinic website structure for treatments, practitioner trust, FAQs, and appointment enquiries.",
    pages: ["Home", "Treatments", "About Practitioners", "Patient FAQ", "Appointment"],
    conversion: "WhatsApp appointment CTA, treatment enquiry form, clinic location block",
    seo: "Treatment keywords, local clinic metadata, FAQ-ready content",
    sampleHref: "/portfolio/sample/dental",
  },
  {
    title: "Consultant Lead Website",
    niche: "Consultant / Coach",
    plan: "Business-style build",
    image:
      "/brand-template-preview.svg",
    summary:
      "A credibility-first website for consultants who need service positioning, proof sections, and call booking.",
    pages: ["Home", "Services", "Case Results", "FAQ", "Book a Call"],
    conversion: "Strategy-call CTA, service fit questions, direct contact form",
    seo: "Consultant service keywords, professional-service metadata, internal links",
    sampleHref: "/portfolio/sample/consultant",
  },
  {
    title: "Beauty Salon Website",
    niche: "Salon / Beauty",
    plan: "Launch-to-Growth build",
    image:
      "/brand-template-preview.svg",
    summary:
      "A polished service menu and package website for salons, facial studios, aesthetic clinics, and wellness brands.",
    pages: ["Home", "Services", "Packages", "Gallery", "Booking"],
    conversion: "Package CTA, WhatsApp booking, promotion-ready landing sections",
    seo: "Treatment/service terms, local beauty service keywords, gallery alt text",
    sampleHref: "/portfolio/sample/beauty",
  },
  {
    title: "Renovation Contractor Website",
    niche: "Contractor / Renovation",
    plan: "Growth-style build",
    image:
      "/brand-template-preview.svg",
    summary:
      "A quote-focused contractor site with services, project highlights, trust points, and local service areas.",
    pages: ["Home", "Services", "Projects", "Areas Served", "Quote Request"],
    conversion: "Budget enquiry form, project gallery CTA, WhatsApp quote button",
    seo: "Service-area pages, renovation keywords, project-gallery metadata",
    sampleHref: "/portfolio/sample/contractor",
  },
  {
    title: "Restaurant & Cafe Website",
    niche: "Restaurant / F&B",
    plan: "Business-style build",
    image:
      "/brand-template-preview.svg",
    summary:
      "A local discovery website for menus, promotions, reservations, location details, and delivery links.",
    pages: ["Home", "Menu", "Promotions", "Gallery", "Reservation"],
    conversion: "Reservation CTA, WhatsApp order link, map and opening hours",
    seo: "Menu schema-ready content, local dining search terms, location FAQs",
    sampleHref: "/portfolio/sample/restaurant",
  },
  {
    title: "Tuition Centre Website",
    niche: "Education / Tuition",
    plan: "Business-style build",
    image:
      "/brand-template-preview.svg",
    summary:
      "An enrolment-focused website for classes, trial lessons, teacher trust, programmes, and parent enquiries.",
    pages: ["Home", "Programmes", "Teachers", "FAQ", "Trial Class"],
    conversion: "Trial-class CTA, parent enquiry form, programme comparison",
    seo: "Subject keywords, city/class metadata, parent FAQ content",
    sampleHref: "/portfolio/sample/education",
  },
];

const buildCapabilities = [
  {
    icon: MessageCircle,
    title: "WhatsApp Enquiry Flow",
    text: "Each website can route visitors into pre-filled WhatsApp enquiries for services, bookings, or quotes.",
  },
  {
    icon: Search,
    title: "Local SEO Structure",
    text: "Pages can include service areas, city content, local FAQs, SEO titles, and meta descriptions.",
  },
  {
    icon: LayoutTemplate,
    title: "Niche content architecture",
    text: "Clinic, salon, contractor, consultant, restaurant, education, and service-business content architectures.",
  },
  {
    icon: CalendarCheck,
    title: "Booking & Contact CTAs",
    text: "Contact forms, appointment buttons, quote buttons, booking links, and fallback enquiry paths.",
  },
];

const proofPoints = [
  ["Website setup", "Template-based, prepared around the customer’s niche and offer."],
  ["Managed plans", "Managed Website pricing varies by market; start with a free website preview."],
  ["Custom upgrade", "Premium custom website build available when the client needs full CMS control."],
  ["Growth tools", "SEO checks, enquiry tracking, update requests, and monthly improvement suggestions."],
];

const process = [
  ["1", "Choose the build style", "Select a managed website plan or request a custom website quote."],
  ["2", "Submit business details", "Provide services, location, target customer, CTA preference, and brand direction."],
  ["3", "Preview the structure", "Review the content architecture, sections, CTA flow, and SEO-ready content."],
  ["4", "Launch and improve", "Go live, capture enquiries, request updates, and improve the site over time."],
];

export default function PortfolioPage() {
  const navigate = useNavigate();

  return (
    <div className="brand-public min-h-screen bg-[#f6f7fb] text-[#141821]">
      <Helmet>
        <title>Website Portfolio & Case Studies | Bennie Studio</title>
        <meta
          name="description"
          content="Explore Bennie Studio website portfolio and concept case studies for clinics, renovation companies, consultants, restaurants, beauty salons, and education providers."
        />
      </Helmet>

      <PublicSiteHeader />

      <main>
        <section className="brand-grid-bg relative overflow-hidden border-b border-white/10 bg-[#0b1020] text-white">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#5746e8]/20 blur-3xl" />
          <div className="brand-shell relative grid gap-12 py-16 lg:grid-cols-12 lg:items-center lg:py-24">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="lg:col-span-5">
              <p className="brand-kicker !text-[#b9b1ff]">Website work</p>
              <h1 className="mt-5 !max-w-[13ch] !text-white">Website work that shows the thinking behind the design.</h1>
              <p className="brand-copy brand-muted-on-dark mt-6">Explore service-business website directions through positioning, proof, enquiry flow and local search context. The examples show possibilities, not a fixed template or page count.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => navigate("/generate-preview")} className="min-h-12 bg-white px-6 font-semibold text-[#141821] hover:bg-[#eeebff]">Generate my preview <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => navigate("/book-demo")} className="min-h-12 border-white/25 bg-white/[0.03] px-6 font-semibold text-white hover:bg-white/[0.08] hover:text-white">Discuss my scope</Button>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }} className="relative lg:col-span-7 lg:-mr-8 xl:-mr-14">
              <div className="pointer-events-none absolute -inset-8 bg-[#5746e8]/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#080b15] shadow-[0_55px_140px_-55px_rgba(0,0,0,.95)]">
                <img src="/images/bennie-studio-hero.webp" alt="" className="aspect-[16/9] w-full object-cover" loading="eager" decoding="async" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#080b15] via-[#080b15]/75 to-transparent px-5 pb-5 pt-16">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] !text-[#b9b1ff]">Different businesses · different outcomes</p>
                  <p className="mt-2 text-sm font-semibold !text-white">The direction adapts to the offer, customer and evidence available.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 px-4 py-10 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {buildCapabilities.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <Icon className="mb-5 h-6 w-6 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-950">{type.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{type.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-20">
          <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Badge className="mb-4 rounded-full bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-100">
                Selected Website Builds
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Industry-specific website case studies
              </h2>
            </div>
            <p className="max-w-xl text-base font-medium leading-7 text-slate-600">
              Each concept study shows the business challenge, recommended content architecture, enquiry flow, and SEO angle.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {featuredBuilds.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.035 }}
                className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl"
              >
                <WebsiteConceptVisual title={item.title} eyebrow={item.niche} index={index} className="aspect-[16/9]" />
                <div className="p-6 sm:p-8">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {item.niche}
                    </Badge>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {item.plan}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-slate-600">{item.summary}</p>

                  <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Content Scope
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.pages.map((page) => (
                          <span
                            key={page}
                            className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700"
                          >
                            {page}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                        <span>{item.conversion}</span>
                      </div>
                      <div className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                        <Search className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                        <span>{item.seo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={() => navigate(item.sampleHref)}
                      className="h-12 rounded-xl bg-indigo-600 px-5 text-xs font-bold uppercase tracking-wide hover:bg-indigo-700"
                    >
                      Read Case Study
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/book-demo")}
                      className="h-12 rounded-xl px-5 text-xs font-bold uppercase tracking-wide"
                    >
                      Build Similar
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <Badge className="mb-4 rounded-full bg-indigo-50 px-4 py-2 text-indigo-700 hover:bg-indigo-50">
                  What Prospects Can Inspect
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  More than a homepage screenshot
                </h2>
              </div>
              <p className="max-w-xl text-base font-medium leading-7 text-slate-600">
                The portfolio explains the commercial website structure: how customers enquire, what pages are included, and how the site supports local search.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {proofPoints.map(([title, text]) => (
                <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
                  <BadgeCheck className="mb-5 h-6 w-6 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-16 text-white sm:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Badge className="mb-6 rounded-full bg-white/10 px-4 py-2 text-white hover:bg-white/10">
                What Can Be Built
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                A complete business website, not just a nice-looking page.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-300">
                The managed website system can prepare clear pages, trust sections, lead capture, WhatsApp CTAs, local SEO content, and ongoing update workflows.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [FileText, "Service pages", "Clear pages for each treatment, package, offer, or service."],
                [MessageCircle, "WhatsApp CTAs", "Buttons that send prospects directly into chat with a pre-filled message."],
                [ClipboardList, "Lead forms", "Capture name, phone, email, service interest, budget, and notes."],
                [MapPin, "Local SEO", "Structure for city, service area, local FAQs, and metadata."],
                [Star, "Trust sections", "Reviews, credentials, team, process, guarantees, and proof blocks."],
                [Sparkles, "Monthly updates", "Request changes and improve the website after launch."],
              ].map(([Icon, title, text]: any) => (
                <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-6">
                  <Icon className="mb-4 h-5 w-5 text-indigo-200" />
                  <h3 className="font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <Badge className="mb-4 rounded-full bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-100">
                Build Process
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                From case study to managed website direction
              </h2>
            </div>
            <div className="grid gap-4">
              {process.map(([step, title, text]) => (
                <div key={step} className="flex gap-5 rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white">
                    {step}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-8 lg:pb-24">
          <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12 lg:flex lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Want one of these for your business?
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
                Send a short brief and we can recommend the right website plan, content architecture, CTA flow, and upgrade path.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-slate-600">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-indigo-600" /> Local SEO-ready</span>
                <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-indigo-600" /> Lead capture included</span>
                <span className="flex items-center gap-2"><Store className="h-4 w-4 text-indigo-600" /> Built for SMEs</span>
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600" /> Managed monthly plan</span>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col">
              <Button
                size="lg"
                onClick={() => navigate("/book-demo")}
                className="h-14 rounded-2xl bg-indigo-600 px-8 text-xs font-bold uppercase tracking-wide hover:bg-indigo-700"
              >
                Book Demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/")}
                className="h-14 rounded-2xl px-8 text-xs font-bold uppercase tracking-wide"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
