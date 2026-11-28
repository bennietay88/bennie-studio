import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleHelp } from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";

import { COMPARISON_GUIDES } from "../content/comparisonGuides";

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
