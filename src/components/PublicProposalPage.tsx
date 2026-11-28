import React from "react";
import { Helmet } from "react-helmet-async";
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
          setAccepted(Boolean(payload.proposal?.config?.paymentRecorded));
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
      if(payload.paid){setAccepted(true);return;}
      if(payload.checkoutUrl){const url=new URL(payload.checkoutUrl);if(url.protocol==="https:"&&["checkout.stripe.com","buy.stripe.com"].includes(url.hostname)){window.location.assign(url.href);return;}}
      setError("Your acceptance is recorded. Please return to this proposal once Bennie Studio has prepared secure checkout.");
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
  const commitmentMonths = Number(proposal?.config?.commitmentMonths ?? 0);
  const termsMarket = market === "US" ? "INTL" : market;
  const money = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));

  return <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#15191f]"><Helmet><title>Website Proposal | Bennie Studio</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet><PublicSiteHeader /><main id="main-content" className="brand-shell max-w-5xl py-14 sm:py-20">
    {loading ? <div role="status" aria-label="Loading proposal" className="flex min-h-[50vh] items-center justify-center"><Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-[#1741ed]" /></div> : !proposal ? <div className="rounded-2xl border border-[#dbe1ea] bg-white p-7 text-center sm:p-10"><FileText className="mx-auto h-9 w-9 text-[#1741ed]" /><h1 className="mt-4 text-3xl font-bold">Proposal unavailable</h1><p role="alert" className="mt-3 text-sm leading-6 text-[#526071]">{error}</p><Link to="/contact" className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-[#1741ed] px-6 text-sm font-bold text-white hover:bg-[#1035c2]">Contact Bennie Studio <ArrowRight className="ml-2 h-4 w-4" /></Link></div> : <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
      <section className="min-w-0 rounded-2xl border border-[#dbe1ea] bg-white p-6 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">Prepared for {businessName}</p><h1 className="mt-4 break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{proposal.title}</h1><p className="mt-4 text-base leading-7 text-[#526071]">{proposal.outcome}</p>
        <div className="mt-8 border-t border-slate-100 pt-7"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Proposed scope</p><div className="mt-4 space-y-3">{(Array.isArray(proposal.scope) ? proposal.scope : []).map((item: string) => <p key={item} className="flex gap-3 border-b border-[#e3e8ef] py-4 text-sm font-medium leading-6 text-[#25364b] last:border-0"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{item}</p>)}</div></div>
        <div className="mt-7 rounded-xl border border-[#dbe1ea] bg-[#eef3ff] p-5 text-sm leading-6 text-[#25364b]"><ShieldCheck className="mb-3 h-5 w-5 text-indigo-600" />This proposal describes the managed work and commercial terms. It does not promise rankings, traffic, revenue, or a specific number of enquiries.</div>
      </section>
      <aside className="h-fit min-w-0 rounded-2xl border border-[#dbe1ea] bg-[#101c36] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b9caff]">{proposal.package_name}</p><div className="mt-6"><p className="break-words text-4xl font-bold tracking-tight">{money(proposal.config?.billing==="one_time"?proposal.setup_fee:proposal.value)}<span className="text-base text-slate-400">{proposal.config?.billing==="one_time"?" one-time":"/month"}</span></p><p className="mt-2 text-sm font-semibold text-slate-300">{proposal.config?.billing==="one_time"?"Scoped one-time service":money(proposal.setup_fee)+" one-time setup"}</p></div><div className="mt-6 space-y-2 border-y border-white/10 py-5 text-sm font-semibold text-slate-300"><p>Initial commitment: {commitmentMonths} month{commitmentMonths === 1 ? "" : "s"}</p><p>Valid until: {proposal.expires_at || "Confirm with Bennie Studio"}</p><p>Status: {proposal.status}</p></div>
        {accepted ? <div className="mt-6 rounded-xl border border-emerald-200/20 bg-emerald-400/10 p-5 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" /><h2 className="mt-3 text-xl font-bold">Payment recorded</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-300">Your agreed scope and commercial terms are recorded. Payment is not implied by acceptance. Onboarding starts after confirmed payment.</p>{proposal.checkout_url&& /^https:\/\/buy\.stripe\.com\//.test(proposal.checkout_url)&&<a className="mt-4 inline-flex rounded-lg bg-[#1741ed] px-5 py-3 font-semibold text-white" href={proposal.checkout_url}>Continue secure checkout</a>}</div> : <form onSubmit={accept} className="mt-6 space-y-4"><div><Label htmlFor="proposal-email" className="text-slate-300">Confirm your email</Label><Input id="proposal-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email used for this proposal" className="mt-2 h-12 rounded-xl bg-white text-slate-950" /></div><label className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.04] p-4 text-xs font-semibold leading-5 text-slate-300"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>I confirm the scope and {proposal.config?.billing==="one_time"?"one-time service":commitmentMonths+"-month initial commitment and recurring service"} shown above, and I agree to the <Link to={`/terms?market=${termsMarket}`} target="_blank" className="text-indigo-300 underline underline-offset-2">Terms of Service</Link>.</span></label>{error && <p className="rounded-lg border border-rose-300/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-100">{error}</p>}<Button type="submit" disabled={accepting || !termsAccepted} className="min-h-12 w-full rounded-lg bg-[#1741ed] px-6 font-bold text-white hover:bg-[#2c57fa] disabled:cursor-not-allowed disabled:opacity-60">{accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Accept proposal <ArrowRight className="ml-2 h-4 w-4" /></>}</Button><p className="text-center text-xs font-semibold leading-5 text-slate-400">Acceptance records the agreed scope and commercial terms before payment.</p></form>}
      </aside>
    </div>}
  </main><PublicSiteFooter /></div>;
}
