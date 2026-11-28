import { SALES_PRODUCT_SLUGS, COMMERCIAL_PILOTS, verifiedProposalTerms, proposalMoney, proposalIsPaid, isSalesProduct } from "../../lib/commercialExecution";
import { PLAN_DELIVERY_STANDARDS } from "../../constants/deliveryStandards";
import React from "react";
import { CheckCircle2, CircleDollarSign, Clock3, Copy, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { REVENUE_MARKETS, type RevenueMarket } from "../../constants/revenueOffer";
import { supabase } from "../../lib/supabase";
import { formatCommercialMoney, getCommercialPrice, type CommercialMarket } from "../../lib/commercialPricing";
import { usePublicCommercialPricing } from "../../hooks/usePublicCommercialPricing";
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
  const [form, setForm] = React.useState({ target: typeof window !== "undefined" && sessionStorage.getItem("bts_proposal_lead_id") ? `lead:${sessionStorage.getItem("bts_proposal_lead_id")}` : "", title: "Website Growth proposal", product: "website-growth" as string, pilotPrice: "", scopeNotes: "", market: "MY" as RevenueMarket, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), checkoutUrl: "" });

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

  // Target country is retained for lead context, but new proposal amounts use USD.
  const commercialMarket: CommercialMarket = "INTL";
  const { products: liveCommercialProducts } = usePublicCommercialPricing(commercialMarket);
  const currentProduct=liveCommercialProducts.find(p=>p.slug===form.product);
  const liveTerms=verifiedProposalTerms(currentProduct?getCommercialPrice(currentProduct,commercialMarket):null);
  const pilot=COMMERCIAL_PILOTS.find(p=>p.id===form.product);
  const active=proposals.filter(p=>["Draft","Sent","Accepted"].includes(p.status)&&!proposalIsPaid(p.config));
  const accepted=proposals.filter(p=>p.status==="Accepted"&&!proposalIsPaid(p.config));
  const paid=proposals.filter(p=>proposalIsPaid(p.config));
  const money=(p:any,amount:unknown)=>proposalMoney(amount,p.config?.currency||(p.config?.market==="MY"?"MYR":p.config?.market==="SG"?"SGD":p.config?.market==="GB"?"GBP":"USD"));
  const createProposal = async () => {
    if (!form.target || !form.title.trim()) return toast.error("Choose a lead or customer and add a proposal title.");
    setSaving(true);
    try {
      const [kind,id]=form.target.split(":");
      if(!form.expiresAt||form.expiresAt<new Date().toISOString().slice(0,10))throw Error("Choose a future proposal expiry.");
      let terms:{monthly:number;setup:number;term:number;currency:"USD"},name:string,scope:string[],outcome:string,config:Record<string,unknown>;
      if(pilot){
        const amount=Number(form.pilotPrice);
        if(!form.scopeNotes.trim()||!Number.isFinite(amount)||amount<=0||amount>100000)throw Error("Enter a reviewed positive USD quote and compatibility/scope notes.");
        terms={monthly:pilot.billing==="monthly"?amount:0,setup:pilot.billing==="monthly"?0:amount,term:0,currency:"USD"};
        name=pilot.name;scope=[...pilot.scope,form.scopeNotes.trim(),pilot.exclusions];outcome="Individually scoped service pilot. No automatic activation.";
        config={pilotId:pilot.id,billing:pilot.billing==="monthly"?"monthly":"one_time",approvalRequired:true,approvalState:"draft",scopeNotes:form.scopeNotes.trim()};
      }else{
        if(!isSalesProduct(form.product))throw Error("Select a configured product.");
        const response=await fetch("/api/public/pricing?market=INTL",{cache:"no-store"});
        const payload=await response.json().catch(()=>({}));
        const product=payload.products?.find((item:any)=>item.slug===form.product);
        const checked=verifiedProposalTerms(product?.price);
        if(!response.ok||!checked)throw Error("Current USD commercial terms are unavailable.");
        terms=checked;name=product.name;outcome=product.description;
        const standard=PLAN_DELIVERY_STANDARDS[form.product];
        scope=[standard.pages,standard.revisions,standard.updates,standard.landingPages,standard.seo,standard.strategy];
        config={commercialProductSlug:form.product,billing:"monthly"};
      }
      const payload={lead_id:kind==="lead"?id:null,business_id:kind==="business"?id:null,title:form.title.trim(),package_name:name,value:terms.monthly,amount:terms.monthly,setup_fee:terms.setup,status:"Draft",expires_at:form.expiresAt,valid_until:form.expiresAt,scope,outcome,checkout_url:null,config:{...config,market:form.market,currency:terms.currency,commitmentMonths:terms.term,scope,outcome}};
      const { data, error } = await supabase.from("proposals").insert(payload).select("*, businesses(name), leads(name,email)").single();
      if (error) throw error;
      if (kind === "lead") await supabase.from("leads").update({ status: "proposal", automation_next_action: "Review draft before sharing", next_follow_up_at: new Date(Date.now() + 2 * 86400000).toISOString() }).eq("id", id);
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
    if(proposalIsPaid(proposal.config)||proposal.checkout_url)return toast.error("A payment-linked or paid proposal requires manual finance review before changing status.");
    if(status==="Accepted")return toast.error("Acceptance must be recorded through the customer link; it is not payment.");
    if(status==="Sent"&&proposal.config?.pilotId)return toast.error("Pilot quotes require commercial approval before sharing.");
    let lossReason = "";
    if (status === "Declined") {
      lossReason = window.prompt("Why was this proposal lost? Record the actual reason before closing it.", proposal.config?.lossReason || "")?.trim() || "";
      if (!lossReason) {
        toast.error("A lost reason is required before declining a proposal.");
        return;
      }
    }
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
      ...(lossReason ? { config: { ...(proposal.config || {}), lossReason } } : {}),
    };
    if (status === "Accepted") updates.accepted_at = new Date().toISOString();
    const { data, error } = await supabase.from("proposals").update(updates).eq("id", proposal.id).select("*, businesses(name), leads(name,email)").single();
    if (error) return toast.error(error.message);
    setProposals((current) => current.map((item) => item.id === proposal.id ? data : item));
    const leadStatus = status === "Declined" ? "lost" : status === "Sent" ? "proposal" : null;
    if (proposal.lead_id && leadStatus) await supabase.from("leads").update({ status: leadStatus }).eq("id", proposal.lead_id);
    if (proposal.lead_id && status === "Sent") {
      await supabase.from("sales_tasks").insert({ lead_id: proposal.lead_id, proposal_id: proposal.id, title: "Review proposal engagement and follow up personally", task_type: "proposal_follow_up", priority: "high", due_at: new Date(Date.now() + 2 * 86400000).toISOString(), metadata: { proposalToken: proposal.proposal_token } });

    }
  };

  const copyLink = async (proposal: any) => {
    if(proposal.config?.pilotId)return toast.error("Pilot quote is internal until approved and released.");
    if (!proposal.proposal_token) return toast.error("This legacy proposal does not have a share token yet.");
    await navigator.clipboard.writeText(`${window.location.origin}/proposal/${proposal.proposal_token}`);
    toast.success("Proposal link copied. Mark Sent only after personally sharing it.");
  };

  const createCheckout = async (proposal: any) => {
    if(proposal.config?.pilotId)return toast.error("Pilot payments require approval and separate fulfilment verification.");
    if(!window.confirm("Create a Stripe payment link for this exact reviewed proposal? No email will be sent."))return;
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
    const row=proposals.find(p=>p.id===id);
    if(row?.status!=="Draft"||row?.checkout_url||proposalIsPaid(row?.config))return toast.error("Only unpaid, unshared drafts may be deleted.");
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
        <Metric icon={CircleDollarSign} label="Open unpaid proposals" value={String(active.length)} note="Not recurring revenue" />
        <Metric icon={CheckCircle2} label="Accepted, unpaid" value={String(accepted.length)} note="Acceptance is not payment" />
        <Metric icon={Clock3} label="Payment recorded" value={String(paid.length)} note="Stripe webhook evidence; reconcile refunds separately" />
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
              <div><p className="text-2xl font-black text-slate-950 dark:text-white">{money(proposal,proposal.config?.billing==="one_time"?proposal.setup_fee:value)}<span className="text-xs text-slate-400">{proposal.config?.billing==="one_time"?" one-time":"/mo"}</span></p><p className="mt-1 text-xs font-bold text-slate-500">{proposal.config?.billing==="one_time"?"One-time scoped quote":"Setup: "+money(proposal,proposal.setup_fee)} {proposalIsPaid(proposal.config)?" · Payment recorded":""}</p></div>
              <div className="flex flex-wrap items-center gap-2"><Select value={proposal.status || "Draft"} onValueChange={(value) => void updateStatus(proposal, value)}><SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{PROPOSAL_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>{!proposal.checkout_url && !proposal.config?.pilotId && !proposalIsPaid(proposal.config) && <Button variant="outline" onClick={() => void createCheckout(proposal)} disabled={saving} className="rounded-xl"><CircleDollarSign className="mr-2 h-4 w-4" /> Create checkout</Button>}<Button variant="outline" size="icon" onClick={() => void copyLink(proposal)} className="rounded-xl" aria-label="Copy proposal link"><Copy className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => void remove(proposal.id)} className="rounded-xl text-rose-500" aria-label="Delete proposal"><Trash2 className="h-4 w-4" /></Button></div>
            </article>;
          })}</div>}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl rounded-3xl"><DialogHeader><DialogTitle>Create revenue proposal</DialogTitle></DialogHeader><div className="space-y-4 py-2">
        <div><Label>Lead or customer</Label><Select value={form.target} onValueChange={(target) => setForm((current) => ({ ...current, target }))}><SelectTrigger className="mt-2 rounded-xl"><SelectValue placeholder="Choose a qualified lead" /></SelectTrigger><SelectContent>{leads.map((lead) => <SelectItem key={lead.id} value={`lead:${lead.id}`}>{lead.raw_fields?.businessName || lead.name} · {lead.email}</SelectItem>)}{businesses.map((business) => <SelectItem key={business.id} value={`business:${business.id}`}>{business.name} · customer</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Product / service</Label><Select value={form.product} onValueChange={product=>setForm(current=>({...current,product,title:(liveCommercialProducts.find(p=>p.slug===product)?.name||COMMERCIAL_PILOTS.find(p=>p.id===product)?.name||product)+" proposal"}))}><SelectTrigger className="mt-2"><SelectValue/></SelectTrigger><SelectContent>{SALES_PRODUCT_SLUGS.map(slug=><SelectItem value={slug} key={slug}>{liveCommercialProducts.find(p=>p.slug===slug)?.name||slug}</SelectItem>)}{COMMERCIAL_PILOTS.map(p=><SelectItem value={p.id} key={p.id}>{p.name} · internal pilot</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="proposal-title">Proposal title</Label><Input id="proposal-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-2 rounded-xl" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label>Market</Label><Select value={form.market} onValueChange={(market) => setForm((current) => ({ ...current, market: market as RevenueMarket }))}><SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REVENUE_MARKETS).map(([code, market]) => <SelectItem key={code} value={code}>{market.label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="proposal-expiry">Valid until</Label><Input id="proposal-expiry" type="date" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} className="mt-2 rounded-xl" /></div></div>
        {pilot?<><div><Label>Reviewed quote (USD)</Label><Input type="number" min="1" step="0.01" value={form.pilotPrice} onChange={e=>setForm(c=>({...c,pilotPrice:e.target.value}))}/></div><div><Label>Compatibility, scope and exclusions</Label><Input value={form.scopeNotes} onChange={e=>setForm(c=>({...c,scopeNotes:e.target.value}))}/></div><p className="text-sm text-amber-700">Internal draft only. Approval and payment/fulfilment validation required before activation.</p></>:<div className="rounded-2xl bg-indigo-50 p-4 text-sm text-slate-700">{liveTerms?proposalMoney(liveTerms.monthly,"USD")+"/month + "+proposalMoney(liveTerms.setup,"USD")+" setup · "+(liveTerms.term?liveTerms.term+" month commitment":"Month-to-month"):"Verified live pricing unavailable"}</div>}
      </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button><Button onClick={() => void createProposal()} disabled={saving} className="rounded-xl bg-slate-950 text-white hover:bg-indigo-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create draft</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string }) {
  return <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><Icon className="h-5 w-5 text-indigo-600" /></div><p className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p><p className="mt-2 text-xs font-semibold text-slate-500">{note}</p></CardContent></Card>;
}
