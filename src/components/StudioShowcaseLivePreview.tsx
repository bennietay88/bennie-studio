import React from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { STUDIO_SHOWCASES } from "./StudioCaseStudyDetail";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";

type DemoContent = {
  brand: string;
  tagline: string;
  headline: string;
  intro: string;
  cta: string;
  sectionTitle: string;
  services: Array<{ name: string; copy: string }>;
  steps: Array<{ title: string; copy: string }>;
  reassurance: string[];
};

const DEMOS: Record<string, DemoContent> = {
  "dental-clinic": {
    brand: "Harbour Dental",
    tagline: "Thoughtful care. Clear next steps.",
    headline: "A healthier smile starts with feeling at ease.",
    intro: "Explore your options, meet the care team and find a comfortable next step for your dental health.",
    cta: "Request an appointment",
    sectionTitle: "Care for every stage of your smile",
    services: [
      { name: "Everyday dentistry", copy: "Routine check-ups and preventive care, explained clearly." },
      { name: "Smile restoration", copy: "A considered plan to help restore comfort and confidence." },
      { name: "Family dental care", copy: "A welcoming experience for children, teens and adults." },
    ],
    steps: [
      { title: "Tell us what you need", copy: "Share a little about the care you are looking for." },
      { title: "Talk it through", copy: "A member of the team can explain the next steps." },
      { title: "Choose a time", copy: "Arrange an appointment that works for you." },
    ],
    reassurance: ["Clear treatment information", "A calm, welcoming setting", "Easy-to-find contact details"],
  },
  "renovation-contractor": {
    brand: "Northline Renovation",
    tagline: "Considered work for better living.",
    headline: "Make more of the place you call home.",
    intro: "From the first conversation to the final details, plan a renovation around the way you want to live.",
    cta: "Start a project enquiry",
    sectionTitle: "Spaces shaped around real life",
    services: [
      { name: "Kitchen renovations", copy: "Create a more practical, welcoming heart of the home." },
      { name: "Whole-home updates", copy: "Bring rooms together with a clear, coordinated plan." },
      { name: "Extensions & additions", copy: "Make room for what comes next with thoughtful design." },
    ],
    steps: [
      { title: "Share your project", copy: "Tell us about the space, your goals and where you are based." },
      { title: "Explore the scope", copy: "Discuss the work, priorities and decisions involved." },
      { title: "Plan the next step", copy: "Get a clear path for moving the project forward." },
    ],
    reassurance: ["Clear project conversations", "A defined scope before work begins", "A considered process from start to finish"],
  },
  "professional-advisory": {
    brand: "Fieldstone Advisory",
    tagline: "Sound advice for important decisions.",
    headline: "Clarity for the decisions that shape your business.",
    intro: "Practical, considered guidance to help you understand your options and move forward with confidence.",
    cta: "Arrange an initial conversation",
    sectionTitle: "Advice built around your priorities",
    services: [
      { name: "Business strategy", copy: "Define priorities, evaluate options and build a practical path forward." },
      { name: "Operational improvement", copy: "Find opportunities to make day-to-day work clearer and more effective." },
      { name: "Change & planning", copy: "Bring structure to transitions, investment choices and new initiatives." },
    ],
    steps: [
      { title: "Understand the context", copy: "Start with your goals, constraints and current position." },
      { title: "Assess the options", copy: "Explore the choices and trade-offs that matter." },
      { title: "Agree a way forward", copy: "Leave with clear next steps and priorities." },
    ],
    reassurance: ["Confidential first conversation", "Advice tailored to your situation", "Clear scope and next steps"],
  },
  "tuition-centre": {
    brand: "Brightpath Learning",
    tagline: "Curiosity first. Progress at every pace.",
    headline: "Find the learning support that fits your child.",
    intro: "Explore programmes, teaching styles and class options before choosing a first conversation with our team.",
    cta: "Ask about a trial class",
    sectionTitle: "A programme for the next step",
    services: [
      { name: "Primary foundations", copy: "Build confidence in core skills through supportive practice." },
      { name: "Secondary subjects", copy: "Strengthen understanding with focused subject guidance." },
      { name: "Study skills", copy: "Develop habits that help learners approach new challenges." },
    ],
    steps: [
      { title: "Tell us about your learner", copy: "Share their age, level and what they would like help with." },
      { title: "Find a suitable programme", copy: "Talk through the available subjects and learning approach." },
      { title: "Plan a first visit", copy: "Arrange a trial class or a conversation with the centre." },
    ],
    reassurance: ["Small-group learning options", "Clear programme information", "A supportive first visit"],
  },
  "beauty-wellness": {
    brand: "Morrow Wellness",
    tagline: "A little space to feel like yourself.",
    headline: "Make time for the care that helps you reset.",
    intro: "Discover thoughtful treatments, a calm space and an easy way to plan your next visit.",
    cta: "Enquire about an appointment",
    sectionTitle: "Choose the care that feels right",
    services: [
      { name: "Facial treatments", copy: "A considered approach to skincare and a moment to unwind." },
      { name: "Massage & body care", copy: "Restorative treatments shaped around your comfort." },
      { name: "Wellness rituals", copy: "Thoughtful combinations for a slower, more restorative visit." },
    ],
    steps: [
      { title: "Explore the treatment menu", copy: "Compare options and choose what feels suited to you." },
      { title: "Ask a question", copy: "Talk with the team about comfort, timing or preparation." },
      { title: "Plan your visit", copy: "Enquire about an appointment and the next available times." },
    ],
    reassurance: ["A calm, welcoming space", "Clear treatment descriptions", "Help choosing the right option"],
  },
  "accounting-firm": {
    brand: "Clearline Accounting",
    tagline: "Good records. Clearer decisions.",
    headline: "Make sense of the numbers behind your business.",
    intro: "Get organised with practical accounting support and a clearer view of the decisions ahead.",
    cta: "Book an introductory call",
    sectionTitle: "Support through every business stage",
    services: [
      { name: "Bookkeeping", copy: "Keep day-to-day records organised and easier to understand." },
      { name: "Tax & compliance", copy: "Get support preparing the information needed for key deadlines." },
      { name: "Business reporting", copy: "Turn financial information into useful, timely insight." },
    ],
    steps: [
      { title: "Describe your business", copy: "Share what you do and the support you are looking for." },
      { title: "Review your needs", copy: "Discuss your current setup, questions and upcoming deadlines." },
      { title: "Set a clear scope", copy: "Agree the right services and a practical starting point." },
    ],
    reassurance: ["Plain-language explanations", "A clear view of service scope", "Support matched to your business"],
  },
};

function DemoArtwork({ slug, content }: { slug: string; content: DemoContent }) {
  if (slug === "dental-clinic") {
    return <div className="rounded-[2rem] bg-[#d9eee9] p-5 sm:p-8"><div className="rounded-2xl bg-white p-6 shadow-xl shadow-emerald-950/10 sm:p-8"><div className="flex items-center justify-between border-b border-slate-100 pb-5"><span className="text-sm font-bold text-slate-800">{content.brand}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Patient-first care</span></div><div className="grid gap-5 py-7 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Your visit, made simpler</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Care that begins with a conversation.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Explore treatments, ask a question or plan your first visit.</p></div><div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><ShieldCheck size={34}/></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f4f8f6] p-4"><CalendarDays className="text-emerald-800" size={18}/><p className="mt-3 text-sm font-semibold text-slate-800">Appointments</p><p className="mt-1 text-xs text-slate-500">Ask about a suitable time</p></div><div className="rounded-xl bg-[#f4f8f6] p-4"><MapPin className="text-emerald-800" size={18}/><p className="mt-3 text-sm font-semibold text-slate-800">Visit information</p><p className="mt-1 text-xs text-slate-500">Find the details you need</p></div></div></div></div>;
  }
  if (slug === "renovation-contractor") {
    return <div className="rounded-[2rem] bg-[#e8dfd3] p-5 sm:p-8"><div className="grid grid-cols-2 gap-3"><div className="col-span-2 flex min-h-52 flex-col justify-end rounded-2xl bg-gradient-to-br from-[#4f4639] via-[#a18c70] to-[#d5c5ac] p-6 text-white"><span className="text-xs font-bold uppercase tracking-[.18em] text-white/70">A more considered home</span><h2 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight">Room to live a little better.</h2></div><div className="rounded-2xl bg-[#faf8f4] p-4"><span className="text-xs font-semibold uppercase tracking-wide text-[#76644d]">01 / Plan</span><p className="mt-3 font-semibold text-slate-900">Start with how you live</p></div><div className="rounded-2xl bg-[#faf8f4] p-4"><span className="text-xs font-semibold uppercase tracking-wide text-[#76644d]">02 / Build</span><p className="mt-3 font-semibold text-slate-900">Stay clear on what comes next</p></div></div></div>;
  }
  if (slug === "professional-advisory") {
    return <div className="rounded-[2rem] bg-[#e8e9e5] p-5 sm:p-8"><div className="rounded-2xl bg-[#172a32] p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c8d6ca]">A clearer way forward</p><h2 className="mt-5 max-w-md font-serif text-4xl leading-tight">Good decisions begin with good questions.</h2><div className="mt-8 border-t border-white/20 pt-5"><p className="max-w-sm text-sm leading-6 text-white/70">Independent thinking. Practical next steps. Advice shaped around your context.</p></div></div><div className="mt-3 grid grid-cols-3 gap-3">{["Understand","Evaluate","Act"].map((item,i)=><div key={item} className="rounded-xl bg-white p-4"><span className="text-xs text-slate-400">0{i+1}</span><p className="mt-2 text-sm font-semibold text-slate-800">{item}</p></div>)}</div></div>;
  }
  if (slug === "tuition-centre") {
    return <div className="rounded-[2rem] bg-[#fff0d8] p-5 sm:p-8"><div className="rounded-2xl bg-white p-6 shadow-xl shadow-amber-950/10 sm:p-8"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-900">{content.brand}</span><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Learning, step by step</span></div><h2 className="mt-8 max-w-md text-3xl font-semibold tracking-tight text-slate-900">A little progress adds up.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">Find the right subject, level and learning environment.</p><div className="mt-7 space-y-3">{["Primary foundations","Secondary subjects","Study skills"].map((item,i)=><div key={item} className="flex items-center gap-4 rounded-xl bg-[#fff9ef] p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-950">0{i+1}</span><span className="text-sm font-semibold text-slate-800">{item}</span><ArrowRight className="ml-auto text-amber-800" size={16}/></div>)}</div></div></div>;
  }
  if (slug === "beauty-wellness") {
    return <div className="rounded-[2rem] bg-[#efe3e1] p-5 sm:p-8"><div className="grid min-h-[25rem] grid-cols-[.82fr_1.18fr] overflow-hidden rounded-2xl bg-[#422f36]"><div className="flex flex-col justify-between p-5 text-white sm:p-8"><span className="text-xs font-bold uppercase tracking-[.18em] text-white/65">Morrow / Rituals</span><div><p className="text-xs uppercase tracking-[.16em] text-[#e7c7bd]">Make space to reset</p><h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">A softer kind of self-care.</h2></div><span className="text-xs text-white/60">Thoughtful care, at your pace.</span></div><div className="flex flex-col justify-center bg-gradient-to-br from-[#c99487] via-[#dfbbae] to-[#f2dfd1] p-5 sm:p-8"><div className="rounded-xl bg-white/85 p-5 shadow-xl backdrop-blur"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#795159]">The treatment menu</p><div className="mt-4 space-y-3">{["Face / Skin","Body / Restore","Ritual / Reset"].map(item=><div className="flex items-center justify-between border-b border-[#eadbd7] pb-3 text-sm font-medium text-[#3e3035]" key={item}><span>{item}</span><ArrowRight size={15}/></div>)}</div></div></div></div></div>;
  }
  return <div className="rounded-[2rem] bg-[#dce5ef] p-5 sm:p-8"><div className="rounded-2xl bg-[#142b45] p-6 text-white sm:p-8"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Monthly overview</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">Illustrative layout</span></div><h2 className="mt-7 text-3xl font-semibold">A clearer picture of your business.</h2><div className="mt-7 grid grid-cols-3 gap-3">{["Records","Reports","Deadlines"].map((item,i)=><div className="rounded-xl bg-white/10 p-4" key={item}><Check size={16} className="text-[#a9d5c6]"/><p className="mt-4 text-sm font-medium">{item}</p></div>)}</div><div className="mt-5 h-20 rounded-xl bg-gradient-to-r from-[#193c5d] via-[#24677b] to-[#7cbaa0] p-4"><div className="flex h-full items-end gap-2">{[34,52,40,76,60,88,68,96,72,84].map((h,i)=><span key={i} className="flex-1 rounded-t bg-white/80" style={{height:h+"%"}} />)}</div></div></div></div>;
}

export default function StudioShowcaseLivePreview() {
  const { slug } = useParams();
  const study = STUDIO_SHOWCASES.find((item) => item.slug === slug);
  const content = study ? DEMOS[study.slug] : undefined;

  if (!study || !content) {
    return <main className="brand-public min-h-screen bg-[#f8f8f5]"><PublicSiteHeader/><div className="brand-shell py-24"><h1>Preview not found.</h1><Link to="/case-studies">Browse the case studies <ArrowRight className="ml-2 inline" size={16}/></Link></div><PublicSiteFooter/></main>;
  }

  const previewPath = "/case-studies/showcase/" + study.slug + "/preview";
  const detailPath = "/case-studies/showcase/" + study.slug;
  const theme = study.colour;

  return <div className="min-h-screen bg-white text-slate-900">
    <Helmet>
      <title>{content.brand} Website Demo | Bennie Studio</title>
      <meta name="description" content={content.intro + " Interactive illustrative website demo by Bennie Studio."}/>
      <link rel="canonical" href={"https://app.bennietay.com" + previewPath}/>
      <meta name="robots" content="noindex, follow"/>
    </Helmet>

    <div className="sticky top-0 z-50 border-b border-[#dfe3eb] bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1741ed] text-white"><Sparkles size={16}/></span><div><p className="text-xs font-bold text-slate-900">Interactive website preview</p><p className="text-[11px] text-slate-500">Illustrative studio demo · not a client website</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><Link to={detailPath} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"><ArrowLeft size={14}/> Case study</Link><Link to={"/generate-preview?industry="+study.industry} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1741ed] px-4 text-xs font-semibold text-white hover:bg-[#0f34c4]">Make one for my business <ArrowUpRight size={14}/></Link></div>
      </div>
    </div>

    <div className="border-b border-slate-200 bg-[#f7f8fa]">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 text-[11px] text-slate-600 sm:px-6 lg:px-10"><span className="font-semibold uppercase tracking-[.12em] text-slate-500">Previewing</span><span className="font-semibold text-slate-900">{content.brand}</span><span className="hidden sm:inline">Every interaction is illustrative; enquiry buttons lead to Bennie Studio's preview flow.</span></div>
    </div>

    <header className="border-b border-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-12">
        <a href="#top" className="max-w-[13rem]"><span className="block text-lg font-bold tracking-tight" style={{color:theme}}>{content.brand}</span><span className="mt-0.5 block text-[11px] text-slate-500">{content.tagline}</span></a>
        <nav aria-label="Demo website navigation" className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex"><a className="hover:text-slate-950" href="#services">Services</a><a className="hover:text-slate-950" href="#approach">Our approach</a><a className="hover:text-slate-950" href="#contact">Contact</a></nav>
        <a href="#contact" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white sm:px-5" style={{backgroundColor:theme}}>{content.cta}<ArrowRight size={15}/></a>
      </div>
    </header>

    <main id="top">
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-14 lg:px-12 lg:py-24">
        <div><p className="text-xs font-bold uppercase tracking-[.18em]" style={{color:theme}}>{content.tagline}</p><h1 className="mt-5 max-w-[13ch] text-5xl font-semibold leading-[1.02] tracking-[-.055em] text-slate-950 sm:text-6xl lg:text-7xl">{content.headline}</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{content.intro}</p><div className="mt-8 flex flex-wrap items-center gap-3"><a href="#contact" className="inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white" style={{backgroundColor:theme}}>{content.cta}<ArrowRight size={16}/></a><a href="#services" className="inline-flex min-h-12 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700">Explore services</a></div><div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{content.reassurance.map((item)=><span className="inline-flex items-center gap-1.5" key={item}><Check size={13} style={{color:theme}}/>{item}</span>)}</div></div>
        <DemoArtwork slug={study.slug} content={content}/>
      </section>

      <section id="services" className="border-y border-slate-200 bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="grid gap-6 md:grid-cols-[1fr_.7fr] md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>How we can help</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{content.sectionTitle}</h2></div><p className="max-w-lg leading-7 text-slate-600">Clear information helps you understand your options and choose the next step that feels right.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{content.services.map((service,index)=><article key={service.name} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"><span className="text-xs font-bold" style={{color:theme}}>0{index+1}</span><h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">{service.name}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{service.copy}</p><a href="#contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold" style={{color:theme}}>Ask us about this <ArrowRight size={15}/></a></article>)}</div>
        </div>
      </section>

      <section id="approach" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>A clear way forward</p><h2 className="mt-3 max-w-lg text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Know what happens next.</h2><p className="mt-5 max-w-md leading-7 text-slate-600">The right website makes it easier to understand the service, feel confident and take the next step.</p></div><div className="divide-y divide-slate-200 border-y border-slate-200">{content.steps.map((step,index)=><article className="grid gap-3 py-6 sm:grid-cols-[3rem_1fr]" key={step.title}><span className="font-serif text-3xl italic" style={{color:theme}}>0{index+1}</span><div><h3 className="text-lg font-semibold text-slate-900">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.copy}</p></div></article>)}</div></div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[auto_1fr] lg:items-center lg:px-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm" style={{color:theme}}><Clock3 size={24}/></div><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>Questions welcome</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Start with a conversation.</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">Share what you are looking for and get a clear explanation of possible next steps. There is no pressure to decide before you have the information you need.</p></div>
        </div>
      </section>

      <section id="contact" className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-white/55">Your next step</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Tell us what you need. We’ll help you find the right next step.</h2><p className="mt-4 max-w-2xl leading-7 text-white/70">This interactive page is an illustrative studio demo. Contact actions are not connected to a real business.</p></div><Link to={"/generate-preview?industry="+study.industry} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 hover:bg-slate-100">Get a preview for my business <ArrowRight size={16}/></Link></div>
      </section>
    </main>

    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><span>{content.brand} · Illustrative website demo</span><div className="flex flex-wrap gap-5"><Link to={detailPath} className="font-semibold text-slate-700 hover:text-slate-950">Back to case study</Link><Link to="/case-studies" className="font-semibold text-slate-700 hover:text-slate-950">All examples</Link></div></div></footer>
  </div>;
}
