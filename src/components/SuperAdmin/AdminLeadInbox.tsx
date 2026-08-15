import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Inbox, Loader2, Mail, MessageSquare, Phone, RefreshCw, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
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
  createdAt: string;
};

const LEAD_STATUSES = ["new", "contacted", "qualified", "meeting", "closed"] as const;

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
  createdAt: lead.created_at || new Date().toISOString(),
});

export function AdminLeadInbox() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

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

  const updateStatus = async (leadId: string, nextStatus: string) => {
    const previous = leads;
    setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, status: nextStatus } : lead));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");
      const response = await fetch(`/api/admin/leads/${leadId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Lead status was not updated");
    } catch (error: any) {
      setLeads(previous);
      toast.error(error?.message || "Lead status was not updated");
    }
  };

  const newCount = leads.filter((lead) => lead.status === "new").length;

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
        <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-6"><p className="text-xs font-bold text-slate-500">Needs follow-up</p><p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{leads.filter((lead) => ["new", "contacted"].includes(lead.status)).length}</p></CardContent></Card>
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
                  <article key={lead.id} className="grid gap-4 p-5 hover:bg-slate-50/70 lg:grid-cols-[1.2fr_1.6fr_auto] lg:items-center dark:hover:bg-slate-800/50">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-black text-slate-950 dark:text-white">{lead.businessName || lead.name}</h2>{lead.status === "new" && <Badge className="border-0 bg-indigo-50 text-indigo-700">New</Badge>}</div>
                      {lead.businessName && <p className="mt-1 text-xs font-semibold text-slate-500">Contact: {lead.name}</p>}
                      <p className="mt-1 text-xs text-slate-400">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })} · {lead.source}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{lead.message || "No message supplied."}</p>
                      {lead.websiteUrl && <a href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">View website <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {lead.email && <a aria-label={`Email ${lead.name}`} href={`mailto:${lead.email}`} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"><Mail className="h-4 w-4" /></a>}
                      {lead.phone && <a aria-label={`Call ${lead.name}`} href={`tel:${lead.phone}`} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"><Phone className="h-4 w-4" /></a>}
                      {whatsapp && <a aria-label={`WhatsApp ${lead.name}`} href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600"><MessageSquare className="h-4 w-4" /></a>}
                      <select aria-label={`Status for ${lead.name}`} value={lead.status} onChange={(event) => void updateStatus(lead.id, event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold capitalize text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {LEAD_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
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
