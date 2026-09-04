import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CalendarClock, ExternalLink, Inbox, Loader2, Mail, MessageSquare, Phone, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toLocalFollowUpInput } from "../../lib/salesAutomation";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { toast } from "sonner";

type AdminLead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  status: string;
  source?: string;
  sourcePage?: string;
  businessName?: string;
  websiteUrl?: string;
  nextAction?: string;
  nextFollowUpAt?: string;
  lastFollowUpAt?: string;
  lossReason?: string;
  createdAt: string;
};

const LEAD_STATUSES = ["new", "contacted", "qualified", "meeting", "proposal", "won", "lost"] as const;

const mapLead = (lead: any): AdminLead => ({
  id: lead.id,
  name: lead.name || lead.full_name || "Unnamed enquiry",
  email: lead.email || "",
  phone: lead.phone || lead.phone_number || "",
  message: lead.message || "",
  status: lead.status || "new",
  source: lead.source || lead.source_platform || "Website",
  sourcePage: lead.source_page || lead.raw_fields?.sourcePage || "",
  businessName: lead.raw_fields?.businessName || lead.raw_fields?.companyName || "",
  websiteUrl: lead.raw_fields?.websiteUrl || "",
  nextAction: lead.automation_next_action || "",
  nextFollowUpAt: lead.next_follow_up_at || "",
  lastFollowUpAt: lead.last_follow_up_at || "",
  lossReason: lead.raw_fields?.lossReason || "",
  createdAt: lead.created_at || new Date().toISOString(),
});

export function AdminLeadInbox() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [savingLeadId, setSavingLeadId] = useState("");
  const [deletingLeadId, setDeletingLeadId] = useState("");
  const [pendingResponse, setPendingResponse] = useState<{ id: string; channel: "email" | "phone" | "whatsapp" } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { nextAction: string; nextFollowUpAt: string }>>({});

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");
      const response = await fetch("/api/admin/leads", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not load inbound leads");
      setLeads((payload.leads || []).map(mapLead));
    } catch (error: any) {
      console.error("Failed to load inbound leads", error);
      toast.error(error?.message || "Could not load inbound leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
    const channel = supabase
      .channel("admin-inbound-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        void fetchLeads();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesStatus = status === "all" || lead.status === status;
      const matchesSearch = !query || [lead.name, lead.email, lead.phone, lead.businessName, lead.websiteUrl]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [leads, search, status]);

  const updateLead = async (leadId: string, updates: Record<string, unknown>) => {
    const previous = leads;
    const optimistic = {
      ...(updates.status ? { status: String(updates.status) } : {}),
      ...(updates.nextAction !== undefined ? { nextAction: String(updates.nextAction || "") } : {}),
      ...(updates.nextFollowUpAt !== undefined ? { nextFollowUpAt: String(updates.nextFollowUpAt || "") } : {}),
      ...(updates.channel ? { lastFollowUpAt: new Date().toISOString() } : {}),
    };
    setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, ...optimistic } : lead));
    try {
      setSavingLeadId(leadId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");
      const response = await fetch(`/api/admin/leads/${leadId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Lead status was not updated");
      setLeads((current) => current.map((lead) => lead.id === leadId ? mapLead(payload.lead) : lead));
      return true;
    } catch (error: any) {
      setLeads(previous);
      toast.error(error?.message || "Lead was not updated");
      return false;
    } finally {
      setSavingLeadId("");
    }
  };

  const saveFollowUp = async (lead: AdminLead) => {
    const draft = drafts[lead.id] || {
      nextAction: lead.nextAction || "",
      nextFollowUpAt: toLocalFollowUpInput(lead.nextFollowUpAt),
    };
    const saved = await updateLead(lead.id, {
      nextAction: draft.nextAction || null,
      nextFollowUpAt: draft.nextFollowUpAt ? new Date(draft.nextFollowUpAt).toISOString() : null,
      note: draft.nextAction ? `Next action set: ${draft.nextAction}` : "Follow-up plan updated",
    });
    if (saved) toast.success("Next action saved");
  };

  const changeStatus = async (lead: AdminLead, nextStatus: string) => {
    if (nextStatus !== "lost") {
      await updateLead(lead.id, { status: nextStatus });
      return;
    }
    const lossReason = window.prompt("Why was this lead lost? Record the actual reason before closing it.", lead.lossReason || "")?.trim() || "";
    if (!lossReason) {
      toast.error("A lost reason is required before closing a lead as lost.");
      return;
    }
    await updateLead(lead.id, { status: "lost", lossReason, note: `Lead closed as lost: ${lossReason}` });
  };

  const logContact = (lead: AdminLead, channel: "email" | "phone" | "whatsapp") => {
    setPendingResponse({ id: lead.id, channel });
  };

  const confirmResponse = async (lead: AdminLead) => {
    if (pendingResponse?.id !== lead.id) return;
    const saved = await updateLead(lead.id, { status: lead.status === "new" ? "contacted" : lead.status,
      channel: pendingResponse.channel, note: `${pendingResponse.channel} response confirmed by operator` });
    if (saved) { setPendingResponse(null); toast.success("Response recorded."); }
  };

  const deleteLead = async (lead: AdminLead) => {
    const confirmed = window.confirm(`Delete this enquiry from ${lead.businessName || lead.name || lead.email}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingLeadId(lead.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");
      const response = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not delete enquiry");
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setDrafts((current) => {
        const next = { ...current };
        delete next[lead.id];
        return next;
      });
      toast.success("Enquiry deleted");
    } catch (error: any) {
      toast.error(error?.message || "Could not delete enquiry");
    } finally {
      setDeletingLeadId("");
    }
  };

  const newCount = leads.filter((lead) => lead.status === "new").length;
  const overdueCount = leads.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date() && !["won", "lost"].includes(lead.status)).length;

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Inbound enquiries</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Lead inbox</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
            Every public form submission appears here. Respond first; qualify and move it into your sales process second.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchLeads()} className="rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-6"><p className="text-xs font-bold text-slate-500">New enquiries</p><p className="mt-2 text-4xl font-black text-indigo-600">{newCount}</p></CardContent></Card>
        <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-6"><p className="text-xs font-bold text-slate-500">Overdue follow-ups</p><p className={`mt-2 text-4xl font-black ${overdueCount ? "text-rose-600" : "text-slate-950 dark:text-white"}`}>{overdueCount}</p></CardContent></Card>
        <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-6"><p className="text-xs font-bold text-slate-500">All enquiries</p><p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{leads.length}</p></CardContent></Card>
      </div>

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white p-5 dark:bg-slate-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-5 w-5 text-indigo-600" /> Enquiries</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or business" className="w-full rounded-xl pl-9 sm:w-72" />
              </div>
              <select aria-label="Filter leads by status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <option value="all">All statuses</option>
                {LEAD_STATUSES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading enquiries…</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center"><Inbox className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No enquiries match this view.</p><p className="mt-1 text-sm text-slate-500">New website submissions will appear here automatically.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((lead) => {
                const whatsapp = lead.phone ? String(lead.phone).replace(/[^0-9]/g, "") : "";
                return (
                  <article key={lead.id} className="grid gap-4 p-5 hover:bg-slate-50/70 lg:grid-cols-[1.05fr_1.35fr_1fr] lg:items-start dark:hover:bg-slate-800/50">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-black text-slate-950 dark:text-white">{lead.businessName || lead.name}</h2>{lead.status === "new" && <Badge className="border-0 bg-indigo-50 text-indigo-700">New</Badge>}</div>
                      {lead.businessName && <p className="mt-1 text-xs font-semibold text-slate-500">Contact: {lead.name}</p>}
                      <p className="mt-1 text-xs text-slate-400">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })} · {lead.source}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{lead.message || "No message supplied."}</p>
                      {lead.websiteUrl && <a href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">View website <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                      {lead.email && <a onClick={() => logContact(lead, "email")} aria-label={`Email ${lead.name}`} href={`mailto:${lead.email}`} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"><Mail className="h-4 w-4" /></a>}
                      {lead.phone && <a onClick={() => logContact(lead, "phone")} aria-label={`Call ${lead.name}`} href={`tel:${lead.phone}`} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"><Phone className="h-4 w-4" /></a>}
                      {whatsapp && <a onClick={() => logContact(lead, "whatsapp")} aria-label={`WhatsApp ${lead.name}`} href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600"><MessageSquare className="h-4 w-4" /></a>}
                      <Button type="button" size="icon" variant="outline" disabled={deletingLeadId === lead.id} onClick={() => void deleteLead(lead)} className="h-10 w-10 rounded-xl border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete enquiry from ${lead.name}`} title="Delete enquiry">{deletingLeadId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                      <select aria-label={`Status for ${lead.name}`} value={lead.status} onChange={(event) => void changeStatus(lead, event.target.value)} className="h-10 min-w-32 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold capitalize text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {LEAD_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      </div>
                      {pendingResponse?.id === lead.id && <Button type="button" variant="outline" disabled={savingLeadId === lead.id} onClick={() => void confirmResponse(lead)}>Confirm response sent</Button>}
                      <Input
                        aria-label={`Next action for ${lead.name}`}
                        value={drafts[lead.id]?.nextAction ?? lead.nextAction ?? ""}
                        onChange={(event) => setDrafts((current) => ({ ...current, [lead.id]: { nextAction: event.target.value, nextFollowUpAt: current[lead.id]?.nextFollowUpAt ?? toLocalFollowUpInput(lead.nextFollowUpAt) } }))}
                        placeholder="Next action"
                        className="h-10 rounded-xl"
                      />
                      <div className="flex gap-2">
                        <div className="relative flex-1"><CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input type="datetime-local" aria-label={`Follow-up date for ${lead.name}`} value={drafts[lead.id]?.nextFollowUpAt ?? toLocalFollowUpInput(lead.nextFollowUpAt)} onChange={(event) => setDrafts((current) => ({ ...current, [lead.id]: { nextAction: current[lead.id]?.nextAction ?? lead.nextAction ?? "", nextFollowUpAt: event.target.value } }))} className="h-10 rounded-xl pl-9 text-xs" /></div>
                        <Button type="button" size="icon" variant="outline" disabled={savingLeadId === lead.id} onClick={() => void saveFollowUp(lead)} className="h-10 w-10 rounded-xl" aria-label={`Save follow-up for ${lead.name}`}>{savingLeadId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}</Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
