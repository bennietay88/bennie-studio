import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleHelp } from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";

type ComparisonGuide = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  options: [string, string];
  rows: Array<{ topic: string; first: string; second: string }>;
  goodFit: [string[], string[]];
  questions: string[];
};

export const COMPARISON_GUIDES: Record<string, ComparisonGuide> = {
  diy: {
    path: "/managed-website-vs-diy",
    title: "Managed Website vs DIY Website Builder | Bennie Studio",
    description: "Compare a self-managed website builder with Bennie Studio’s managed website plans, including ownership, updates, hosting and pricing questions.",
    eyebrow: "Buyer guide · website ownership",
    heading: "Managed website vs a DIY website builder",
    intro: "Both approaches can work. The right choice depends on whether you want to manage the setup and ongoing work yourself, or prefer a managed service with a defined scope and support allowance.",
    options: ["DIY website builder", "Bennie Studio managed website"],
    rows: [
      { topic: "Setup", first: "You choose the builder, structure the pages, add content and connect the tools you need.", second: "Bennie Studio prepares a website from an approved template and your onboarding details; you review it before launch." },
      { topic: "Hosting and SSL", first: "Check which hosting, SSL and platform costs are included in your chosen builder and plan.", second: "Managed Website plans include hosting and SSL while the subscription is active." },
      { topic: "Enquiry path", first: "You select and configure forms, calls, booking links or messaging tools.", second: "The agreed site can include contact forms and suitable enquiry paths such as WhatsApp, calls or booking links." },
      { topic: "Ongoing updates", first: "You make changes yourself or arrange separate help.", second: "You can request supported changes within the monthly allowance for your selected plan." },
      { topic: "Price comparison", first: "Include the platform, paid add-ons, domain, outside help and your own time in your estimate.", second: "Compare the current setup fee, monthly price, initial term and included scope in the published catalogue." },
    ],
    goodFit: [
      ["You want direct control over page editing and platform choices.", "You are comfortable maintaining the site and configuring its enquiry tools.", "You prefer to compare builder subscriptions and add-ons yourself."],
      ["You want help preparing and maintaining the website.", "You want an agreed service scope, hosting and SSL in one plan.", "You prefer to request supported updates instead of managing every change."],
    ],
    questions: [
      "Who will prepare the website copy, images and service information?",
      "What are the full setup and recurring costs, including optional tools?",
      "Who handles hosting, security updates, backups and technical issues?",
      "How many changes are included, and what happens when you need more?",
    ],
  },
  agency: {
    path: "/managed-website-vs-agency",
    title: "Managed Website vs Web Design Agency | Bennie Studio",
    description: "Compare a managed website subscription with a custom agency project. Review scope, ownership, ongoing support and questions to ask before choosing.",
    eyebrow: "Buyer guide · service model",
    heading: "Managed website vs a web design agency",
    intro: "Agency projects differ in process, scope and ongoing support. Compare the actual proposal and contract with a managed plan’s published scope instead of assuming one model is always cheaper or more suitable.",
    options: ["Custom agency project", "Bennie Studio managed website"],
    rows: [
      { topic: "Project scope", first: "The agency defines deliverables, process and price in its proposal. Confirm page count, integrations, revisions and exclusions.", second: "Bennie Studio offers published plan scopes with setup, recurring service and stated page and update limits." },
      { topic: "Design and build", first: "Ask whether the proposal includes custom design, research, content, development and testing, and how each is approved.", second: "Websites use approved templates and managed structures, with business details collected during onboarding and a customer review before launch." },
      { topic: "After launch", first: "Confirm whether hosting, SSL, maintenance, support and future changes are included or billed separately.", second: "Hosting, SSL and plan-based support are included while the managed subscription is active." },
      { topic: "Ownership and handover", first: "Confirm who owns the domain, code, content, accounts and deliverables, and what handover costs apply.", second: "Review the service terms for account access, website use, domain responsibilities and end-of-service handover before checkout." },
      { topic: "Price comparison", first: "Compare the written project quote, payment milestones, recurring support and future change fees.", second: "Compare the current catalogue’s setup fee, monthly price, initial term and included scope." },
    ],
    goodFit: [
      ["You need custom functionality or a bespoke design process.", "You have a defined project brief and want providers to quote that scope.", "You can evaluate the proposal, ownership terms and post-launch support separately."],
      ["A structured, template-based website fits your needs.", "You want hosting, SSL and ongoing supported updates in the same service.", "You prefer a published plan scope and monthly service model."],
    ],
    questions: [
      "Which deliverables, revisions and integrations are explicitly included?",
      "What will hosting, maintenance, support and changes cost after launch?",
      "Who owns the domain, website files, content and service accounts?",
      "What happens to the website and its data when the agreement ends?",
    ],
  },
};

export default function ComparisonGuidePage({ kind }: { kind: keyof typeof COMPARISON_GUIDES }) {
  const guide = COMPARISON_GUIDES[kind];
  return (
    <div className="brand-public min-h-screen bg-[#f6f7fb] text-[#141821]">
      <Helmet>
        <title>{guide.title}</title>
        <meta name="description" content={guide.description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`https://app.bennietay.com${guide.path}`} />
      </Helmet>
      <PublicSiteHeader />
      <main>
        <section className="border-b border-slate-200 bg-white px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">{guide.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">{guide.heading}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{guide.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white hover:bg-indigo-800">Compare current plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
              <Link to="/generate-preview" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50">Get a free website direction</Link>
            </div>
          </div>
        </section>
        <section className="px-5 py-12 sm:py-16">
          <div role="table" aria-label={`${guide.options[0]} compared with ${guide.options[1]}`} className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div role="row" className="grid grid-cols-[minmax(8rem,.7fr)_1fr_1fr] border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 sm:grid-cols-[minmax(10rem,.75fr)_1fr_1fr]">
              <div role="columnheader" className="p-4 sm:p-6">Compare</div><div role="columnheader" className="p-4 sm:p-6">{guide.options[0]}</div><div role="columnheader" className="p-4 sm:p-6">{guide.options[1]}</div>
            </div>
            {guide.rows.map((row) => <div role="row" key={row.topic} className="grid grid-cols-[minmax(8rem,.7fr)_1fr_1fr] border-b border-slate-100 last:border-0 sm:grid-cols-[minmax(10rem,.75fr)_1fr_1fr]"><div role="rowheader" className="p-4 text-sm font-bold text-slate-900 sm:p-6">{row.topic}</div><div role="cell" className="p-4 text-sm leading-6 text-slate-600 sm:p-6">{row.first}</div><div role="cell" className="p-4 text-sm leading-6 text-slate-600 sm:p-6">{row.second}</div></div>)}
          </div>
          <p className="mx-auto mt-3 max-w-6xl text-xs leading-5 text-slate-500">This guide describes Bennie Studio’s published service model. Other providers’ offers vary; verify all details in their current written proposal and terms. Prices and plan availability can change, so use the current catalogue before deciding.</p>
        </section>
        <section className="bg-white px-5 py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            {guide.options.map((option, index) => <article key={option} className="rounded-2xl border border-slate-200 p-6 sm:p-8"><h2 className="text-2xl font-bold text-slate-950">A good fit when</h2><p className="mt-2 text-sm font-semibold text-indigo-700">{option}</p><ul className="mt-6 space-y-4">{guide.goodFit[index].map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}</ul></article>)}
          </div>
        </section>
        <section className="px-5 py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[.75fr_1.25fr]">
            <div><CircleHelp className="h-8 w-8 text-indigo-700" /><h2 className="mt-4 text-3xl font-bold text-slate-950">Questions to ask before you choose</h2><p className="mt-3 text-sm leading-6 text-slate-600">Compare written scope and ongoing responsibilities. The answers matter more than the service label.</p></div>
            <ol className="space-y-3">{guide.questions.map((question, index) => <li key={question} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"><span className="font-bold text-indigo-700">{String(index + 1).padStart(2, "0")}</span><span className="text-sm font-semibold leading-6 text-slate-700">{question}</span></li>)}</ol>
          </div>
          <div className="mx-auto mt-12 max-w-6xl border-t border-slate-300 pt-6 text-sm font-semibold text-slate-600">Related: <Link className="text-indigo-700 underline" to={kind === "diy" ? "/managed-website-vs-agency" : "/managed-website-vs-diy"}>{kind === "diy" ? "managed website vs agency" : "managed website vs DIY"}</Link> · <Link className="text-indigo-700 underline" to="/pricing">current plan scope and pricing</Link>.</div>
        </section>
      </main>
      <PublicSiteFooter tagline="A managed website system for service businesses that need stronger trust, clearer enquiries and ongoing improvement." />
    </div>
  );
}
