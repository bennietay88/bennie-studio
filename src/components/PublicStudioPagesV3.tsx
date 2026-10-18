import React from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { STUDIO_SHOWCASES, StudioShowcaseVisual } from "./StudioCaseStudyDetail";

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
    throw new Error(payload?.message || "We could not submit this right now. Please try again.");
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

export function AboutStudioPage() {
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
            
            <h1 className="mt-6 !max-w-[13ch]">Small studio. <em>Serious about your website.</em></h1>
            <p className="brand-copy mt-7">We bring together business-first strategy, considered design and a managed delivery process. The aim is a website that is easy to understand, easy to trust and easier to enquire through.</p>
            <div className="mt-8 flex flex-wrap gap-4"><Link to="/generate-preview" className="c27-button">Get a free website preview <ArrowRight className="h-4 w-4"/></Link><Link to="/how-it-works" className="c27-quiet">Our approach <ArrowRight className="h-4 w-4"/></Link></div>
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

export function ResourcesStudioPage() {
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [subscriberEmail, setSubscriberEmail] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);
  const [subscriptionPending, setSubscriptionPending] = React.useState(false);
  const [subscriptionError, setSubscriptionError] = React.useState("");
  const categories = ["All","Website Strategy","Design & UX","Copy & Messaging","Conversion","Case Studies","Tools & Resources"];

  const subscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (subscribed || subscriptionPending) return;
    setSubscriptionError("");
    setSubscriptionPending(true);
    try {
      const email = subscriberEmail.trim();
      await submitPublicLead({
        name: email.split("@")[0] || "Newsletter subscriber",
        email,
        formName: "Resources newsletter",
        leadType: "newsletter_subscription",
        message: "Subscribed from the Bennie Studio resources page.",
      });
      setSubscribed(true);
    } catch (error: any) {
      setSubscriptionError(error?.message || "We could not subscribe you right now. Please try again.");
    } finally {
      setSubscriptionPending(false);
    }
  };
  const filteredArticles = RESOURCE_ARTICLES.filter(({ category: cat, title, excerpt: copy }) => {
    const categoryMatch = activeCategory === "All" || cat.toLowerCase() === activeCategory.toLowerCase() || (activeCategory === "Website Strategy" && cat === "Business growth");
    const searchMatch = `${title} ${copy} ${cat}`.toLowerCase().includes(query.toLowerCase().trim());
    return categoryMatch && searchMatch;
  });

  return (
    <>
      <section className="c27-marketing-hero">
        <div className="brand-shell grid gap-12 py-20 lg:grid-cols-12 lg:items-center lg:py-24">
          <div className="lg:col-span-7">
            <h1 className="mt-6 !max-w-[15ch]">Make your next website <em>decision a better one.</em></h1>
            <p className="brand-copy mt-7">Clear, practical guides on positioning, content, customer trust, enquiry paths and the ongoing management of a business website.</p>
            <div className="mt-8 flex flex-wrap gap-5"><Link to="/generate-preview" className="c27-button">Apply it to my business <ArrowRight className="h-4 w-4"/></Link><Link to="/case-studies" className="c27-quiet">See the design work <ArrowRight className="h-4 w-4"/></Link></div>
          </div>
          <div className="lg:col-span-5"><div className="border-y border-[#cbd1dc]">
            {[["01","Positioning","Explain the offer."],["02","Trust","Earn confidence."],["03","Conversion","Make the next step clear."],["04","Aftercare","Keep it working."]].map(([n,t,desc])=><div key={n} className="grid grid-cols-[3rem_1fr] gap-5 border-b border-[#cbd1dc] py-5 last:border-b-0"><span className="font-serif text-3xl italic text-[#1741ed]">{n}</span><div><p className="text-xl font-semibold !text-[#15191f]">{t}</p><p className="mt-1 text-sm text-[#596573]">{desc}</p></div></div>)}
          </div></div>
        </div>
      </section>
      <section className="bg-white border-y border-[#e6e8ef]">
        <div className="brand-shell py-6">
          <div className="relative max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6252f4]" />
            <label htmlFor="resource-search" className="sr-only">Search resources</label>
            <input id="resource-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles, guides or topics..." className="w-full rounded-xl border border-[#dfe3ed] bg-[#fbfcff] py-3 pl-11 pr-4 text-sm text-[#172033] outline-none transition placeholder:text-[#9aa3b2] focus:border-[#6252f4] focus:ring-4 focus:ring-[#6252f4]/10" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Resource categories">
            {categories.map((x) => <button type="button" key={x} onClick={() => setActiveCategory(x)} aria-pressed={activeCategory === x} className={activeCategory === x ? "bs3-pill bs3-pill-active" : "bs3-pill"}>{x}</button>)}
          </div>
        </div>
      </section>
      <section className="brand-shell brand-section">
        <SectionHeader kicker="Latest resources" title="Practical resources for real business growth." copy="Clear guidance to help you improve your website, communicate more clearly and convert more visitors." />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map(({ slug, image: img, category: cat, title, excerpt: copy })=>(
            <Link key={title} to={`/resources/${slug}`} className="bs3-card bs3-card-hover overflow-hidden">
              <img src={img} alt="" className="aspect-[16/8.8] w-full object-cover" loading="lazy" />
              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6252f4]">{cat}</p>
                <h3 className="mt-2">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#657186]">{copy}</p>
                <span className="mt-5 inline-flex items-center text-xs font-semibold text-[#526071]">Read resource<ArrowRight className="ml-2 h-3.5 w-3.5" /></span>
              </div>
            </Link>
          ))}
        </div>
        {filteredArticles.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-[#cfd5e2] bg-[#fbfcff] p-10 text-center"><p className="font-semibold text-[#172033]">No resources match that search.</p><button type="button" onClick={() => { setQuery(""); setActiveCategory("All"); }} className="mt-3 text-sm font-semibold text-[#6252f4]">Clear filters</button></div> : null}
      </section>
      <section className="bs3-soft border-y border-[#e6e8ef]">
        <div className="brand-shell brand-section grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5"><h2 className="mt-4">The Website Launch Checklist.</h2><p className="brand-copy mt-5">Use the launch process as a checklist for content, responsive behaviour, search basics, forms and final QA.</p><Link to="/resources/website-launch-checklist" className={`${primary} mt-7`}>View the checklist<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
          <div className="lg:col-span-7"><div className="bs3-resource-art"><BookOpen className="h-16 w-16 text-[#8d7bff]" /><div><p className="text-sm font-semibold text-white/60">Bennie Studio</p><p className="mt-2 text-3xl font-semibold text-white">Website<br/>Launch Checklist</p></div></div></div>
        </div>
      </section>
      <section className="brand-shell brand-section">
        <SectionHeader kicker="Popular topics" title="Explore by topic." copy="Start with the area that matters most to your next website decision." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {["Website Strategy","Design & UX","Copy & Messaging","Conversion","Case Studies","Tools & Resources"].map((topic) => <button type="button" key={topic} onClick={() => { setActiveCategory(topic); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="bs3-card bs3-card-hover p-5 text-left"><span className="bs3-icon"><BookOpen className="h-4 w-4" /></span><h3 className="mt-4 !text-base">{topic}</h3><p className="mt-2 text-xs text-[#657186]">Useful guides and examples</p><ArrowRight className="mt-5 h-4 w-4 text-[#6252f4]" /></button>)}
        </div>
      </section>
      <section className="bs3-dark">
        <div className="brand-shell brand-section grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5"><h2 className="mt-4 !text-white">Get better website thinking in your inbox.</h2><p className="mt-5 text-base leading-8 text-white/62">Join practical updates for service businesses — no hype, just useful advice, examples and launch checklists.</p></div>
          <form onSubmit={subscribe} className="lg:col-span-7"><div className="flex flex-col gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-3 sm:flex-row"><label htmlFor="resource-email" className="sr-only">Email address</label><div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl bg-white px-4"><Mail className="h-4 w-4 text-[#6252f4]" /><input id="resource-email" required type="email" value={subscriberEmail} onChange={(event) => setSubscriberEmail(event.target.value)} disabled={subscribed || subscriptionPending} placeholder="Your email address" className="min-w-0 flex-1 bg-transparent text-sm text-[#172033] outline-none placeholder:text-[#8d96a5] disabled:cursor-not-allowed disabled:opacity-65" /></div><button type="submit" disabled={subscribed || subscriptionPending} className={`${primary} disabled:cursor-not-allowed disabled:opacity-65`}>{subscriptionPending ? "Subscribing…" : subscribed ? "You’re subscribed" : "Subscribe"}<ArrowRight className="ml-2 h-4 w-4" /></button></div><p className="mt-3 text-xs text-white/45">No spam. Unsubscribe anytime.</p>{subscriptionError ? <p role="alert" className="mt-2 text-sm font-semibold text-red-200">{subscriptionError}</p> : null}</form>
        </div>
      </section>
    </>
  );
}

export function ContactStudioPage() {
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
      try { localStorage.setItem("bt_contact_brief", JSON.stringify(brief)); } catch {}
      const params = new URLSearchParams({
        mode: "business",
        source: "contact",
        name: brief.name.trim(),
        business: brief.company.trim(),
        email: brief.email.trim(),
      });
      if (brief.details.trim()) params.set("problem", brief.details.trim());
      navigate(`/generate-preview?${params.toString()}`);
    } catch (error: any) {
      setSubmitError(error?.message || "We could not send your project brief. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="bs3-dark bs3-grid border-b border-white/10">
        <div className="brand-shell grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:items-center lg:py-24">
          <div className="lg:col-span-6">
            
            <h1 className="mt-5 !max-w-[13ch] !text-white">Let’s talk about <span className="bs3-accent">your website.</span></h1>
            <p className="brand-copy mt-6 !text-white/65">Have a project in mind? Share a short brief or book a focused call. The goal is to understand what you need and give you a clear next step.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/book-demo" className={primary}>Book a free call<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/generate-preview" className={secondary}>Send a project brief</Link></div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/58"><span>No-obligation call</span><span>Focused on real results</span><span>Clear next steps</span></div>
          </div>
          <form onSubmit={submit} className="bs3-card-dark p-6 lg:col-span-6">
            <div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-[#9f93ff]" /><h3 className="!text-white">Book a call or send a message</h3></div>
            <p className="mt-2 text-sm text-white/55">Tell us a little about your project and we’ll take it from there.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-white/75">Your name<input required value={brief.name} onChange={(e)=>setBrief({...brief,name:e.target.value})} className="bs3-input mt-2" placeholder="Your name" /></label>
              <label className="text-xs font-semibold text-white/75">Company<input required value={brief.company} onChange={(e)=>setBrief({...brief,company:e.target.value})} className="bs3-input mt-2" placeholder="Company" /></label>
              <label className="text-xs font-semibold text-white/75 sm:col-span-2">Work email<input required type="email" value={brief.email} onChange={(e)=>setBrief({...brief,email:e.target.value})} className="bs3-input mt-2" placeholder="you@company.com" /></label>
              <label className="text-xs font-semibold text-white/75 sm:col-span-2">I’m interested in<select value={brief.interest} onChange={(e)=>setBrief({...brief,interest:e.target.value})} className="bs3-input mt-2"><option>New website design</option><option>Website redesign</option><option>Website audit</option><option>Ongoing website support</option></select></label>
              <label className="text-xs font-semibold text-white/75 sm:col-span-2">Tell us about your project<textarea value={brief.details} onChange={(e)=>setBrief({...brief,details:e.target.value})} className="bs3-input mt-2 min-h-28 resize-y" placeholder="A few details about your goals, timeline or questions..." /></label>
            </div>
            <button type="submit" disabled={submitting} className={`${primary} mt-5 w-full disabled:cursor-not-allowed disabled:opacity-65`}>{submitting ? "Sending brief…" : "Start project brief"}<ArrowRight className="ml-2 h-4 w-4" /></button>
            {submitError ? <p role="alert" className="mt-3 text-sm font-semibold text-red-200">{submitError}</p> : null}
          </form>
        </div>
      </section>

      <section className="bg-white border-b border-[#e6e8ef]"><div className="brand-shell grid gap-6 py-9 sm:grid-cols-2 lg:grid-cols-4">{[
        [Compass,"Strategy first","Website decisions anchored to the business goal."],
        [ClipboardCheck,"Clear process","A transparent path from first brief to launch."],
        [MessageCircle,"Fast response","A direct route to the person responsible for the work."],
        [ShieldCheck,"No obligation","Explore the fit before committing to a build."],
      ].map(([Icon,t,c]:any)=><div key={t} className="flex gap-4"><span className="bs3-icon"><Icon className="h-4 w-4"/></span><div><p className="font-semibold text-[#172033]">{t}</p><p className="mt-1 text-sm text-[#657186]">{c}</p></div></div>)}</div></section>

      <section className="brand-shell brand-section grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5"><h2 className="mt-4">Speak with Bennie directly.</h2><p className="brand-copy mt-5">A focused call to discuss the business, current site and what a better direction could look like. Bring questions; leave with clarity.</p><div className="mt-6 space-y-3">{["Discuss goals and constraints","Review useful examples","Clarify scope and next steps","No pressure, no hard sell"].map(x=><p key={x} className="flex gap-3 text-sm font-semibold text-[#526071]"><Check className="h-4 w-4 text-[#6252f4]" />{x}</p>)}</div><Link to="/book-demo" className={`${primary} mt-7`}>Book a free 30-min call<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
        <div className="lg:col-span-7"><div className="bs3-calendar"><div className="bs3-calendar-side"><p className="text-sm font-semibold text-white/60">Bennie Studio</p><h3 className="mt-3 !text-white">30-min discovery call</h3><p className="mt-5 text-sm leading-6 text-white/58">A focused conversation about your project, goals and website direction.</p><Link to="/book-demo" className={`${primary} mt-6 w-full`}>Open live calendar<ArrowRight className="ml-2 h-4 w-4" /></Link></div><div className="bs3-calendar-grid"><p className="font-semibold text-[#172033]">Example booking view</p><p className="mt-1 text-xs leading-5 text-[#657186]">Dates and times below are illustrative. Open the live calendar to see current availability.</p><div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs text-[#657186]" aria-hidden="true">{Array.from({length:28},(_,i)=><span key={i} className={i===14?"bs3-day bs3-day-active":"bs3-day"}>{i+1}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-2" aria-hidden="true">{["9:00 AM","10:30 AM","1:00 PM","4:00 PM"].map(x=><span key={x} className="bs3-time">{x}</span>)}</div></div></div></div>
      </section>

      <section className="bs3-soft border-y border-[#e6e8ef]"><div className="brand-shell brand-section"><SectionHeader kicker="Prefer to write?" title="Send a project brief." copy="Share your goals and useful context. The preview flow gives the conversation a concrete starting point."/><div className="mt-10 grid gap-4 md:grid-cols-3">{[[Target,"Your goals","Tell us what you want the website to achieve."],[Users,"Your business","A little about the company and target audience."],[Globe2,"Inspiration","Share any useful references or existing website links."]].map(([Icon,t,c]:any)=><IconCard key={t} icon={Icon} title={t} copy={c}/>)}</div></div></section>

      <section className="brand-shell brand-section"><SectionHeader kicker="How it works" title="From conversation to a better website." copy="A simple, transparent process designed to move from idea to useful next step without unnecessary complexity."/><div className="mt-10 grid gap-4 md:grid-cols-4">{[["01","Reach out","Book a call or send a project brief."],["02","Discuss & plan","We learn about the business and goals."],["03","Design & build","The website is designed around the brief."],["04","Launch & grow","Go live with managed support available."]].map(([n,t,c])=><article key={n} className="bs3-card p-5"><span className="text-xs font-bold text-[#6252f4]">{n}</span><h3 className="mt-4">{t}</h3><p className="mt-2 text-sm text-[#657186]">{c}</p></article>)}</div></section>
    </>
  );
}

export function PricingStudioPage() {
  return <CommercialPricing />;
}

export function ProcessStudioPage() {
  const stages = [
    ["01",Search,"Discover","Your goals, offer and audience.","1–2 days","Project plan · Site structure"],
    ["02",Compass,"Plan","Strategy and structure.","2–3 days","Content direction · Design direction"],
    ["03",WandSparkles,"Design","Bring the brand to life.","4–7 days","Homepage · Key page templates"],
    ["04",Code2,"Build","Develop and refine.","5–10 days","Responsive build · Forms · SEO basics"],
    ["05",Rocket,"Launch","Go live and grow.","1–2 days","Final checks · Handover · Support"],
  ] as const;

  return (
    <>
      <section className="border-b border-[#dadde5] bg-[#f4f5f7]"><div className="brand-shell grid gap-12 py-20 lg:grid-cols-12 lg:items-center lg:py-28"><div className="lg:col-span-6"><h1 className="mt-6 !max-w-[14ch] !text-[#141821]">From your first idea to a website that's <span className="font-serif italic font-normal !text-[#1943ed]">ready for business.</span></h1><p className="brand-copy mt-6">A transparent journey with a free initial website direction, clear scope, collaborative review and support after launch.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/generate-preview" className="inline-flex min-h-12 items-center justify-center bg-[#1943ed] px-6 py-3 font-semibold text-white">Start with a free preview<ArrowRight className="ml-2 h-4 w-4"/></Link><Link to="/pricing" className="inline-flex min-h-12 items-center gap-2 font-semibold text-[#172033] underline underline-offset-4">See plan details</Link></div></div><div className="lg:col-span-6"><div className="border-y border-[#cad0da]">{[["01","Share your business"],["02","See a preview"],["03","Agree scope & pricing"],["04","Build, review & launch"],["05","Stay supported"]].map(([n,t])=><div key={n} className="flex items-center gap-7 border-b border-[#cad0da] py-4 last:border-b-0"><span className="w-16 shrink-0 font-serif text-4xl italic text-[#1943ed]">{n}</span><p className="text-xl font-semibold tracking-tight !text-[#172033]">{t}</p><ArrowRight className="ml-auto h-4 w-4 text-[#1943ed]"/></div>)}</div></div></div></section>
      <section className="bg-white border-y border-[#e6e8ef]"><div className="brand-shell grid gap-5 py-8 sm:grid-cols-5">{stages.map(([n,Icon,t])=><div key={n} className="flex items-center gap-3"><span className="bs3-icon"><Icon className="h-4 w-4"/></span><div><p className="text-[11px] font-bold text-[#6252f4]">{n}</p><p className="text-sm font-semibold text-[#172033]">{t}</p></div></div>)}</div></section>
      <section className="bs3-soft border-b border-[#e6e8ef]"><div className="brand-shell brand-section grid gap-12 lg:grid-cols-12 lg:items-center"><div className="lg:col-span-5"><h2 className="mt-4">A process built around you.</h2><p className="brand-copy mt-5">Strategy, design and delivery are combined in a clear step-by-step process so you know what is happening, what is needed and what to expect.</p><div className="mt-6 space-y-3">{["Clear timelines and deliverables","Regular human review and feedback","Built for real business outcomes"].map(x=><p key={x} className="flex gap-3 text-sm font-semibold text-[#526071]"><Check className="h-4 w-4 text-[#6252f4]"/>{x}</p>)}</div></div><div className="lg:col-span-7"><div className="rounded-[1.2rem] border border-[#dfe3eb] bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6252f4]">What stays visible</p><div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[#e3e6ed] bg-[#e3e6ed] sm:grid-cols-2">{["What we need from you","What Bennie Studio is doing","What is ready for review","What happens before launch"].map((item)=><div key={item} className="bg-[#fbfcff] p-5"><Check className="h-4 w-4 text-[#6252f4]" /><p className="mt-3 text-sm font-semibold text-[#344054]">{item}</p></div>)}</div></div></div></div></section>
      <section className="brand-shell brand-section"><SectionHeader kicker="The process" title="Five steps. A better website." copy="Each stage is designed to be simple, collaborative and focused on results."/><div className="mt-10 space-y-4">{stages.map(([n,Icon,t,sub,time,deliverable])=><article key={n} className="bs3-card grid gap-5 p-6 lg:grid-cols-[70px_1.2fr_.75fr_.9fr] lg:items-center"><div className="flex items-center gap-3 lg:block"><span className="bs3-step">{n}</span></div><div><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[#6252f4]"/><h3>{t}</h3></div><p className="mt-2 text-sm text-[#8a7dff]">{sub}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#657186]">Timeframe</p><p className="mt-2 text-sm font-semibold text-[#172033]">{time}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#657186]">Key deliverables</p><p className="mt-2 text-sm text-[#526071]">{deliverable}</p></div></article>)}</div></section>
      <section className="bs3-dark"><div className="brand-shell brand-section"><SectionHeader dark kicker="Human review at every stage" title="Real people. Real feedback. Better results." copy="The workflow supports the work; professional judgement remains part of every review stage."/><div className="mt-10 grid gap-4 md:grid-cols-3">{[[Compass,"Strategy review","Goals, positioning, site structure and timeline."],[WandSparkles,"Design review","Homepage direction, key layouts and responsive behaviour."],[ShieldCheck,"Pre-launch review","Functionality, search basics and final sign-off."]].map(([Icon,t,c]:any)=><IconCard key={t} icon={Icon} title={t} copy={c} dark />)}</div></div></section>
      <section className="brand-shell brand-section"><div className="grid gap-10 lg:grid-cols-12 lg:items-start"><div className="lg:col-span-4"><h2 className="mt-4">Questions about the process?</h2><p className="brand-copy mt-5">The delivery plan makes responsibilities and review points explicit before launch.</p></div><div className="lg:col-span-8"><Faqs items={[
        ["How long does a project take?","Timing depends on the agreed scope, the readiness of content and the feedback cycle."],
        ["What do I need to provide?","Business details, service information, useful brand assets and timely feedback are the usual inputs."],
        ["Can I request changes along the way?","Yes. Review points are part of the process so the direction can be refined before launch."],
        ["Do you provide content and images?","Content guidance is part of the workflow. Any additional production requirements are scoped explicitly."],
        ["Will the website be mobile friendly and SEO ready?","Responsive behaviour and the agreed search foundations are part of launch QA."],
      ]}/></div></div></section>
    </>
  );
}

export function WorkStudioPage() {
  return (
    <>
      <section className="c27-marketing-hero">
        <div className="brand-shell py-20 lg:py-28">
          <div className="max-w-[62rem]">
            <h1 className="!max-w-[18ch]">See the websites <em>we can build.</em></h1>
            <p className="brand-copy mt-7 max-w-3xl">Explore our own website and six industry-focused website designs created with the Bennie Studio app. See how each design presents a business, builds confidence and guides visitors towards an enquiry.</p>
            <div className="mt-8 flex flex-wrap gap-5">
              <a href="#studio-work" className="c27-button">Explore the work <ArrowRight className="h-4 w-4"/></a>
              <Link to="/generate-preview" className="c27-quiet">Get a free website preview <ArrowRight className="h-4 w-4"/></Link>
            </div>
          </div>
        </div>
      </section>
      <section className="brand-shell brand-section" id="studio-work">
        <div className="grid gap-8 lg:grid-cols-[.65fr_1.35fr] lg:items-end"><div><h2 className="mt-4">Bennie Studio's own website redesign.</h2></div><p className="brand-copy">Our in-house brief was to make the offer easier to understand, showcase website design quality and give business owners a clear route to a free preview, real pricing and an enquiry. The live website is the deliverable.</p></div>
        <div className="mt-9 grid gap-0 border border-[#dce1e6] lg:grid-cols-[1.15fr_.85fr]">
          <div className="flex min-h-[330px] flex-col justify-center bg-[#1741ed] p-9 text-white sm:p-14"><h3 className="mt-7 max-w-[11ch] !text-white !text-[clamp(2.5rem,5vw,5rem)] !leading-[.99] !tracking-[-.06em]">Made to <span className="font-serif italic font-normal">stand out.</span> Built to work.</h3><p className="mt-7 text-sm !text-white/75">Responsive, enquiry-led design system for Bennie Studio.</p></div>
          <div className="flex flex-col justify-center bg-white p-8 sm:p-11"><h3 className="mt-4">A clearer path from first impression to a buying decision.</h3><p className="mt-5 text-sm leading-7 text-[#536171]">Homepage positioning, visual proof of design capability, a free preview, transparent commercial pricing, and managed service information all working together.</p><div className="mt-7 flex gap-3 flex-wrap"><Link to="/" className="c27-quiet">View live website <ArrowRight className="h-4 w-4"/></Link><Link to="/pricing" className="c27-quiet">Review the buying journey <ArrowRight className="h-4 w-4"/></Link></div></div>
        </div>
      </section>
      <section className="border-y border-[#dfe3e8] bg-[#f2f4f7]">
        <div className="brand-shell brand-section">
          <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_.8fr] lg:items-end"><div><h2 className="mt-4">Six industries. Six different buying journeys.</h2></div><p className="brand-copy">Every preview below is rendered from a built-in website template available in the Bennie Studio app. The work shows design and structure; it does not imply the business scenario is a real client.</p></div>
          <div className="c27-grid">{STUDIO_SHOWCASES.map(study=><article key={study.slug} className="c27-card">
            <StudioShowcaseVisual study={study} compact />
            <div className="c27-card-content"><p className="c27-kicker">{study.category} · Studio-built</p><h3>{study.title}</h3><p>{study.headline}</p><p className="mt-3 !text-xs">Enquiry goal: {study.goal}</p><Link to={"/case-studies/showcase/"+study.slug}>Explore case study <ArrowRight className="h-4 w-4"/></Link></div>
          </article>)}</div>
          <p className="mt-6 max-w-4xl text-xs leading-6 text-[#697585]">Showcase businesses and briefs are illustrative. The previews are rendered using the app's existing template configuration; final paid websites are personalised and require business content, approved proof and studio review.</p>
        </div>
      </section>
      <section className="brand-shell brand-section grid gap-9 lg:grid-cols-[1fr_auto] lg:items-center"><div><h2 className="mt-4">Wondering what this would look like for your business?</h2><p className="brand-copy mt-5">Tell us about your business and receive a preliminary website direction before choosing a managed plan.</p></div><Link to="/generate-preview" className="c27-button">Get your free website preview <ArrowRight className="h-4 w-4"/></Link></section>
    </>
  );
}
