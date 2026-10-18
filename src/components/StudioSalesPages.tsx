import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Globe2, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import { STUDIO_SHOWCASES, StudioShowcaseVisual } from "./StudioCaseStudyDetail";
import { Pricing } from "./Pricing";
import { trackPublicEvent } from "../lib/publicTracking";
import "../styles/studioSales.css";
import "../styles/studioSalesRefinements.css";

const salesLink=(label:string,target:string)=>()=>trackPublicEvent({eventType:"sales_cta_clicked",label,target});

const serviceFaqs=[
  ["Is this a one-time website project or an ongoing service?","Bennie Studio sells managed website plans. Setup covers the initial build; the recurring plan covers hosting, maintenance and the support specified in your agreement. Compare the setup, recurring fee and minimum term before ordering."],
  ["Will my website be different from the other examples?","Yes. The built-in designs provide a starting structure, but your final pages depend on your services, content, brand assets, approved evidence and the agreed scope. The showcase websites are studio-built demonstrations, not past client commissions."],
  ["Do you write the content and source images?","We help plan content and guide your messaging within the plan scope. You provide accurate business details, approvals and any essential proof. Additional copywriting, bespoke photography or integrations can require separate scoping."],
  ["What happens after the website launches?","Your plan determines the included updates, turnaround targets and support. Hosting and agreed maintenance remain managed during your subscription."],
  ["Can I try the website preview without paying?","Yes. The initial website direction is free and requires no payment card. It is a preview, not a finished production website."],
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

export function ServicesSalesPage(){
 const showcase=STUDIO_SHOWCASES.slice(0,3);
 return <main className="bs-sales bs-sales-services">
  <section className="s28-hero s28-services-hero" aria-labelledby="s28-services-title">
   <div className="brand-shell s28-services-layout">
    <div className="s28-services-copy">
     
     <h1 id="s28-services-title">A website should do more than <em>look good.</em></h1>
     <p className="s28-large-copy">We design, build and manage websites that help service businesses explain their value, earn trust and make it easier for customers to enquire.</p>
     <div className="s28-hero-actions">
      <Link to="/generate-preview" onClick={salesLink("Services hero free preview","/generate-preview")} className="s28-button">Get your free website preview <ArrowUpRight size={19}/></Link>
      <Link to="/pricing" onClick={salesLink("Services hero pricing","/pricing")} className="s28-text-link">See plans & pricing <ArrowRight size={17}/></Link>
     </div>
     <p className="s28-tiny-note"><Check size={14}/> Free initial direction. No card required. No obligation to proceed.</p>
    </div>
    <div className="s28-services-art">
     <div className="s28-services-art-top"><span>THE WORK / 001</span><span>DESIGN → ENQUIRY</span></div>
     <div className="s28-screen-large"><TemplatePreviewThumbnail templateId="renovation-contractor-v1" templateName="Renovation contractor" className="h-[350px] sm:h-[400px]" /></div>
     <div className="s28-art-caption"><span>Mobile-first / Built for business</span><span>Showcase website · App-rendered, not client work</span></div>
    </div>
   </div>
  </section>

  <section className="s28-strip" aria-label="Website service overview"><div className="brand-shell">
    <span>DESIGNED FOR SERVICE BUSINESSES</span><div><MonitorSmartphone size={18}/> Responsive website design</div><div><Globe2 size={18}/> Build & technical launch</div><div><ShieldCheck size={18}/> Managed hosting & support</div>
   </div></section>

  <section className="s28-approach brand-shell" aria-labelledby="s28-approach-title">
   <div className="s28-intro-grid"><div><h2 id="s28-approach-title">Built around the business. <em>Not the template.</em></h2></div><div><p>Potential customers arrive with questions. Good websites answer them quickly, back claims with credible information and offer a clear way to contact you.</p><Link to="/case-studies" onClick={salesLink("Services work link","/case-studies")} className="s28-text-link">See website work <ArrowUpRight size={17}/></Link></div></div>
   <div className="s28-principles">{[
    [Sparkles,"Clearer positioning","Say what you do, who you help and why it matters, without unnecessary agency jargon."],
    [MonitorSmartphone,"Stronger first impressions","Confident visual design and considered mobile layouts that fit your business category."],
    [ArrowUpRight,"Easier enquiries","Make calling, booking, requesting a quote or sending a WhatsApp message feel effortless."],
   ].map(([Icon,title,copy]:any,i)=><article key={title}><span className="s28-principle-number">0{i+1}</span><Icon size={27} strokeWidth={1.45} aria-hidden="true"/><h3>{title}</h3><p>{copy}</p></article>)}</div>
  </section>

  <section className="s28-service-chapters" aria-labelledby="s28-service-chapters-title">
   <div className="brand-shell">
    <div className="s28-chapters-top"><h2 id="s28-service-chapters-title">Everything from first brief <em>to after launch.</em></h2><p>Three connected parts of one managed website service. The exact number of pages, revisions and updates depends on the plan you select.</p></div>
    {websiteItems.map(([n,eyebrow,title,copy,result],idx)=><article className="s28-chapter" key={n}><span className="s28-chapter-number">{n} / 03</span><div><p className="s28-kicker">{eyebrow}</p><h3>{title}</h3></div><div className="s28-chapter-body"><p>{copy}</p><div><Check size={17}/> {result}</div></div></article>)}
    <div className="s28-chapter-footer"><Link to="/pricing" onClick={salesLink("Services compare plan scopes","/pricing")} className="s28-button">Compare what's included in each plan <ArrowRight size={18}/></Link><span>Clear setup costs and commitments before checkout.</span></div>
   </div>
  </section>

  <section className="s28-work brand-shell" aria-labelledby="s28-work-title">
   <div className="s28-intro-grid"><div><h2 id="s28-work-title">Different businesses. <em>Different buying journeys.</em></h2></div><div><p>Explore website directions produced from the actual templates inside Bennie Studio. They demonstrate the design system and enquiry paths—not fictitious client success.</p><Link to="/case-studies" className="s28-text-link">All case studies <ArrowUpRight size={17}/></Link></div></div>
   <div className="s28-website-grid">{showcase.map(study=><article key={study.slug}><StudioShowcaseVisual study={study} compact/><div className="s28-showcase-copy"><span>{study.category} / Studio-built showcase</span><h3>{study.headline}</h3><p>{study.goal}</p><Link to={"/case-studies/showcase/"+study.slug} onClick={salesLink("Services case study "+study.slug,"/case-studies/showcase/"+study.slug)}>See design decisions <ArrowUpRight size={17}/></Link></div></article>)}</div>
   <p className="s28-showcase-disclaimer">Design studies rendered from existing product templates. Hypothetical business scenarios; not real client projects or measured commercial outcomes.</p>
  </section>

  <section className="s28-steps-section"><div className="brand-shell">
   <div className="s28-intro-grid"><div><h2>A simple path to <em>your own website.</em></h2></div><p>See an initial direction before committing to a paid service, then move through a transparent design and launch process.</p></div>
   <div className="s28-steps">{[
    ["01","Tell us about the business","Share your website URL or a short description of your services and goals."],
    ["02","Explore the free preview","Review a preliminary direction. No credit card and no commitment required."],
    ["03","Choose a managed plan","Confirm the scope, setup cost, ongoing fee and minimum contract term."],
    ["04","Review, launch & stay supported","Approve the final website, then receive the support included in your plan."],
   ].map(([n,title,description])=><div key={n}><span>{n}</span><h3>{title}</h3><p>{description}</p></div>)}</div>
   <Link to="/generate-preview" onClick={salesLink("Services process preview","/generate-preview")} className="s28-button">Start with a free preview <ArrowUpRight size={18}/></Link>
  </div></section>
  <SalesFaqs/>
 </main>
}

const pricingFaqs=[
 ["Is the setup fee separate from the monthly fee?","Yes. The setup fee covers the initial website build. The monthly charge covers your recurring managed service. Each card shows both charges, what is due initially and the estimated initial-term total, before any applicable taxes."],
 ["What does the initial-term total include?","It combines the one-time setup with the monthly service charges for the minimum commitment shown. It excludes taxes and any separately agreed work or third-party charges. The optional promotional offer changes the initial commitment, and the displayed total updates accordingly."],
 ["Is the first month really free with the optional offer?","For eligible new customers choosing the optional offer, the first month of service is discounted. The one-time setup fee still applies and the initial service commitment becomes 12 months. Read the terms and verify eligibility before checkout."],
 ["Can I start without paying?","Yes. You can create a preliminary website preview without a payment card. It does not reserve a paid service or guarantee a finished website."],
 ["Are search rankings or leads guaranteed?","No. The work targets better usability, trust and enquiry structure; traffic, search positions, leads and sales are not guaranteed."],
 ["Can I change or cancel my plan?","Review the minimum commitment, notice period and applicable cancellation or change terms before payment. Any changes are subject to your selected service agreement."],
];

export function PricingSalesPage(){
 return <main className="bs-sales bs-sales-pricing">
  <section className="s28-pricing-hero">
   <div className="brand-shell">
    <div className="s28-pricing-hero-content">
     <h1>A website worth investing in. <em>Pricing you can understand.</em></h1>
     <p>Choose the level of support you need. Compare the real monthly fee, one-time build cost, what's included and the minimum commitment before you buy.</p>
     <div className="s28-pricing-hero-links"><a href="#plans" className="s28-button" onClick={salesLink("Pricing hero compare","/pricing#plans")}>Compare the plans <ArrowRight size={18}/></a><Link to="/generate-preview" className="s28-text-link" onClick={salesLink("Pricing hero preview","/generate-preview")}>Try a free website preview <ArrowUpRight size={17}/></Link></div>
    </div>
    <div className="s28-pricing-trust"><div><Check size={17}/> Setup + recurring costs visible</div><div><Check size={17}/> Initial-term total shown</div><div><Check size={17}/> Secure checkout after review</div></div>
   </div>
  </section>
  <section className="s28-pricing-body">
   <Pricing hideIntro editorial />
  </section>
  <section className="s28-pricing-explain"><div className="brand-shell"><div className="s28-intro-grid"><div><h2>What's included—and <em>what isn't.</em></h2></div><div><p>We want you to understand the service before making a purchase. Plan scope, delivery targets, ongoing changes and minimum commitments are defined; advertising spend, custom applications and other out-of-scope work aren't automatically included.</p><Link to="/terms" className="s28-text-link">Read service terms <ArrowUpRight size={17}/></Link></div></div>
   <div className="s28-explain-grid">{[
    ["01","The initial build","Planning, design, agreed pages, revisions and launch work within your plan's scope."],
    ["02","The monthly service","Managed hosting, routine maintenance and the plan's specific ongoing update/support allowance."],
    ["03","Additional work","Special integrations, extensive new content, ad campaigns or work beyond plan allowances need separate scoping."],
   ].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
  </div></section>
  <SalesFaqs questions={pricingFaqs} heading="Understand your plan before committing." />
  <section className="s28-pricing-end"><div className="brand-shell"><h2>Start by seeing what your <em>business could look like.</em></h2><p>The first direction is free. Review it before choosing whether a managed website makes sense.</p><div className="flex flex-wrap items-center gap-5"><Link to="/generate-preview" onClick={salesLink("Pricing bottom free preview","/generate-preview")} className="s28-button s28-button-white">Get your free website preview <ArrowUpRight size={18}/></Link><Link to="/book-demo" onClick={salesLink("Pricing bottom consult","/book-demo")} className="s28-text-link">Prefer to speak first? <ArrowRight size={17}/></Link></div></div></section>
 </main>
}
