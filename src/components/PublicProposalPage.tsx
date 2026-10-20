import React from "react";
import { ArrowRight, Check, CheckCircle2, FileText, Loader2, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function PublicProposalPage() {
  const { token } = useParams();
  const [proposal, setProposal] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/public/proposals/${encodeURIComponent(token || "")}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Proposal not found");
        if (!cancelled) {
          setProposal(payload.proposal);
          setAccepted(payload.proposal?.status === "Accepted");
        }
      } catch (loadError: any) {
        if (!cancelled) setError(loadError.message || "Proposal could not be loaded");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [token]);

  const accept = async (event: React.FormEvent) => {
    event.preventDefault();
    setAccepting(true);
    setError("");
    try {
      const response = await fetch(`/api/public/proposals/${encodeURIComponent(token || "")}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, termsAccepted: true }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Proposal could not be accepted");
      setAccepted(true);
      if (payload.checkoutUrl) window.location.assign(payload.checkoutUrl);
    } catch (acceptError: any) {
      setError(acceptError.message || "Proposal could not be accepted");
    } finally {
      setAccepting(false);
    }
  };

  const businessName = proposal?.leads?.raw_fields?.businessName || proposal?.businesses?.name || proposal?.leads?.name || "your business";
  const market = proposal?.config?.market || "US";
  // The accepted proposal's agreed currency is authoritative; new proposals are USD.
  const currency = String(proposal?.config?.currency || (market === "MY" ? "MYR" : market === "SG" ? "SGD" : market === "GB" ? "GBP" : "USD")).toUpperCase();
  const locale = currency === "MYR" ? "en-MY" : currency === "SGD" ? "en-SG" : currency === "GBP" ? "en-GB" : "en-US";
  const commitmentMonths = Number(proposal?.config?.commitmentMonths || 3);
  const termsMarket = market === "US" ? "INTL" : market;
  const money = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));

  return <div className="min-h-screen bg-slate-50 text-slate-950"><PublicSiteHeader /><main className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
    {loading ? <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div> : !proposal ? <div className="rounded-3xl bg-white p-10 text-center shadow-sm"><FileText className="mx-auto h-10 w-10 text-slate-300" /><h1 className="mt-4 text-3xl font-black">Proposal unavailable</h1><p className="mt-3 font-semibold text-rose-600">{error}</p></div> : <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Prepared for {businessName}</p><h1 className="mt-4 text-4xl font-black tracking-tight">{proposal.title}</h1><p className="mt-4 text-base font-semibold leading-7 text-slate-600">{proposal.outcome}</p>
        <div className="mt-8 border-t border-slate-100 pt-7"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Proposed scope</p><div className="mt-4 space-y-3">{(Array.isArray(proposal.scope) ? proposal.scope : []).map((item: string) => <p key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</p>)}</div></div>
        <div className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm font-bold leading-6 text-slate-700"><ShieldCheck className="mb-3 h-5 w-5 text-indigo-600" />This proposal describes the managed work and commercial terms. It does not promise rankings, traffic, revenue, or a specific number of enquiries.</div>
      </section>
      <aside className="h-fit rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">{proposal.package_name}</p><div className="mt-6"><p className="text-4xl font-black tracking-tight">{money(proposal.value)}<span className="text-base text-slate-400">/month</span></p><p className="mt-2 text-sm font-semibold text-slate-300">{money(proposal.setup_fee)} one-time setup</p></div><div className="mt-6 space-y-2 border-y border-white/10 py-5 text-sm font-semibold text-slate-300"><p>Initial commitment: {commitmentMonths} month{commitmentMonths === 1 ? "" : "s"}</p><p>Valid until: {proposal.expires_at || "Confirm with Bennie Studio"}</p><p>Status: {proposal.status}</p></div>
        {accepted ? <div className="mt-6 rounded-2xl bg-emerald-400/10 p-5 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" /><h2 className="mt-3 text-xl font-black">Proposal accepted</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-300">Your agreed scope and commercial terms are recorded. Continue through the secure checkout when available, then onboarding begins.</p></div> : <form onSubmit={accept} className="mt-6 space-y-4"><div><Label htmlFor="proposal-email" className="text-slate-300">Confirm your email</Label><Input id="proposal-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email used for this proposal" className="mt-2 h-12 rounded-xl bg-white text-slate-950" /></div><label className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.04] p-4 text-xs font-semibold leading-5 text-slate-300"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>I confirm the scope, {commitmentMonths}-month initial commitment and recurring service shown above, and I agree to the <Link to={`/terms?market=${termsMarket}`} target="_blank" className="text-indigo-300 underline underline-offset-2">Terms of Service</Link>.</span></label>{error && <p className="rounded-xl bg-rose-400/10 p-3 text-sm font-bold text-rose-200">{error}</p>}<Button type="submit" disabled={accepting || !termsAccepted} className="min-h-12 w-full rounded-2xl bg-indigo-500 px-6 text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">{accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Accept proposal <ArrowRight className="ml-2 h-4 w-4" /></>}</Button><p className="text-center text-xs font-semibold leading-5 text-slate-400">Acceptance records the agreed scope and commercial terms before payment.</p></form>}
      </aside>
    </div>}
  </main><PublicSiteFooter /></div>;
}
