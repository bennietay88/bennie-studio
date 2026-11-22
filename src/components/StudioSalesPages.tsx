import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Globe2, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";
import { STUDIO_SHOWCASES, StudioShowcaseVisual } from "./StudioCaseStudyDetail";
import { useStudioShowcaseCatalog } from "../lib/studioShowcaseCms";
import type { PlatformCmsPage } from "../lib/platformSiteCms";
import { Pricing } from "./Pricing";
import { trackPublicEvent } from "../lib/publicTracking";
import "../styles/studioSales.css";
import "../styles/studioSalesRefinements.css";

const salesLink=(label:string,target:string)=>()=>trackPublicEvent({eventType:"sales_cta_clicked",label,target});

const serviceFaqs=[
  ["Is this a one-time website project or an ongoing service?","Bennie Studio sells managed website plans. Setup covers the initial build; the recurring plan covers hosting, maintenance and the support specified in your agreement. Your first payment includes setup and month one; service bills monthly after that."],
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

export function ServicesSalesPage({ cmsPage }: { cmsPage?: PlatformCmsPage }){
 const showcase=useStudioShowcaseCatalog(STUDIO_SHOWCASES).slice(0,3);
 return <main className="bs-sales bs-sales-services">
  <section className="s28-hero s28-services-hero" aria-labelledby="s28-services-title">
   <div className="brand-shell s28-services-layout">
    <div className="s28-services-copy">
     
     <h1 id="s28-services-title">{cmsPage?.heroTitle || <>A website should do more than <em>look good.</em></>}</h1>
     <p className="s28-large-copy">{cmsPage?.heroDescription || "We design, build and manage websites that help service businesses explain their value, earn trust and make it easier for customers to enquire."}</p>
     <div className="s28-hero-actions">
      <Link to={cmsPage?.primaryCtaHref || "/generate-preview"} onClick={salesLink("Services hero free preview",cmsPage?.primaryCtaHref || "/generate-preview")} className="s28-button">{cmsPage?.primaryCtaLabel || "Get your free website preview"} <ArrowUpRight size={19}/></Link>
      <Link to="/pricing" onClick={salesLink("Services hero pricing","/pricing")} className="s28-text-link">See plans & pricing <ArrowRight size={17}/></Link>
     </div>
     <p className="s28-tiny-note"><Check size={14}/> Free initial direction. No card required. No obligation to proceed.</p>
    </div>
    <div className="s28-services-art">
     <div className="s28-services-art-top"><span>THE OFFER / OTC + MRC</span><span>SETUP → MONTHLY CARE</span></div>
     <div className="s28-screen-large flex items-center justify-center bg-white p-6 sm:p-10">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
       <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">WEBSITE GROWTH</p><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Setup once. Managed monthly.</h2></div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Month-to-month</span>
       </div>
       <div className="space-y-4 py-5 text-sm font-semibold text-slate-600">
        <div className="flex justify-between gap-4"><span>One-time website setup</span><strong className="text-slate-950">$149</strong></div>
        <div className="flex justify-between gap-4"><span>First month of managed service</span><strong className="text-slate-950">$99</strong></div>
       </div>
       <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-5"><span className="font-bold text-slate-700">Due today</span><strong className="text-3xl font-black tracking-tight text-slate-950">$248</strong></div>
       <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">Then $99/month for ongoing website care. No free trial; service starts with the first payment.</p>
       <div className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-black text-white">Review scope and totals before checkout</div>
      </div>
     </div>
     <div className="s28-art-caption"><span>One-time setup · Monthly managed service</span><span>First payment = setup + month one</span></div>
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
    <div className="s28-chapter-footer"><Link to="/pricing" onClick={salesLink("Services compare plan scopes","/pricing")} className="s28-button">Compare what's included in each plan <ArrowRight size={18}/></Link><span>Clear setup costs and monthly billing before checkout.</span></div>
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
    ["03","Choose a managed plan","Confirm the scope, setup fee, and monthly service fee."],
    ["04","Review, launch & stay supported","Approve the final website, then receive the support included in your plan."],
   ].map(([n,title,description])=><div key={n}><span>{n}</span><h3>{title}</h3><p>{description}</p></div>)}</div>
   <Link to="/generate-preview" onClick={salesLink("Services process preview","/generate-preview")} className="s28-button">Start with a free preview <ArrowUpRight size={18}/></Link>
  </div></section>
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
 return <main className="bs-sales bs-sales-pricing">
  <section className="s28-pricing-hero">
   <div className="brand-shell">
    <div className="s28-pricing-hero-grid"><div className="s28-pricing-hero-content">
     <h1>{cmsPage?.heroTitle || <>A website worth investing in. <em>Pricing you can understand.</em></>}</h1>
     <p>{cmsPage?.heroDescription || "Choose the level of support you need. Compare the monthly fee, one-time setup, what's included and the cancellation terms before you buy."}</p>
     <div className="s28-pricing-hero-links"><a href="#plans" className="s28-button" onClick={salesLink("Pricing hero compare","/pricing#plans")}>Compare the plans <ArrowRight size={18}/></a><Link to="/generate-preview" className="s28-text-link" onClick={salesLink("Pricing hero preview","/generate-preview")}>Try a free website preview <ArrowUpRight size={17}/></Link></div>
    </div>
    <div className="c30-pricing-hero-art" aria-label="Illustration of three managed website plan options">
      <div className="c30-pricing-window">
        <div className="c30-pricing-window-top"><span className="c30-pricing-dots">● ● ●</span><span>Managed website plans</span></div>
        <div className="c30-pricing-mini-cards">
          {[["01","Foundation","Website + care"],["02","Growth","Stronger enquiries"],["03","Partner","Strategy + support"]].map(([n,title,desc],i)=>
            <div key={n} className={i===1?"c30-mini-plan c30-mini-featured":"c30-mini-plan"}>
              <span>{n}</span><strong>{title}</strong><small>{desc}</small><div className="c30-mini-rule"/><div className="c30-mini-line"/><div className="c30-mini-line c30-short"/><div className="c30-mini-button"/>
            </div>
          )}
        </div>
        <p className="c30-pricing-art-note">Choose your market to view verified prices</p>
      </div>
    </div></div>
    <div className="s28-pricing-trust"><div><Check size={17}/> Setup + recurring costs visible</div><div><Check size={17}/> Setup + first month shown</div><div><Check size={17}/> Secure checkout after review</div></div>
   </div>
  </section>
  <section className="s28-pricing-body">
   <Pricing hideIntro editorial />
  </section>
  <section className="s28-pricing-explain"><div className="brand-shell"><div className="s28-intro-grid"><div><h2>What's included—and <em>what isn't.</em></h2></div><div><p>We want you to understand the service before making a purchase. Plan scope, delivery targets and ongoing changes are defined; advertising spend, custom applications and other out-of-scope work aren't automatically included.</p><Link to="/terms" className="s28-text-link">Read service terms <ArrowUpRight size={17}/></Link></div></div>
   <div className="s28-explain-grid">{[
    ["01","The initial build","Planning, design, agreed pages, revisions and launch work within your plan's scope."],
    ["02","The monthly service","Managed hosting, routine maintenance and the plan's specific ongoing update/support allowance."],
    ["03","Additional work","Special integrations, extensive new content, ad campaigns or work beyond plan allowances need separate scoping."],
   ].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
  </div></section>
  <SalesFaqs questions={pricingFaqs} heading="Understand your plan before committing." />
  <section className="s28-pricing-end"><div className="brand-shell"><h2>{cmsPage?.finalCtaTitle || <>Start by seeing what your <em>business could look like.</em></>}</h2><p>{cmsPage?.finalCtaDescription || "The first direction is free. Review it before choosing whether a managed website makes sense."}</p><div className="flex flex-wrap items-center gap-5"><Link to={cmsPage?.primaryCtaHref || "/generate-preview"} onClick={salesLink("Pricing bottom free preview",cmsPage?.primaryCtaHref || "/generate-preview")} className="s28-button s28-button-white">{cmsPage?.primaryCtaLabel || "Get your free website preview"} <ArrowUpRight size={18}/></Link><Link to="/book-demo" onClick={salesLink("Pricing bottom consult","/book-demo")} className="s28-text-link">Prefer to speak first? <ArrowRight size={17}/></Link></div></div></section>
 </main>
}
