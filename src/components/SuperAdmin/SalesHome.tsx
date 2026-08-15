import React from "react";
import { ArrowRight, CalendarClock, CheckCircle2, CircleDollarSign, Inbox, Loader2, MessageSquare, Target, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export const SalesHome: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
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
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const now = new Date();
  const newLeads = data.leads.filter((lead) => lead.status === "new");
  const overdue = [
    ...data.leads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= now && !["won", "lost", "closed"].includes(lead.status)),
    ...data.prospects.filter((prospect) => prospect.next_follow_up_at && new Date(prospect.next_follow_up_at) <= now && !["won", "lost"].includes(prospect.outreach_status)),
  ];
  const openProposals = data.proposals.filter((proposal) => !["Accepted", "Declined", "Expired"].includes(proposal.status));
  const accepted = data.proposals.filter((proposal) => proposal.status === "Accepted");
  const pipelineMrr = openProposals.reduce((sum, proposal) => sum + Number(proposal.value || proposal.amount || 0), 0);
  const acceptedMrr = accepted.reduce((sum, proposal) => sum + Number(proposal.value || proposal.amount || 0), 0);
  const engaged = data.prospects.filter((prospect) => ["replied", "call_booked", "won"].includes(prospect.outreach_status)).length;

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return <div className="space-y-7 pt-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">US$10k MRR revenue sprint</p><h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Sales command center</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">One view of what arrived, what needs action, what was proposed, and what has actually been accepted. No simulated conversion metrics.</p></div><Button variant="outline" onClick={() => void load()} className="rounded-xl">Refresh actual data</Button></div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Inbox} label="New inbound leads" value={String(newLeads.length)} note="Actual uncontacted lead records" action="Open inbox" onClick={() => navigate("/admin/inbound_leads")} />
      <Metric icon={CalendarClock} label="Follow-ups overdue" value={String(overdue.length)} note={overdue.length ? "Action required today" : "Nothing overdue"} action="Open outreach" onClick={() => navigate("/admin/outreach_lab")} alert={overdue.length > 0} />
      <Metric icon={CircleDollarSign} label="Open proposal MRR" value={`$${pipelineMrr.toLocaleString()}`} note={`${openProposals.length} open proposal${openProposals.length === 1 ? "" : "s"}`} action="Open pipeline" onClick={() => navigate("/admin/proposals_deals")} />
      <Metric icon={CheckCircle2} label="Accepted MRR" value={`$${acceptedMrr.toLocaleString()}`} note={accepted.length ? `${accepted.length} accepted` : "Not enough data yet"} action="Review deals" onClick={() => navigate("/admin/proposals_deals")} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100 p-5"><CardTitle className="text-base">Today’s next actions</CardTitle></CardHeader><CardContent className="p-5"><div className="space-y-3">
        {newLeads.length > 0 && <Action icon={Inbox} title={`Respond to ${newLeads.length} new lead${newLeads.length === 1 ? "" : "s"}`} copy="Review the website context, respond personally, and set the next follow-up before leaving the record." button="Open lead inbox" onClick={() => navigate("/admin/inbound_leads")} />}
        {overdue.length > 0 && <Action icon={CalendarClock} title={`Complete ${overdue.length} overdue follow-up${overdue.length === 1 ? "" : "s"}`} copy="Every contacted prospect should have a dated next action until won or lost." button="Work follow-ups" onClick={() => navigate("/admin/outreach_lab")} />}
        {engaged > 0 && <Action icon={MessageSquare} title={`${engaged} engaged prospect${engaged === 1 ? "" : "s"}`} copy="Move replies and booked calls toward a same-day proposal while context is fresh." button="Review prospects" onClick={() => navigate("/admin/prospect_explorer")} />}
        {newLeads.length === 0 && overdue.length === 0 && engaged === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center"><Target className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-black text-slate-700">The pipeline needs prospecting activity.</p><p className="mt-2 text-sm font-semibold text-slate-500">Add qualified prospects, prepare specific reviews, and record every follow-up.</p><Button onClick={() => navigate("/admin/prospect_explorer")} className="mt-5 rounded-xl bg-slate-950 text-white">Build prospect list</Button></div>}
      </div></CardContent></Card>

      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-slate-950 text-white shadow-sm"><CardHeader className="border-b border-white/10 p-5"><CardTitle className="text-base">Market sprint</CardTitle></CardHeader><CardContent className="space-y-4 p-5">{[
        ["Singapore", "Renovation, aesthetics, professional services, enrichment"],
        ["United Kingdom", "Trades, home services, clinics, property services"],
        ["Malaysia", "Renovation, home services, aesthetics, professional services"],
      ].map(([market, niches]) => <div key={market} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-indigo-300" /><p className="font-black">{market}</p></div><p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{niches}</p></div>)}<p className="text-xs font-semibold leading-5 text-slate-400">Market breadth creates prospect volume; the offer, qualification stages, and proposal workflow remain consistent.</p></CardContent></Card>
    </div>

    <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100 p-5"><CardTitle className="text-base">Measured sales activity this month</CardTitle></CardHeader><CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">{[
      ["Lead submissions", data.leads.filter((lead) => new Date(lead.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length],
      ["Follow-ups logged", data.events.filter((event) => event.event_type === "sales_follow_up_logged").length],
      ["Proposals accepted", data.events.filter((event) => event.event_type === "proposal_accepted").length],
      ["Engaged prospects", engaged],
    ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>)}</CardContent></Card>
  </div>;
};

function Metric({ icon: Icon, label, value, note, action, onClick, alert }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string; action: string; onClick: () => void; alert?: boolean }) {
  return <Card className={`rounded-3xl shadow-sm ${alert ? "border-rose-200" : "border-slate-200"}`}><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p><Icon className={`h-5 w-5 ${alert ? "text-rose-600" : "text-indigo-600"}`} /></div><p className={`mt-4 text-4xl font-black tracking-tight ${alert ? "text-rose-600" : "text-slate-950 dark:text-white"}`}>{value}</p><p className="mt-2 min-h-5 text-xs font-semibold text-slate-500">{note}</p><Button variant="ghost" onClick={onClick} className="mt-3 h-auto p-0 text-xs font-black text-indigo-600 hover:bg-transparent">{action}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></CardContent></Card>;
}

function Action({ icon: Icon, title, copy, button, onClick }: { icon: React.ComponentType<{ className?: string }>; title: string; copy: string; button: string; onClick: () => void }) {
  return <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" /></div><div className="flex-1"><p className="font-black text-slate-950">{title}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{copy}</p></div><Button variant="outline" onClick={onClick} className="rounded-xl">{button}</Button></div>;
}
