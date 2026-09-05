import React from "react";
import { Link } from "react-router-dom";
import { getStoredMarket, COMMERCIAL_MARKET_CHANGED_EVENT } from "../lib/commercialPricing";
import { trackPublicEvent } from "../lib/publicTracking";

const industries = [
  { id: "cleaning", name: "Cleaning companies", outcome: "Make quote requests easier to assess", detail: "Explain your services and coverage, show genuine reviews, and ask about property type, cleaning frequency and preferred dates." },
  { id: "education", name: "Tuition and education centres", outcome: "Help parents choose a class", detail: "Explain subjects, age groups, schedules and teacher experience, then guide parents to a trial-class enquiry." },
  { id: "accounting", name: "Accounting and bookkeeping firms", outcome: "Start better-fit client conversations", detail: "Clarify the businesses you serve, your service scope and credentials, then invite an initial consultation." },
];

export function FocusIndustries() {
  const [market, setMarket] = React.useState(getStoredMarket);
  React.useEffect(() => {
    const update = () => setMarket(getStoredMarket());
    window.addEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, update);
    return () => window.removeEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, update);
  }, []);
  return <section className="mx-auto max-w-7xl px-5 py-14" aria-labelledby="focus-industries-title">
    <p className="text-sm font-bold text-indigo-600">Malaysia · Singapore · United Kingdom</p>
    <h2 id="focus-industries-title" className="mt-3 text-3xl font-black text-slate-950">A website shaped around your next enquiry</h2>
    <p className="mt-4 max-w-3xl leading-7 text-slate-600">Choose your business type to see a relevant website direction. Bennie handles the build and ongoing management; you keep the conversation with your customers.</p>
    <div className="mt-7 grid gap-5 md:grid-cols-3">{industries.map((industry) => {
      const href = `/generate-preview?industry=${industry.id}&market=${market}&source=industry-card`;
      return <article key={industry.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-950">{industry.name}</h3>
        <p className="mt-3 font-semibold text-indigo-700">{industry.outcome}</p>
        <p className="mt-3 flex-1 leading-7 text-slate-600">{industry.detail}</p>
        <Link className="mt-6 inline-flex min-h-12 items-center font-bold text-indigo-700 underline underline-offset-4" to={href} onClick={() => trackPublicEvent({eventType: "select_industry", label: industry.name, target: href, metadata: {industryId: industry.id, market}})}>See my website direction →</Link>
      </article>;
    })}</div>
    <p className="mt-5 text-sm leading-6 text-slate-600">A clearer website supports the traffic you attract through referrals, search, social or advertising. Traffic acquisition and advertising spend require a separate plan; enquiry and sales volumes are not guaranteed.</p>
    <Link to={`/book-demo?market=${market}`} className="mt-4 inline-flex min-h-11 items-center font-bold text-indigo-700 underline underline-offset-4">Prefer to talk first? Discuss your website with Bennie →</Link>
  </section>;
}
