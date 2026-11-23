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
    <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#141821]">
      <Helmet>
        <title>{guide.title}</title>
        <meta name="description" content={guide.description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`https://app.bennietay.com${guide.path}`} />
      </Helmet>
      <PublicSiteHeader />
      <main id="main-content">
        <section className="border-b border-[#dbe1ea] bg-[#f8f8f5] py-14 sm:py-20">
          <div className="brand-shell max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">{guide.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-[#15191f] sm:text-6xl">{guide.heading}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#526071]">{guide.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1741ed] px-5 py-3 text-center text-sm font-bold text-white hover:bg-[#1035c2]">Compare current plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
              <Link to="/generate-preview" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#dbe1ea] bg-white px-5 py-3 text-center text-sm font-bold text-[#1741c9] hover:bg-[#eef3ff]">Get a free website direction</Link>
            </div>
          </div>
        </section>
        <section className="brand-shell py-14 sm:py-20" aria-labelledby="comparison-heading">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">Side-by-side · Scope and responsibilities</p>
            <h2 id="comparison-heading" className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#15191f] sm:text-4xl">What changes between the two approaches?</h2>
          </div>
          <div className="space-y-4 md:hidden">
            {guide.rows.map((row, index) => (
              <article key={row.topic} className="min-w-0 rounded-xl border border-[#dbe1ea] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">0{index + 1} · {row.topic}</p>
                <h3 className="mt-4 text-sm font-bold text-[#15191f]">{guide.options[0]}</h3>
                <p className="mt-2 text-sm leading-6 text-[#526071]">{row.first}</p>
                <div className="mt-5 border-t border-[#dbe1ea] pt-5">
                  <h3 className="text-sm font-bold text-[#15191f]">{guide.options[1]}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#526071]">{row.second}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-xl border border-[#dbe1ea] bg-white md:block">
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">{guide.options[0]} compared with {guide.options[1]}</caption>
              <thead className="bg-[#edf2fa] text-sm text-[#15191f]">
                <tr><th scope="col" className="w-1/5 p-5 font-bold">Compare</th><th scope="col" className="w-2/5 p-5 font-bold">{guide.options[0]}</th><th scope="col" className="w-2/5 p-5 font-bold">{guide.options[1]}</th></tr>
              </thead>
              <tbody>
                {guide.rows.map((row) => (
                  <tr key={row.topic} className="border-t border-[#dbe1ea] align-top">
                    <th scope="row" className="p-5 text-sm font-bold leading-6 text-[#15191f]">{row.topic}</th>
                    <td className="p-5 text-sm leading-6 text-[#526071]">{row.first}</td>
                    <td className="p-5 text-sm leading-6 text-[#526071]">{row.second}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 max-w-5xl text-xs leading-6 text-[#526071]">Other providers’ offers vary. Verify scope and terms in their written proposal. Current Bennie Studio prices and availability are shown in the live catalogue.</p>
        </section>
        <section className="border-y border-[#dbe1ea] bg-white py-14 sm:py-20">
          <div className="brand-shell grid max-w-6xl gap-6 lg:grid-cols-2">
            {guide.options.map((option, index) => <article key={option} className="rounded-xl border border-[#dbe1ea] p-6 sm:p-8"><h2 className="text-2xl font-bold text-slate-950">A good fit when</h2><p className="mt-2 text-sm font-semibold text-indigo-700">{option}</p><ul className="mt-6 space-y-4">{guide.goodFit[index].map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}</ul></article>)}
          </div>
        </section>
        <section className="brand-shell py-14 sm:py-20">
          <div className="grid max-w-6xl gap-8 md:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
            <div><CircleHelp className="h-8 w-8 text-indigo-700" /><h2 className="mt-4 text-3xl font-bold text-slate-950">Questions to ask before you choose</h2><p className="mt-3 text-sm leading-6 text-slate-600">Compare written scope and ongoing responsibilities. The answers matter more than the service label.</p></div>
            <ol className="space-y-3">{guide.questions.map((question, index) => <li key={question} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"><span className="font-bold text-indigo-700">{String(index + 1).padStart(2, "0")}</span><span className="text-sm font-semibold leading-6 text-slate-700">{question}</span></li>)}</ol>
          </div>
          <div className="mt-12 max-w-6xl border-t border-[#dbe1ea] pt-6 text-sm font-semibold text-[#526071]">Related: <Link className="text-indigo-700 underline" to={kind === "diy" ? "/managed-website-vs-agency" : "/managed-website-vs-diy"}>{kind === "diy" ? "managed website vs agency" : "managed website vs DIY"}</Link> · <Link className="text-indigo-700 underline" to="/pricing">current plan scope and pricing</Link>.</div>
        </section>
      </main>
      <PublicSiteFooter tagline="A managed website system for service businesses that need stronger trust, clearer enquiries and ongoing improvement." />
    </div>
  );
}
