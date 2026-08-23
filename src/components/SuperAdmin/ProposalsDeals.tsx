import React from "react";
import { CheckCircle2, CircleDollarSign, Clock3, Copy, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getOfferForMarket, REVENUE_MARKETS, type RevenueMarket } from "../../constants/revenueOffer";
import { supabase } from "../../lib/supabase";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const PROPOSAL_STATUSES = ["Draft", "Sent", "Accepted", "Declined", "Expired"];

export function ProposalsDeals() {
  const [proposals, setProposals] = React.useState<any[]>([]);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [businesses, setBusinesses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ target: typeof window !== "undefined" && sessionStorage.getItem("bts_proposal_lead_id") ? `lead:${sessionStorage.getItem("bts_proposal_lead_id")}` : "", title: "Website Growth Partner proposal", market: "SG" as RevenueMarket, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), checkoutUrl: "" });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const [proposalResult, leadResult, businessResult] = await Promise.all([
      supabase.from("proposals").select("*, businesses(name), leads(name,email)").order("created_at", { ascending: false }),
      supabase.from("leads").select("id,name,email,status,raw_fields").not("status", "in", '("won","lost","closed")').order("created_at", { ascending: false }).limit(250),
      supabase.from("businesses").select("id,name").order("name"),
    ]);
    if (proposalResult.error) toast.error(proposalResult.error.message || "Could not load proposals");
    setProposals(proposalResult.data || []);
    setLeads(leadResult.data || []);
    setBusinesses(businessResult.data || []);
    setLoading(false);
  }, []);

  React.useEffect(() => { void fetchData(); }, [fetchData]);
  React.useEffect(() => { if (form.target) sessionStorage.removeItem("bts_proposal_lead_id"); }, [form.target]);

  const offer = getOfferForMarket(form.market);
  const active = proposals.filter((proposal) => !["Declined", "Expired"].includes(proposal.status));
  const accepted = proposals.filter((proposal) => proposal.status === "Accepted");
  const stats = {
    pipelineMrr: active.reduce((sum, proposal) => sum + Number(proposal.value || proposal.amount || 0), 0),
    acceptedMrr: accepted.reduce((sum, proposal) => sum + Number(proposal.value || proposal.amount || 0), 0),
    pendingSetup: active.filter((proposal) => proposal.status !== "Accepted").reduce((sum, proposal) => sum + Number(proposal.setup_fee || 0), 0),
  };

  const createProposal = async () => {
    if (!form.target || !form.title.trim()) return toast.error("Choose a lead or customer and add a proposal title.");
    setSaving(true);
    try {
      const [kind, id] = form.target.split(":");
      const payload = {
        lead_id: kind === "lead" ? id : null,
        business_id: kind === "business" ? id : null,
        title: form.title.trim(),
        package_name: offer.name,
        value: offer.monthlyPrice,
        amount: offer.monthlyPrice,
        setup_fee: offer.setupFee,
        status: "Draft",
        expires_at: form.expiresAt,
        valid_until: form.expiresAt,
        scope: offer.included,
        outcome: offer.description,
        checkout_url: form.checkoutUrl.trim() || null,
        config: { offerId: offer.id, planId: offer.planId, market: form.market, currency: offer.prices[form.market].currency, commitmentMonths: offer.commitmentMonths, package_name: offer.name, setup_fee: offer.setupFee, scope: offer.included, outcome: offer.description },
      };
      const { data, error } = await supabase.from("proposals").insert(payload).select("*, businesses(name), leads(name,email)").single();
      if (error) throw error;
      if (kind === "lead") await supabase.from("leads").update({ status: "proposal", automation_next_action: "Send proposal and schedule follow-up", next_follow_up_at: new Date(Date.now() + 2 * 86400000).toISOString() }).eq("id", id);
      setProposals((current) => [data, ...current]);
      setOpen(false);
      toast.success("Proposal created. Review it before sharing.");
    } catch (error: any) {
      toast.error(error.message || "Proposal could not be created");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (proposal: any, status: string) => {
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === "Accepted") updates.accepted_at = new Date().toISOString();
    const { data, error } = await supabase.from("proposals").update(updates).eq("id", proposal.id).select("*, businesses(name), leads(name,email)").single();
    if (error) return toast.error(error.message);
    setProposals((current) => current.map((item) => item.id === proposal.id ? data : item));
    const leadStatus = status === "Accepted" ? "won" : status === "Declined" ? "lost" : status === "Sent" ? "proposal" : null;
    if (proposal.lead_id && leadStatus) await supabase.from("leads").update({ status: leadStatus }).eq("id", proposal.lead_id);
    if (proposal.lead_id && status === "Sent") {
      await supabase.from("sales_tasks").insert({ lead_id: proposal.lead_id, proposal_id: proposal.id, title: "Review proposal engagement and follow up personally", task_type: "proposal_follow_up", priority: "high", due_at: new Date(Date.now() + 2 * 86400000).toISOString(), metadata: { proposalToken: proposal.proposal_token } });
      const { data: sequence } = await supabase.from("outreach_sequences").select("id").eq("name", "Proposal follow-up").eq("status", "active").maybeSingle();
      if (sequence) {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch("/api/admin/sales-automation/enroll", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ sequenceId: sequence.id, leadId: proposal.lead_id, observation: "A tailored proposal has been sent and may need a clear answer on scope, timing, or commercial terms." }) });
      }
    }
  };

  const copyLink = async (proposal: any) => {
    if (!proposal.proposal_token) return toast.error("This legacy proposal does not have a share token yet.");
    await navigator.clipboard.writeText(`${window.location.origin}/proposal/${proposal.proposal_token}`);
    if (proposal.status === "Draft") await updateStatus(proposal, "Sent");
    toast.success("Proposal link copied and marked sent.");
  };

  const createCheckout = async (proposal: any) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/proposals/${proposal.id}/create-checkout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: "{}" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Checkout could not be created");
      setProposals((current) => current.map((item) => item.id === proposal.id ? { ...item, checkout_url: payload.checkoutUrl } : item));
      await navigator.clipboard.writeText(payload.checkoutUrl);
      toast.success("Secure Stripe checkout created and copied.");
    } catch (error: any) {
      toast.error(error.message || "Checkout could not be created");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Retract and delete this proposal?")) return;
    const { error } = await supabase.from("proposals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setProposals((current) => current.filter((proposal) => proposal.id !== id));
  };

  return (
    <div className="space-y-7 pt-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Lead to checkout</p><h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Proposals & deals</h1><p className="mt-2 text-sm font-semibold text-slate-500">Create a proposal directly from an inbound lead or an existing customer, then share one trackable link.</p></div>
        <Button onClick={() => setOpen(true)} className="min-h-11 rounded-xl bg-slate-950 px-6 text-white hover:bg-indigo-600"><Plus className="mr-2 h-4 w-4" /> New proposal</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={CircleDollarSign} label="Open proposal MRR" value={`$${stats.pipelineMrr.toLocaleString()}`} note="Actual open proposal value" />
        <Metric icon={CheckCircle2} label="Accepted MRR" value={`$${stats.acceptedMrr.toLocaleString()}`} note={accepted.length ? `${accepted.length} accepted proposal${accepted.length === 1 ? "" : "s"}` : "Not enough data yet"} />
        <Metric icon={Clock3} label="Pending setup fees" value={`$${stats.pendingSetup.toLocaleString()}`} note="Excludes accepted and declined proposals" />
      </div>

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 p-5"><CardTitle className="text-base">Proposal pipeline</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div> : proposals.length === 0 ? <div className="py-20 text-center"><FileText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 font-black text-slate-700">No active proposals yet.</p><p className="mt-1 text-sm text-slate-500">Qualify a lead and create the first proposal from this page.</p></div> : <div className="divide-y divide-slate-100">{proposals.map((proposal) => {
            const contact = proposal.leads?.name || proposal.businesses?.name || "Unassigned prospect";
            const market = proposal.config?.market || "US";
            const value = Number(proposal.value || proposal.amount || 0);
            return <article key={proposal.id} className="grid gap-4 p-5 lg:grid-cols-[1.3fr_0.7fr_auto] lg:items-center">
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-950 dark:text-white">{proposal.title}</h2><Badge variant="outline">{market}</Badge>{Number(proposal.view_count || 0) > 0 && <Badge className="bg-indigo-50 text-indigo-700">Viewed {proposal.view_count}×</Badge>}</div><p className="mt-1 text-sm font-semibold text-slate-500">{contact} · {proposal.package_name || "Custom proposal"}</p><p className="mt-2 text-xs font-bold text-slate-400">Expires {proposal.expires_at || proposal.valid_until || "not set"}</p></div>
              <div><p className="text-2xl font-black text-slate-950 dark:text-white">{REVENUE_MARKETS[market as RevenueMarket] ? getOfferForMarket(market as RevenueMarket).monthlyLabel : `$${value.toLocaleString()}`}<span className="text-xs text-slate-400">/mo</span></p><p className="mt-1 text-xs font-bold text-slate-500">Setup: {Number(proposal.setup_fee || 0).toLocaleString()}</p></div>
              <div className="flex flex-wrap items-center gap-2"><Select value={proposal.status || "Draft"} onValueChange={(value) => void updateStatus(proposal, value)}><SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{PROPOSAL_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>{!proposal.checkout_url && <Button variant="outline" onClick={() => void createCheckout(proposal)} disabled={saving} className="rounded-xl"><CircleDollarSign className="mr-2 h-4 w-4" /> Create checkout</Button>}<Button variant="outline" size="icon" onClick={() => void copyLink(proposal)} className="rounded-xl" aria-label="Copy proposal link"><Copy className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => void remove(proposal.id)} className="rounded-xl text-rose-500" aria-label="Delete proposal"><Trash2 className="h-4 w-4" /></Button></div>
            </article>;
          })}</div>}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl rounded-3xl"><DialogHeader><DialogTitle>Create revenue proposal</DialogTitle></DialogHeader><div className="space-y-4 py-2">
        <div><Label>Lead or customer</Label><Select value={form.target} onValueChange={(target) => setForm((current) => ({ ...current, target }))}><SelectTrigger className="mt-2 rounded-xl"><SelectValue placeholder="Choose a qualified lead" /></SelectTrigger><SelectContent>{leads.map((lead) => <SelectItem key={lead.id} value={`lead:${lead.id}`}>{lead.raw_fields?.businessName || lead.name} · {lead.email}</SelectItem>)}{businesses.map((business) => <SelectItem key={business.id} value={`business:${business.id}`}>{business.name} · customer</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="proposal-title">Proposal title</Label><Input id="proposal-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-2 rounded-xl" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label>Market</Label><Select value={form.market} onValueChange={(market) => setForm((current) => ({ ...current, market: market as RevenueMarket }))}><SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REVENUE_MARKETS).map(([code, market]) => <SelectItem key={code} value={code}>{market.label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="proposal-expiry">Valid until</Label><Input id="proposal-expiry" type="date" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} className="mt-2 rounded-xl" /></div></div>
        <div><Label htmlFor="proposal-checkout">Secure checkout URL <span className="font-medium text-slate-400">(optional)</span></Label><Input id="proposal-checkout" type="url" placeholder="https://buy.stripe.com/..." value={form.checkoutUrl} onChange={(event) => setForm((current) => ({ ...current, checkoutUrl: event.target.value }))} className="mt-2 rounded-xl" /><p className="mt-2 text-xs font-semibold text-slate-500">When supplied, an accepted proposal continues directly to this Stripe checkout or payment link.</p></div>
        <div className="rounded-2xl bg-indigo-50 p-4 text-sm font-bold leading-6 text-slate-700">{offer.monthlyLabel}/month + {offer.setupLabel} setup · {offer.commitmentMonths}-month initial commitment</div>
      </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button><Button onClick={() => void createProposal()} disabled={saving} className="rounded-xl bg-slate-950 text-white hover:bg-indigo-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create draft</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string }) {
  return <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><Icon className="h-5 w-5 text-indigo-600" /></div><p className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p><p className="mt-2 text-xs font-semibold text-slate-500">{note}</p></CardContent></Card>;
}
