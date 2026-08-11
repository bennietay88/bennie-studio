/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { SafeImage } from "./SafeImage";

const samples = {
  dental: {
    name: "SmileHaus Dental Clinic",
    eyebrow: "Dental Clinic Concept Case Study",
    headline: "Gentle dental care for confident smiles in Kuala Lumpur.",
    description:
      "A clinic-ready website demo with treatment explanations, dentist trust sections, WhatsApp booking, patient FAQs, operating hours, and local search structure for Kuala Lumpur patients.",
    challenge: "Patients need treatment clarity, practitioner reassurance, and location confidence before they are ready to book.",
    strategy: "Organise treatments in plain language, build dentist trust, answer common questions, and keep WhatsApp booking visible throughout the journey.",
    intendedOutcome: "Turn treatment research into better-informed appointment enquiries.",
    metaDescription:
      "Dental clinic website demo for Kuala Lumpur with treatment pages, WhatsApp booking, patient FAQs, dentist trust sections, and local SEO-ready content.",
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1600",
    accent: "text-cyan-700",
    button: "bg-cyan-600 hover:bg-cyan-700",
    soft: "bg-cyan-50 text-cyan-800",
    services: [
      ["Braces Consultation", "Clear guidance for teens and adults considering orthodontic care."],
      ["Dental Implant Assessment", "Explain suitability, process, recovery, and next steps clearly."],
      ["Scaling & Polishing", "Simple hygiene page with benefits, price guidance, and booking CTA."],
    ],
    stats: ["Treatment pages", "WhatsApp booking", "KL local SEO"],
    proof: ["Dentist profile section", "Patient FAQ and aftercare notes", "Google Maps and opening hours"],
    serviceHeading: "Treatment pages patients can understand",
    serviceDescription:
      "Each treatment section is written for patient clarity: what the treatment helps with, who it is suitable for, what to expect, and how to book an appointment.",
    trustHeading: "Built for patient trust before they contact the clinic.",
    trustDescription:
      "Dental visitors need reassurance. This demo includes dentist introductions, treatment guidance, FAQ content, location details, and clear WhatsApp booking actions.",
    finalHeading: "Use this clinic structure for a real dental practice.",
    finalDescription:
      "The same structure can be adapted for dental, wellness, aesthetic, physiotherapy, chiropractic, or specialist clinic websites.",
  },
  consultant: {
    name: "NorthStar Growth Advisory",
    eyebrow: "Consultant Concept Case Study",
    headline: "A sharper website for consultants who sell strategy and trust.",
    description:
      "A consultant-ready website demo with authority positioning, service offer pages, proof sections, case-study prompts, lead capture, and a strategy-call conversion flow.",
    challenge: "Prospects cannot assess expertise when the offer, outcomes, and engagement model are vague.",
    strategy: "Connect services to buyer problems, clarify delivery, introduce proof prompts, and focus the journey on one strategy-call action.",
    intendedOutcome: "Turn professional interest into qualified consultation calls.",
    metaDescription:
      "Consultant website demo with service positioning, proof sections, case-study prompts, lead capture, and strategy-call CTAs.",
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=1600",
    accent: "text-indigo-700",
    button: "bg-indigo-600 hover:bg-indigo-700",
    soft: "bg-indigo-50 text-indigo-800",
    services: [
      ["Business Growth Audit", "A clear offer page for diagnosing bottlenecks and missed revenue."],
      ["Marketing System Design", "Position strategy, implementation, and campaign planning in one funnel."],
      ["Founder Advisory Retainer", "A recurring-service page for long-term consulting relationships."],
    ],
    stats: ["Authority-first layout", "Lead form included", "Case-study ready"],
    proof: ["Offer positioning", "Outcome-led proof sections", "Strategy-call booking CTA"],
    serviceHeading: "Service pages designed for high-trust selling",
    serviceDescription:
      "Each service section is structured around the buyer problem, advisory outcome, delivery format, and next step so prospects understand the value before booking.",
    trustHeading: "Built to position expertise clearly.",
    trustDescription:
      "Consulting buyers need confidence before they enquire. This demo includes authority messaging, results prompts, service clarity, and a direct strategy-call path.",
    finalHeading: "Use this consultant structure for a real advisory business.",
    finalDescription:
      "The same structure can be adapted for coaches, consultants, agencies, professional services, fractional leaders, and B2B experts.",
  },
  beauty: {
    name: "Lumi Beauty Studio",
    eyebrow: "Beauty Salon Concept Case Study",
    headline: "Premium beauty treatments with a simple booking path.",
    description:
      "A salon-ready website demo with service menus, package highlights, gallery sections, WhatsApp booking, promotion blocks, and local search structure for beauty studios.",
    challenge: "Mobile visitors need to compare treatments, packages, visual quality, and availability quickly.",
    strategy: "Group treatments clearly, surface package value and proof, then connect every decision point to a simple booking path.",
    intendedOutcome: "Move treatment browsers toward confident WhatsApp bookings.",
    metaDescription:
      "Beauty salon website demo with service menus, package CTAs, gallery sections, WhatsApp booking, and local SEO-ready content.",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1600",
    accent: "text-pink-700",
    button: "bg-pink-600 hover:bg-pink-700",
    soft: "bg-pink-50 text-pink-800",
    services: [
      ["Facial Treatments", "A clear treatment menu with benefits, session time, and booking prompts."],
      ["Hair & Styling", "Package-ready sections for cut, colour, wash, blowout, and special occasions."],
      ["Beauty Packages", "Promotion blocks for bundled treatments, seasonal offers, and repeat visits."],
    ],
    stats: ["Service menu", "Package CTA", "Gallery-ready"],
    proof: ["Treatment package section", "Before-enquiry guidance", "Promotion landing blocks"],
    serviceHeading: "Beauty service pages designed for quick decisions",
    serviceDescription:
      "Salon visitors need to compare services quickly. This structure organizes treatments, packages, proof, pricing guidance, and booking CTAs in a mobile-first layout.",
    trustHeading: "Built for beauty brands that sell through trust and visuals.",
    trustDescription:
      "Beauty prospects want to see quality, style, cleanliness, and service clarity before booking. This demo supports galleries, package sections, testimonials, and WhatsApp booking.",
    finalHeading: "Use this salon structure for a real beauty business.",
    finalDescription:
      "The same structure can be adapted for salons, facial studios, aesthetic clinics, nail studios, spa brands, and wellness businesses.",
  },
  contractor: {
    name: "PrimeBuild Renovation",
    eyebrow: "Contractor Concept Case Study",
    headline: "A quote-focused renovation website for serious enquiries.",
    description:
      "A contractor-ready website demo with service pages, project highlights, quote request flow, service areas, trust points, and local SEO sections.",
    challenge: "Unstructured contact forms create weak leads without project type, budget, location, or timeline context.",
    strategy: "Lead with capability and project proof, explain the process, define service areas, and collect the details needed for a useful quote.",
    intendedOutcome: "Generate better-qualified renovation and fit-out enquiries.",
    metaDescription:
      "Renovation contractor website demo with service pages, project gallery, quote request flow, service areas, and local SEO-ready content.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1600",
    accent: "text-amber-700",
    button: "bg-amber-600 hover:bg-amber-700",
    soft: "bg-amber-50 text-amber-800",
    services: [
      ["Home Renovation", "Explain scope, process, timeline expectations, and how to request a quote."],
      ["Kitchen & Bathroom Works", "Dedicated sections for high-intent renovation categories."],
      ["Commercial Fit-Out", "A business-facing page structure for offices, clinics, shops, and studios."],
    ],
    stats: ["Quote request", "Project gallery", "Service areas"],
    proof: ["Project highlight grid", "Budget enquiry form", "Location-based service sections"],
    serviceHeading: "Service pages that help prospects describe the job",
    serviceDescription:
      "Contractor enquiries are easier to qualify when the website asks for project type, location, budget range, timeline, and notes before the first call.",
    trustHeading: "Built to show capability before a quote request.",
    trustDescription:
      "Renovation buyers want proof and clarity. This demo includes project sections, process explanation, service area content, quote CTAs, and trust blocks.",
    finalHeading: "Use this contractor structure for a real renovation company.",
    finalDescription:
      "The same structure can be adapted for renovation firms, interior designers, plumbers, electricians, repair companies, and local contractors.",
  },
  restaurant: {
    name: "Kopi Yard Cafe",
    eyebrow: "Restaurant Concept Case Study",
    headline: "A local cafe website built for menus, bookings, and discovery.",
    description:
      "A restaurant-ready website demo with menu highlights, food gallery, reservation CTA, location details, delivery links, promotions, and local search content.",
    challenge: "Diners want menu, photos, location, hours, and booking options without searching across several platforms.",
    strategy: "Prioritise the highest-intent information and connect discovery to reservations, WhatsApp, maps, and current promotions.",
    intendedOutcome: "Support more direct visits, reservations, and orders.",
    metaDescription:
      "Restaurant and cafe website demo with menu sections, reservation CTA, gallery, delivery links, location details, and local SEO-ready content.",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1600",
    accent: "text-orange-700",
    button: "bg-orange-600 hover:bg-orange-700",
    soft: "bg-orange-50 text-orange-800",
    services: [
      ["Signature Menu", "Show popular dishes, categories, prices, and add-ons clearly."],
      ["Private Dining", "A page section for groups, birthdays, company meals, and small events."],
      ["Promotions", "Seasonal offers, lunch sets, happy hours, or delivery campaigns."],
    ],
    stats: ["Menu showcase", "Reservation CTA", "Maps & hours"],
    proof: ["Food gallery", "Opening hours and location", "WhatsApp order or reservation link"],
    serviceHeading: "Menu sections designed for mobile visitors",
    serviceDescription:
      "Restaurant visitors usually want menu, location, opening hours, photos, and booking options fast. This layout keeps those actions close to the top.",
    trustHeading: "Built for local discovery and fast decisions.",
    trustDescription:
      "F&B websites should make it easy to inspect the food, find the restaurant, reserve, order, and understand current offers. This demo is structured around those actions.",
    finalHeading: "Use this restaurant structure for a real F&B brand.",
    finalDescription:
      "The same structure can be adapted for cafes, restaurants, bars, bakeries, cloud kitchens, food trucks, and catering businesses.",
  },
  education: {
    name: "BrightPath Tuition Centre",
    eyebrow: "Education Concept Case Study",
    headline: "A tuition centre website for trial class enquiries.",
    description:
      "An education-ready website demo with programme pages, teacher trust sections, parent FAQs, trial-class CTA, timetable prompts, and enrolment lead capture.",
    challenge: "Parents need clear programmes, levels, teachers, schedules, and outcomes before making contact.",
    strategy: "Make programmes easy to compare, establish teacher trust, answer parent questions, and lead into a trial-class enquiry.",
    intendedOutcome: "Generate better-informed enrolment and trial-class leads.",
    metaDescription:
      "Tuition centre website demo with programme pages, teacher trust sections, parent FAQs, trial class CTA, and enrolment enquiry flow.",
    image:
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&q=80&w=1600",
    accent: "text-blue-700",
    button: "bg-blue-600 hover:bg-blue-700",
    soft: "bg-blue-50 text-blue-800",
    services: [
      ["Primary Programmes", "Programme sections for levels, subjects, outcomes, and class format."],
      ["Exam Preparation", "Clear pages for exam-focused learning, revision, and progress tracking."],
      ["Holiday Workshops", "Campaign-ready sections for workshops, bootcamps, and short courses."],
    ],
    stats: ["Trial class CTA", "Parent FAQ", "Programme pages"],
    proof: ["Teacher profile sections", "Programme comparison", "Enrolment lead capture"],
    serviceHeading: "Programme pages parents can evaluate quickly",
    serviceDescription:
      "Parents need clear levels, subjects, schedules, teaching style, and next steps. This structure makes trial class enquiries easier to capture.",
    trustHeading: "Built for education providers that need parent confidence.",
    trustDescription:
      "Education buyers compare trust, outcomes, teachers, schedule, and pricing fit. This demo includes programme clarity, teacher trust, FAQs, and trial-class CTAs.",
    finalHeading: "Use this education structure for a real learning centre.",
    finalDescription:
      "The same structure can be adapted for tuition centres, training providers, academies, workshops, music schools, and enrichment centres.",
  },
} as const;

type SampleKey = keyof typeof samples;

export default function WaasSamplePage() {
  const navigate = useNavigate();
  const params = useParams();
  const requestedSample = params.sampleType as SampleKey | undefined;
  const sampleKey: SampleKey =
    requestedSample && requestedSample in samples ? requestedSample : "dental";
  const sample = samples[sampleKey];

  React.useEffect(() => {
    document.title = `${sample.name} | Concept Case Study`;
  }, [sample.name]);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Helmet>
        <title>{sample.name} | Concept Case Study</title>
        <meta
          name="description"
          content={sample.metaDescription}
        />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <button
            onClick={() => navigate("/case-studies")}
            className="flex items-center gap-2 border-none bg-transparent text-left text-sm font-black uppercase tracking-widest text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Case Studies
          </button>
          <Button
            onClick={() => navigate("/generate-preview")}
            className={`rounded-xl px-5 font-bold text-white ${sample.button}`}
          >
            Generate Similar
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <Badge className={`mb-6 w-fit rounded-full px-4 py-2 hover:opacity-100 ${sample.soft}`}>
              {sample.eyebrow}
            </Badge>
            <h1 className="text-4xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">
              {sample.headline}
            </h1>
            <p className="mt-8 max-w-2xl text-lg font-medium leading-8 text-slate-600">
              {sample.description}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => navigate("/generate-preview")}
                className={`h-14 rounded-2xl px-8 font-black uppercase tracking-widest text-white ${sample.button}`}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Generate Similar Website
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById("case-study-solution")?.scrollIntoView({ behavior: "smooth" })}
                className="h-14 rounded-2xl px-8 font-black uppercase tracking-widest"
              >
                Explore Case Study
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl">
            <SafeImage
              src={sample.image}
              alt={sample.name}
              className="h-full w-full object-cover"
              containerClassName="aspect-[4/3]"
            />
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl">
              <Badge className="mb-4 rounded-full bg-indigo-50 px-4 py-2 text-indigo-700 hover:bg-indigo-50">
                Case study overview
              </Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                From business problem to website direction
              </h2>
              <p className="mt-4 text-base font-medium leading-7 text-slate-600">
                This is an illustrative concept study. It demonstrates the decisions Bennie Studio would make for this type of business without presenting fictional client performance claims.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {[
                ["Challenge", sample.challenge, "border-rose-100 bg-rose-50 text-rose-700"],
                ["Website strategy", sample.strategy, "border-indigo-100 bg-indigo-50 text-indigo-700"],
                ["Intended outcome", sample.intendedOutcome, "border-emerald-100 bg-emerald-50 text-emerald-700"],
              ].map(([title, copy, style]) => (
                <article key={title} className={`rounded-3xl border p-6 ${style}`}>
                  <p className="text-xs font-black uppercase tracking-[0.18em]">{title}</p>
                  <p className="mt-3 text-sm font-bold leading-7 text-slate-800">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-10 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-3">
            {sample.stats.map((stat) => (
              <div key={stat} className="rounded-2xl border border-slate-200 bg-white p-6">
                <CheckCircle2 className={`mb-4 h-6 w-6 ${sample.accent}`} />
                <p className="text-sm font-black uppercase tracking-widest text-slate-900">{stat}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="case-study-solution" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-8 lg:py-24">
          <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Badge className="mb-4 rounded-full bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-100">
                Solution structure
              </Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                {sample.serviceHeading}
              </h2>
            </div>
            <p className="max-w-xl text-base font-medium leading-7 text-slate-600">
              {sample.serviceDescription}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {sample.services.map(([title, text]) => (
              <article key={title} className="rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-sm">
                <Star className={`mb-6 h-6 w-6 ${sample.accent}`} />
                <h3 className="text-2xl font-black tracking-tight">{title}</h3>
                <p className="mt-4 text-sm font-medium leading-7 text-slate-600">{text}</p>
                <Button variant="ghost" className={`mt-6 px-0 font-black ${sample.accent}`}>
                  Enquire Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-16 text-white sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge className="mb-6 rounded-full border border-indigo-300/40 bg-indigo-500 px-4 py-2 text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-500">
                Trust & Conversion
              </Badge>
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                {sample.trustHeading}
              </h2>
              <p className="mt-6 text-base font-semibold leading-7 text-slate-100">
                {sample.trustDescription}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {sample.proof.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-500/70 bg-slate-800 p-6 shadow-sm">
                  <ShieldCheck className="mb-4 h-5 w-5 text-indigo-200" />
                  <p className="font-black text-white">{item}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-slate-500/70 bg-slate-800 p-6 shadow-sm">
                <Clock className="mb-4 h-5 w-5 text-indigo-200" />
                <p className="font-black text-white">Fast launch workflow</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-24">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                  {sample.finalHeading}
                </h2>
                <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600">
                  {sample.finalDescription}
                </p>
                <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-slate-600">
                  <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> WhatsApp CTA</span>
                  <span className="flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> Booking flow</span>
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Local SEO</span>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => navigate("/generate-preview")}
                className={`h-14 rounded-2xl px-8 font-black uppercase tracking-widest text-white ${sample.button}`}
              >
                Generate Similar Preview
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
