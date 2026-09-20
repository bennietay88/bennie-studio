import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Briefcase, CalendarDays, Clock3, Inbox, Loader2, RefreshCw, Users } from "lucide-react";
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

type DeliveryProject = {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  target_launch_date?: string | null;
  updated_at?: string;
  businesses?: { name?: string } | null;
  assignee?: { full_name?: string; email?: string } | null;
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
  const [projects, setProjects] = useState<DeliveryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired.");

      const [leadResponse, appointmentResponse, projectResponse] = await Promise.all([
        fetch("/api/admin/leads", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch(`/api/admin/appointments?from=${today}&to=${format(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd")}`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase
          .from("projects")
          .select("id,title,status,priority,assigned_to,target_launch_date,updated_at,businesses(name),assignee:profiles!projects_assigned_to_fkey(full_name,email)")
          .order("updated_at", { ascending: false }),
      ]);
      const leadPayload = await leadResponse.json().catch(() => ({}));
      if (!leadResponse.ok) throw new Error(leadPayload.error || "Could not load customer CRM activity.");
      const appointmentPayload = await appointmentResponse.json().catch(() => ({}));
      if (!appointmentResponse.ok) throw new Error(appointmentPayload.error || "Could not load appointments.");
      setLeads((leadPayload.leads || []).map(mapLead));
      setAppointments((appointmentPayload.appointments || []) as OperatorAppointment[]);
      if (projectResponse.error) {
        console.warn("Delivery queue unavailable:", projectResponse.error.message);
        setProjects([]);
      } else {
        setProjects((projectResponse.data || []) as unknown as DeliveryProject[]);
      }
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
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const newLeads = useMemo(() => leads.filter((lead) => lead.status === "new"), [leads]);
  const dueFollowUps = useMemo(() => leads.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) <= new Date()), [leads]);
  const todayAppointments = useMemo(() => appointments.filter((appointment) => appointment.date === today), [appointments]);
  const activeProjects = useMemo(
    () => projects.filter((project) => !["live", "maintenance", "cancelled"].includes(String(project.status || ""))),
    [projects],
  );
  const overdueProjects = useMemo(
    () => activeProjects.filter((project) => project.target_launch_date && project.target_launch_date < today),
    [activeProjects],
  );
  const unassignedProjects = useMemo(
    () => activeProjects.filter((project) => !project.assigned_to),
    [activeProjects],
  );
  const reviewProjects = useMemo(
    () => activeProjects.filter((project) => ["internal_review", "customer_review", "changes_requested", "approved"].includes(String(project.status || ""))),
    [activeProjects],
  );

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-slate-400">New enquiries</p><Inbox className="h-5 w-5 text-indigo-600" /></div><p className="mt-3 text-4xl font-black text-slate-950">{newLeads.length}</p><p className="mt-2 text-sm text-slate-500">Uncontacted customer CRM records</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Delivery active</p><Briefcase className="h-5 w-5 text-indigo-600" /></div><p className="mt-3 text-4xl font-black text-slate-950">{activeProjects.length}</p><p className="mt-2 text-sm text-slate-500">{reviewProjects.length} currently in review/approval</p></CardContent></Card>
        <Card className={`rounded-2xl ${overdueProjects.length ? "border-rose-200 bg-rose-50/40" : ""}`}><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Overdue delivery</p><AlertTriangle className={`h-5 w-5 ${overdueProjects.length ? "text-rose-600" : "text-emerald-600"}`} /></div><p className="mt-3 text-4xl font-black text-slate-950">{overdueProjects.length}</p><p className="mt-2 text-sm text-slate-500">{unassignedProjects.length} active project(s) unassigned</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Today&apos;s appointments</p><CalendarDays className="h-5 w-5 text-emerald-600" /></div><p className="mt-3 text-4xl font-black text-slate-950">{todayAppointments.length}</p><p className="mt-2 text-sm text-slate-500">{dueFollowUps.length} sales follow-up(s) due</p></CardContent></Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-indigo-600" /> Delivery attention queue</CardTitle>
          <Button variant="ghost" className="rounded-xl text-indigo-600" onClick={() => navigate("/admin/projects")}>Open production workflow</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && activeProjects.length === 0 && <p className="py-6 text-sm text-slate-500">No active delivery projects.</p>}
          {activeProjects
            .sort((a, b) => {
              const aOverdue = a.target_launch_date && a.target_launch_date < today ? 1 : 0;
              const bOverdue = b.target_launch_date && b.target_launch_date < today ? 1 : 0;
              if (aOverdue !== bOverdue) return bOverdue - aOverdue;
              if (!a.assigned_to && b.assigned_to) return -1;
              if (a.assigned_to && !b.assigned_to) return 1;
              return String(a.target_launch_date || "9999").localeCompare(String(b.target_launch_date || "9999"));
            })
            .slice(0, 8)
            .map((project) => {
              const overdue = Boolean(project.target_launch_date && project.target_launch_date < today);
              return (
                <div key={project.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${overdue ? "border-rose-200 bg-rose-50/60" : "border-slate-100"}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-slate-900">{project.title || project.businesses?.name || "Customer website"}</p>
                      <Badge variant="outline" className="capitalize">{String(project.status || "new").replace(/_/g, " ")}</Badge>
                      {!project.assigned_to && <Badge className="border-none bg-amber-100 text-amber-700">Unassigned</Badge>}
                      {overdue && <Badge className="border-none bg-rose-100 text-rose-700">Overdue</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {project.businesses?.name || "Customer"} · Owner: {project.assignee?.full_name || project.assignee?.email || "Not assigned"}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs font-bold text-slate-500">
                    {project.target_launch_date ? `Target ${new Date(`${project.target_launch_date}T00:00:00`).toLocaleDateString()}` : "No launch target"}
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

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
