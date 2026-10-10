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
import { WebsiteConceptVisual } from "./WebsiteConceptVisual";

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6252f4] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-25px_rgba(98,82,244,.9)] transition hover:-translate-y-0.5 hover:bg-[#5142de]";
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
  primaryLabel = "Get a website review",
  primaryHref = "/website-audit",
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
    [Users, "Studio Review", "A real person reviews the message, layout, responsive behaviour and conversion path before launch."],
    [Rocket, "Launch & Support", "Technical launch, hosting, SSL, maintenance and the plan-based support needed after the site goes live."],
  ] as const;

  return (
    <>
      <section className="bs3-dark border-b border-white/10">
        <div className="brand-shell brand-section grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <p className="brand-kicker !text-[#9f93ff]">Bennie Studio · Website Services</p>
            <h1 className="mt-5 max-w-[12ch] !text-white">Strategic websites designed to win trust and enquiries.</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/64">We plan, design, build and manage websites for service businesses. The work starts with the buyer, the offer and the proof — not a generic template.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/website-audit" className={primary}>Get a website review<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/case-studies" className={secondary}>View our work</Link></div>
          </div>
          <div className="lg:col-span-6"><WebsiteConceptVisual title="Service business website" eyebrow="Strategy · design · build" index={0} className="rounded-[1.15rem] border border-white/10 shadow-2xl" /></div>
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
            <p className="brand-kicker">What we do</p>
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
      <section className="border-b border-[#e6e8ef] bg-white">
        <div className="brand-shell brand-section grid gap-12 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7"><p className="brand-kicker">About Bennie Studio</p><h1 className="mt-5 max-w-[13ch]">A web studio built around judgement, not volume.</h1><p className="brand-copy mt-6 max-w-2xl">We design, build and manage websites for service businesses. Modern tools remove repetitive work; Bennie Studio remains responsible for the strategy, design decisions, review and launch quality.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/website-audit" className={primary}>Get a website review<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d7dbe5] bg-white px-6 py-3 text-sm font-semibold text-[#172033] hover:border-[#aaa0ff]">See how it works</Link></div></div>
          <aside className="lg:col-span-5 lg:border-l lg:border-[#e2e5ec] lg:pl-10"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6252f4]">What we take responsibility for</p><div className="mt-5 divide-y divide-[#e6e8ef]">{["Positioning and page hierarchy","Design and responsive behaviour","Content and proof placement","Pre-launch QA and customer approval","Ongoing managed improvements"].map((item)=><p key={item} className="flex items-center gap-3 py-4 text-sm font-semibold text-[#344054]"><Check className="h-4 w-4 text-[#6252f4]" />{item}</p>)}</div></aside>
        </div>
      </section>
      <section className="brand-shell brand-section">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="brand-kicker">Our mission</p>
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
            <p className="brand-kicker !text-[#9f93ff]">Our difference</p>
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
      <section className="border-b border-[#e6e8ef] bg-white">
        <div className="brand-shell brand-section grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8"><p className="brand-kicker">Resources & insights</p><h1 className="mt-5 max-w-[17ch]">Practical website thinking for service businesses.</h1><p className="brand-copy mt-6 max-w-2xl">Guides, examples and checklists about positioning, trust, page structure, conversion paths and maintaining a useful website after launch.</p></div>
          <div className="flex flex-col gap-3 lg:col-span-4 lg:items-start"><Link to="/website-audit" className={primary}>Get a website review<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/case-studies" className="text-sm font-semibold text-[#526071] hover:text-[#6252f4]">View the work →</Link></div>
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
          <div className="lg:col-span-5"><p className="brand-kicker">Free resource</p><h2 className="mt-4">The Website Launch Checklist.</h2><p className="brand-copy mt-5">Use the launch process as a checklist for content, responsive behaviour, search basics, forms and final QA.</p><Link to="/resources/website-launch-checklist" className={`${primary} mt-7`}>View the checklist<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
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
        <div className="lg:col-span-5"><p className="brand-kicker">Book a call</p><h2 className="mt-4">Speak with Bennie directly.</h2><p className="brand-copy mt-5">A focused call to discuss the business, current site and what a better direction could look like. Bring questions; leave with clarity.</p><div className="mt-6 space-y-3">{["Discuss goals and constraints","Review useful examples","Clarify scope and next steps","No pressure, no hard sell"].map(x=><p key={x} className="flex gap-3 text-sm font-semibold text-[#526071]"><Check className="h-4 w-4 text-[#6252f4]" />{x}</p>)}</div><Link to="/book-demo" className={`${primary} mt-7`}>Book a free 30-min call<ArrowRight className="ml-2 h-4 w-4" /></Link></div>
        <div className="lg:col-span-7"><div className="bs3-calendar"><div className="bs3-calendar-side"><p className="text-sm font-semibold text-white/60">Bennie Studio</p><h3 className="mt-3 !text-white">30-min discovery call</h3><p className="mt-5 text-sm leading-6 text-white/58">A focused conversation about your project, goals and website direction.</p><Link to="/book-demo" className={`${primary} mt-6 w-full`}>Open live calendar<ArrowRight className="ml-2 h-4 w-4" /></Link></div><div className="bs3-calendar-grid"><p className="font-semibold text-[#172033]">Example booking view</p><p className="mt-1 text-xs leading-5 text-[#657186]">Dates and times below are illustrative. Open the live calendar to see current availability.</p><div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs text-[#657186]" aria-hidden="true">{Array.from({length:28},(_,i)=><span key={i} className={i===14?"bs3-day bs3-day-active":"bs3-day"}>{i+1}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-2" aria-hidden="true">{["9:00 AM","10:30 AM","1:00 PM","4:00 PM"].map(x=><span key={x} className="bs3-time">{x}</span>)}</div></div></div></div>
      </section>

      <section className="bs3-soft border-y border-[#e6e8ef]"><div className="brand-shell brand-section"><SectionHeader kicker="Prefer to write?" title="Send a project brief." copy="Share your goals and useful context. The preview flow gives the conversation a concrete starting point."/><div className="mt-10 grid gap-4 md:grid-cols-3">{[[Target,"Your goals","Tell us what you want the website to achieve."],[Users,"Your business","A little about the company and target audience."],[Globe2,"Inspiration","Share any useful references or existing website links."]].map(([Icon,t,c]:any)=><IconCard key={t} icon={Icon} title={t} copy={c}/>)}</div></div></section>

      <section className="brand-shell brand-section"><SectionHeader kicker="How it works" title="From conversation to a better website." copy="A simple, transparent process designed to move from idea to useful next step without unnecessary complexity."/><div className="mt-10 grid gap-4 md:grid-cols-4">{[["01","Reach out","Book a call or send a project brief."],["02","Discuss & plan","We learn about the business and goals."],["03","Design & build","The website is designed around the brief."],["04","Launch & grow","Go live with managed support available."]].map(([n,t,c])=><article key={n} className="bs3-card p-5"><span className="text-xs font-bold text-[#6252f4]">{n}</span><h3 className="mt-4">{t}</h3><p className="mt-2 text-sm text-[#657186]">{c}</p></article>)}</div></section>
    </>
  );
}

export function PricingStudioPage() {
  return (
    <>
      <section className="border-b border-[#e6e8ef] bg-white"><div className="brand-shell py-14 sm:py-20"><div className="max-w-3xl"><p className="brand-kicker">Simple pricing · clear scope</p><h1 className="mt-5 max-w-[14ch]">Choose the level of website support your business needs.</h1><p className="brand-copy mt-6">Setup fees, monthly service and commitments are shown before checkout. Start with a website review if you want a clearer recommendation before choosing a plan.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/website-audit" className={primary}>Get a website review<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/contact" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#d7dbe5] bg-white px-6 py-3 text-sm font-semibold text-[#172033]">Talk to Bennie Studio</Link></div></div></div></section>
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
      <section className="bs3-dark border-b border-white/10"><div className="brand-shell brand-section grid gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-6"><p className="brand-kicker !text-[#9f93ff]">How Bennie Studio works</p><h1 className="mt-5 max-w-[11ch] !text-white">From business context to a reviewed launch.</h1><p className="mt-6 max-w-xl text-base leading-8 text-white/64">A clear studio process keeps strategy, design, feedback and launch responsibilities visible from the start.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/website-audit" className={primary}>Start with a website review<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/case-studies" className={secondary}>Explore the work</Link></div></div><div className="grid gap-px overflow-hidden rounded-xl border border-white/12 bg-white/12 sm:grid-cols-3 lg:col-span-6">{[["01","Understand","Business, audience, offer and proof."],["02","Recommend","Structure, message and visual direction."],["03","Refine & launch","Human review, customer approval and QA."]].map(([n,t,x])=><div key={n} className="bg-[#0d1426] p-5"><p className="text-xs font-bold text-[#9f93ff]">{n}</p><h3 className="mt-3 !text-white">{t}</h3><p className="mt-2 text-sm leading-6 text-white/55">{x}</p></div>)}</div></div></section>
      <section className="bg-white border-y border-[#e6e8ef]"><div className="brand-shell grid gap-5 py-8 sm:grid-cols-5">{stages.map(([n,Icon,t])=><div key={n} className="flex items-center gap-3"><span className="bs3-icon"><Icon className="h-4 w-4"/></span><div><p className="text-[11px] font-bold text-[#6252f4]">{n}</p><p className="text-sm font-semibold text-[#172033]">{t}</p></div></div>)}</div></section>
      <section className="bs3-soft border-b border-[#e6e8ef]"><div className="brand-shell brand-section grid gap-12 lg:grid-cols-12 lg:items-center"><div className="lg:col-span-5"><p className="brand-kicker">Simple. transparent. strategic.</p><h2 className="mt-4">A process built around you.</h2><p className="brand-copy mt-5">Strategy, design and delivery are combined in a clear step-by-step process so you know what is happening, what is needed and what to expect.</p><div className="mt-6 space-y-3">{["Clear timelines and deliverables","Regular human review and feedback","Built for real business outcomes"].map(x=><p key={x} className="flex gap-3 text-sm font-semibold text-[#526071]"><Check className="h-4 w-4 text-[#6252f4]"/>{x}</p>)}</div></div><div className="lg:col-span-7"><div className="rounded-[1.2rem] border border-[#dfe3eb] bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6252f4]">What stays visible</p><div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-[#e3e6ed] bg-[#e3e6ed] sm:grid-cols-2">{["What we need from you","What Bennie Studio is doing","What is ready for review","What happens before launch"].map((item)=><div key={item} className="bg-[#fbfcff] p-5"><Check className="h-4 w-4 text-[#6252f4]" /><p className="mt-3 text-sm font-semibold text-[#344054]">{item}</p></div>)}</div></div></div></div></section>
      <section className="brand-shell brand-section"><SectionHeader kicker="The process" title="Five steps. A better website." copy="Each stage is designed to be simple, collaborative and focused on results."/><div className="mt-10 space-y-4">{stages.map(([n,Icon,t,sub,time,deliverable])=><article key={n} className="bs3-card grid gap-5 p-6 lg:grid-cols-[70px_1.2fr_.75fr_.9fr] lg:items-center"><div className="flex items-center gap-3 lg:block"><span className="bs3-step">{n}</span></div><div><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[#6252f4]"/><h3>{t}</h3></div><p className="mt-2 text-sm text-[#8a7dff]">{sub}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#657186]">Timeframe</p><p className="mt-2 text-sm font-semibold text-[#172033]">{time}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#657186]">Key deliverables</p><p className="mt-2 text-sm text-[#526071]">{deliverable}</p></div></article>)}</div></section>
      <section className="bs3-dark"><div className="brand-shell brand-section"><SectionHeader dark kicker="Human review at every stage" title="Real people. Real feedback. Better results." copy="The workflow supports the work; professional judgement remains part of every review stage."/><div className="mt-10 grid gap-4 md:grid-cols-3">{[[Compass,"Strategy review","Goals, positioning, site structure and timeline."],[WandSparkles,"Design review","Homepage direction, key layouts and responsive behaviour."],[ShieldCheck,"Pre-launch review","Functionality, search basics and final sign-off."]].map(([Icon,t,c]:any)=><IconCard key={t} icon={Icon} title={t} copy={c} dark />)}</div></div></section>
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
    { category: "Professional services", title: "Professional advisory website", sample: "consultant", visualIndex: 0, challenge: "Expertise can feel interchangeable when services and proof are buried.", direction: "Lead with the specialist offer, move evidence earlier and make consultation the obvious next step." },
    { category: "Healthcare", title: "Clinic website", sample: "dental", visualIndex: 1, challenge: "Patients need treatment clarity and practitioner reassurance before they are ready to book.", direction: "Explain treatments in plain language, establish trust early and keep appointment actions easy to find." },
    { category: "Local service", title: "Renovation contractor", sample: "contractor", visualIndex: 3, challenge: "Generic contact forms produce weak enquiries without project context or proof.", direction: "Show project capability, service areas and process before asking for the details needed for a useful quote." },
    { category: "Education", title: "Education provider", sample: "education", visualIndex: 4, challenge: "Parents need programmes, teachers, schedules and outcomes to be easy to compare.", direction: "Clarify programmes, establish teacher trust and make the trial-class journey obvious." },
    { category: "Lifestyle", title: "Beauty & wellness", sample: "beauty", visualIndex: 2, challenge: "Mobile visitors need to compare treatments, visual quality and booking options quickly.", direction: "Group services clearly, bring proof closer to the offer and connect each decision point to booking." },
  ] as const;

  return (
    <>
      <section className="border-b border-[#e6e8ef] bg-white"><div className="brand-shell py-14 sm:py-20"><p className="brand-kicker">Selected work</p><div className="mt-5 grid gap-8 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-8"><h1 className="max-w-[15ch]">Website decisions for different businesses.</h1><p className="brand-copy mt-6 max-w-2xl">These are concept redesigns, not invented client results. Each example shows the business problem, the design direction and the customer journey Bennie Studio would recommend.</p></div><div className="flex flex-col gap-3 lg:col-span-4 lg:items-start"><Link to="/website-audit" className={primary}>See what we’d improve<ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/how-it-works" className="text-sm font-semibold text-[#526071] hover:text-[#6252f4]">Explore the process →</Link></div></div></div></section>
      <section className="bg-white border-y border-[#e6e8ef]"><div className="brand-shell flex flex-wrap items-center justify-between gap-5 py-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a7dff]">Designed across service categories</p><div className="flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[#778193]"><span>Professional</span><span>Healthcare</span><span>Local service</span><span>Education</span><span>Lifestyle</span></div></div></section>
      <section className="brand-shell brand-section"><SectionHeader kicker="Concept redesigns" title="The website is the proof." copy="Instead of decorative industry imagery, each example shows a website direction and the reasoning behind it."/><div className="mt-10 grid gap-6 md:grid-cols-2">{work.map((item)=><article key={item.title} className="overflow-hidden rounded-[1.1rem] border border-[#dfe3eb] bg-white"><WebsiteConceptVisual title={item.title} eyebrow={`${item.category} · concept redesign`} index={item.visualIndex} className="aspect-[16/10] border-b border-[#e5e8ef]" /><div className="p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6252f4]">{item.category}</p><span className="rounded-full bg-[#f0efff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6252f4]">Concept redesign</span></div><h3 className="mt-3">{item.title}</h3><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a93a2]">Business challenge</p><p className="mt-2 text-sm leading-6 text-[#526071]">{item.challenge}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6252f4]">Design direction</p><p className="mt-2 text-sm leading-6 text-[#526071]">{item.direction}</p></div></div><Link to={`/portfolio/sample/${item.sample}`} className="mt-6 inline-flex items-center text-sm font-semibold text-[#172033]">View the design decisions<ArrowRight className="ml-2 h-4 w-4"/></Link></div></article>)}</div></section>
      <section className="bs3-soft border-y border-[#e6e8ef]"><div className="brand-shell brand-section"><SectionHeader kicker="Before & after thinking" title="A clear difference without losing the business." copy="A redesign should keep useful identity and evidence while improving hierarchy, readability and conversion clarity."/><div className="mt-10 grid gap-5 lg:grid-cols-2"><div className="bs3-compare"><span className="bs3-compare-label">Before</span><div className="h-full bg-[#f5f5f3] p-8"><p className="text-xs text-[#8992a1]">Existing website</p><h3 className="mt-7 max-w-[13ch] !text-[#343a46]">Useful business information, but harder to scan.</h3><div className="mt-8 h-36 bg-white/80"/></div></div><div className="bs3-compare bs3-compare-after"><span className="bs3-compare-label !bg-[#6252f4]">After</span><WebsiteConceptVisual title="Professional advisory website" eyebrow="Recommended direction" index={0} className="h-full min-h-[22rem]" /></div></div></div></section>
      <section className="bs3-dark"><div className="brand-shell brand-section"><SectionHeader dark kicker="Our process" title="From strategy to a website people can use." copy="The work moves from understanding the business to design, build and a reviewed launch."/><div className="mt-10 grid gap-4 md:grid-cols-4">{[["01",Search,"Strategy","Understand goals, audience and positioning."],["02",Layout,"Design","Create the visual direction and page system."],["03",Code2,"Build","Develop a responsive implementation."],["04",BarChart3,"Grow","Launch, measure and improve over time."]].map(([n,Icon,t,c]:any)=><article key={n} className="bs3-card-dark p-5"><span className="text-xs font-bold text-[#9f93ff]">{n}</span><Icon className="mt-5 h-5 w-5 text-[#9f93ff]"/><h3 className="mt-4 !text-white">{t}</h3><p className="mt-2 text-sm text-white/55">{c}</p></article>)}</div></div></section>
    </>
  );
}
