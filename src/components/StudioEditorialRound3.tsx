import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, ExternalLink, Globe2, MonitorSmartphone, ShieldCheck } from "lucide-react";
import type { PlatformCmsPage } from "../lib/platformSiteCms";
import { useStudioPortfolioCatalog } from "../lib/studioShowcaseCms";
import { PortfolioShowcaseCard, PortfolioShowcaseVisual } from "./PortfolioShowcaseVisual";
import "../styles/studioEditorialRound3.css";

const previewPath = "/generate-preview";

function StudioBrowser({ slug, title, children }: { slug?: string; title: string; children: React.ReactNode }) {
  const frame = <div className="s32-browser">
    <div className="s32-browser-toolbar">
      <span className="s32-browser-dots" aria-hidden="true"><i/><i/><i/></span>
      <span className="s32-browser-address">{title}</span>
      <span className="s32-browser-device"><MonitorSmartphone size={15} aria-hidden="true"/></span>
    </div>
    <div className="s32-browser-visual">{children}</div>
  </div>;
  return slug ? <Link className="s32-browser-link" to={`/case-studies/showcase/${slug}`} aria-label={`Explore ${title} website design study`}>{frame}</Link> : frame;
}

const processSteps = [
  { number: "01", stage: "Free", title: "Tell us about your business", description: "Share an existing website or describe your services, audience and the action you want visitors to take.", detail: "A short brief helps shape a relevant direction; you do not need a finished content package yet." },
  { number: "02", stage: "Free", title: "Explore a preliminary preview", description: "Review an initial website direction before deciding whether a managed service fits your business.", detail: "No card required. A preview is an illustrative starting point, not a completed production website." },
  { number: "03", stage: "Your decision", title: "Agree on scope and first payment", description: "Compare verified plans, included pages and revisions, setup fees, monthly charges and any minimum commitment.", detail: "The paid build begins only after the order, terms and first payment have been confirmed." },
  { number: "04", stage: "Paid delivery", title: "Review, refine and approve", description: "The agreed website is developed, checked across screen sizes and reviewed with you before launch.", detail: "Your selected plan defines the revision allowance and delivery targets. Your approval is required to launch." },
  { number: "05", stage: "Ongoing service", title: "Launch and stay supported", description: "After the site goes live, hosting, maintenance and included updates continue under your managed plan.", detail: "Your agreement defines support allowances, turnaround expectations and cancellation terms." },
] as const;

const processFaqs = [
  ["How long will my website take?", "Timelines depend on the plan, project scope, your content readiness and review cycle. The relevant delivery targets are shown with the plan and confirmed before ordering."],
  ["What happens after the free preview?", "Nothing is charged automatically. You may compare plans, discuss the project or stop. A preview is not a trial of the paid service."],
  ["What do I need to provide?", "Accurate business details, your services and contact information, approved brand assets or images, any genuine credentials or proof, and timely feedback."],
  ["Can I request design changes?", "Yes. The selected plan sets out the included revisions and update allowance. Work outside that scope is discussed before any additional charge."],
  ["Do you guarantee enquiries or search rankings?", "No. The service can improve the clarity and usability of the website, but traffic, search positions and business outcomes are not guaranteed."],
];

export function ProcessStudioPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  return <div className="s32-page s32-process-page" data-testid="editorial-process-page">
    <section className="s32-process-hero" aria-labelledby="s32-process-title">
      <div className="brand-shell s32-process-hero-grid">
        <div>
          <p className="s32-eyebrow">From a free direction to a managed website</p>
          <h1 id="s32-process-title">{cmsPage?.heroTitle || "Know what happens before you commit."}</h1>
          <p className="s32-lead">{cmsPage?.heroDescription || "See the initial idea for free. Understand the scope and costs before a paid build. Review the website before launch, then receive the care included in your plan."}</p>
          <div className="s32-actions">
            <Link className="s32-primary" to={cmsPage?.primaryCtaHref || previewPath}>{cmsPage?.primaryCtaLabel || "Get your free website preview"} <ArrowRight size={18} aria-hidden="true"/></Link>
            <Link className="s32-secondary" to="/pricing">Compare plan terms <ArrowUpRight size={17} aria-hidden="true"/></Link>
          </div>
        </div>
        <aside className="s32-commitment" aria-label="When payment begins">
          <span className="s32-commitment-label">What changes at each decision</span>
          <div className="s32-commitment-row"><span className="s32-tag s32-tag-free">Before payment</span><strong>Explore and evaluate.</strong><p>Business brief and preliminary preview. No card, no obligation.</p></div>
          <div className="s32-commitment-divider" aria-hidden="true"><span>YOUR APPROVAL TO PROCEED</span></div>
          <div className="s32-commitment-row"><span className="s32-tag s32-tag-paid">After payment</span><strong>Build, review and launch.</strong><p>Confirmed scope, first payment, website delivery and ongoing care under the selected plan.</p></div>
          <p className="s32-commitment-note">Setup fees, monthly charges, commitment and cancellation terms are disclosed before checkout.</p>
        </aside>
      </div>
    </section>

    <section className="s32-process-journey" aria-labelledby="s32-journey-title">
      <div className="brand-shell">
        <div className="s32-process-intro">
          <div><p className="s32-eyebrow">The complete journey</p><h2 id="s32-journey-title">Five stages. Nothing hidden.</h2></div>
          <p>Each stage is visible here. No carousel or interactive stepper is needed to understand the process.</p>
        </div>
        <ol className="s32-steps" aria-label="Five stages from free website preview to managed support">
          {processSteps.map(step=><li key={step.number} className="s32-step">
            <div className="s32-step-index"><span>{step.number}</span><span className={step.stage==="Free"?"s32-step-stage s32-step-stage-free":"s32-step-stage"}>{step.stage}</span></div>
            <div className="s32-step-core"><h3>{step.title}</h3><p>{step.description}</p></div>
            <p className="s32-step-detail">{step.detail}</p>
          </li>)}
        </ol>
      </div>
    </section>

    <section className="s32-input-section" aria-labelledby="s32-input-title">
      <div className="brand-shell s32-input-layout">
        <div><p className="s32-eyebrow">Preparing your project</p><h2 id="s32-input-title">What we'll need from you.</h2><p>Accurate source material makes the website useful. The exact checklist depends on the agreed scope; we will not invent business credentials or customer results.</p></div>
        <ul className="s32-input-list">{["Business identity, services and contact information", "Approved logo, brand assets and images", "Genuine credentials, testimonials or business proof", "Timely feedback and final launch approval"].map(x=><li key={x}><Check size={18} aria-hidden="true"/>{x}</li>)}</ul>
      </div>
    </section>

    <section className="s32-faq-section brand-shell" aria-labelledby="s32-process-faq-title">
      <div className="s32-faq-heading"><p className="s32-eyebrow">Before you start</p><h2 id="s32-process-faq-title">Common process questions.</h2><p>Clear answers about timing, payment and what the managed service covers.</p></div>
      <div className="s32-accordion">
        {processFaqs.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}
      </div>
    </section>
  </div>;
}

export function WorkStudioPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const catalog = useStudioPortfolioCatalog();
  const published = catalog.filter(item=>item.published);
  const [industry, setIndustry] = React.useState("all");
  const [style, setStyle] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const industries = Array.from(new Set(published.map(item=>item.category))).sort();
  const styles = Array.from(new Set(published.map(item=>item.style))).sort();
  const filtered = published.filter(item=>(industry==="all"||item.category===industry)
    &&(style==="all"||item.style===style)
    &&(!search.trim()||[item.title,item.category,item.style,item.headline].join(" ").toLowerCase().includes(search.trim().toLowerCase())));
  const featured = published.find(item=>item.featured) || published[0] || null;
  const hasFilter = industry!=="all"||style!=="all"||Boolean(search.trim());
  const clear = ()=>{setIndustry("all");setStyle("all");setSearch("");};
  return <div className="s32-page s32-work-page" data-testid="editorial-work-page">
    <section className="s32-work-hero" aria-labelledby="s32-work-title">
      <div className="brand-shell s32-work-hero-grid">
        <div className="s32-work-hero-copy">
          <p className="s32-eyebrow">Website examples / studio-built design studies</p>
          <h1 id="s32-work-title">{cmsPage?.heroTitle || "Different businesses. Different website directions."}</h1>
          <p className="s32-lead">{cmsPage?.heroDescription || "Explore how a website's structure, visual language and enquiry path can change for the business it represents—not just the colours."}</p>
          <div className="s32-actions">
            <a className="s32-primary" href="#industry-examples">Explore the collection <ArrowRight size={18} aria-hidden="true"/></a>
            <Link className="s32-secondary" to={cmsPage?.primaryCtaHref || previewPath}>{cmsPage?.primaryCtaLabel || "Preview a site for my business"} <ArrowUpRight size={17} aria-hidden="true"/></Link>
          </div>
          <p className="s32-editorial-note">These are illustrative studio design studies—not client commissions or verified commercial results.</p>
        </div>
        <div className="s32-featured-work">
          {featured ? <>
            <StudioBrowser slug={featured.slug} title={featured.title}><PortfolioShowcaseVisual item={featured} priority /></StudioBrowser>
            <div className="s32-featured-caption"><div><span>Featured direction</span><strong>{featured.title}</strong><p>{featured.category} · {featured.style}</p></div><Link to={`/case-studies/showcase/${featured.slug}`} aria-label={`Explore ${featured.title} design study`}><ArrowUpRight size={23} aria-hidden="true"/></Link></div>
          </> : <div className="s32-featured-empty"><Globe2 size={32} aria-hidden="true"/><p>Website design studies will appear here when published.</p></div>}
        </div>
      </div>
    </section>

    <section id="industry-examples" className="s32-portfolio-section" aria-labelledby="s32-collection-title">
      <div className="brand-shell">
        <div className="s32-collection-heading"><div><p className="s32-eyebrow">The collection</p><h2 id="s32-collection-title">Explore the work by business or style.</h2></div><p>Open any design study to inspect its layout and conversion choices. Where a live interactive demo exists, you can explore it from the study.</p></div>
        <div className="s32-portfolio-toolbar" aria-label="Portfolio filters">
          <label>Industry<select aria-label="Filter by industry" value={industry} onChange={e=>setIndustry(e.target.value)}><option value="all">All industries</option>{industries.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Visual style<select aria-label="Filter by visual style" value={style} onChange={e=>setStyle(e.target.value)}><option value="all">All styles</option>{styles.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Search examples<input aria-label="Search portfolio" type="search" placeholder="Clinic, renovation, editorial..." value={search} onChange={e=>setSearch(e.target.value)}/></label>
        </div>
        <div className="s32-filter-status"><p aria-live="polite">Showing <strong>{filtered.length}</strong> of {published.length} design studies</p>{hasFilter && <button type="button" onClick={clear}>Clear filters</button>}</div>
        {filtered.length ? <div className="s32-portfolio-grid">{filtered.map(item=><PortfolioShowcaseCard key={item.slug} item={item}/>)}</div>
          : <div className="s32-empty-state"><p>{published.length ? "No designs match these filters." : "No design studies are published yet."}</p>{hasFilter && <button type="button" onClick={clear}>Show all designs</button>}</div>}
        <div className="s32-portfolio-disclosure"><ShieldCheck size={19} aria-hidden="true"/><p>Studio-built examples demonstrate visual approaches and user journeys. They are not presented as client projects, testimonials or proven revenue outcomes.</p></div>
      </div>
    </section>
  </div>;
}

export function AboutStudioPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const catalog = useStudioPortfolioCatalog();
  const featured = catalog.find(item=>item.published&&item.featured) || catalog.find(item=>item.published) || null;
  return <div className="s32-page s32-about-page" data-testid="editorial-about-page">
    <section className="s32-about-hero" aria-labelledby="s32-about-title">
      <div className="brand-shell s32-about-hero-grid">
        <div>
          <p className="s32-eyebrow">A studio with a name behind it</p>
          <h1 id="s32-about-title">{cmsPage?.heroTitle || "A more personal way to build a better website."}</h1>
          <p className="s32-lead">{cmsPage?.heroDescription || "Bennie Studio combines practical business thinking, considered design and a managed delivery process. The aim is a website people can understand, trust and use."}</p>
          <div className="s32-actions">
            <Link to={cmsPage?.primaryCtaHref || previewPath} className="s32-primary">{cmsPage?.primaryCtaLabel || "Get your free website preview"} <ArrowRight size={18} aria-hidden="true"/></Link>
            <Link to="/book-demo" className="s32-secondary">Speak with the studio <ArrowUpRight size={17} aria-hidden="true"/></Link>
          </div>
        </div>
        <aside className="s32-founder-card" aria-label="Meet the founder">
          <div className="s32-founder-mark" role="img" aria-label="BT founder initials">BT</div>
          <p className="s32-founder-label">The person behind the studio</p>
          <h2>Meet Bennie.</h2>
          <p className="s32-founder-name">Bennie Tay <span>· Founder, Bennie Studio</span></p>
          <p className="s32-founder-copy">The studio is built around a straightforward idea: business owners should be able to see a direction, understand the scope and know who is accountable for the work.</p>
          <p className="s32-founder-photo-note">Founder portrait not currently published. The initials are intentional—not a stock photo presented as Bennie.</p>
        </aside>
      </div>
    </section>

    <section className="s32-about-principle" aria-labelledby="s32-about-principle-title">
      <div className="brand-shell s32-about-principle-grid">
        <div><p className="s32-eyebrow">What matters in the work</p><h2 id="s32-about-principle-title">A useful website earns its place in the business.</h2></div>
        <div className="s32-principle-copy"><p>It starts with making the offer clear. The design should help customers find credible information, understand the next step and contact the business without unnecessary friction.</p><p>AI-assisted tools can speed up production. They do not replace genuine business information, human judgement or customer approval.</p></div>
      </div>
    </section>

    <section className="s32-about-evidence" aria-labelledby="s32-evidence-title">
      <div className="brand-shell s32-evidence-grid">
        <div className="s32-evidence-visual">
          {featured ? <StudioBrowser slug={featured.slug} title={featured.title}><PortfolioShowcaseVisual item={featured}/></StudioBrowser> : <div className="s32-evidence-empty"><Globe2 size={36} aria-hidden="true"/>Studio demonstrations are visible in the website examples collection.</div>}
          <p>Studio-built example · Illustrative design, not a client result</p>
        </div>
        <div className="s32-evidence-copy">
          <p className="s32-eyebrow">See what you can verify</p>
          <h2 id="s32-evidence-title">Show the work. Explain the terms. Avoid invented proof.</h2>
          <p>The live platform and studio-built design studies are available to explore. Pricing, plan scope and the review-before-launch process are explained before you commit.</p>
          <div className="s32-evidence-links">
            <Link to="/case-studies">Browse the website examples <ArrowUpRight size={17} aria-hidden="true"/></Link>
            <Link to="/pricing">Review plan scope and pricing <ArrowUpRight size={17} aria-hidden="true"/></Link>
            <Link to="/how-it-works">Understand delivery and approval <ArrowUpRight size={17} aria-hidden="true"/></Link>
          </div>
        </div>
      </div>
    </section>

    <section className="s32-standards" aria-labelledby="s32-standards-title">
      <div className="brand-shell">
        <div className="s32-standards-intro"><p className="s32-eyebrow">The working standard</p><h2 id="s32-standards-title">Three commitments that matter.</h2></div>
        <div className="s32-standards-grid">
          {[
            ["01","No invented credibility","Business claims, credentials and testimonials must come from accurate, approved sources."],
            ["02","An understandable commercial scope","Setup charges, ongoing service, plan allowances and any applicable terms are available before payment."],
            ["03","Human review before launch","Responsive behaviour, content, enquiry paths and customer approval are part of the delivery workflow."],
          ].map(([num,title,copy])=><article key={num}><span>{num}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>
  </div>;
}
