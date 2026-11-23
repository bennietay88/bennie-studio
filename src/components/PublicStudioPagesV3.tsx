import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { StudioProcessTimeline, WebsitePreviewExplorer } from "./StudioFieldNotes";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Check,
  ClipboardCheck,
  Code2,
  Compass,
  FileText,
  Globe2,
  HeartHandshake,
  Layout,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  WandSparkles,
} from "lucide-react";
import { Pricing as CommercialPricing } from "./Pricing";
import { RESOURCE_ARTICLES } from "../content/resources";
import { WebsiteConceptVisual } from "./WebsiteConceptVisual";
import { StudioEmailOptIn } from "./StudioEmailOptIn";
import "../styles/studioEditorialRound4.css";
import { PortfolioShowcaseCard, PortfolioShowcaseVisual } from "./PortfolioShowcaseVisual";
import { useStudioPortfolioCatalog } from "../lib/studioShowcaseCms";
import type { PlatformCmsPage } from "../lib/platformSiteCms";

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1741ed] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-25px_rgba(98,82,244,.9)] transition hover:-translate-y-0.5 hover:bg-[#0a2aaa]";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-white/22 bg-white/[0.035] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]";

async function submitPublicLead(input: {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  industry?: string;
  message?: string;
  formName: string;
  leadType: string;
}) {
  const response = await fetch("/api/platform-leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      sourcePage: `${window.location.pathname}${window.location.search}`,
      pageTitle: document.title,
      referrer: document.referrer || "",
      country: navigator.language?.split("-")?.[1] || "",
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error((typeof payload?.message === "string" && payload.message.trim()) || (typeof payload?.error === "string" && payload.error.trim()) || "We could not submit this right now. Please try again.");
  }
  return payload;
}

function StudioDecisionPanel({ title, items }: { kicker: string; title: string; items: readonly [string, string][] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 text-white shadow-[0_35px_90px_-55px_rgba(0,0,0,.75)] sm:p-8">
      
      <h2 className="mt-3 text-2xl !text-white">{title}</h2>
      <div className="mt-5 divide-y divide-white/10">
        {items.map(([label, detail], index) => <div key={label} className="grid gap-2 py-4 sm:grid-cols-[2.5rem_1fr] sm:gap-4"><span className="text-xs font-bold text-[#9f93ff]">0{index + 1}</span><div><p className="font-semibold !text-white">{label}</p><p className="mt-1 text-sm leading-6 !text-white/60">{detail}</p></div></div>)}
      </div>
    </div>
  );
}

function SectionHeader({ title, copy, dark = false }: { kicker: string; title: string; copy?: string; dark?: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        
        <h2 className={dark ? "mt-4 !text-white" : "mt-4"}>{title}</h2>
      </div>
      {copy ? <p className={dark ? "brand-copy lg:col-span-5 !text-white/62" : "brand-copy lg:col-span-5"}>{copy}</p> : null}
    </div>
  );
}

function IconCard({ icon: Icon, title, copy, dark = false }: { icon: React.ElementType; title: string; copy: string; dark?: boolean }) {
  return (
    <article className={dark ? "bs3-card-dark p-6" : "bs3-card p-6"}>
      <span className={dark ? "bs3-icon !bg-white/8 !text-[#a99eff]" : "bs3-icon"}><Icon className="h-5 w-5" /></span>
      <h3 className={dark ? "mt-5 !text-white" : "mt-5"}>{title}</h3>
      <p className={dark ? "mt-3 text-sm leading-7 !text-white/58" : "mt-3 text-sm leading-7 text-[#657186]"}>{copy}</p>
    </article>
  );
}

function Faqs({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="divide-y divide-[#e5e8ef] overflow-hidden rounded-2xl border border-[#e5e8ef] bg-white">
      {items.map(([question, answer]) => (
        <details key={question} className="group px-5">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-[#172033]">
            {question}<span className="text-[#6252f4]">+</span>
          </summary>
          <p className="pb-5 text-sm leading-7 text-[#657186]">{answer}</p>
        </details>
      ))}
    </div>
  );
}

export function ServicesStudioPage() {
  const servicePillars = [
    [Compass, "Strategy & Discovery", "We understand the business, buyer, offer and evidence before deciding what the website should say or show."],
    [MessageCircle, "Messaging & Positioning", "Clear page hierarchy and sharper copy make the offer easier to understand and easier to trust."],
    [MonitorSmartphone, "Design & User Experience", "A modern visual system designed around the brand, the category and the customer's decision journey."],
    [Code2, "Build & Integrations", "Responsive implementation with forms, analytics, tracking and the practical integrations needed for launch."],
    [Users, "Studio Review", "A real person reviews the message, layout, responsive behaviour and conversion path before launch."],
    [Rocket, "Launch & Support", "Technical launch, hosting, SSL, maintenance and the plan-based support needed after the site goes live."],
  ] as const;

  return (
    <>
      <section className="overflow-hidden border-b border-white/10 bg-[#111821] text-white">
        <div className="brand-shell grid gap-12 py-20 lg:grid-cols-12 lg:items-center lg:py-28">
          <div className="lg:col-span-6">
            
            <h1 className="mt-6 !max-w-[13ch] !text-white">A complete website solution. <span className="font-serif italic font-normal !text-[#afc0ff]">One accountable team.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-8 !text-white/75">Your website should explain your offer, earn confidence and help the right customers get in touch. We design, build and manage that experience—from strategy through ongoing care.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/generate-preview" className="inline-flex min-h-12 items-center justify-center bg-[#1943ed] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0a2ec9]">Get a free website preview<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/pricing" className={secondary}>Compare managed plans</Link></div>
          </div>
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden border border-white/20 bg-[#1741ed] p-7 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[.17em] !text-white/75">The managed website system</p>
              <p className="mt-5 max-w-[10ch] text-[clamp(2.8rem,5vw,5rem)] font-bold leading-[.98] tracking-[-.07em] !text-white">Design. Build. <span className="font-serif italic font-normal">Manage.</span></p>
              <div className="mt-10 grid divide-y divide-white/25 border-t border-white/25">{[["01 / Strategy","Know what your customers need to hear."],["02 / Website","A purposeful, mobile-ready design."],["03 / Aftercare","Hosting, maintenance and agreed updates."]].map(([n,d])=><div key={n} className="grid gap-3 py-5 sm:grid-cols-[8rem_1fr]"><span className="text-sm font-semibold text-white">{n}</span><span className="text-sm leading-6 text-white/80">{d}</span></div>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-[#e8eaf1]">
        <div className="brand-shell grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {["Professional services", "Healthcare & wellness", "Creative businesses", "Local services"].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#5f6b7d]"><BadgeCheck className="h-4 w-4 text-[#6252f4]" />{item}</div>
          ))}
        </div>
      </section>

      <section className="brand-shell brand-section">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            
            <h2 className="mt-4">More than a website. A strategic growth asset.</h2>
            <p className="brand-copy mt-6">We combine strategy, messaging, design and delivery to create websites that look credible, build trust and turn visitors into real enquiries.</p>
            <Link to="/website-audit" className={`${primary} mt-7`}>Get a website review<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
          <div className="lg:col-span-7"><div className="rounded-[1.2rem] border border-[#dfe3eb] bg-[#0d1426] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9f93ff]">How the studio thinks</p><div className="mt-6 divide-y divide-white/10">{[["01","What should a customer understand first?","Clarify the offer and who it is for."],["02","What proof earns trust?","Move evidence closer to the claims it supports."],["03","What action should the page drive?","Build the journey around one useful next step."]].map(([n,t,x])=><div key={n} className="grid gap-3 py-5 sm:grid-cols-[3rem_1fr]"><span className="text-xs font-bold text-[#9f93ff]">{n}</span><div><h3 className="!text-white">{t}</h3><p className="mt-2 text-sm leading-6 text-white/55">{x}</p></div></div>)}</div></div></div>
        </div>
      </section>

      <section className="bs3-soft border-y border-[#e6e8ef]">
        <div className="brand-shell brand-section">
          <SectionHeader kicker="Our service pillars" title="A complete website system, from strategy to growth." copy="Everything needed for a high-performing service-business website, with expert guidance at each stage." />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servicePillars.map(([Icon, title, copy]) => <IconCard key={title} icon={Icon} title={title} copy={copy} />)}
          </div>
        </div>
      </section>

      <section className="bs3-dark">
        <div className="brand-shell brand-section">
          <SectionHeader dark kicker="What's included" title="Everything you need to launch with confidence." copy="No guesswork and no hidden complexity. The managed service covers the practical website essentials from planning through launch." />
          <div className="mt-10 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Strategy call and planning","Messaging and content guidance","Custom responsive design","Conversion-focused page layouts",
              "CMS setup and editing workflow","Contact forms and integrations","Basic SEO setup","Analytics and search console",
              "Human review and quality assurance","Technical launch and domain setup","Post-launch support","Managed update workflow",
            ].map((item) => <div key={item} className="flex items-start gap-3 border-b border-white/10 py-3 text-sm font-semibold text-white/72"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#9f93ff]" />{item}</div>)}
          </div>
        </div>
      </section>

      <section className="brand-shell brand-section">
        <SectionHeader kicker="Who it's for" title="Built for service businesses ready to grow." copy="The structure changes with the business. Trust, proof and conversion paths are adapted to how customers actually choose." />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            [FileText,"Advisory & professional services","Consultants, accountants, financial advisers and specialist firms."],
            [HeartHandshake,"Healthcare & wellness","Clinics, therapists, medical practices and wellness brands."],
            [WandSparkles,"Creative & lifestyle","Photographers, designers, studios and personal brands."],
            [Target,"Local service businesses","Home services, trades, education and other local businesses."],
          ].map(([Icon,title,copy]: any)=><IconCard key={title} icon={Icon} title={title} copy={copy} />)}
        </div>
      </section>
    </>
  );
}

export function AboutStudioPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const values = [
    [HeartHandshake,"Human first","Real people, real feedback and real responsibility at the stages where judgement matters."],
    [BarChart3,"Business minded","Design decisions are tied back to trust, enquiries and commercial usefulness."],
    [Sparkles,"Quality over quantity","The studio process makes launch quality explicit instead of pushing volume."],
    [ShieldCheck,"Long-term partnership","The website stays managed and can evolve as the business grows."],
  ] as const;

  return (
    <>
      <section className="c27-marketing-hero">
        <div className="brand-shell grid gap-12 py-20 lg:grid-cols-12 lg:items-center lg:py-28">
          <div className="lg:col-span-6">
            
            <h1 className="mt-6 !max-w-[13ch]">{cmsPage?.heroTitle || <>Small studio. <em>Serious about your website.</em></>}</h1>
            <p className="brand-copy mt-7">{cmsPage?.heroDescription || "We bring together business-first strategy, considered design and a managed delivery process. The aim is a website that is easy to understand, easy to trust and easier to enquire through."}</p>
            <div className="mt-8 flex flex-wrap gap-4"><Link to={cmsPage?.primaryCtaHref || "/generate-preview"} className="c27-button">{cmsPage?.primaryCtaLabel || "Get a free website preview"} <ArrowRight className="h-4 w-4"/></Link><Link to="/how-it-works" className="c27-quiet">Our approach <ArrowRight className="h-4 w-4"/></Link></div>
          </div>
          <div className="lg:col-span-6"><div className="c27-panel">
            <p className="!text-white/75 text-xs font-bold uppercase tracking-[.16em]">The studio promise</p>
            <h2 className="mt-5">Human judgement. <span className="font-serif italic font-normal">A clear process.</span></h2>
            <div className="mt-8">{[["01 / Understand","Every design decision begins with your business and its buyers."],["02 / Build","Careful messaging, design and technical implementation."],["03 / Review","You see and approve the website before launch."],["04 / Manage","Hosting, maintenance and updates within your agreed plan."]].map(([a,b])=><div key={a} className="c27-panel-row"><strong>{a}</strong><span>{b}</span></div>)}</div>
          </div></div>
        </div>
      </section>
      <section className="brand-shell brand-section">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            
            <h2 className="mt-4">Better websites for real businesses.</h2>
            <p className="brand-copy mt-6">Bennie Studio exists to help good businesses look as good as the work they do. Strategy, design and delivery are combined into a human-guided process so the website is easier to understand, trust and act on.</p>
            <Link to="/website-audit" className={`${primary} mt-7`}>Get a website review<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
          <div className="lg:col-span-7"><div className="rounded-[1.2rem] border border-[#dfe3eb] bg-[#fbfcff] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6252f4]">A managed studio relationship</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{["One accountable workflow","Clear review points","No invented proof","Customer approval before launch"].map((item)=><div key={item} className="rounded-xl border border-[#e1e5ed] bg-white p-4 text-sm font-semibold text-[#344054]"><Check className="mb-3 h-4 w-4 text-[#6252f4]" />{item}</div>)}</div></div></div>
        </div>
      </section>
      <section className="bs3-soft border-y border-[#e6e8ef]">
        <div className="brand-shell brand-section">
          <SectionHeader kicker="Our values" title="A more thoughtful way to build websites." copy="The studio model is intentionally small, direct and focused on quality." />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{values.map(([Icon,t,c])=><IconCard key={t} icon={Icon} title={t} copy={c} />)}</div>
        </div>
      </section>
      <section className="bs3-dark">
        <div className="brand-shell brand-section grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            
            <h2 className="mt-4 !text-white">Every website is reviewed by a human.</h2>
            <p className="mt-6 text-base leading-8 text-white/64">Every paid website goes through studio review for credibility, content, design quality, responsive behaviour and whether the journey makes sense to a customer.</p>
            <div className="mt-7 space-y-3">{["Design and content review","Responsive and performance checks","Final launch sign-off"].map((x)=><p key={x} className="flex gap-3 text-sm font-semibold text-white/75"><Check className="h-4 w-4 text-[#9f93ff]" />{x}</p>)}</div>
          </div>
          <div className="lg:col-span-7"><div className="rounded-[1.2rem] border border-white/12 bg-white/[0.04] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9f93ff]">Before launch</p><div className="mt-5 space-y-4">{["Does the offer make sense quickly?","Is the proof credible and properly placed?","Does mobile feel deliberate, not compressed?","Do forms, links and primary actions work?","Has the customer approved the final website?"].map((item,index)=><div key={item} className="flex gap-4 border-b border-white/10 pb-4"><span className="text-xs font-bold text-[#9f93ff]">0{index+1}</span><p className="text-sm font-semibold text-white/75">{item}</p></div>)}</div></div></div>
        </div>
      </section>
      <section className="brand-shell brand-section">
        <SectionHeader kicker="Our story" title="From frustration to a more useful studio model." copy="The idea is simple: combine the care of a creative studio with a repeatable process that gives small businesses a clearer path to a strong website." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["01","See the business clearly","Start with the offer, customers and existing proof rather than a generic visual template."],
            ["02","Turn clarity into design","Use strategy and evidence to decide hierarchy, content and visual direction."],
            ["03","Keep improving after launch","Treat the website as an operating asset that can change with the business."],
          ].map(([n,t,c])=><article key={n} className="bs3-card p-6"><span className="text-xs font-bold text-[#6252f4]">{n}</span><h3 className="mt-4">{t}</h3><p className="mt-3 text-sm leading-7 text-[#657186]">{c}</p></article>)}
        </div>
      </section>
    </>
  );
}

export function ResourcesStudioPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("All");
  const categories = ["All", ...Array.from(new Set(RESOURCE_ARTICLES.map(article => article.category)))];
  const filteredArticles = RESOURCE_ARTICLES.filter(({ category, title, excerpt }) => {
    const matchesCategory = activeCategory === "All" || category === activeCategory;
    const matchesSearch = `${title} ${excerpt} ${category}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const clear = () => { setQuery(""); setActiveCategory("All"); };
  const featured = RESOURCE_ARTICLES[0];

  return <div className="s33-page s33-resources-page" data-testid="editorial-resources-page">
    <section className="s33-resources-hero">
      <div className="brand-shell s33-resources-hero-grid">
        <div>
          <p className="s33-eyebrow">The Bennie Studio library</p>
          <h1>{cmsPage?.heroTitle || "Better website decisions start with better questions."}</h1>
          <p className="s33-lead">{cmsPage?.heroDescription || "Practical guides on clear messaging, credible design, enquiry journeys and what it takes to launch and maintain a useful business website."}</p>
          <div className="s33-actions">
            <a href="#resource-library" className="s33-primary">Explore the guides <ArrowRight size={18} aria-hidden="true" /></a>
            <Link to="/generate-preview" className="s33-secondary">Apply this to my business <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        {featured && <Link to={`/resources/${featured.slug}`} className="s33-featured-article" aria-label={`Read featured resource: ${featured.title}`}>
          <div className="s33-featured-image"><img src={featured.image} alt="" loading="eager" /></div>
          <div className="s33-featured-content"><span>Featured guide · {featured.category}</span><h2>{featured.title}</h2><p>{featured.excerpt}</p><strong>Read the guide <ArrowRight size={16} aria-hidden="true" /></strong></div>
        </Link>}
      </div>
    </section>
    <section id="resource-library" className="s33-resource-library" aria-labelledby="s33-library-title">
      <div className="brand-shell">
        <div className="s33-library-heading">
          <div><p className="s33-eyebrow">Explore by topic</p><h2 id="s33-library-title">Find the answer you need.</h2></div>
          <p>Use the topic filters or search by a business problem. Every article opens as a full guide.</p>
        </div>
        <div className="s33-resource-search">
          <label htmlFor="resource-search">Search resources</label>
          <div><Search aria-hidden="true" size={19}/><input id="resource-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search guides, topics or questions…" /></div>
        </div>
        <div className="s33-resource-categories" aria-label="Resource categories">
          {categories.map(category=><button key={category} type="button" aria-pressed={activeCategory===category} onClick={()=>setActiveCategory(category)} className={activeCategory===category?"s33-resource-pill s33-active":"s33-resource-pill"}>{category}</button>)}
        </div>
        <div className="s33-resource-status"><p aria-live="polite">Showing <strong>{filteredArticles.length}</strong> of {RESOURCE_ARTICLES.length} guides</p>{(query||activeCategory!=="All")&&<button type="button" onClick={clear}>Clear filters</button>}</div>
        {filteredArticles.length ? <div className="s33-resource-grid">
          {filteredArticles.map(({ slug, image, category, title, excerpt })=><Link key={slug} to={`/resources/${slug}`} className="s33-resource-card" aria-label={`Read ${title}`}>
            <img src={image} loading="lazy" alt="" />
            <div><span>{category}</span><h3>{title}</h3><p>{excerpt}</p><strong>Read guide <ArrowRight size={16} aria-hidden="true" /></strong></div>
          </Link>)}
        </div> : <div className="s33-no-resources"><p>No guides match those filters.</p><button type="button" onClick={clear}>Show all guides</button></div>}
      </div>
    </section>
    <section className="s33-resources-bottom">
      <div className="brand-shell s33-resources-bottom-grid">
        <div><p className="s33-eyebrow">When you want to go further</p><h2>Turn the reading into a website direction.</h2><p>Explore an initial website concept for your own business, or receive an optional checklist by email. Neither requires purchasing a plan.</p><Link className="s33-primary" to="/generate-preview">Get a free website preview <ArrowRight size={18} aria-hidden="true" /></Link></div>
        <details className="s33-checklist-details"><summary><span><strong>Want the optional website checklist?</strong><small>Open the signup form. Newsletter consent is separate from requesting a preview.</small></span><span aria-hidden="true">+</span></summary><div><StudioEmailOptIn sourcePage="/resources" title="Get the website checklist" description="Optional website guidance by email. You can unsubscribe; signing up is not required to read the library or request a preview."/></div></details>
      </div>
    </section>
  </div>;
}

export function ContactStudioPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const navigate = useNavigate();
  const [brief, setBrief] = React.useState({ name:"", company:"", email:"", interest:"New website design", details:"" });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      await submitPublicLead({
        name: brief.name.trim(),
        email: brief.email.trim(),
        businessName: brief.company.trim(),
        industry: brief.interest,
        message: brief.details.trim() || `Interested in: ${brief.interest}`,
        formName: "Contact project brief",
        leadType: "project_brief",
      });
      // Keep submitted contact details within this browser tab only; never put
      // email, name or project notes in the URL (history, analytics or referrers).
      try { sessionStorage.removeItem("bt_preview_intent"); sessionStorage.setItem("bt_contact_brief", JSON.stringify(brief)); } catch {}
      navigate("/generate-preview?mode=business&source=contact");
    } catch (error: any) {
      setSubmitError(error?.message || "We could not submit your brief. No preview was started; please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="s33-page s33-contact-page" data-testid="editorial-contact-page">
      <section className="s33-contact-hero">
        <div className="brand-shell s33-contact-grid">
          <div className="s33-contact-intro">
            <p className="s33-eyebrow">Tell us about your project</p>
            <h1>{cmsPage?.heroTitle || "A useful website starts with a clear conversation."}</h1>
            <p className="s33-lead">{cmsPage?.heroDescription || "Share what you offer, what you want to improve and how customers should reach you. We will use your brief to establish the next practical step."}</p>
            <div className="s33-contact-choices">
              <div><span>01</span><div><strong>Send a project brief</strong><p>Give us the essentials. After submitting, you can continue into a website preview using the same details.</p></div></div>
              <div><span>02</span><div><strong>Prefer a conversation?</strong><p>Use the live booking page to see actual consultation availability.</p><Link to={cmsPage?.primaryCtaHref || "/book-demo"}>{cmsPage?.primaryCtaLabel || "Book a free consultation"} <ArrowRight size={17} aria-hidden="true"/></Link></div></div>
              <div><span>03</span><div><strong>Just exploring?</strong><p>Try a free website direction first. No payment card required.</p><Link to="/generate-preview">Start with a free preview <ArrowRight size={17} aria-hidden="true"/></Link></div></div>
            </div>
          </div>
          <form onSubmit={submit} className="s33-contact-form" aria-label="Contact project brief">
            <div className="s33-contact-form-head"><p className="s33-eyebrow">Project enquiry</p><h2>Share the essentials.</h2><p>We use your details to respond to this enquiry and continue your preview. You are not subscribing to marketing emails.</p></div>
            <div className="s33-contact-fields">
              <label>Your name<input required autoComplete="name" value={brief.name} onChange={e=>setBrief({...brief,name:e.target.value})} placeholder="Your name"/></label>
              <label>Business or company<input required autoComplete="organization" value={brief.company} onChange={e=>setBrief({...brief,company:e.target.value})} placeholder="Business name"/></label>
              <label>Work email<input required type="email" autoComplete="email" value={brief.email} onChange={e=>setBrief({...brief,email:e.target.value})} placeholder="you@business.com"/></label>
              <label>What can we help with?<select value={brief.interest} onChange={e=>setBrief({...brief,interest:e.target.value})}><option>New website design</option><option>Website redesign</option><option>Website audit</option><option>Ongoing website support</option></select></label>
              <label className="s33-field-wide">Tell us a little more <span>(optional)</span><textarea value={brief.details} onChange={e=>setBrief({...brief,details:e.target.value})} placeholder="Your goals, current site, audience or timeline…" rows={4}/></label>
            </div>
            {submitError ? <p role="alert" className="s33-contact-error">{submitError}</p> : null}
            <button className="s33-primary s33-contact-submit" type="submit" disabled={submitting}>{submitting?"Sending your brief…":"Send brief & continue to preview"}<ArrowRight size={18} aria-hidden="true"/></button>
            <p className="s33-form-footnote">No payment required. Submitted briefs are sent to the studio and the preview step opens after a successful submission.</p>
          </form>
        </div>
      </section>
      <section className="s33-contact-next">
        <div className="brand-shell s33-contact-next-grid">
          <div><p className="s33-eyebrow">What happens next</p><h2>One clear route, not another sales pitch.</h2></div>
          <div><p>We review your business information and the direction you want to take. Scope, plan pricing and any commitment are made clear before paid work begins.</p><Link to="/how-it-works">Understand the full process <ArrowRight size={17} aria-hidden="true"/></Link></div>
        </div>
      </section>
    </div>
  );
}

export function PricingStudioPage() {
  return <CommercialPricing />;
}

export function ProcessStudioPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const steps = [
    {
      number: "01",
      title: "Tell us about your business",
      description: "Share your current website or describe what your business offers, who it serves and the action you want customers to take.",
      detail: "Your business details help us prepare an initial website direction suited to your services.",
    },
    {
      number: "02",
      title: "Explore your free preview",
      description: "See a preliminary website direction before deciding whether to proceed. There is no payment card or purchase commitment at this stage.",
      detail: "This is a starting point for discussion, not a completed production website.",
    },
    {
      number: "03",
      title: "Confirm scope and pricing",
      description: "Confirm your pages, content, revisions and monthly plan. Your first payment covers any setup fee and month one; check the plan's minimum commitment before ordering.",
      detail: "You know the agreed deliverables and costs before the paid build begins.",
    },
    {
      number: "04",
      title: "Review the build and launch",
      description: "We refine the approved direction, develop the agreed pages and check mobile layouts, enquiry paths and launch basics with your feedback.",
      detail: "The website goes live after the required review and approval steps.",
    },
    {
      number: "05",
      title: "Stay supported",
      description: "After launch, Bennie Studio manages hosting, maintenance and the ongoing support or updates included in your selected plan.",
      detail: "Your plan defines the support allowance and applicable response expectations.",
    },
  ] as const;
  return (
    <>
      <section className="border-b border-[#dde2ea] bg-[#f8f8f5]">
        <div className="brand-shell grid gap-10 py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-24">
          <div>
            <h1 className="!max-w-[14ch] md:!max-w-[22ch] !text-[#15191f]">{cmsPage?.heroTitle || <>From first idea to <span className="font-serif italic font-normal !text-[#1741ed]">launch.</span></>}</h1>
            <p className="brand-copy mt-6 max-w-xl">{cmsPage?.heroDescription || "One straightforward journey: see an initial direction, choose your plan, review the finished work and stay supported after launch."}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link to={cmsPage?.primaryCtaHref || "/generate-preview"} className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#1741ed] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1034c0]">{cmsPage?.primaryCtaLabel || "Get your free website preview"} <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/pricing" className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-[#18283c] underline underline-offset-4">Compare plans <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-[#566577]">No card required for the initial preview. Your website launches after the required review and approval steps; scope and pricing are confirmed before ordering.</p>
          </div>
          <div className="overflow-hidden bg-[#172b89] p-7 text-white sm:p-10">
            <p className="max-w-sm text-[clamp(2rem,3vw,3.4rem)] font-bold leading-[1.08] tracking-[-.06em] !text-white">Clarity at <span className="font-serif italic font-normal">every stage.</span></p>
            <div className="mt-8 border-t border-white/25">
              {[["Before you commit", "Explore a free preliminary direction and review plan pricing."],["Before we launch", "Review the agreed design, content and functionality."],["After launch", "Hosting and care continue under your selected plan."]].map(([name,copy],i)=><div key={name} className="grid grid-cols-[2rem_1fr] gap-4 border-b border-white/25 py-4"><span className="font-serif text-2xl italic text-[#c4d0ff]">0{i+1}</span><div><p className="text-sm font-bold !text-white">{name}</p><p className="mt-1 text-sm leading-6 !text-[#e0e6ff]">{copy}</p></div></div>)}
            </div>
          </div>
        </div>
      </section>
      <section className="brand-shell py-16 lg:py-24">
        <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div><h2 className="!text-[#15191f]">The five steps.</h2></div>
          <p className="max-w-xl text-base leading-7 text-[#566273]">Follow the project from your first brief to ongoing website care. Select a step to see what happens and when.</p>
        </div>
        <StudioProcessTimeline steps={steps} />
        <p className="mt-6 max-w-3xl text-sm leading-6 text-[#566273]">When you choose a plan, the first payment is the one-time setup fee plus your first month. Plans are billed monthly, with any minimum commitment and cancellation terms shown before checkout. The free preview requires no payment card.</p>
      </section>
      <section className="border-y border-[#d9dfeb] bg-[#eef1f7]">
        <div className="brand-shell grid gap-6 py-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div><h2 className="!text-[#15191f]">What you'll need to provide.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-[#556171]">Your input keeps the project accurate and avoids delays. Exact requirements vary with the agreed scope.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Business and service information","Logo, brand assets and approved imagery","Accurate credentials and business proof","Feedback and final approval"].map(label=><div className="flex items-start gap-3 border border-[#d4dae5] bg-white p-4 text-sm font-semibold text-[#243347]" key={label}><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1741ed]"/>{label}</div>)}
          </div>
        </div>
      </section>
      <section className="brand-shell py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]"><div><h2 className="!text-[#15191f]">Questions about the process?</h2><p className="brand-copy mt-4">Review what to expect before getting started.</p></div><Faqs items={[
          ["How long does a project take?","Timing depends on the agreed scope, the readiness of your content and the feedback cycle. We confirm expectations before the paid build."],
          ["What do I need to provide?","Your business and service details, approved brand assets, accurate proof and timely feedback. We clarify any further requirements during planning."],
          ["Can I request changes along the way?","Yes. The selected plan defines the included review rounds and what additional work may require separate scope."],
          ["Do you provide content and images?","We guide the content structure within the agreed service. Additional writing, custom photography or specialist assets may need separate scoping."],
          ["What happens after launch?","Your managed plan covers hosting, routine maintenance and the specific updates or support stated in your agreement."],
        ]}/></div>
      </section>
    </>
  );
}

export function WorkStudioPage({ cmsPage }: { cmsPage?: PlatformCmsPage }) {
  const catalog = useStudioPortfolioCatalog();
  const published = catalog.filter((item) => item.published);
  const [industry, setIndustry] = React.useState("all");
  const [style, setStyle] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const industries = Array.from(new Set(published.map((item) => item.category))).sort();
  const styles = Array.from(new Set(published.map((item) => item.style))).sort();
  const filtered = published.filter((item) =>
    (industry === "all" || item.category === industry)
    && (style === "all" || item.style === style)
    && (!search.trim() || [item.title, item.category, item.style, item.headline].join(" ").toLowerCase().includes(search.trim().toLowerCase()))
  );
  const featured = published.filter((item) => item.featured).slice(0, 2);
  const heroItems = featured.length ? featured : published.slice(0, 2);
  return <>
    <section className="c27-marketing-hero">
      <div className="brand-shell grid gap-10 py-14 lg:grid-cols-[minmax(0,.87fr)_minmax(0,1.13fr)] lg:items-center lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1741ed]">Bennie Studio · Website design directions</p>
          <h1 className="mt-5 !max-w-[18ch]">{cmsPage?.heroTitle || <>Websites designed to <em>win trust.</em></>}</h1>
          <p className="brand-copy mt-7 max-w-2xl">{cmsPage?.heroDescription || "Browse distinctive website concepts for service businesses. Explore the visual direction, customer journey and conversion goal behind each design."}</p>
          <p className="mt-3 text-xs text-slate-500">Illustrative design studies, not claimed client projects or verified business results.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#industry-examples" className="c27-button">Explore the collection <ArrowRight className="h-4 w-4"/></a>
            <Link to="/generate-preview" className="c27-quiet">Preview a site for my business <ArrowRight className="h-4 w-4"/></Link>
          </div>
        </div>
        <div className="sfn-portfolio-hero-art min-w-0" aria-label="Featured design examples">
          {heroItems.map((item, index) => <Link key={item.slug} to={"/case-studies/showcase/" + item.slug}
            className={`block min-w-0 overflow-hidden border border-slate-200 bg-white shadow-xl ${index === 1 ? "sfn-portfolio-offset" : ""}`}>
            <PortfolioShowcaseVisual item={item} compact priority={index === 0}/>
            <div className="sfn-portfolio-hero-label"><p className="truncate text-sm font-bold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.category} · Design direction</p></div>
          </Link>)}
        </div>
      </div>
    </section>
    <section className="sfn-portfolio-intro"><div className="brand-shell grid gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-[#e9bc85]">THE COLLECTION / NOT ONE TEMPLATE</p><h2 className="mt-4">Every project has a different personality.</h2></div><div><p>Look beyond the colors. Explore how typography, navigation, imagery, structure and enquiry flow respond to different businesses. All examples are clearly labelled studio concepts.</p><a href="#industry-examples" className="mt-6 inline-flex items-center gap-2 border-b border-current pb-2 text-sm font-bold">Explore the collection <ArrowRight size={16}/></a></div></div></section>
    <section className="brand-shell py-14 lg:py-20"><WebsitePreviewExplorer /></section>
    <section id="industry-examples" className="border-y border-[#dfe3e8] bg-[#f5f6f8]">
      <div className="brand-shell brand-section">
        <div className="mb-7 grid gap-5 lg:grid-cols-[1fr_.7fr] lg:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1741ed]">Explore the portfolio</p>
            <h2 className="mt-3">Designs for different businesses and buying journeys.</h2>
          </div>
          <p className="brand-copy">Select an industry or design style. Each study explains how a website can help customers take the next step.</p>
        </div>
        <div className="mb-7 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3" aria-label="Portfolio filters">
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-600">Industry
            <select aria-label="Filter by industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">
              <option value="all">All industries</option>{industries.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-600">Visual style
            <select aria-label="Filter by visual style" value={style} onChange={(e) => setStyle(e.target.value)} className="h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">
              <option value="all">All styles</option>{styles.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-600">Search examples
            <input aria-label="Search portfolio" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. clinic, editorial…" className="h-11 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900"/>
          </label>
        </div>
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600" aria-live="polite">Showing {filtered.length} of {published.length} design studies</p>
          {(industry !== "all" || style !== "all" || search) && <button type="button" onClick={() => {setIndustry("all");setStyle("all");setSearch("");}} className="text-sm font-semibold text-[#1741ed] hover:underline">Clear filters</button>}
        </div>
        {filtered.length ? <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((item) =>
          <PortfolioShowcaseCard key={item.slug} item={item}/>)}</div> :
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">No designs match these filters. Try another industry or style.</div>}
      </div>
    </section>
    <section className="brand-shell brand-section grid gap-9 lg:grid-cols-[1fr_auto] lg:items-center">
      <div><h2 className="mt-4">Want a website designed around your own business?</h2>
        <p className="brand-copy mt-5">See a tailored direction, then explore managed website plans that include hosting and ongoing support.</p></div>
      <Link to="/generate-preview" className="c27-button">Get your free website preview <ArrowRight className="h-4 w-4"/></Link>
    </section>
  </>;
}
