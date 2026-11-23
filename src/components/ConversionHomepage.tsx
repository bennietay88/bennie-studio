import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Globe2, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";
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
            <p className="sfn-hero-eyebrow"><span className="sfn-hero-dot" aria-hidden="true"/> INDEPENDENT DIGITAL DESIGN & WEBSITE CARE</p>
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
          <div><h2 id="c26-value-title">More than a good-looking website.</h2></div>
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

      <section className="c26-live-proof" aria-labelledby="c26-live-proof-title">
        <div className="brand-shell c26-live-proof-grid">
          <div>
            <p className="c26-proof-kicker">A real site, available to inspect</p>
            <h2 id="c26-live-proof-title">Our own website is live. See how we build.</h2>
          </div>
          <div>
            <p>You're browsing a Bennie Studio website right now. Check its navigation, mobile experience and enquiry path for yourself. The industry examples above are design studies—not claimed client results.</p>
            <div className="c26-proof-links">
              <Link to="/about">Meet the studio <ArrowUpRight size={17} aria-hidden="true"/></Link>
              <Link to="/case-studies">Explore the design decisions <ArrowUpRight size={17} aria-hidden="true"/></Link>
            </div>
          </div>
        </div>
      </section>
      <div className="brand-shell py-8 sm:py-12"><div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div><h2 className="!text-2xl !leading-tight text-slate-950">Explore before you enquire.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Browse the examples at your own pace. No account, email or credit card needed.</p></div><Link to="/case-studies" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#1946c3] px-5 py-3 text-sm font-bold text-white">Explore interactive examples <ArrowUpRight size={18} aria-hidden="true"/></Link></div></div>

      <section className="c26-process" aria-labelledby="c26-process-title">
        <div className="brand-shell">
          <div className="c26-section-head c26-process-head"><div><h2 id="c26-process-title">How it works.</h2></div><p>You can explore a website direction before choosing a managed plan. Here is what happens next.</p><Link to="/how-it-works" className="c26-quiet-link">View our process <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
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
        <div className="c26-section-head"><div><h2 id="c26-services-title">One studio. Every step of your website.</h2></div><p>A clear plan to get your site live, followed by the hosting, updates and support your plan includes.</p><Link to="/services" className="c26-quiet-link">Explore our services <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
        <div className="c26-service-grid">{[
          {number:"01",title:"Plan the right pages",description:"We structure your message around what customers need to know before they enquire.",details:["Clear service positioning","Navigation and enquiry paths","A direction suited to your business"],label:"Discovery & design"},
          {number:"02",title:"Build and launch",description:"A responsive, reviewed website that helps people understand your work and take the next step.",details:["Mobile-first presentation","Contact and conversion routes","A review before publication"],label:"Build & launch"},
          {number:"03",title:"Care after launch",description:"We continue hosting and maintaining the site, with the support included in your selected plan.",details:["Managed hosting","Maintenance and security updates","Ongoing content support by plan"],label:"Hosting & care"},
        ].map((service)=><article key={service.number} className="c26-service">
          <span>{service.number}</span><h3>{service.title}</h3><p>{service.description}</p>
          <ul>{service.details.map(detail=><li key={detail}><Check size={15} aria-hidden="true"/>{detail}</li>)}</ul>
          <small>{service.label}</small>
        </article>)}</div>
      </section>
    </div>
  );
}
