import React from "react";
import { demoDesign, readableInk } from "../lib/demoDesignProfiles";
import "../styles/demoDesigns.css";
import { DemoIndustryPhoto } from "./DemoIndustryPhoto";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Menu, X, MoveUpRight } from "lucide-react";
import { useStudioPortfolioCatalog } from "../lib/studioShowcaseCms";
import { hasExpandedDemo, INTERACTIVE_DEMOS, type InteractiveDemoSpec } from "../lib/studioInteractiveDemos";

type DemoPage = "home" | "services" | "about" | "contact";
const pages: DemoPage[] = ["home", "services", "about", "contact"];
function Artwork({ spec }: { spec: InteractiveDemoSpec }) {
  return <DemoIndustryPhoto key={spec.slug} slug={spec.slug} tone={spec.muted}><ConceptArtwork spec={spec}/></DemoIndustryPhoto>;
}
function ConceptArtwork({ spec }: { spec: InteractiveDemoSpec }) {
  const a=spec.accent, bg=spec.background, ink=spec.foreground;
  const symbol=<span className="text-xs font-semibold uppercase tracking-[.2em]">STUDIO / {spec.style}</span>;
  if(spec.style==="architecture"||spec.style==="editorial") return <div aria-hidden="true" className="relative flex min-h-[340px] flex-col justify-between overflow-hidden p-6 sm:min-h-[440px] sm:p-10" style={{background:spec.muted,color:ink}}>
    <div className="relative z-10 flex justify-between">{symbol}<span className="text-xs">01 / 03</span></div>
    <div className="absolute inset-x-[12%] bottom-[16%] top-[16%] overflow-hidden border-[12px] border-white/70 shadow-[25px_22px_0_rgba(0,0,0,.05)]" style={{background:"linear-gradient(125deg,"+bg+" 18%,"+spec.muted+" 60%,"+a+" 140%)"}}>
      <div className="absolute bottom-0 left-[15%] top-[20%] w-[22%] border-x-[12px] border-t-[12px] border-white/80"/>
      <div className="absolute bottom-0 right-[12%] top-[32%] w-[33%] border-x-[12px] border-t-[12px] border-white/80"/>
      <div className="absolute bottom-[17%] left-0 right-0 border-t-[2px] border-white/70"/>
    </div>
    <div className="relative z-10 ml-auto max-w-[180px] bg-white/90 p-4 text-xs leading-5 shadow-sm">Space, material and considered details.</div>
  </div>;
  if(spec.style==="industrial"||spec.style==="corporate") return <div aria-hidden="true" className="relative flex min-h-[340px] flex-col justify-between overflow-hidden p-6 sm:min-h-[440px] sm:p-10" style={{background:ink,color:bg}}>
    <div className="flex items-center justify-between">{symbol}<span className="font-mono text-xs opacity-60">SYSTEM / ACTIVE</span></div>
    <div className="grid grid-cols-6 gap-2">{Array.from({length:24},(_,i)=><div key={i} className="aspect-square rounded-sm border border-white/15" style={{background:i%7===0||i%11===0?a:"rgba(255,255,255,.035)",opacity:i%3===0?0.8:0.5}}/>)}</div>
    <div className="flex items-center justify-between border-t border-white/20 pt-5 font-mono text-xs"><span>DISCOVER / PLAN / ACT</span><span>● ● ○</span></div>
  </div>;
  if(spec.style==="photography"||spec.style==="automotive") return <div aria-hidden="true" className="relative flex min-h-[340px] flex-col justify-center overflow-hidden p-6 sm:min-h-[440px] sm:p-10" style={{background:ink,color:bg}}>
    <div className="absolute -right-20 top-[-10%] h-[130%] w-[55%] -skew-x-12" style={{background:"linear-gradient(120deg,"+a+"66,"+spec.muted+")"}}/>
    <div className="relative z-10 grid grid-cols-3 gap-3">
      {[0,1,2].map((i)=><div key={i} className="flex aspect-[2/3] items-end border-4 border-white/80 p-3 shadow-2xl" style={{transform:i===1?"translateY(-14px)":"translateY(14px)",background:"linear-gradient(160deg,"+a+","+spec.muted+")"}}><span className="font-serif text-3xl text-white/90">0{i+1}</span></div>)}
    </div><p className="relative z-10 mt-10 text-xs font-semibold uppercase tracking-[.3em]">A study in detail</p>
  </div>;
  if(spec.style==="playful"||spec.style==="celebration") return <div aria-hidden="true" className="relative flex min-h-[340px] items-center justify-center overflow-hidden p-6 sm:min-h-[440px]" style={{background:spec.muted,color:ink}}>
    <div className="absolute -left-14 top-10 h-52 w-52 rounded-full border-[35px] border-white/70"/>
    <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full border-[52px] border-white/60"/>
    <div className="relative z-10 h-48 w-48 rotate-[-12deg] rounded-[30%] shadow-2xl sm:h-56 sm:w-56" style={{background:"linear-gradient(145deg,"+a+","+bg+")"}}>
      <div className="absolute left-[30%] top-[30%] h-16 w-16 rounded-full bg-white/80 sm:h-20 sm:w-20"/>
      <div className="absolute bottom-[20%] right-[20%] h-9 w-9 rounded-full bg-white/60"/>
    </div><div className="absolute bottom-8 left-8 text-xs font-bold uppercase tracking-[.2em]">{spec.highlight}</div>
  </div>;
  if(spec.style==="nature"||spec.style==="clinical"||spec.style==="fitness") return <div aria-hidden="true" className="relative flex min-h-[340px] items-center justify-center overflow-hidden p-6 sm:min-h-[440px]" style={{background:spec.muted,color:mutedInk}}>
    <div className="absolute inset-10 rounded-full border border-white/80"/>
    <div className="absolute inset-20 rounded-full border border-white/70"/>
    <div className="relative flex h-56 w-56 items-center justify-center rounded-full shadow-[20px_25px_60px_rgba(0,0,0,.13)] sm:h-72 sm:w-72" style={{background:"linear-gradient(135deg,"+a+","+ink+")"}}>
      <span className="max-w-[60%] text-center font-serif text-4xl leading-tight text-white sm:text-5xl">{spec.highlight.split(" ").slice(0,3).join(" ")}</span>
    </div>
    <span className="absolute bottom-7 left-8 text-xs font-bold uppercase tracking-[.15em]" style={{color:ink}}>{spec.eyebrow}</span>
  </div>;
  return <div aria-hidden="true" className="relative flex min-h-[340px] flex-col justify-between overflow-hidden p-8" style={{background:spec.muted,color:ink}}>
    {symbol}<div className="flex gap-4">{spec.services.map((s,i)=><div key={s.title} className="flex min-h-32 flex-1 flex-col justify-end rounded-2xl p-4 text-white" style={{background:i===1?ink:a}}><span className="text-2xl font-black">0{i+1}</span><p className="mt-3 text-xs">{s.title}</p></div>)}</div><span className="text-xs uppercase tracking-[.2em]">A simpler next step</span>
  </div>;
}

function PageIntro({ spec, title, description, label }: {spec: InteractiveDemoSpec;title:string;description:string;label:string}) {
  return <div className="mx-auto max-w-7xl px-5 pb-10 pt-14 sm:px-8 sm:pb-14 sm:pt-20 lg:px-12">
    <p className="text-xs font-bold uppercase tracking-[.19em]" style={{color:readableInk(spec.background,spec.accent)}}>{label}</p>
    <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.07] tracking-tight sm:text-6xl" style={{color:spec.foreground}}>{title}</h1>
    <p className="mt-6 max-w-2xl text-base leading-8 opacity-80 sm:text-lg">{description}</p>
  </div>;
}

export default function StudioExpandedLivePreview() {
  const {slug,page}=useParams();
  const catalog=useStudioPortfolioCatalog();
  const spec=slug&&hasExpandedDemo(slug)?INTERACTIVE_DEMOS[slug]:undefined;
  const entry=catalog.find(x=>x.slug===slug);
  const currentPage:DemoPage=pages.includes(page as DemoPage)?(page as DemoPage):"home";
  const [mobileOpen,setMobileOpen]=React.useState(false);
  const [selected,setSelected]=React.useState(0);
  const [projectNote,setProjectNote]=React.useState("");
  const [briefOpen,setBriefOpen]=React.useState(false);
  React.useEffect(()=>{setMobileOpen(false);setSelected(0);setBriefOpen(false)},[slug,page]);
  if(!spec || !entry?.published) return <main className="min-h-screen bg-slate-50 p-12 text-slate-900"><h1 className="text-3xl font-semibold">Design concept unavailable</h1><p className="mt-3 max-w-xl">This illustrative website might not be published.</p><Link to="/case-studies" className="mt-7 inline-flex text-blue-700 underline">Back to the portfolio</Link></main>;
  const root="/case-studies/showcase/"+spec.slug+"/preview";
  const path=(p:DemoPage)=>p==="home"?root:root+"/"+p;
  const previewLink="/generate-preview?industry="+encodeURIComponent(entry.industry);
  const design=demoDesign(spec.slug);
  const dark=spec.style==="automotive"||spec.style==="industrial"||spec.style==="photography"||spec.style==="corporate";
  const accentInk=readableInk(spec.accent,spec.background);
  const mainInk=readableInk(spec.background,spec.foreground);
  const mutedInk=readableInk(spec.muted,spec.foreground);
  const sectionTone=dark?spec.foreground:spec.background;
  const sectionText=readableInk(sectionTone,dark?spec.background:spec.foreground);
  const rounded=(spec.style==="utility"||spec.style==="playful"||spec.style==="fitness")?"rounded-3xl":spec.style==="industrial"||spec.style==="corporate"?"rounded-sm":"rounded-xl";
  const action=(label:string)=> <Link to={path("contact")} className="inline-flex min-h-12 items-center justify-center gap-2 px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2" style={{background:spec.accent,color:accentInk,borderRadius:spec.style==="utility"||spec.style==="playful"?"99px":"6px"}}>{label}<ArrowUpRight size={17}/></Link>;
  return <div className="bt-demo-design min-h-screen" data-demo-layout={design.layout} data-demo-type={design.type} data-demo-services={design.services} style={{background:spec.background,color:mainInk,"--demo-bg":spec.background,"--demo-ink":mainInk,"--demo-accent":spec.accent,"--demo-accent-ink":accentInk,"--demo-muted":spec.muted,"--demo-muted-ink":mutedInk,"--demo-label":readableInk(spec.background,spec.accent)} as React.CSSProperties}>
    <Helmet>
      <title>{(currentPage==="home"?spec.brand:currentPage[0].toUpperCase()+currentPage.slice(1)+" | "+spec.brand)} — Interactive Website Concept</title>
      <meta name="description" content={"Illustrative interactive "+entry.title+" website design. "+spec.intro}/>
      <meta name="robots" content="noindex,follow"/>
      <link rel="canonical" href={"https://app.bennietay.com"+path(currentPage)}/>
    </Helmet>
    <div className="relative z-30 flex min-h-9 items-center justify-center gap-3 px-4 py-2 text-center text-[11px] font-medium tracking-wide" style={{background:spec.foreground,color:spec.background}}>
      <span>Interactive design study · Fictional business · Not an active service</span>
      <Link to={"/case-studies/showcase/"+spec.slug} className="hidden underline underline-offset-4 sm:inline">View case study</Link>
    </div>
    <header className="relative z-20 border-b border-current/10" style={{borderColor:spec.muted}}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-12">
        <Link to={path("home")} className="max-w-[14rem] shrink-0 text-xl font-bold tracking-tight sm:text-2xl">{spec.brand}<span className="mt-1 block text-[10px] font-medium uppercase tracking-[.16em] opacity-60">{spec.eyebrow}</span></Link>
        <nav aria-label="Demo website navigation" className="hidden items-center gap-7 md:flex">{pages.map(p=><Link to={path(p)} key={p} aria-current={currentPage===p?"page":undefined} className={"text-sm capitalize transition-opacity hover:opacity-60 "+(p===currentPage?"font-bold underline underline-offset-8":"font-medium")}>{p}</Link>)}</nav>
        <div className="ml-auto hidden md:block">{action(spec.primaryAction)}</div>
        <button type="button" aria-label={mobileOpen?"Close demo navigation":"Open demo navigation"} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)} className="ml-auto inline-flex h-11 w-11 items-center justify-center border md:hidden" style={{borderColor:spec.muted}}>{mobileOpen?<X size={22}/>:<Menu size={22}/>}</button>
      </div>
      {mobileOpen&&<nav aria-label="Mobile demo navigation" className="flex flex-col gap-2 border-t px-5 py-5 md:hidden" style={{borderColor:spec.muted}}>{pages.map(p=><Link to={path(p)} onClick={()=>setMobileOpen(false)} key={p} className="rounded-md px-3 py-3 text-base font-semibold capitalize" style={{background:p===currentPage?spec.muted:"transparent"}}>{p}</Link>)}</nav>}
    </header>
    {currentPage==="home"&&<main>
      <section className={"bt-demo-hero mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:gap-16 lg:px-12 lg:py-24 "+(spec.style==="photography"||spec.style==="editorial"||spec.style==="celebration"?"lg:grid-cols-[.92fr_1.08fr]":"lg:grid-cols-[1fr_1fr]")}>
        <div className={"bt-demo-copy "+(spec.style==="automotive"||spec.style==="fitness"?"lg:order-2":"")}>
          <p className="text-xs font-bold uppercase tracking-[.2em]" style={{color:readableInk(spec.background,spec.accent)}}>{spec.eyebrow}</p>
          <h1 className={"mt-7 max-w-[16ch] leading-[1.02] tracking-[-.05em] "+(spec.style==="industrial"||spec.style==="utility"||spec.style==="fitness"||spec.style==="automotive"?"text-5xl font-black uppercase sm:text-6xl xl:text-7xl":"font-serif text-5xl sm:text-6xl xl:text-7xl")}>{spec.headline}</h1>
          <p className="mt-7 max-w-lg text-base leading-8 opacity-75 sm:text-lg">{spec.intro}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">{action(spec.primaryAction)}<Link to={path("services")} className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold underline underline-offset-4">Explore services <ArrowRight size={16}/></Link></div>
          <p className="mt-8 text-xs font-medium opacity-60">Illustrative site experience · No real bookings, customer reviews or verified results</p>
        </div>
        <div className={"bt-demo-media "+(spec.style==="automotive"||spec.style==="fitness"?"lg:order-1":"")}><Artwork spec={spec}/></div>
      </section>
      <section className="bt-demo-service-section border-y" style={{background:sectionTone,color:sectionText,borderColor:spec.muted}}>
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.2em]" style={{color:readableInk(sectionTone,spec.accent)}}>What we do</p><h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight sm:text-5xl">{spec.highlight}</h2></div><Link to={path("services")} className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">All services <ArrowRight size={15}/></Link></div>
          <div className="bt-demo-service-grid mt-10 grid gap-4 md:grid-cols-3">{spec.services.map((service,i)=><button type="button" key={service.title} aria-pressed={selected===i} onClick={()=>setSelected(i)} className={"flex min-h-[230px] flex-col items-start border p-7 text-left transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 "+rounded} style={{background:selected===i?spec.muted:spec.background,color:selected===i?mutedInk:mainInk,borderColor:selected===i?spec.accent:spec.muted}}>
            <span className="text-xs font-bold" style={{color:readableInk(selected===i?spec.muted:spec.background,spec.accent)}}>0{i+1} / SELECT</span><h3 className="mt-9 text-2xl font-semibold">{service.title}</h3><p className="mt-3 text-sm leading-7 opacity-75">{service.detail}</p><ArrowRight className="mt-auto self-end" size={18}/></button>)}</div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-6" style={{borderColor:spec.muted}}><p className="text-sm">Selected: <strong>{spec.services[selected].title}</strong></p><Link to={path("contact")} className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Enquire about this option <ArrowRight size={16}/></Link></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20"><p className="text-xs font-bold uppercase tracking-[.2em]" style={{color:readableInk(spec.background,spec.accent)}}>A clear process</p><div className="mt-7 grid gap-10 border-t pt-8 lg:grid-cols-3" style={{borderColor:spec.muted}}>{spec.process.map((step,i)=><div key={step.title}><span className="font-serif text-4xl" style={{color:readableInk(spec.background,spec.accent)}}>0{i+1}</span><h3 className="mt-5 text-xl font-semibold">{step.title}</h3><p className="mt-3 max-w-sm text-sm leading-7 opacity-75">{step.detail}</p></div>)}</div></section>
      <section className="border-y" style={{borderColor:spec.muted,background:spec.muted,color:mutedInk}}><div className="mx-auto grid max-w-7xl gap-7 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12"><div><h2 className="font-serif text-3xl sm:text-4xl">A website experience shaped for your business.</h2><p className="mt-3 max-w-2xl text-sm leading-7 opacity-75">This is an illustrative concept. Bennie Studio can help explore a tailored managed website direction.</p></div><Link to={previewLink} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md px-6 py-3 text-sm font-bold text-white" style={{background:spec.accent,color:accentInk}}>Get a website preview <ArrowUpRight size={17}/></Link></div></section>
    </main>}
    {currentPage==="services"&&<main>
      <PageIntro spec={spec} label="01 / Explore" title="Services with a clear next step." description={spec.intro}/>
      <div className="mx-auto max-w-7xl px-5 pb-8 sm:px-8 lg:px-12"><DemoIndustryPhoto slug={spec.slug} tone={spec.muted} compact/></div>
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[.55fr_1fr]"><div className="flex flex-col gap-3" role="group" aria-label="Select a service">{spec.services.map((s,i)=><button key={s.title} aria-pressed={selected===i} type="button" onClick={()=>setSelected(i)} className={"flex min-h-20 items-center justify-between gap-3 border px-5 py-4 text-left text-lg font-semibold transition hover:opacity-80 "+rounded} style={{borderColor:spec.muted,background:selected===i?spec.foreground:spec.background,color:selected===i?spec.background:spec.foreground}}><span>{s.title}</span><ArrowRight size={18}/></button>)}</div>
          <div className={"min-h-[370px] p-8 sm:p-12 "+rounded} style={{background:spec.muted,color:mutedInk}}><span className="text-xs font-bold uppercase tracking-[.2em]">Service / 0{selected+1}</span><h2 className="mt-16 max-w-lg font-serif text-4xl sm:text-5xl">{spec.services[selected].title}</h2><p className="mt-6 max-w-xl leading-8 opacity-80">{spec.services[selected].detail}</p><div className="mt-9">{action("Discuss this option")}</div></div>
        </div>
        <div className="mt-16 grid gap-7 border-t pt-10 md:grid-cols-3" style={{borderColor:spec.muted}}>{spec.process.map((s,i)=><div key={s.title}><span className="text-xs font-bold" style={{color:readableInk(spec.background,spec.accent)}}>0{i+1}</span><h3 className="mt-3 text-lg font-bold">{s.title}</h3><p className="mt-3 text-sm leading-7 opacity-70">{s.detail}</p></div>)}</div>
      </section>
    </main>}
    {currentPage==="about"&&<main>
      <PageIntro spec={spec} label="02 / Approach" title={spec.highlight} description={spec.intro}/>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-2 lg:px-12"><Artwork spec={spec}/><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[.2em]" style={{color:spec.accent}}>Design philosophy</p><h2 className="mt-5 font-serif text-3xl sm:text-4xl">Thoughtful structure. Useful interactions.</h2><p className="mt-5 text-base leading-8 opacity-75">This fictional business website illustrates how service details, visual hierarchy and a clear enquiry path can work together. It does not represent a completed client project or claim measurable results.</p><div className="mt-8">{action("Start a conversation")}</div></div></section>
      <section className="px-5 py-16 sm:px-8 lg:px-12" style={{background:spec.muted,color:mutedInk}}><div className="mx-auto max-w-5xl"><h2 className="font-serif text-3xl">Questions worth answering</h2><div className="mt-8 divide-y" style={{borderColor:spec.accent}}>{spec.faqs.map(f=><details key={f.question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-semibold">{f.question}<ChevronDown size={20} className="shrink-0 transition-transform group-open:rotate-180"/></summary><p className="mt-3 max-w-3xl text-sm leading-8 opacity-75">{f.answer}</p></details>)}</div></div></section>
    </main>}
    {currentPage==="contact"&&<main>
      <PageIntro spec={spec} label="03 / Enquire" title={spec.contactPrompt} description="Explore how a thoughtful enquiry form can help customers explain their needs. This demo does not send or store submissions."/>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 sm:px-8 lg:grid-cols-[1fr_.8fr] lg:px-12">
        <div className={"border p-6 sm:p-10 "+rounded} style={{borderColor:spec.muted}}>
          <p className="text-xs font-bold uppercase tracking-[.2em]">Interactive enquiry example</p>
          <label className="mt-8 block text-sm font-semibold" htmlFor="demo-service">What are you interested in?</label>
          <select id="demo-service" value={selected} onChange={e=>setSelected(Number(e.target.value))} className="mt-3 h-12 w-full rounded-md border px-4 text-base" style={{borderColor:spec.accent,background:spec.background,color:spec.foreground}}>
            {spec.services.map((s,i)=><option key={s.title} value={i}>{s.title}</option>)}
          </select>
          <label className="mt-7 block text-sm font-semibold" htmlFor="demo-brief">A few words about your project (optional)</label>
          <textarea id="demo-brief" maxLength={300} value={projectNote} onChange={e=>setProjectNote(e.target.value)} placeholder="For example: the goal, type of service or ideal timing…" rows={4} className="mt-3 w-full rounded-md border bg-transparent p-4 text-sm" style={{borderColor:spec.accent}}/>
          <button type="button" onClick={()=>setBriefOpen(true)} className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-md px-6 py-3 text-sm font-bold text-white" style={{background:spec.accent,color:accentInk}}>Preview enquiry summary <ArrowRight size={16}/></button>
          <p className="mt-4 text-xs leading-6 opacity-70">Demo only. No message is sent, no appointment is booked, and the information is not stored by this form.</p>
          {briefOpen&&<div role="status" className="mt-7 border-l-4 p-5" style={{borderColor:spec.accent,background:spec.muted,color:mutedInk}}><h2 className="font-bold">Your sample enquiry</h2><p className="mt-3 text-sm"><strong>Service:</strong> {spec.services[selected].title}</p><p className="mt-2 whitespace-pre-wrap text-sm"><strong>Brief:</strong> {projectNote.trim()||"No additional details provided"}</p><p className="mt-4 text-xs opacity-75">Preview only — nothing has been submitted.</p></div>}
        </div>
        <aside className={"h-fit p-7 sm:p-9 "+rounded} style={{background:spec.muted,color:mutedInk}}><span className="text-xs font-bold uppercase tracking-[.2em]">What happens next?</span><ol className="mt-8 space-y-7">{spec.process.map((s,i)=><li key={s.title} className="flex gap-4"><span className="font-serif text-3xl" style={{color:readableInk(spec.background,spec.accent)}}>0{i+1}</span><div><h3 className="font-semibold">{s.title}</h3><p className="mt-2 text-sm leading-7 opacity-75">{s.detail}</p></div></li>)}</ol><div className="mt-10 border-t pt-7" style={{borderColor:spec.accent}}><p className="text-sm leading-7">Want a working enquiry journey for your own service business?</p><Link to={previewLink} className="mt-4 inline-flex items-center gap-2 font-bold underline underline-offset-4">Explore Bennie Studio <ArrowUpRight size={17}/></Link></div></aside>
      </section>
    </main>}
    <footer className="border-t" style={{borderColor:spec.muted}}><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div><p className="font-bold">{spec.brand}</p><p className="mt-2 max-w-xl text-xs leading-6 opacity-70">Illustrative website design by Bennie Studio. Fictional business identity. No transactions or bookings.</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium"><Link to={path("home")} className="hover:underline">Home</Link><Link to={path("services")} className="hover:underline">Services</Link><Link to={"/case-studies/showcase/"+spec.slug} className="inline-flex items-center gap-1 hover:underline">Case study <MoveUpRight size={15}/></Link><Link to="/case-studies" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft size={15}/> All concepts</Link></div></div></footer>
  </div>;
}
