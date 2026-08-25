import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Clock3, Inbox, Loader2, RefreshCw, Users } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type OperatorLead = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  nextFollowUpAt?: string;
};

type OperatorAppointment = {
  id: string;
  customer_name?: string;
  customer_email?: string;
  service?: string;
  date: string;
  time?: string;
  status?: string;
  business_id?: string;
};

const mapLead = (lead: any): OperatorLead => ({
  id: lead.id,
  name: lead.name || lead.full_name || "Unnamed enquiry",
  email: lead.email || "",
  status: lead.status || "new",
  createdAt: lead.created_at || new Date().toISOString(),
  nextFollowUpAt: lead.next_follow_up_at || "",
});

const today = format(new Date(), "yyyy-MM-dd");

export function DailyOperations() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<OperatorLead[]>([]);
  const [appointments, setAppointments] = useState<OperatorAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired.");

      const [leadResponse, appointmentResponse] = await Promise.all([
        fetch("/api/admin/leads", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase
          .from("appointments")
          .select("id,customer_name,customer_email,service,date,time,status,business_id")
          .gte("date", today)
          .order("date", { ascending: true })
          .order("time", { ascending: true })
          .limit(50),
      ]);
      const leadPayload = await leadResponse.json().catch(() => ({}));
      if (!leadResponse.ok) throw new Error(leadPayload.error || "Could not load customer CRM activity.");
      if (appointmentResponse.error) throw appointmentResponse.error;
      setLeads((leadPayload.leads || []).map(mapLead));
      setAppointments((appointmentResponse.data || []) as OperatorAppointment[]);
    } catch (err: any) {
      console.error("Daily operations load failed", err);
      setError(err?.message || "Daily operations could not be loaded.");
      toast.error(err?.message || "Could not load daily operations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("daily-operations")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const newLeads = useMemo(() => leads.filter((lead) => lead.status === "new"), [leads]);
  const dueFollowUps = useMemo(() => leads.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) <= new Date()), [leads]);
  const todayAppointments = useMemo(() => appointments.filter((appointment) => appointment.date === today), [appointments]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Daily operations</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Customer work, at a glance</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">Start the day with the customer enquiries and booked appointments that need attention. Website delivery tools remain under Customers &amp; Delivery.</p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Refresh
        </Button>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="p-5 text-sm font-semibold text-red-700">{error}</CardContent></Card>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-slate-400">New enquiries</p><Inbox className="h-5 w-5 text-indigo-600" /></div><p className="mt-3 text-4xl font-black text-slate-950">{newLeads.length}</p><p className="mt-2 text-sm text-slate-500">Uncontacted customer CRM records</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Follow-ups due</p><Users className="h-5 w-5 text-amber-600" /></div><p className="mt-3 text-4xl font-black text-slate-950">{dueFollowUps.length}</p><p className="mt-2 text-sm text-slate-500">Based on recorded next-action dates</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Today&apos;s appointments</p><CalendarDays className="h-5 w-5 text-emerald-600" /></div><p className="mt-3 text-4xl font-black text-slate-950">{todayAppointments.length}</p><p className="mt-2 text-sm text-slate-500">Booked customer conversations for today</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5 text-indigo-600" /> Customer CRM</CardTitle><Button variant="ghost" className="rounded-xl text-indigo-600" onClick={() => navigate("/admin/inbound_leads")}>Open inbox</Button></CardHeader><CardContent className="space-y-3">
          {loading && <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading enquiries…</div>}
          {!loading && leads.length === 0 && <p className="py-8 text-sm text-slate-500">No customer enquiries are available yet.</p>}
          {!loading && leads.slice(0, 6).map((lead) => <div key={lead.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"><div className="min-w-0"><p className="truncate font-bold text-slate-900">{lead.name}</p><p className="truncate text-xs text-slate-500">{lead.email || "No email recorded"} · {format(new Date(lead.createdAt), "d MMM, h:mm a")}</p></div><Badge variant="outline" className="capitalize">{lead.status}</Badge></div>)}
        </CardContent></Card>

        <Card className="rounded-2xl"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-600" /> Appointments</CardTitle><Button variant="ghost" className="rounded-xl text-indigo-600" onClick={() => navigate("/admin/businesses")}>Customer records</Button></CardHeader><CardContent className="space-y-3">
          {loading && <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading appointments…</div>}
          {!loading && appointments.length === 0 && <p className="py-8 text-sm text-slate-500">No upcoming appointments are booked.</p>}
          {!loading && appointments.slice(0, 8).map((appointment) => <div key={appointment.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"><div className="min-w-0"><p className="truncate font-bold text-slate-900">{appointment.customer_name || "Customer appointment"}</p><p className="truncate text-xs text-slate-500">{appointment.service || "General enquiry"} · {appointment.customer_email || "No email recorded"}</p></div><div className="shrink-0 text-right"><p className="flex items-center gap-1 text-sm font-bold text-slate-900"><Clock3 className="h-3.5 w-3.5" /> {appointment.date === today ? "Today" : format(parseISO(appointment.date), "d MMM")} {appointment.time || ""}</p><p className="text-xs capitalize text-slate-500">{appointment.status || "pending"}</p></div></div>)}
        </CardContent></Card>
      </div>
    </div>
  );
}
