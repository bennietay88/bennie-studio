import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Globe2, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";
import { trackPublicEvent } from "../lib/publicTracking";
import { STUDIO_SHOWCASES } from "./StudioCaseStudyDetail";
import { StudioProcessTimeline } from "./StudioFieldNotes";
import { StudioSignatureStage, StudioSelectedWork } from "./StudioCreativeShowcase";
import { useStudioShowcaseCatalog } from "../lib/studioShowcaseCms";
import { usePublishedPlatformCms } from "../lib/platformSiteCms";
import "../styles/conversionHomepage.css";

/**
 * Bennie Studio's conversion-led editorial homepage.
 * The visual showcase is an in-house representation of this website,
 * not a fabricated customer commission or a measured result.
 */
export function ConversionHomepage({ onCta }: { onCta: (path: string, label: string) => void }) {
  const cta = (label: string) => onCta("/generate-preview", label);
  const showcases = useStudioShowcaseCatalog(STUDIO_SHOWCASES);
  const cms = usePublishedPlatformCms();
  const pageCms = cms.pages["/"];
  return (
    <div className="conversion-home sfn-home">
      <section className="c26-hero sfn-hero" aria-labelledby="c26-title">
        <div className="c26-hero-grid brand-shell">
          <div className="c26-hero-copy">
            <p className="sfn-hero-eyebrow"><span className="sfn-hero-dot" aria-hidden="true"/> INDEPENDENT DIGITAL DESIGN STUDIO / EST. 2026</p>
            <h1 id="c26-title">{pageCms?.heroTitle || <>Websites that <em>earn trust.</em></>}</h1>
            <p className="c26-intro">{pageCms?.heroDescription || "We design, build, host and manage distinctive websites that make your business easier to trust, your services easier to understand and the next step clearer—so you can get more enquiries."}</p>
            <div className="c26-actions">
              <button type="button" className="c26-button c26-button-blue" onClick={() => onCta(pageCms?.primaryCtaHref || "/generate-preview", pageCms?.primaryCtaLabel || "Homepage editorial primary preview")}>{pageCms?.primaryCtaLabel || "Get your free website preview"} <ArrowUpRight aria-hidden="true" size={19} /></button>
              <Link className="c26-quiet-link" to="/case-studies" onClick={() => trackPublicEvent({eventType:"sales_cta_clicked",label:"Homepage editorial case studies",target:"/case-studies"})}>Explore website examples <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <ul className="c26-assurances" aria-label="What to expect">
              <li><Check size={14} aria-hidden="true" /> No card required</li>
              <li><Check size={14} aria-hidden="true" /> Scope and billing shown up front</li>
              <li><Check size={14} aria-hidden="true" /> Hosting & ongoing care</li>
            </ul>
          </div>
          <StudioSignatureStage studies={showcases}/>
        </div>
      </section>

      <section className="c26-value" aria-labelledby="c26-value-title">
        <div className="brand-shell c26-value-grid">
          <div><h2 id="c26-value-title">More than a <em>pretty website.</em></h2></div>
          <p className="c26-value-description">Good design attracts attention. Clear messaging, credible information and easy enquiry paths help turn that attention into a business opportunity.</p>
          <div className="c26-value-items">
            {[
              [Globe2,"Clear messaging","Customers understand what you do and who you help."],
              [MonitorSmartphone,"Built for every screen","Responsive, easy-to-use pages on mobile and desktop."],
              [ShieldCheck,"Hosting and updates","A website that's kept maintained after launch."],
              [Sparkles,"Focused enquiry paths","The next step is easy to find and act on."],
            ].map(([Icon,title,detail]:any)=><div className="c26-value-item" key={title}><Icon size={23} strokeWidth={1.5} aria-hidden="true"/><h3>{title}</h3><p>{detail}</p></div>)}
          </div>
        </div>
      </section>

      <StudioSelectedWork studies={showcases}/>
      <div className="brand-shell py-8 sm:py-12"><div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div><h2 className="!text-2xl !leading-tight text-slate-950">See a website direction before sharing your details.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore illustrative industry examples freely. No account, email or credit card needed to browse.</p></div><Link to="/case-studies" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#1946c3] px-5 py-3 text-sm font-bold text-white">Explore interactive examples <ArrowUpRight size={18} aria-hidden="true"/></Link></div></div>

      <section className="c26-process" aria-labelledby="c26-process-title">
        <div className="brand-shell">
          <div className="c26-section-head c26-process-head"><div><h2 id="c26-process-title">How it <em>works.</em></h2></div><p>You can explore a website direction before choosing a managed plan. Here is what happens next.</p><Link to="/how-it-works" className="c26-quiet-link">View our process <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
          <StudioProcessTimeline steps={[
            {number:"01",title:"Share your business",description:"Tell us what you offer and who you want to reach, or share your current site.",detail:"We use your brief to shape an initial website direction."},
            {number:"02",title:"Review your free preview",description:"Explore a preliminary direction and the proposed enquiry path before choosing a plan.",detail:"No card is required to request the preview."},
            {number:"03",title:"Approve scope and start",description:"Confirm the pages, deliverables and plan that fit your business before work begins.",detail:"The first payment includes the applicable setup fee and first month. Check each plan for its minimum commitment and cancellation terms."},
            {number:"04",title:"Launch and stay supported",description:"Review the build, launch with confidence, then receive the hosting and care included in your plan.",detail:"Service is billed monthly. Any initial minimum commitment is shown in the selected plan and order summary."},
          ]} />
          <button onClick={() => cta("Homepage process free preview")} className="c26-button c26-button-blue c26-process-cta" type="button">Start with a free preview <ArrowUpRight size={18} aria-hidden="true"/></button>
        </div>
      </section>

      <section className="c26-services brand-shell" aria-labelledby="c26-services-title">
        <div className="c26-section-head"><div><h2 id="c26-services-title">A complete website solution for your business.</h2></div><p>From design and launch to hosting, maintenance and continuing support—one accountable studio.</p><Link to="/services" className="c26-quiet-link">Explore our services <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
        <div className="c26-service-grid">{[
          ["01","Design that communicates","Distinctive, responsive pages that make your services and credibility clear.","Website strategy & design"],
          ["02","A build that works","A tested website with clear navigation and useful ways to enquire.","Build, content & launch"],
          ["03","A partner after launch","Managed hosting, updates and support rather than a one-off handover.","Hosting & ongoing care"],
        ].map(([num,title,detail,label])=><article key={num} className="c26-service"><span>{num}</span><h3>{title}</h3><p>{detail}</p><small>{label}</small></article>)}</div>
      </section>
    </div>
  );
}
