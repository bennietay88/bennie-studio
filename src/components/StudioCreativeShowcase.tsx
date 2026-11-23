import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, MoveUpRight } from "lucide-react";
import type { StudioShowcase } from "./StudioCaseStudyDetail";
import { trackPublicEvent } from "../lib/publicTracking";

/**
 * Curated, concept-only design art direction for the public marketing site.
 * Concept artwork is explicitly illustrative; no client metrics,
 * outcomes, testimonials or commissioned projects are fabricated.
 */
const directions = [
  {slug:"renovation-contractor", number:"01", eyebrow:"LOCAL SERVICE / CONVERSION", heading:"Make the next quote feel easy.", accent:"#f7b46e", signature:"Bold service hierarchy", treatment:"quote"},
  {slug:"dental-clinic", number:"02", eyebrow:"HEALTHCARE / TRUST", heading:"A calmer first impression.", accent:"#94ecd1", signature:"Confidence through clarity", treatment:"care"},
  {slug:"professional-advisory", number:"03", eyebrow:"PROFESSIONAL / EDITORIAL", heading:"Expertise that speaks clearly.", accent:"#ddceff", signature:"Editorial authority", treatment:"advisory"},
] as const;

type CuratedDirection = typeof directions[number];

/** Readable, non-interactive visual studies. The project pages link to real
 * demos. Buttons pictured inside these mockups are illustrative, not controls. */
const conceptImages: Record<string, string> = {
  "renovation-contractor": "/template-assets/flagship-renovation.jpg",
  "dental-clinic": "/template-assets/flagship-clinic.jpg",
  "professional-advisory": "/template-assets/flagship-professional.jpg",
  "beauty-wellness": "/template-assets/flagship-beauty.jpg",
  "tuition-centre": "/template-assets/flagship-education.jpg",
};

const conceptContent: Record<string, { category: string; wordmark: string; eyebrow: string; title: string; copy: string; action: string; detail: string }> = {
  "renovation-contractor": {
    category: "Home transformation", wordmark: "FORM / SPACE", eyebrow: "RETHINK YOUR SPACE",
    title: "A better space starts here.",
    copy: "Considered renovation for the spaces that matter most.",
    action: "Request a quote", detail: "Residential · Commercial",
  },
  "dental-clinic": {
    category: "Patient care", wordmark: "CALM / DENTAL", eyebrow: "A MORE PERSONAL APPROACH",
    title: "Feel good about your smile.",
    copy: "Thoughtful care, clearly explained.",
    action: "Explore treatments", detail: "Care · Confidence · Clarity",
  },
  "professional-advisory": {
    category: "Professional advice", wordmark: "ATLAS / ADVISORY", eyebrow: "A CLEARER WAY FORWARD",
    title: "Confidence in your next decision.",
    copy: "Focused expertise for complex questions.",
    action: "Explore expertise", detail: "Insight · Strategy · Direction",
  },
  "beauty-wellness": {
    category: "Beauty and wellness", wordmark: "STILL / STUDIO", eyebrow: "YOUR MOMENT, REIMAGINED",
    title: "Make space for yourself.",
    copy: "An intentional approach to feeling your best.",
    action: "View treatments", detail: "Ritual · Care · Renewal",
  },
  "tuition-centre": {
    category: "Education", wordmark: "BRIGHT / MINDS", eyebrow: "LEARN WITH CONFIDENCE",
    title: "Every learner has potential.",
    copy: "A clear path from curiosity to progress.",
    action: "See programmes", detail: "Discover · Learn · Grow",
  },
  "accounting-firm": {
    category: "Accounting and advisory", wordmark: "NORTH / LEDGER", eyebrow: "CLARITY FOR BUSINESS",
    title: "See the numbers. Know the next step.",
    copy: "Accounting, tax and practical advice for growing teams.",
    action: "Our services", detail: "Accounts · Tax · Advice",
  },
};

export function StudioConceptCanvas({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const concept = conceptContent[slug] || conceptContent["professional-advisory"];
  const image = conceptImages[slug];
  return (
    <div className={"sfn-concept sfn-concept-" + slug + (compact ? " sfn-concept-compact" : "")}
      aria-label={concept.category + " illustrative website direction"}>
      <div className="sfn-concept-nav">
        <span className="sfn-concept-brand">{concept.wordmark}</span>
        <span className="sfn-concept-menu" aria-hidden="true">About&nbsp; · &nbsp;Services&nbsp; · &nbsp;Contact</span>
        <span className="sfn-concept-menu-mobile" aria-hidden="true">☰</span>
      </div>
      <div className="sfn-concept-body">
        <div className="sfn-concept-copy">
          <span className="sfn-concept-eyebrow">{concept.eyebrow}</span>
          <strong className="sfn-concept-title">{concept.title}</strong>
          <span className="sfn-concept-description">{concept.copy}</span>
          <span className="sfn-concept-cta">{concept.action} <ArrowUpRight size={15} aria-hidden="true" /></span>
        </div>
        <div className="sfn-concept-photo">
          {image
            ? <img src={image} alt="" loading="lazy" decoding="async" />
            : <div className="sfn-concept-finance-art" aria-hidden="true"><span>FINANCIAL OVERVIEW</span><i/><i/><i/><strong>Clarity in every detail.</strong></div>}
        </div>
      </div>
      <div className="sfn-concept-footer"><span>{concept.detail}</span><span>DESIGN STUDY / NOT A LIVE CLIENT WEBSITE</span></div>
    </div>
  );
}



function findStudy(studies: readonly StudioShowcase[], slug: string) {
  return studies.find(study => study.slug === slug);
}

export function StudioSignatureStage({studies}: {studies: readonly StudioShowcase[]}) {
  const [active, setActive] = React.useState(0);
  const tabs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const selected: CuratedDirection = directions[active];
  const study = findStudy(studies, selected.slug);
  const change = (index: number, focus = false) => {
    const next = (index + directions.length) % directions.length;
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  };
  const onKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {event.preventDefault();change(active+1,true);}
    else if (event.key === "ArrowLeft") {event.preventDefault();change(active-1,true);}
    else if (event.key === "Home") {event.preventDefault();change(0,true);}
    else if (event.key === "End") {event.preventDefault();change(directions.length-1,true);}
  };
  return <div className="sfn-signature" style={{"--sfn-spot":selected.accent} as React.CSSProperties} aria-label="Three website directions">
    <div className="sfn-signature-top"><span>BENNIE / DIGITAL DESIGN STUDIO</span><span>SELECTED DIRECTIONS <span aria-hidden="true">✳</span></span></div>
    <div className={"sfn-signature-canvas sfn-signature-"+selected.treatment} role="tabpanel" aria-label={selected.eyebrow} id="sfn-signature-panel" aria-labelledby={"sfn-signature-tab-"+selected.slug}>
      <div className="sfn-signature-orbit" aria-hidden="true"/>
      <div className="sfn-signature-backdrop" aria-hidden="true">{selected.number}</div>
      <div className="sfn-signature-window" key={selected.slug}>
        <div className="sfn-signature-browser"><span className="sfn-browser-dots" aria-hidden="true"><i/><i/><i/></span><span>{study?.title ?? "Website concept"} / DESIGN STUDY</span><span>↗</span></div>
        {study && <StudioConceptCanvas slug={study.slug} />}
      </div>
      <div className="sfn-signature-stamp" aria-hidden="true">VISUAL<br/>DIRECTION<br/>STUDY ↗</div>
    </div>
    <div className="sfn-signature-bottom">
      <div className="sfn-signature-story">
        <span className="sfn-signature-kicker">{selected.eyebrow}</span>
        <strong>{selected.heading}</strong>
        <span className="sfn-signature-description">{selected.signature} · Illustrative studio work, not a commissioned client result.</span>
        <Link to={"/case-studies/showcase/"+selected.slug} onClick={()=>trackPublicEvent({eventType:"case_study_clicked",label:"Hero stage "+selected.slug,target:"/case-studies/showcase/"+selected.slug})}>Explore design decisions <ArrowUpRight size={16}/></Link>
      </div>
      <div className="sfn-signature-controls">
        <div role="tablist" aria-label="Choose a website industry" onKeyDown={onKeys}>
          {directions.map((direction,index)=><button key={direction.slug} type="button" role="tab" id={"sfn-signature-tab-"+direction.slug} aria-controls="sfn-signature-panel" aria-selected={active===index} tabIndex={active===index?0:-1} ref={node=>{tabs.current[index]=node;}} onClick={()=>change(index)} aria-label={"View "+direction.eyebrow+" website direction"}>{direction.number}</button>)}
        </div>
        <div className="sfn-signature-arrows"><button type="button" onClick={()=>change(active-1)} aria-label="Previous design"><ChevronLeft size={18}/></button><button type="button" onClick={()=>change(active+1)} aria-label="Next design"><ChevronRight size={18}/></button></div>
      </div>
    </div>
  </div>;
}

const workDirection: Record<string,{kind:string,line:string}> = {
  "renovation-contractor":{kind:"Service-led",line:"Make quote requests easy to find."},
  "dental-clinic":{kind:"Trust-first",line:"Make treatments and bookings clearer."},
  "professional-advisory":{kind:"Editorial",line:"Build confidence before the first call."},
};

export function StudioSelectedWork({studies}:{studies:readonly StudioShowcase[]}) {
  const order = ["renovation-contractor","dental-clinic","professional-advisory"];
  const curated = order.map(slug=>findStudy(studies,slug)).filter((study):study is StudioShowcase=>Boolean(study));
  return <section className="sfn-work-section" aria-labelledby="sfn-work-title">
    <div className="brand-shell">
      <div className="sfn-work-heading">
        <div><p className="sfn-kicker">DESIGN IS NOT A TEMPLATE</p><h2 id="sfn-work-title">Different businesses. Different design directions.</h2></div>
        <div><p>Every business deserves its own visual story. Three focused design studies show how different industries need different messages, structures and enquiry paths.</p><Link to="/case-studies">View all design studies <MoveUpRight size={17}/></Link></div>
      </div>
      <div className="sfn-work-grid">
        {curated.map((study,index)=>{
          const dir=workDirection[study.slug];
          return <article className={"sfn-work-card sfn-work-card-"+(index+1)} key={study.slug} style={{"--sfn-card-accent":study.colour} as React.CSSProperties}>
            <div className="sfn-work-card-top"><span>{String(index+1).padStart(2,"0")} / {study.category}</span><span>STUDIO CONCEPT ↗</span></div>
            <Link to={"/case-studies/showcase/"+study.slug} className="sfn-work-art" aria-label={"Explore "+study.title+" design concept"} onClick={()=>trackPublicEvent({eventType:"case_study_clicked",label:study.title,target:"/case-studies/showcase/"+study.slug})}>
              <div className="sfn-work-art-inner"><StudioConceptCanvas slug={study.slug} compact /></div>
              <span className="sfn-work-open"><ArrowUpRight size={23}/></span>
            </Link>
            <div className="sfn-work-card-foot"><div><span>{dir?.kind || "Industry design"}</span><h3>{study.title}</h3><p>{dir?.line || study.goal}</p></div><Link to={"/case-studies/showcase/"+study.slug} aria-label={"View "+study.title+" case study"}><ArrowRight size={24}/></Link></div>
          </article>;
        })}
      </div>
      <p className="sfn-work-fineprint">These are illustrative design studies, not commissioned client projects or measured client outcomes.</p>
    </div>
  </section>;
}
