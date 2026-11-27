import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Globe2, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";
import { trackPublicEvent } from "../lib/publicTracking";
import { STUDIO_SHOWCASES } from "./StudioCaseStudyDetail";
import { StudioProcessTimeline } from "./StudioFieldNotes";
import { StudioComparisonDemo } from "./InteractiveSiteSections";
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
          <div><h2 id="c26-value-title">More than a beautiful website.</h2></div>
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
      <StudioComparisonDemo />

      <section className="c27-studio-proof" aria-labelledby="c27-proof-title">
        <div className="brand-shell c27-studio-proof-layout">
          <div className="c27-proof-copy">
            <p className="c27-kicker">Meet the studio</p>
            <h2 id="c27-proof-title">A real person behind the work.</h2>
            <div className="c27-founder-byline">
              <div className="c27-founder-avatar" aria-hidden="true">BT</div>
              <div><strong>Bennie Tay</strong><span>Founder, Bennie Studio</span></div>
            </div>
            <p>Bennie Studio is a hands-on website studio built around a simple belief: your business deserves a clear, credible website and someone accountable for keeping it useful after launch.</p>
            <p className="c27-proof-disclosure">This website is a live example of our work. The industry previews are design studies, not fabricated client projects or performance results.</p>
            <div className="c27-proof-actions">
              <Link to="/about" className="c27-proof-link">Meet Bennie and the studio <ArrowUpRight size={17} aria-hidden="true"/></Link>
              <Link to="/case-studies" className="c27-proof-link">Explore the interactive examples <ArrowUpRight size={17} aria-hidden="true"/></Link>
            </div>
          </div>
          <div className="c27-proof-visual">
            <div className="c27-proof-browser" aria-label="Visual of the Bennie Studio homepage">
              <div className="c27-browser-bar"><span aria-hidden="true"><i/><i/><i/></span><strong>app.bennietay.com</strong></div>
              <div className="c27-browser-content">
                <div className="c27-browser-brand">B<span> / </span>BENNIE STUDIO <small>WEBSITE DESIGN & CARE</small></div>
                <div className="c27-browser-message"><span>THE STUDIO, IN PRACTICE</span><strong>Websites that earn trust.</strong><p>Design, build, launch and ongoing care for service businesses.</p><b>Explore a free website preview ↗</b></div>
                <div className="c27-browser-footer">Real studio website · Browse freely</div>
              </div>
            </div>
            <div className="c27-proof-side-note"><span className="c27-proof-line" aria-hidden="true"/><strong>Built for clarity. Maintained with care.</strong><p>See the navigation, language and next steps in the site you are using.</p></div>
          </div>
        </div>
      </section>

      <section className="c26-process c27-unified-process" aria-labelledby="c26-process-title">
        <div className="brand-shell">
          <div className="c27-process-header">
            <div><p className="c27-kicker">One process, from first idea to ongoing care</p><h2 id="c26-process-title">From free preview to a managed website.</h2></div>
            <p>Explore a direction first. When you are ready, we plan the pages, build and launch your website, then keep it supported under your chosen plan.</p>
          </div>
          <StudioProcessTimeline steps={[
            {number:"01",title:"Share your business",description:"Tell us what you offer and who you want to reach.",detail:"We plan a direction around your message and enquiry goals."},
            {number:"02",title:"Review your preview",description:"Explore an initial site direction before paying.",detail:"No card needed for the free preview."},
            {number:"03",title:"Approve, build and launch",description:"Review scope and pricing, then we design, build and launch.",detail:"Billing and any minimum commitment are shown before checkout."},
            {number:"04",title:"Ongoing website care",description:"Hosting, maintenance and content support continue after launch.",detail:"The exact services depend on your selected plan."},
          ]} />
          <div className="c27-process-cta"><button onClick={() => cta("Homepage unified process free preview")} className="c26-button c26-button-blue" type="button">Start with a free preview <ArrowUpRight size={18} aria-hidden="true"/></button><Link to="/services" className="c27-proof-link">What is included <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
        </div>
      </section>
    </div>
  );
}
