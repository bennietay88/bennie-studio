import React from "react";
import { ArrowRight, CalendarClock, CheckCircle2, CircleDollarSign, Inbox, Loader2, MessageSquare, Target, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ProspectEmailTemplateEditor } from "./ProspectEmailTemplateEditor";

export const SalesHome: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [health, setHealth] = React.useState<null | { generatedAt: string; counts: Record<string, number>; notes: string[] }>(null);
  const [healthError, setHealthError] = React.useState("");
  const [repairing, setRepairing] = React.useState(false);
  const [repairResult, setRepairResult] = React.useState("");
  const [showEmailTemplates, setShowEmailTemplates] = React.useState(() => new URLSearchParams(window.location.search).get("templates") === "1");
  const [data, setData] = React.useState({ leads: [] as any[], prospects: [] as any[], proposals: [] as any[], events: [] as any[] });

  const load = React.useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(1);
    const [leads, prospects, proposals, events] = await Promise.all([
      supabase.from("leads").select("id,name,email,status,next_follow_up_at,automation_next_action,created_at,raw_fields").order("created_at", { ascending: false }).limit(250),
      supabase.from("prospects").select("id,name,outreach_status,next_follow_up_at,location,industry").order("created_at", { ascending: false }).limit(500),
      supabase.from("proposals").select("id,status,value,amount,setup_fee,created_at,accepted_at").order("created_at", { ascending: false }).limit(250),
      supabase.from("tracking_events").select("event_type,created_at,metadata").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(100),
    ]);
    setData({ leads: leads.data || [], prospects: prospects.data || [], proposals: proposals.data || [], events: events.data || [] });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in to inspect revenue integrity.");
      const response = await fetch("/api/admin/revenue-health", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not verify sales data.");
      setHealth(payload);
      setHealthError("");
    } catch (error: any) {
      setHealth(null);
      setHealthError(error?.message || "Revenue checks unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  const repairMissingFollowUps = React.useCallback(async () => {
    if (!window.confirm("Create follow-up tasks only for existing new lead records that have no response task? Historical tracking events will not be used to recreate leads.")) return;
    setRepairing(true);
    setRepairResult("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in first.");
      const response = await fetch("/api/admin/revenue-health/repair-follow-ups", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Task repair failed.");
      setRepairResult(`Follow-up tasks created: ${data.created}. Failures: ${data.failedCount}. No historical event-only leads were recreated.`);
      await load();
    } catch (error: any) {
      setRepairResult(error?.message || "Could not create follow-up tasks.");
    } finally {
      setRepairing(false);
    }
  }, [load]);

  React.useEffect(() => { void load(); }, [load]);

  const now = new Date();
  const newLeads = data.leads.filter((lead) => lead.status === "new");
  const overdueFollowUps = health?.counts.overdueFollowUps;
  const openProposals = data.proposals.filter((proposal) => !["Accepted", "Declined", "Expired"].includes(proposal.status));
  const accepted = data.proposals.filter((proposal) => proposal.status === "Accepted");

  const engaged = data.prospects.filter((prospect) => ["replied", "call_booked", "won"].includes(prospect.outreach_status)).length;

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return <div className="space-y-7 pt-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-semibold text-indigo-600">Sales operations</p><h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Sales Pipeline</h1><p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">One view of what arrived, what needs action, what was proposed, and what has actually been accepted. No simulated conversion metrics.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setShowEmailTemplates((current) => !current)} className="rounded-xl">{showEmailTemplates ? "Hide email templates" : "Edit email templates"}</Button><Button variant="outline" onClick={() => void load()} className="rounded-xl">Refresh actual data</Button></div></div>

    {showEmailTemplates && <section id="prospect-email-templates"><ProspectEmailTemplateEditor /></section>}

    {healthError && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">Sales integrity checks could not be loaded: {healthError}. Avoid relying on the counts below until the backend is reachable.</div>}
    {health && <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-950">Revenue integrity · last 30 days</h2><p className="mt-1 text-xs leading-5 text-slate-600">Verified against live CRM, outreach and billing records. Visitor events and payment webhooks are not counted as paying customers.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">Updated {new Date(health.generatedAt).toLocaleString()}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Actual inbound lead records", health.counts.actualLeads30d, "Persistent CRM records"],
          ["Tracked leads absent from CRM", health.counts.trackedLeadIdsNotInActiveCRM, "Investigate test cleanup or missing records"],
          ["Overdue follow-up records", health.counts.overdueFollowUps, "CRM leads and prospects, counted once"],
          ["Active Stripe-linked services", health.counts.activeStripeLinkedServices, "Not inferred from checkout events"],
        ].map(([label, value, note]) => <div key={String(label)} className="rounded-xl border border-indigo-100 bg-white p-4"><p className="text-xs font-semibold text-slate-600">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>)}
      </div>
      <details className="mt-4 border-t border-indigo-100 pt-3"><summary className="cursor-pointer text-sm font-semibold text-indigo-800">View additional funnel checks</summary>
        <div className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">{[
          ["Preview generated (events)", health.counts.previewsGenerated30d],
          ["Checkout started (events)", health.counts.checkoutStartedEvents30d],
          ["Completed checkout webhooks (not unique customers)", health.counts.checkoutCompletedWebhookEvents30d],
          ["New leads missing follow-up tasks", health.counts.newLeadsWithoutFollowUpTask],
          ["Outbound emails delivered", health.counts.deliveredOutreach30d],
          ["Outbound emails bounced", health.counts.bouncedOutreach30d],
          ["Inbound replies recorded", health.counts.recordedInboundReplies30d],
          ["Booked sales calls (CRM)", health.counts.bookedCalls],
          ["Proposals recorded", health.counts.proposals],
          ["Converted prospect records", health.counts.convertedProspects],
        ].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4 border-b border-indigo-100 pb-2"><span className="text-slate-600">{label}</span><strong className="tabular-nums text-slate-950">{value}</strong></div>)}</div>
        <p className="mt-3 text-xs text-slate-600">Do not recreate missing leads from anonymous events. Check for test data removal and actual form deliveries first.</p>
        {health.counts.newLeadsWithoutFollowUpTask > 0 && <button type="button" disabled={repairing} onClick={() => void repairMissingFollowUps()} className="mt-3 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50">{repairing ? "Checking saved leads…" : `Create ${health.counts.newLeadsWithoutFollowUpTask} missing follow-up task(s)`}</button>}
        {repairResult && <p role="status" className="mt-2 text-sm font-medium text-indigo-800">{repairResult}</p>}
      </details>
    </div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Inbox} label="New inbound leads" value={String(health?.counts.pendingLeadResponses ?? newLeads.length)} note="Actual saved, unresponded enquiries" action="Open inbox" onClick={() => navigate("/admin/inbound_leads")} />
      <Metric icon={CalendarClock} label="Follow-ups overdue" value={overdueFollowUps === undefined ? "—" : String(overdueFollowUps)} note="CRM leads and prospects with overdue follow-up; linked tasks are counted once" action="Review all overdue" onClick={() => navigate("/admin/overdue_followups")} alert={(overdueFollowUps ?? 0) > 0} />
      <Metric icon={CircleDollarSign} label="Open proposals" value={String(openProposals.length)} note="Mixed-market amounts are not treated as one currency" action="Open pipeline" onClick={() => navigate("/admin/proposals_deals")} />
      <Metric icon={CheckCircle2} label="Accepted proposals" value={String(accepted.length)} note="Accepted deals are not assumed to be paid subscriptions" action="Review deals" onClick={() => navigate("/admin/proposals_deals")} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100 p-5"><CardTitle className="text-base">Today’s next actions</CardTitle></CardHeader><CardContent className="p-5"><div className="space-y-3">
        {newLeads.length > 0 && <Action icon={Inbox} title={`Respond to ${newLeads.length} new lead${newLeads.length === 1 ? "" : "s"}`} copy="Review the website context, respond personally, and set the next follow-up before leaving the record." button="Open lead inbox" onClick={() => navigate("/admin/inbound_leads")} />}
        {(overdueFollowUps ?? 0) > 0 && <Action icon={CalendarClock} title={`Review ${overdueFollowUps} overdue follow-up${overdueFollowUps === 1 ? "" : "s"}`} copy="Overdue leads and prospects, with linked open tasks deduplicated." button="Review all follow-ups" onClick={() => navigate("/admin/overdue_followups")} />}
        {engaged > 0 && <Action icon={MessageSquare} title={`${engaged} engaged prospect${engaged === 1 ? "" : "s"}`} copy="Move replies and booked calls toward a same-day proposal while context is fresh." button="Review prospects" onClick={() => navigate("/admin/prospect_explorer")} />}
        {health && newLeads.length === 0 && overdueFollowUps === 0 && engaged === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center"><Target className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">The pipeline needs prospecting activity.</p><p className="mt-2 text-sm font-semibold text-slate-500">Add qualified prospects, prepare specific reviews, and record every follow-up.</p><Button onClick={() => navigate("/admin/prospect_explorer")} className="mt-5 rounded-xl bg-slate-950 text-white">Build prospect list</Button></div>}
      </div></CardContent></Card>

      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-slate-950 text-white shadow-sm"><CardHeader className="border-b border-white/10 p-5"><CardTitle className="text-base">Target markets</CardTitle></CardHeader><CardContent className="space-y-4 p-5">{[
        ["Singapore", "Renovation, aesthetics, professional services, enrichment"],
        ["United Kingdom", "Trades, home services, clinics, property services"],
        ["Malaysia", "Renovation, home services, aesthetics, professional services"],
      ].map(([market, niches]) => <div key={market} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-indigo-300" /><p className="font-semibold">{market}</p></div><p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{niches}</p></div>)}<p className="text-xs font-semibold leading-5 text-slate-400">Market breadth creates prospect volume; the offer, qualification stages, and proposal workflow remain consistent.</p></CardContent></Card>
    </div>

    <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100 p-5"><CardTitle className="text-base">Measured sales activity this month</CardTitle></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Lead submissions", data.leads.filter((lead) => new Date(lead.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length],
      ["Follow-ups logged", data.events.filter((event) => event.event_type === "sales_follow_up_logged").length],
      ["Proposals accepted", data.events.filter((event) => event.event_type === "proposal_accepted").length],
      ["Engaged prospects", engaged],
    ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p></div>)}</CardContent></Card>
  </div>;
};

function Metric({ icon: Icon, label, value, note, action, onClick, alert }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string; action: string; onClick: () => void; alert?: boolean }) {
  return <Card className={`rounded-3xl shadow-sm ${alert ? "border-rose-200" : "border-slate-200"}`}><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">{label}</p><Icon className={`h-5 w-5 ${alert ? "text-rose-600" : "text-indigo-600"}`} /></div><p className={`mt-4 text-4xl font-black tracking-tight ${alert ? "text-rose-600" : "text-slate-950 dark:text-white"}`}>{value}</p><p className="mt-2 min-h-5 text-xs font-semibold text-slate-500">{note}</p><Button variant="ghost" onClick={onClick} className="mt-3 h-auto p-0 text-xs font-black text-indigo-600 hover:bg-transparent">{action}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></CardContent></Card>;
}

function Action({ icon: Icon, title, copy, button, onClick }: { icon: React.ComponentType<{ className?: string }>; title: string; copy: string; button: string; onClick: () => void }) {
  return <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" /></div><div className="flex-1"><p className="font-semibold text-slate-950">{title}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{copy}</p></div><Button variant="outline" onClick={onClick} className="rounded-xl">{button}</Button></div>;
}
