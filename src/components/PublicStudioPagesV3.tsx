import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarDays,
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

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6252f4] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-25px_rgba(98,82,244,.9)] transition hover:-translate-y-0.5 hover:bg-[#5142de]";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-white/22 bg-white/[0.035] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]";

function StudioVisual({ image = "/images/studio-hero-v2.png", label = "Website direction" }: { image?: string; label?: string }) {
  return (
    <div className="bs3-device-wrap">
      <div className="bs3-laptop">
        <div className="bs3-browser-dots"><span /><span /><span /></div>
        <img src={image} alt="" loading="eager" decoding="async" />
        <div className="bs3-screen-label">{label}</div>
      </div>
      <div className="bs3-phone" aria-hidden="true">
        <div className="bs3-phone-notch" />
        <img src={image} alt="" />
      </div>
    </div>
  );
}

function StudioHero({
  kicker,
  title,
  accent,
  copy,
  primaryLabel = "Start your website",
  primaryHref = "/generate-preview",
  secondaryLabel,
  secondaryHref,
  image = "/images/studio-hero-v2.png",
  visualLabel,
  trust = ["Strategy-led", "Human review", "Built for growth"],
  titleClassName = "!max-w-[15ch]",
}: {
  kicker: string;
  title: string;
  accent?: string;
  copy: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  image?: string;
  visualLabel?: string;
  trust?: string[];
  titleClassName?: string;
}) {
  return (
    <section className="bs3-dark bs3-grid relative overflow-hidden border-b border-white/10">
      <div className="bs3-orb -right-36 -top-36" />
      <div className="brand-shell grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:items-center lg:py-24">
        <div className="lg:col-span-6">
          <p className="brand-kicker !text-[#9f93ff]">{kicker}</p>
          <h1 className={`mt-5 ${titleClassName} !text-white`}>
            {title}{accent ? <> <span className="bs3-accent">{accent}</span></> : null}
          </h1>
          <p className="brand-copy mt-6 !max-w-[40rem] !text-white/68">{copy}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={primaryHref} className={primary}>{primaryLabel}<ArrowRight className="ml-2 h-4 w-4" /></Link>
            {secondaryLabel && secondaryHref ? <Link to={secondaryHref} className={secondary}>{secondaryLabel}</Link> : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {trust.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 text-xs font-semibold text-white/62">
                <ShieldCheck className="h-4 w-4 text-[#8d7bff]" /> {item}
              </span>
            ))}
          </div>
        </div>
        <div className="lg:col-span-6">
          <StudioVisual image={image} label={visualLabel} />
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ kicker, title, copy, dark = false }: { kicker: string; title: string; copy?: string; dark?: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <p className={dark ? "brand-kicker !text-[#9f93ff]" : "brand-kicker"}>{kicker}</p>
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

function Faqs({ items, dark = false }: { items: Array<[string, string]>; dark?: boolean }) {
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
    [Users, "Human Review", "A real person reviews the message, layout, responsive behaviour and conversion path before launch."],
    [Rocket, "Launch & Support", "Technical launch, hosting, SSL, maintenance and the plan-based support needed after the site goes live."],
  ] as const;

  return (
    <>
      <StudioHero
        kicker="Bennie Studio · Website Services"
        title="Strategic websites designed to"
        accent="win trust and enquiries."
        copy="We plan, design and build high-performing websites for service businesses. Clear messaging, modern design and a seamless experience — so you look credible and get more enquiries."
        secondaryLabel="View our work"
        secondaryHref="/case-studies"
        image="/images/studio-hero-v2.png"
        visualLabel="Strategy · design · build"
      />

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
            <p className="brand-kicker">What we do</p>
            <h2 className="mt-4">More than a website. A strategic growth asset.</h2>
            <p className="brand-copy mt-6">We combine strategy, messaging, design and technology to create websites that look exceptional, build trust and turn visitors into real enquiries.</p>
            <Link to="/generate-preview" className={`${primary} mt-7`}>Start your website<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
          <div className="lg:col-span-7">
            <div className="bs3-image-card">
              <img src="/images/studio-process-v2.png" alt="Bennie Studio website strategy and design workflow" />
              <span className="bs3-float-card left-[7%] top-[14%]">Strategy & positioning</span>
              <span className="bs3-float-card right-[7%] top-[30%]">Design & build</span>
              <span className="bs3-float-card bottom-[12%] left-[25%]">Human review</span>
            </div>
          </div>
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
    [Sparkles,"Quality over quantity","The system is designed to make launch quality explicit instead of pushing volume."],
    [ShieldCheck,"Long-term partnership","The website stays managed and can evolve as the business grows."],
  ] as const;

  return (
    <>
      <StudioHero
        kicker="About Bennie Studio"
        title="A modern studio for businesses that need a"
        accent="better website."
        copy="We design, build and manage websites for ambitious businesses — without the hassle. Thoughtful design, human support and real results, not just templates."
        secondaryLabel="See how it works"
        secondaryHref="/how-it-works"
        image="/images/studio-process-v2.png"
        visualLabel="Designed around real businesses"
      />
      <section className="brand-shell brand-section">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="brand-kicker">Our mission</p>
            <h2 className="mt-4">Better websites for real businesses.</h2>
            <p className="brand-copy mt-6">Bennie Studio exists to help good businesses look as good as the work they do. Strategy, design and technology are combined into a human-guided process so the website is easier to understand, trust and act on.</p>
            <Link to="/generate-preview" className={`${primary} mt-7`}>Start your project<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </div>
          <div className="lg:col-span-7"><div className="bs3-image-card"><img src="/images/studio-process-v2.png" alt="Bennie Studio website review process" /></div></div>
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
            <p className="brand-kicker !text-[#9f93ff]">Our difference</p>
            <h2 className="mt-4 !text-white">Every website is reviewed by a human.</h2>
            <p className="mt-6 text-base leading-8 text-white/64">Automation can accelerate repetitive work. It does not replace judgement about credibility, content, design quality or whether a site actually makes sense to a customer.</p>
            <div className="mt-7 space-y-3">{["Design and content review","Responsive and performance checks","Final launch sign-off"].map((x)=><p key={x} className="flex gap-3 text-sm font-semibold text-white/75"><Check className="h-4 w-4 text-[#9f93ff]" />{x}</p>)}</div>
          </div>
          <div className="lg:col-span-7"><div className="bs3-image-card !border-white/10"><img src="/images/studio-process-v2.png" alt="Human website review at Bennie Studio" /><span className="bs3-float-card bottom-[12%] left-[10%]">A real person looks at every detail.</span></div></div>
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
  const [subscribed, setSubscribed] = React.useState(false);
  const categories = ["All","Website Strategy","Design & UX","Copy & Messaging","Conversion","Case Studies","Tools & Resources"];
  const filteredArticles = RESOURCE_ARTICLES.filter(({ category: cat, title, excerpt: copy }) => {
    const categoryMatch = activeCategory === "All" || cat.toLowerCase() === activeCategory.toLowerCase() || (activeCategory === "Website Strategy" && cat === "Business growth");
    const searchMatch = `${title} ${copy} ${cat}`.toLowerCase().includes(query.toLowerCase().trim());
    return categoryMatch && searchMatch;
  });

  return (
    <>
      <StudioHero
        kicker="Resources & insights"
        title="Guides, insights and examples for businesses improving their website."
        copy="Practical advice, proven frameworks and useful examples to help you build a clearer message, a better website and more customers."
        primaryLabel="Run a free website audit"
        primaryHref="/website-audit"
        secondaryLabel="View the work"
        secondaryHref="/case-studies"
        image="/images/studio-insights-v2.png"
        visualLabel="Practical website guidance"
        trust={["Practical advice","Templates & checklists","Examples that work"]}
        titleClassName="!max-w-[20ch]"
      />
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
          <div className="lg:col-span-5"><p className="brand-kicker">Free resource</p><h2 className="mt-4">The Website Launch Checklist.</h2><p className="brand-copy mt-5">Use the launch process as a checklist for content, responsive behaviour, search basics, forms and final QA.</p><Link to="/how-it-works" className={`${primary} mt-7`}>View the checklist<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
          <div className="lg:col-span-7"><div className="bs3-resource-art"><BookOpen className="h-16 w-16 text-[#8d7bff]" /><div><p className="text-sm font-semibold text-white/60">Bennie Studio</p><p className="mt-2 text-3xl font-semibold text-white">Website<br/>Launch Checklist</p></div></div></div>
        </div>
      </section>
      <section className="brand-shell brand-section">
        <SectionHeader kicker="Popular topics" title="Explore by topic." copy="Start with the area that matters most to your next website decision." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {["Website Strategy","Design & UX","Copy & Messaging","Conversion","Case Studies","Tools & Resources"].map((topic, index) => <button type="button" key={topic} onClick={() => { setActiveCategory(topic); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="bs3-card bs3-card-hover p-5 text-left"><span className="bs3-icon"><BookOpen className="h-4 w-4" /></span><h3 className="mt-4 !text-base">{topic}</h3><p className="mt-2 text-xs text-[#657186]">Useful guides and examples</p><ArrowRight className="mt-5 h-4 w-4 text-[#6252f4]" /></button>)}
        </div>
      </section>
      <section className="bs3-dark">
        <div className="brand-shell brand-section grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5"><p className="brand-kicker !text-[#9f93ff]">Stay in the loop</p><h2 className="mt-4 !text-white">Get better website thinking in your inbox.</h2><p className="mt-5 text-base leading-8 text-white/62">Join practical updates for service businesses — no hype, just useful advice, examples and launch checklists.</p></div>
          <form onSubmit={(event) => { event.preventDefault(); setSubscribed(true); }} className="lg:col-span-7"><div className="flex flex-col gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-3 sm:flex-row"><label htmlFor="resource-email" className="sr-only">Email address</label><div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl bg-white px-4"><Mail className="h-4 w-4 text-[#6252f4]" /><input id="resource-email" required type="email" placeholder="Your email address" className="min-w-0 flex-1 bg-transparent text-sm text-[#172033] outline-none placeholder:text-[#8d96a5]" /></div><button type="submit" className={primary}>{subscribed ? "You’re subscribed" : "Subscribe"}<ArrowRight className="ml-2 h-4 w-4" /></button></div><p className="mt-3 text-xs text-white/45">No spam. Unsubscribe anytime.</p></form>
        </div>
      </section>
    </>
  );
}

export function ContactStudioPage() {
  const navigate = useNavigate();
  const [brief, setBrief] = React.useState({ name:"", company:"", email:"", interest:"New website design", details:"" });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try { localStorage.setItem("bt_contact_brief", JSON.stringify(brief)); } catch {}
    navigate("/generate-preview");
  };

  return (
    <>
      <section className="bs3-dark bs3-grid border-b border-white/10">
        <div className="brand-shell grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:items-center lg:py-24">
          <div className="lg:col-span-6">
            <p className="brand-kicker !text-[#9f93ff]">Contact Bennie Studio</p>
            <h1 className="mt-5 !max-w-[13ch] !text-white">Let’s talk about <span className="bs3-accent">your website.</span></h1>
            <p className="brand-copy mt-6 !text-white/65">Have a project in mind? Share a short brief or book a focused call. The goal is to understand what you need and give you a clear next step.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/book-demo" className={primary}>Book a free call<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/generate-preview" className={secondary}>Send a project brief</Link></div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/58"><span>No-obligation call</span><span>Focused on real results</span><span>Clear next steps</span></div>
          </div>
          <form onSubmit={submit} className="bs3-card-dark p-6 lg:col-span-6">
            <div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-[#9f93ff]" /><h3 className="!text-white">Book a call or send a message</h3></div>
            <p className="mt-2 text-sm text-white/55">Tell us a little about your project and we’ll take it from there.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-white/75">Your name<input value={brief.name} onChange={(e)=>setBrief({...brief,name:e.target.value})} className="bs3-input mt-2" placeholder="Your name" /></label>
              <label className="text-xs font-semibold text-white/75">Company<input value={brief.company} onChange={(e)=>setBrief({...brief,company:e.target.value})} className="bs3-input mt-2" placeholder="Company" /></label>
              <label className="text-xs font-semibold text-white/75 sm:col-span-2">Work email<input type="email" value={brief.email} onChange={(e)=>setBrief({...brief,email:e.target.value})} className="bs3-input mt-2" placeholder="you@company.com" /></label>
              <label className="text-xs font-semibold text-white/75 sm:col-span-2">I’m interested in<select value={brief.interest} onChange={(e)=>setBrief({...brief,interest:e.target.value})} className="bs3-input mt-2"><option>New website design</option><option>Website redesign</option><option>Website audit</option><option>Ongoing website support</option></select></label>
              <label className="text-xs font-semibold text-white/75 sm:col-span-2">Tell us about your project<textarea value={brief.details} onChange={(e)=>setBrief({...brief,details:e.target.value})} className="bs3-input mt-2 min-h-28 resize-y" placeholder="A few details about your goals, timeline or questions..." /></label>
            </div>
            <button type="submit" className={`${primary} mt-5 w-full`}>Start project brief<ArrowRight className="ml-2 h-4 w-4" /></button>
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
        <div className="lg:col-span-5"><p className="brand-kicker">Book a call</p><h2 className="mt-4">Speak with Bennie directly.</h2><p className="brand-copy mt-5">A focused call to discuss the business, current site and what a better direction could look like. Bring questions; leave with clarity.</p><div className="mt-6 space-y-3">{["Discuss goals and constraints","Review useful examples","Clarify scope and next steps","No pressure, no hard sell"].map(x=><p key={x} className="flex gap-3 text-sm font-semibold text-[#526071]"><Check className="h-4 w-4 text-[#6252f4]" />{x}</p>)}</div><Link to="/book-demo" className={`${primary} mt-7`}>Book a free 30-min call<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
        <div className="lg:col-span-7"><div className="bs3-calendar"><div className="bs3-calendar-side"><p className="text-sm font-semibold text-white/60">Bennie Studio</p><h3 className="mt-3 !text-white">30-min discovery call</h3><p className="mt-5 text-sm leading-6 text-white/58">A focused conversation about your project, goals and website direction.</p></div><div className="bs3-calendar-grid"><p className="font-semibold text-[#172033]">Select a date and time</p><div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs text-[#657186]">{Array.from({length:28},(_,i)=><span key={i} className={i===14?"bs3-day bs3-day-active":"bs3-day"}>{i+1}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-2">{["9:00 AM","10:30 AM","1:00 PM","4:00 PM"].map(x=><span key={x} className="bs3-time">{x}</span>)}</div></div></div></div>
      </section>

      <section className="bs3-soft border-y border-[#e6e8ef]"><div className="brand-shell brand-section"><SectionHeader kicker="Prefer to write?" title="Send a project brief." copy="Share your goals and useful context. The preview flow gives the conversation a concrete starting point."/><div className="mt-10 grid gap-4 md:grid-cols-3">{[[Target,"Your goals","Tell us what you want the website to achieve."],[Users,"Your business","A little about the company and target audience."],[Globe2,"Inspiration","Share any useful references or existing website links."]].map(([Icon,t,c]:any)=><IconCard key={t} icon={Icon} title={t} copy={c}/>)}</div></div></section>

      <section className="brand-shell brand-section"><SectionHeader kicker="How it works" title="From conversation to a better website." copy="A simple, transparent process designed to move from idea to useful next step without unnecessary complexity."/><div className="mt-10 grid gap-4 md:grid-cols-4">{[["01","Reach out","Book a call or send a project brief."],["02","Discuss & plan","We learn about the business and goals."],["03","Design & build","The website is designed around the brief."],["04","Launch & grow","Go live with managed support available."]].map(([n,t,c])=><article key={n} className="bs3-card p-5"><span className="text-xs font-bold text-[#6252f4]">{n}</span><h3 className="mt-4">{t}</h3><p className="mt-2 text-sm text-[#657186]">{c}</p></article>)}</div></section>
    </>
  );
}

export function PricingStudioPage() {
  return (
    <>
      <StudioHero
        kicker="Simple pricing · clear scope"
        title="Professional websites for"
        accent="growing businesses."
        copy="Choose the plan that matches your goals. Current setup fees, monthly service and commitments are shown before checkout so the commercial terms stay clear."
        primaryLabel="Start your project"
        primaryHref="/generate-preview"
        secondaryLabel="Talk to our team"
        secondaryHref="/contact"
        image="/images/studio-hero-v2.png"
        visualLabel="Pricing built around scope"
        trust={["Clear scope","Human support","Built for results"]}
      />
      <CommercialPricing hideIntro />
      <section className="bs3-soft border-y border-[#e6e8ef]">
        <div className="brand-shell brand-section">
          <SectionHeader kicker="What's included" title="Everything you need to launch with confidence." copy="The exact scope follows the selected plan. The foundation stays focused on quality, clarity and a reliable launch." />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              [Compass,"Strategic discovery","Understand the business, goals and audience before design begins."],
              [WandSparkles,"Premium design","A modern design direction tailored to the business and category."],
              [MonitorSmartphone,"Mobile optimised","Layouts designed to work clearly across devices."],
              [Search,"SEO ready","Core technical and content foundations for discoverability."],
              [ShieldCheck,"Fast & secure","A managed technical setup with launch QA."],
              [HeartHandshake,"Ongoing support","A clear route for support and plan-based changes after launch."],
            ].map(([Icon,t,c]:any)=><IconCard key={t} icon={Icon} title={t} copy={c} />)}
          </div>
        </div>
      </section>
      <section className="brand-shell brand-section"><div className="grid gap-10 lg:grid-cols-12 lg:items-start"><div className="lg:col-span-4"><p className="brand-kicker">FAQ</p><h2 className="mt-4">Questions serious businesses ask.</h2><p className="brand-copy mt-5">Review the common questions before deciding which scope fits.</p></div><div className="lg:col-span-8"><Faqs items={[
        ["How long does a website take to launch?","Timing depends on the selected scope, content readiness and feedback cycle. The confirmed timeline is shown in the delivery plan."],
        ["Do you offer ongoing support?","Yes. Managed plans can include ongoing hosting, maintenance and update support according to plan terms."],
        ["Can I upgrade later?","Yes. Additional pages, functionality or growth services can be scoped when the business needs them."],
        ["Do you provide domain and hosting?","Hosting and launch support are handled as part of the managed website workflow where included in the selected plan."],
        ["What if I need custom functionality?","Custom integrations or functionality are reviewed separately so the scope remains explicit before work starts."],
      ]}/></div></div></section>
    </>
  );
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
      <StudioHero
        kicker="A clear process · a better website"
        title="From brief to launch,"
        accent="without the chaos."
        copy="A simple, structured process designed to get you a high-performing website — with zero guesswork, clear communication and full human support."
        primaryLabel="Start your project"
        primaryHref="/generate-preview"
        secondaryLabel="Explore the work"
        secondaryHref="/case-studies"
        image="/images/studio-process-v2.png"
        visualLabel="Discover · plan · design · build · launch"
        trust={["Clear milestones","Human review","Built to perform"]}
      />
      <section className="bg-white border-y border-[#e6e8ef]"><div className="brand-shell grid gap-5 py-8 sm:grid-cols-5">{stages.map(([n,Icon,t])=><div key={n} className="flex items-center gap-3"><span className="bs3-icon"><Icon className="h-4 w-4"/></span><div><p className="text-[11px] font-bold text-[#6252f4]">{n}</p><p className="text-sm font-semibold text-[#172033]">{t}</p></div></div>)}</div></section>
      <section className="bs3-soft border-b border-[#e6e8ef]"><div className="brand-shell brand-section grid gap-12 lg:grid-cols-12 lg:items-center"><div className="lg:col-span-5"><p className="brand-kicker">Simple. transparent. strategic.</p><h2 className="mt-4">A process built around you.</h2><p className="brand-copy mt-5">Strategy, design and technology are combined in a clear step-by-step process so you know what is happening, what is needed and what to expect.</p><div className="mt-6 space-y-3">{["Clear timelines and deliverables","Regular human review and feedback","Built for real business outcomes"].map(x=><p key={x} className="flex gap-3 text-sm font-semibold text-[#526071]"><Check className="h-4 w-4 text-[#6252f4]"/>{x}</p>)}</div></div><div className="lg:col-span-7"><div className="bs3-image-card"><img src="/images/studio-process-v2.png" alt="Bennie Studio website delivery process" /><span className="bs3-float-card right-[7%] top-[16%]">Real people. Strategic thinking.</span><span className="bs3-float-card bottom-[14%] right-[12%]">A smoother process.</span></div></div></div></section>
      <section className="brand-shell brand-section"><SectionHeader kicker="The process" title="Five steps. A better website." copy="Each stage is designed to be simple, collaborative and focused on results."/><div className="mt-10 space-y-4">{stages.map(([n,Icon,t,sub,time,deliverable])=><article key={n} className="bs3-card grid gap-5 p-6 lg:grid-cols-[70px_1.2fr_.75fr_.9fr] lg:items-center"><div className="flex items-center gap-3 lg:block"><span className="bs3-step">{n}</span></div><div><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[#6252f4]"/><h3>{t}</h3></div><p className="mt-2 text-sm text-[#8a7dff]">{sub}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#657186]">Timeframe</p><p className="mt-2 text-sm font-semibold text-[#172033]">{time}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#657186]">Key deliverables</p><p className="mt-2 text-sm text-[#526071]">{deliverable}</p></div></article>)}</div></section>
      <section className="bs3-dark"><div className="brand-shell brand-section"><SectionHeader dark kicker="Human review at every stage" title="Real people. Real feedback. Better results." copy="The system supports the work; it does not replace professional judgement."/><div className="mt-10 grid gap-4 md:grid-cols-3">{[[Compass,"Strategy review","Goals, positioning, site structure and timeline."],[WandSparkles,"Design review","Homepage direction, key layouts and responsive behaviour."],[ShieldCheck,"Pre-launch review","Functionality, search basics and final sign-off."]].map(([Icon,t,c]:any)=><IconCard key={t} icon={Icon} title={t} copy={c} dark />)}</div></div></section>
      <section className="brand-shell brand-section"><div className="grid gap-10 lg:grid-cols-12 lg:items-start"><div className="lg:col-span-4"><p className="brand-kicker">Common questions</p><h2 className="mt-4">Questions about the process?</h2><p className="brand-copy mt-5">The delivery plan makes responsibilities and review points explicit before launch.</p></div><div className="lg:col-span-8"><Faqs items={[
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
  const work = [
    ["/template-assets/flagship-professional.jpg","Professional services","Professional advisory website","Authority-led structure with clearer services and a stronger consultation path."],
    ["/template-assets/flagship-clinic.jpg","Healthcare","Clinic website","Treatment clarity, practitioner trust and a cleaner appointment journey."],
    ["/template-assets/flagship-renovation.jpg","Local business","Renovation contractor","Project proof, service areas and a more direct quotation path."],
    ["/template-assets/flagship-education.jpg","Education","Education provider","Programme clarity, teacher trust and a focused parent enquiry journey."],
    ["/template-assets/flagship-beauty.jpg","Lifestyle","Beauty & wellness","A service-led visual system with stronger treatment discovery and booking actions."],
    ["/images/studio-work-v2.png","Business services","Consulting business","Sharper positioning, proof and conversion flow for a specialist offer."],
  ] as const;

  return (
    <>
      <StudioHero
        kicker="Our work"
        title="Work that helps businesses look better and"
        accent="convert better."
        copy="Website directions designed around real business goals: stronger trust, clearer messaging and a more obvious path to enquiry."
        primaryLabel="Start a project"
        primaryHref="/generate-preview"
        secondaryLabel="Explore the process"
        secondaryHref="/how-it-works"
        image="/images/studio-work-v2.png"
        visualLabel="Different businesses · different directions"
        trust={["Strategic design","Built for performance","Real business context"]}
      />
      <section className="bg-white border-y border-[#e6e8ef]"><div className="brand-shell flex flex-wrap items-center justify-between gap-5 py-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a7dff]">Designed across service categories</p><div className="flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[#778193]"><span>Professional</span><span>Healthcare</span><span>Local service</span><span>Education</span><span>Lifestyle</span><span>Consulting</span></div></div></section>
      <section className="brand-shell brand-section"><SectionHeader kicker="Selected work" title="Websites for different businesses. Better decisions across industries." copy="The visual direction changes with the business. The objective stays the same: make the offer easier to understand, trust and act on."/><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{work.map(([img,cat,title,copy])=><article key={title} className="bs3-card bs3-card-hover overflow-hidden"><img src={img} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy"/><div className="p-5"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6252f4]">{cat}</p><h3 className="mt-2">{title}</h3><p className="mt-3 text-sm leading-6 text-[#657186]">{copy}</p><Link to="/generate-preview" className="mt-5 inline-flex items-center text-sm font-semibold text-[#172033]">Build a direction<ArrowRight className="ml-2 h-4 w-4"/></Link></div></article>)}</div></section>
      <section className="bs3-soft border-y border-[#e6e8ef]"><div className="brand-shell brand-section"><SectionHeader kicker="Before & after thinking" title="A clear difference without losing the business." copy="A redesign should keep useful identity and evidence while improving hierarchy, readability and conversion clarity."/><div className="mt-10 grid gap-5 lg:grid-cols-2"><div className="bs3-compare"><span className="bs3-compare-label">Before</span><div className="h-full bg-[#f5f5f3] p-8"><p className="text-xs text-[#8992a1]">Existing website</p><h3 className="mt-7 max-w-[13ch] !text-[#343a46]">Useful business information, but harder to scan.</h3><div className="mt-8 h-36 bg-white/80"/></div></div><div className="bs3-compare bs3-compare-after"><span className="bs3-compare-label !bg-[#6252f4]">After</span><img src="/images/studio-work-v2.png" alt="" className="h-full w-full object-cover"/></div></div></div></section>
      <section className="bs3-dark"><div className="brand-shell brand-section"><SectionHeader dark kicker="Our process" title="From strategy to a website people can use." copy="The work moves from understanding the business to design, build and a reviewed launch."/><div className="mt-10 grid gap-4 md:grid-cols-4">{[["01",Search,"Strategy","Understand goals, audience and positioning."],["02",Layout,"Design","Create the visual direction and page system."],["03",Code2,"Build","Develop a responsive implementation."],["04",BarChart3,"Grow","Launch, measure and improve over time."]].map(([n,Icon,t,c]:any)=><article key={n} className="bs3-card-dark p-5"><span className="text-xs font-bold text-[#9f93ff]">{n}</span><Icon className="mt-5 h-5 w-5 text-[#9f93ff]"/><h3 className="mt-4 !text-white">{t}</h3><p className="mt-2 text-sm text-white/55">{c}</p></article>)}</div></div></section>
    </>
  );
}
