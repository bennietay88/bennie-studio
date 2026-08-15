import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, CalendarCheck, CheckCircle2, Inbox, Loader2, MessageSquare, RefreshCw, Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type DashboardLead = {
  id: string;
  name: string;
  email: string;
  status: string;
  source: string;
  businessName: string;
  createdAt: string;
};

const mapLead = (lead: any): DashboardLead => ({
  id: lead.id,
  name: lead.name || lead.full_name || "Unnamed enquiry",
  email: lead.email || "",
  status: lead.status || "new",
  source: lead.source || lead.source_platform || "Website",
  businessName: lead.raw_fields?.businessName || lead.raw_fields?.companyName || "",
  createdAt: lead.created_at || new Date().toISOString(),
});

export function RevenueCommand() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<DashboardLead[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");
      const [leadsResponse, prospectsResult, proposalsResult] = await Promise.all([
        fetch("/api/admin/leads", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.from("prospects").select("id,outreach_status,next_follow_up_at"),
        supabase.from("proposals").select("id,status"),
      ]);

      const leadsPayload = await leadsResponse.json().catch(() => ({}));
      if (!leadsResponse.ok) throw new Error(leadsPayload.error || "Enquiries could not be loaded.");
      if (prospectsResult.error) throw prospectsResult.error;
      if (proposalsResult.error) throw proposalsResult.error;

      setLeads((leadsPayload.leads || []).map(mapLead));
      setProspects(prospectsResult.data || []);
      setProposals(proposalsResult.data || []);
    } catch (error: any) {
      console.error("Failed to load sales overview", error);
      setLoadError(error?.message || "Sales data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin-sales-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const metrics = useMemo(() => {
    const now = Date.now();
    return {
      newLeads: leads.filter((lead) => lead.status === "new").length,
      totalLeads: leads.length,
      followUpsDue: prospects.filter((prospect) => prospect.next_follow_up_at && new Date(prospect.next_follow_up_at).getTime() <= now && !["won", "lost"].includes(prospect.outreach_status)).length,
      replies: prospects.filter((prospect) => ["replied", "call_booked"].includes(prospect.outreach_status)).length,
      won: proposals.filter((proposal) => proposal.status === "accepted").length,
    };
  }, [leads, prospects, proposals]);

  if (loading) {
    return <div className="flex h-48 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> Loading sales activity…</div>;
  }

  return (
    <section className="space-y-6" aria-labelledby="sales-overview-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Sales today</p>
          <h2 id="sales-overview-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Enquiries and next actions</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Real submissions and follow-up work only—no simulated performance metrics.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} className="rounded-xl"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      {loadError && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{loadError}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["New enquiries", metrics.newLeads, Inbox, "text-indigo-600 bg-indigo-50"],
          ["All enquiries", metrics.totalLeads, Users, "text-slate-700 bg-slate-100"],
          ["Follow-ups due", metrics.followUpsDue, MessageSquare, "text-amber-700 bg-amber-50"],
          ["Replies / calls", metrics.replies, CalendarCheck, "text-blue-700 bg-blue-50"],
          ["Deals won", metrics.won, CheckCircle2, "text-emerald-700 bg-emerald-50"],
        ].map(([label, value, Icon, tone]: any) => (
          <Card key={label} className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></div>
              <p className="mt-5 text-xs font-bold text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-5">
            <CardTitle className="text-base">Newest enquiries</CardTitle>
            <Button variant="ghost" onClick={() => navigate("/admin/inbound_leads")} className="rounded-xl text-indigo-600">Open inbox <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="p-0">
            {leads.length === 0 ? (
              <div className="px-6 py-14 text-center"><Inbox className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No enquiries yet.</p><p className="mt-1 text-sm text-slate-500">New public form submissions will appear here automatically.</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {leads.slice(0, 5).map((lead) => (
                  <button key={lead.id} onClick={() => navigate("/admin/inbound_leads")} className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700">{(lead.businessName || lead.name).slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-950 dark:text-white">{lead.businessName || lead.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{lead.email || lead.source}</span></span>
                    <span className="text-right"><Badge className={lead.status === "new" ? "border-0 bg-indigo-50 text-indigo-700" : "border-0 bg-slate-100 text-slate-600"}>{lead.status}</Badge><span className="mt-1 block text-[10px] text-slate-400">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span></span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="p-5"><CardTitle className="text-base">What to do next</CardTitle></CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 pt-0">
            {metrics.newLeads > 0 && <ActionButton icon={Inbox} label={`Respond to ${metrics.newLeads} new ${metrics.newLeads === 1 ? "enquiry" : "enquiries"}`} onClick={() => navigate("/admin/inbound_leads")} />}
            {metrics.followUpsDue > 0 && <ActionButton icon={MessageSquare} label={`Complete ${metrics.followUpsDue} due follow-up${metrics.followUpsDue === 1 ? "" : "s"}`} onClick={() => navigate("/admin/prospect_explorer")} />}
            <ActionButton icon={Search} label="Add or review prospects" onClick={() => navigate("/admin/prospect_explorer")} />
            <ActionButton icon={MessageSquare} label="Prepare personalised outreach" onClick={() => navigate("/admin/outreach_lab")} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 text-left text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200">
      <Icon className="h-4 w-4 shrink-0" /><span className="flex-1">{label}</span><ArrowRight className="h-4 w-4" />
    </button>
  );
}
