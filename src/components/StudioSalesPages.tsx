import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Globe2, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";
import { STUDIO_SHOWCASES } from "./StudioCaseStudyDetail";
import { StudioConceptCanvas } from "./StudioCreativeShowcase";
import { useStudioShowcaseCatalog } from "../lib/studioShowcaseCms";
import type { PlatformCmsPage } from "../lib/platformSiteCms";
import { Pricing } from "./Pricing";
import { StudioEmailOptIn } from "./StudioEmailOptIn";
import { trackPublicEvent } from "../lib/publicTracking";
import "../styles/studioSales.css";
import "../styles/studioSalesRefinements.css";
import "../styles/studioSalesRound1.css";

const salesLink=(label:string,target:string)=>()=>trackPublicEvent({eventType:"sales_cta_clicked",label,target});

const serviceFaqs=[
  ["Is this a one-time website project or an ongoing service?","Bennie Studio sells managed website plans. Setup covers the initial build; the recurring plan covers hosting, maintenance and the support specified in your agreement. Your first payment includes setup and month one; service bills monthly after that."],
  ["Will my website be different from the other examples?","Yes. The built-in designs provide a starting structure, but your final pages depend on your services, content, brand assets, approved evidence and the agreed scope. The showcase websites are studio-built demonstrations, not past client commissions."],
  ["Do you write the content and source images?","We help plan content and guide your messaging within the plan scope. You provide accurate business details, approvals and any essential proof. Additional copywriting, bespoke photography or integrations can require separate scoping."],
  ["What happens after the website launches?","Your plan determines the included updates, turnaround targets and support. Hosting and agreed maintenance remain managed during your subscription."],
  ["Can I try the website preview without paying?","Yes. The initial website direction is free and requires no payment card. It is a preview, not a finished production website or a trial of the paid service. Starting a plan charges setup plus the first service month; monthly billing follows."],
];

function SalesFaqs({questions=serviceFaqs,heading="Questions before you begin?"}:{questions?:string[][];heading?:string}){
  return <section className="s28-faq brand-shell" aria-labelledby="s28-faq-title">
    <div className="s28-faq-intro"><h2 id="s28-faq-title">{heading}</h2><p>Useful answers before you decide. <Link to="/book-demo" onClick={salesLink("Sales FAQ consultation","/book-demo")}>Talk to the studio <ArrowUpRight size={14}/></Link></p></div>
    <div className="s28-faq-questions">{questions.map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={19} aria-hidden="true"/></summary><p>{a}</p></details>)}</div>
  </section>
}
const websiteItems=[
  ["01","Discovery & positioning","Get the fundamentals right before building.","The offer, your customer, your competitors and the decision someone needs to make on your website.","A clearer page hierarchy and messaging direction."],
  ["02","Website design & launch","Make the right impression—and a useful next step.","Responsive page designs, service content structure, enquiry actions and agreed integrations, with human review before launch.","An approved, ready-to-use website within the selected plan scope."],
  ["03","Hosting & ongoing care","Avoid the website becoming another job on your list.","Managed hosting, routine maintenance and a defined allowance for updates and support, according to your plan.","One accountable service relationship after go-live."],
] as const;

export function ServicesSalesPage({ cmsPage }: { cmsPage?: PlatformCmsPage }){
 const showcase=useStudioShowcaseCatalog(STUDIO_SHOWCASES).slice(0,3);
 const heroShowcase=showcase.find(study=>study.slug==="renovation-contractor") || STUDIO_SHOWCASES[1];
 return <main id="main-content" className="bs-sales bs-sales-services s31-sales">
  <section className="s28-hero s28-services-hero s31-services-hero" aria-labelledby="s28-services-title">
   <div className="brand-shell s28-services-layout">
    <div className="s28-services-copy">
     <p className="s31-eyebrow">Website design, launch & ongoing care</p>
     
     <h1 id="s28-services-title">{cmsPage?.heroTitle || <>A website that makes <em>choosing you</em> easier.</>}</h1>
     <p className="s28-large-copy">{cmsPage?.heroDescription || "Strategy, design, build and ongoing care—so the right customers understand your offer and know what to do next."}</p>
     <div className="s28-hero-actions">
      <Link to={cmsPage?.primaryCtaHref || "/generate-preview"} onClick={salesLink("Services hero free preview",cmsPage?.primaryCtaHref || "/generate-preview")} className="s28-button">{cmsPage?.primaryCtaLabel || "Get your free website preview"} <ArrowUpRight size={19}/></Link>
      <Link to="/pricing" onClick={salesLink("Services hero pricing","/pricing")} className="s28-text-link">See plans & pricing <ArrowRight size={17}/></Link>
     </div>
     <p className="s28-tiny-note"><Check size={14}/> Free initial direction. No card required. No obligation to proceed.</p>
    </div>
    <div className="s28-services-art s28-services-showcase-art">
     <div className="s28-services-art-top"><span>THE WORK / 001</span><span>DESIGN → ENQUIRY</span></div>
     <div className="s28-services-preview-frame">
      <div className="s28-services-preview-browser"><span>app.bennietay.com</span><span>RENOVATION / WEBSITE CONCEPT</span></div>
      <StudioConceptCanvas slug={heroShowcase.slug} />
      <div className="s28-services-preview-caption"><span>Service pages · Project gallery</span><span>Quote request</span></div>
     </div>
     <div className="s28-art-caption"><span>Illustrative studio design study</span><span>Built around the enquiry journey</span></div>
    </div>
   </div>
  </section>

  <section className="s28-strip" aria-label="Website service overview"><div className="brand-shell">
    <span>DESIGNED FOR SERVICE BUSINESSES</span><div><MonitorSmartphone size={18}/> Responsive website design</div><div><Globe2 size={18}/> Build & technical launch</div><div><ShieldCheck size={18}/> Managed hosting & support</div>
   </div></section>

  <section className="s31-outcomes" aria-labelledby="s31-outcomes-title">
   <div className="brand-shell s31-outcomes-layout">
    <div className="s31-outcome-lead">
     <span className="s31-eyebrow">The outcome we're working toward</span>
     <h2 id="s31-outcomes-title">Make it easy to understand your business—and easier to enquire.</h2>
     <p>Good design should do more than look polished. Your customers should know what you offer, why they can trust you, and how to take the next step.</p>
     <Link to="/case-studies" className="s28-text-link" onClick={salesLink("Services relevant examples","/case-studies")}>See how different businesses are presented <ArrowUpRight size={17}/></Link>
    </div>
    <div className="s31-outcome-stack">
     {[
      ["01","Clarity","Explain services and who they are for, without burying the message."],
      ["02","Credibility","Present genuine team details, work, policies and proof you can substantiate."],
      ["03","Action","Make a call, booking, WhatsApp enquiry or quote request obvious."],
     ].map(([num,title,copy])=><div className="s31-outcome-row" key={num}><span>{num}</span><div><h3>{title}</h3><p>{copy}</p></div><ArrowUpRight size={21} aria-hidden="true"/></div>)}
    </div>
   </div>
  </section>

  <section className="s28-service-chapters" aria-labelledby="s28-service-chapters-title">
   <div className="brand-shell">
    <div className="s28-chapters-top"><h2 id="s28-service-chapters-title">What we deliver, from the first brief to ongoing care.</h2><p>Three connected parts of one managed website service. The exact number of pages, revisions and updates depends on the plan you select.</p></div>
    {websiteItems.map(([n,eyebrow,title,copy,result],idx)=><article className="s28-chapter" key={n}><span className="s28-chapter-number">{n} / 03</span><div><p className="s28-kicker">{eyebrow}</p><h3>{title}</h3></div><div className="s28-chapter-body"><p>{copy}</p><div><Check size={17}/> {result}</div></div></article>)}
    <div className="s28-chapter-footer"><Link to="/pricing" onClick={salesLink("Services compare plan scopes","/pricing")} className="s28-button">Compare what's included in each plan <ArrowRight size={18}/></Link><span>Clear setup costs and monthly billing before checkout.</span></div>
   </div>
  </section>

  <section className="s28-work brand-shell" aria-labelledby="s28-work-title">
   <div className="s28-intro-grid"><div><h2 id="s28-work-title">Different businesses need different websites.</h2></div><div><p>Explore website directions produced from the actual templates inside Bennie Studio. They demonstrate the design system and enquiry paths—not fictitious client success.</p><Link to="/case-studies" className="s28-text-link">All website examples <ArrowUpRight size={17}/></Link></div></div>
   <div className="s28-website-grid">{showcase.map(study=><article key={study.slug}><StudioConceptCanvas slug={study.slug} compact /><div className="s28-showcase-copy"><span>{study.category} / Studio-built showcase</span><h3>{study.headline}</h3><p>{study.goal}</p><Link to={"/case-studies/showcase/"+study.slug} onClick={salesLink("Services case study "+study.slug,"/case-studies/showcase/"+study.slug)}>See design decisions <ArrowUpRight size={17}/></Link></div></article>)}</div>
   <p className="s28-showcase-disclaimer">Design studies rendered from existing product templates. Hypothetical business scenarios; not real client projects or measured commercial outcomes.</p>
  </section>

  <section className="s31-services-close">
   <div className="brand-shell s31-services-close-layout">
    <div><p className="s31-eyebrow">Start without a commitment</p><h2>See a direction for your business before choosing a plan.</h2></div>
    <div><p>Share what your business does. Explore a preliminary website direction at no cost, then review setup, monthly pricing and the exact delivery scope only if you're ready.</p>
     <Link to="/generate-preview" onClick={salesLink("Services final preview","/generate-preview")} className="s28-button">Get your free website preview <ArrowUpRight size={18}/></Link>
     <p className="s31-quiet-note">No card required for the preview. Examples shown are design studies.</p>
    </div>
   </div>
  </section>
  <SalesFaqs/>
 </main>
}

const pricingFaqs=[
 ["Is the setup fee separate from the monthly fee?","Yes. The one-time setup fee covers the initial website build. The first payment includes setup and the first month of service; the recurring monthly fee is billed after that. Prices are before applicable taxes."],
 ["Can I start without paying?","Yes. You can create a preliminary website preview without a payment card. It does not reserve a paid service or guarantee a finished website."],
 ["Are search rankings or leads guaranteed?","No. The work targets better usability, trust and enquiry structure; traffic, search positions, leads and sales are not guaranteed."],
 ["Can I change or cancel my plan?","Plans bill month-to-month. Review the cancellation notice period and applicable change terms before payment. Any changes are subject to your selected service agreement."],
];

export function PricingSalesPage({ cmsPage }: { cmsPage?: PlatformCmsPage }){
 return <main id="main-content" className="bs-sales bs-sales-pricing s31-sales">
  <section className="s28-pricing-hero">
   <div className="brand-shell">
    <div className="s28-pricing-hero-grid"><div className="s28-pricing-hero-content"><p className="s31-eyebrow">Transparent website plans</p>
     <h1>{cmsPage?.heroTitle || <>Choose a plan with clarity, not guesswork.</>}</h1>
     <p>{cmsPage?.heroDescription || "Choose the level of support you need. Compare the monthly fee, one-time setup, what's included and the cancellation terms before you buy."}</p>
     <div className="s28-pricing-hero-links"><a href="#plans" className="s28-button" onClick={salesLink("Pricing hero compare","/pricing#plans")}>Compare the plans <ArrowRight size={18}/></a><Link to="/generate-preview" className="s28-text-link" onClick={salesLink("Pricing hero preview","/generate-preview")}>Try a free website preview <ArrowUpRight size={17}/></Link></div>
    </div>
    <div className="s31-pricing-decision" aria-label="Illustration of four managed website service levels">
      <div className="s31-pricing-decision-label">Two common starting points</div>
      <div className="s31-pricing-path s31-pricing-path-primary"><span>01 / A managed presence</span><strong>Get the essentials live.</strong><p>Professional pages, clearer enquiries and ongoing website care.</p></div>
      <div className="s31-pricing-path"><span>02 / Grow with purpose</span><strong>Build on that foundation.</strong><p>Expand content, conversion work and growth support by plan.</p></div>
      <div className="s31-pricing-decision-footer">Two further options for personal profiles or expanded partnerships are compared below.</div>
    </div></div>
    <div className="s28-pricing-trust"><div><Check size={17}/> Setup + recurring costs visible</div><div><Check size={17}/> Setup + first month shown</div><div><Check size={17}/> Secure checkout after review</div></div>
   </div>
  </section>
  <section className="s28-pricing-body">
   <Pricing hideIntro editorial />
  </section>
  <section className="s28-pricing-explain s31-pricing-explain"><div className="brand-shell"><div className="s28-intro-grid"><div><h2>Understand what's included, and what needs separate scoping.</h2></div><div><p>We want you to understand the service before making a purchase. Plan scope, delivery targets and ongoing changes are defined; advertising spend, custom applications and other out-of-scope work aren't automatically included.</p><Link to="/terms" className="s28-text-link">Read service terms <ArrowUpRight size={17}/></Link></div></div>
   <div className="s28-explain-grid">{[
    ["01","The initial build","Planning, design, agreed pages, revisions and launch work within your plan's scope."],
    ["02","The monthly service","Managed hosting, routine maintenance and the plan's specific ongoing update/support allowance."],
    ["03","Additional work","Special integrations, extensive new content, ad campaigns or work beyond plan allowances need separate scoping."],
   ].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
  </div></section>
  <section className="brand-shell s31-pricing-optin" aria-label="Optional website checklist">
    <details className="s31-pricing-optin-details">
     <summary><span><strong>Not ready to choose?</strong><span>Get the optional website checklist by email instead.</span></span><span className="s31-optin-toggle" aria-hidden="true">+</span></summary>
     <div className="s31-optin-form"><StudioEmailOptIn sourcePage="/pricing" title="Get the free website checklist" description="Occasional practical website advice. Signing up is optional and unrelated to requesting a free preview." /></div>
    </details>
  </section>
  <SalesFaqs questions={pricingFaqs} heading="Understand your plan before committing." />
  <section className="s28-pricing-end"><div className="brand-shell"><h2>{cmsPage?.finalCtaTitle || <>Start by seeing what your <em>business could look like.</em></>}</h2><p>{cmsPage?.finalCtaDescription || "The first direction is free. Review it before choosing whether a managed website makes sense."}</p><div className="flex flex-wrap items-center gap-5"><Link to={cmsPage?.primaryCtaHref || "/generate-preview"} onClick={salesLink("Pricing bottom free preview",cmsPage?.primaryCtaHref || "/generate-preview")} className="s28-button s28-button-white">{cmsPage?.primaryCtaLabel || "Get your free website preview"} <ArrowUpRight size={18}/></Link><Link to="/book-demo" onClick={salesLink("Pricing bottom consult","/book-demo")} className="s28-text-link">Prefer to speak first? <ArrowRight size={17}/></Link></div></div></section>
 </main>
}
