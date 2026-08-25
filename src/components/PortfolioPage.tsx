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
    title: "Niche Page Structure",
    text: "Clinic, salon, contractor, consultant, restaurant, education, and service-business page structures.",
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
  ["3", "Preview the structure", "Review the page structure, sections, CTA flow, and SEO-ready content."],
  ["4", "Launch and improve", "Go live, capture enquiries, request updates, and improve the site over time."],
];

export default function PortfolioPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Helmet>
        <title>Website Portfolio & Case Studies | Bennie Studio</title>
        <meta
          name="description"
          content="Explore Bennie Studio website portfolio and concept case studies for clinics, renovation companies, consultants, restaurants, beauty salons, and education providers."
        />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <button
            onClick={() => navigate("/")}
            className="flex min-w-0 items-center gap-2 border-none bg-transparent text-left text-lg font-black tracking-tight text-indigo-600 sm:text-xl"
          >
            <Globe className="h-7 w-7 shrink-0" />
            <span className="truncate">Bennie Studio</span>
          </button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="hidden rounded-xl text-slate-600 sm:inline-flex"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button
              onClick={() => navigate("/book-demo")}
              className="rounded-xl bg-indigo-600 px-4 font-bold hover:bg-indigo-700 sm:px-5"
            >
              Book Demo
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="flex flex-col justify-center"
          >
            <Badge className="mb-5 w-fit rounded-full bg-indigo-50 px-4 py-2 text-indigo-700 hover:bg-indigo-50">
              Portfolio & Case Studies
            </Badge>
            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">
              Website case studies your prospects can understand quickly.
            </h1>
            <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
              Show potential customers the type of websites Bennie Studio can prepare:
              professional service pages, booking flows, WhatsApp CTAs, local SEO
              sections, and industry-specific website structures.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => navigate("/book-demo")}
                className="h-14 rounded-2xl bg-indigo-600 px-8 text-xs font-black uppercase tracking-widest hover:bg-indigo-700"
              >
                Request Similar Website
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Managed Website Preview
              </span>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {featuredBuilds.slice(0, 4).map((item, index) => (
                <div key={item.title} className="overflow-hidden rounded-2xl bg-white">
                  <WebsiteConceptVisual title={item.title} eyebrow={item.niche} index={index} className="aspect-[4/3]" />
                  <div className="p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">
                      {item.niche}
                    </p>
                    <h2 className="mt-1 text-sm font-black leading-tight text-slate-950">
                      {item.title}
                    </h2>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 px-4 py-10 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {buildCapabilities.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <Icon className="mb-5 h-6 w-6 text-indigo-600" />
                  <h2 className="text-base font-black text-slate-950">{type.title}</h2>
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
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Industry-specific website case studies
              </h2>
            </div>
            <p className="max-w-xl text-base font-medium leading-7 text-slate-600">
              Each concept study shows the business challenge, recommended page structure, enquiry flow, and SEO angle.
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
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {item.plan}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-slate-600">{item.summary}</p>

                  <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Pages Included
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
                      className="h-12 rounded-xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest hover:bg-indigo-700"
                    >
                      Read Case Study
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/book-demo")}
                      className="h-12 rounded-xl px-5 text-xs font-black uppercase tracking-widest"
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
                <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  More than a homepage screenshot
                </h2>
              </div>
              <p className="max-w-xl text-base font-medium leading-7 text-slate-600">
                The portfolio explains the commercial website structure: how customers enquire, what pages are included, and how the site supports local search.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {proofPoints.map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <BadgeCheck className="mb-5 h-6 w-6 text-emerald-600" />
                  <h3 className="text-lg font-black text-slate-950">{title}</h3>
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
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
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
                  <h3 className="font-black text-white">{title}</h3>
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
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                From case study to managed website direction
              </h2>
            </div>
            <div className="grid gap-4">
              {process.map(([step, title, text]) => (
                <div key={step} className="flex gap-5 rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-black text-white">
                    {step}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-8 lg:pb-24">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-12 lg:flex lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Want one of these for your business?
              </h2>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
                Send a short brief and we can recommend the right website plan, page structure, CTA flow, and upgrade path.
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
                className="h-14 rounded-2xl bg-indigo-600 px-8 text-xs font-black uppercase tracking-widest hover:bg-indigo-700"
              >
                Book Demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/")}
                className="h-14 rounded-2xl px-8 text-xs font-black uppercase tracking-widest"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
