import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Globe2, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";
import { trackPublicEvent } from "../lib/publicTracking";
import { STUDIO_SHOWCASES, StudioShowcaseVisual } from "./StudioCaseStudyDetail";
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
  const featuredStudy = showcases[1];
  return (
    <div className="conversion-home">
      <section className="c26-hero" aria-labelledby="c26-title">
        <div className="c26-hero-grid brand-shell">
          <div className="c26-hero-copy">
            
            <h1 id="c26-title">{pageCms?.heroTitle || <>Websites that help service businesses <em>get more enquiries.</em></>}</h1>
            <p className="c26-intro">{pageCms?.heroDescription || "We design, build, host and manage distinctive websites that make your business easier to trust, your services easier to understand and your next step easier to take."}</p>
            <div className="c26-actions">
              <button type="button" className="c26-button c26-button-blue" onClick={() => onCta(pageCms?.primaryCtaHref || "/generate-preview", pageCms?.primaryCtaLabel || "Homepage editorial primary preview")}>{pageCms?.primaryCtaLabel || "Get your free website preview"} <ArrowUpRight aria-hidden="true" size={19} /></button>
              <Link className="c26-quiet-link" to="/case-studies" onClick={() => trackPublicEvent({eventType:"sales_cta_clicked",label:"Homepage editorial case studies",target:"/case-studies"})}>See case studies <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <ul className="c26-assurances" aria-label="What to expect">
              <li><Check size={14} aria-hidden="true" /> No card required</li>
              <li><Check size={14} aria-hidden="true" /> Clear plan pricing</li>
              <li><Check size={14} aria-hidden="true" /> Hosting & ongoing care</li>
            </ul>
          </div>
          <div className="c26-stage" aria-label="Bennie Studio responsive website presentation">
            <div className="c26-halo" aria-hidden="true" />
            <div className="c26-browser">
              <div className="c26-browser-top"><span className="c26-dots" aria-hidden="true"><i/><i/><i/></span><span>app.bennietay.com</span><span className="c26-browser-line" /></div>
              <div className="c26-web-navbar"><strong>bennie<span>studio</span></strong><small>Services &nbsp;&nbsp; Case Studies &nbsp;&nbsp; Pricing</small><span>Free website preview ↗</span></div>
              <div className="c26-web-layout"><div><small>DESIGN · BUILD · MANAGE</small><h2>Made to <em>stand out.</em><br/>Built to work.</h2><p>Distinctive websites for businesses that value clarity and customer enquiries.</p><span className="c26-visual-link">Let's work together ↗</span></div><div className="c26-web-art"><div className="c26-art-circle"/><div className="c26-art-panel"><span>STRATEGY</span><strong>Clearer<br/>messages.<br/>Better<br/>decisions.</strong></div></div></div>
              <div className="c26-web-bottom"><span>01 / Strategy</span><span>02 / Design</span><span>03 / Launch</span><span>04 / Care</span></div>
            </div>
            <div className="c26-phone" aria-hidden="true"><div className="c26-phone-camera"/><div className="c26-phone-nav">bennie<span>studio</span> <b>☰</b></div><span className="c26-phone-kicker">WEBSITES FOR BUSINESS</span><strong>Made to<br/><i>stand out.</i><br/>Built to work.</strong><div className="c26-phone-art"/><span className="c26-phone-cta">Get your preview ↗</span></div>
            <div className="c26-studio-note">DESIGNED TO WORK<br/>ON EVERY DEVICE <ArrowRight size={27} strokeWidth={1.4} aria-hidden="true" /></div>
            <span className="c26-stage-caption">In-house Bennie Studio website presentation</span>
          </div>
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

      <section className="c26-case brand-shell" aria-labelledby="c26-case-title">
        <div className="c26-section-head"><div><h2 id="c26-case-title">Selected website work<span className="c26-dot">.</span></h2></div><p>Explore studio-built website directions shaped around real service-business buying journeys.</p><Link to="/case-studies" className="c26-quiet-link">Browse all case studies <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
        <article className="c26-case-feature">
          <div className="c26-case-art" aria-label={featuredStudy.title + " website"}><img className="c26-case-feature-image" src="/images/bennie-renovation-regenerated-artwork.webp" width={964} height={820} alt="RenovationCo website concept displayed on a laptop against a cobalt studio backdrop" loading="lazy" decoding="async" /></div>
          <div className="c26-case-copy"><span className="c26-case-meta">01 / {featuredStudy.category} · Studio-built</span><h3>{featuredStudy.headline}</h3><p>{featuredStudy.challenge} {featuredStudy.approach}</p><div className="c26-case-tags">{featuredStudy.sections.slice(0, 3).map((section) => <span key={section}>{section}</span>)}</div><Link to={"/case-studies/showcase/" + featuredStudy.slug} className="c26-text-cta" onClick={()=>trackPublicEvent({eventType:"case_study_clicked",label:featuredStudy.title + " case study",target:"/case-studies/showcase/" + featuredStudy.slug})}>Explore this case study <ArrowUpRight size={18} aria-hidden="true"/></Link></div>
        </article>
      </section>

      <section className="c26-process" aria-labelledby="c26-process-title">
        <div className="brand-shell">
          <div className="c26-section-head c26-process-head"><div><h2 id="c26-process-title">How it <em>works.</em></h2></div><p>You can explore a website direction before choosing a managed plan. Here is what happens next.</p><Link to="/how-it-works" className="c26-quiet-link">View our process <ArrowUpRight size={17} aria-hidden="true"/></Link></div>
          <div className="c26-steps">
            {[
              ["01","Share your business","Tell us what you offer and who you want to reach, or share your current site."],
              ["02","Review your free preview","Explore a preliminary website direction and the proposed enquiry path."],
              ["03","Choose a plan & build","Review scope and pricing, then approve the direction before launch."],
              ["04","Stay supported","We manage hosting, maintenance and the updates included in your plan."],
            ].map(([number,title,detail])=><div className="c26-step" key={number}><span className="c26-step-num">{number}</span><h3>{title}</h3><p>{detail}</p></div>)}
          </div>
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
