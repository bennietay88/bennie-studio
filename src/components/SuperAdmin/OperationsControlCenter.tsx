import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  HeartPulse,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { STAFF_PERMISSIONS } from "../../constants/staffPermissions";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { calculateCustomerHealth } from "../../lib/automationPolicy";

const eventLabel = (value: string) => value?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function OperationsControlCenter() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [billingEvents, setBillingEvents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [updateRequests, setUpdateRequests] = useState<any[]>([]);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTermId, setSavingTermId] = useState<string | null>(null);
  const [savingModeId, setSavingModeId] = useState<string | null>(null);
  const [approvalDraft, setApprovalDraft] = useState({
    business_id: "",
    project_id: "",
    title: "Website review and approval",
    description: "Please review the latest website version and approve it or request changes.",
    version_label: "Version 1",
    preview_url: "",
  });

  const isSuperAdmin = profile?.role === "super_admin";
  const staffPermissions = profile?.staffPermissions || [];
  const canView = (permission: string) => isSuperAdmin || staffPermissions.includes(permission);
  const defaultTab = canView("customer_health")
    ? "health"
    : canView("approvals")
      ? "approvals"
      : canView("billing")
        ? "billing"
        : "activity";

  const loadOperations = async () => {
    setLoading(true);
    const emptyResult = Promise.resolve({ data: [], error: null });
    const sources = [
      { name: "Businesses", request: supabase.from("businesses").select("*").order("created_at", { ascending: false }) },
      { name: "Projects", request: canView("delivery") || canView("approvals") ? supabase.from("projects").select("*, businesses(name)").order("updated_at", { ascending: false }) : emptyResult },
      { name: "Approvals", request: canView("approvals") ? supabase.from("customer_approvals").select("*, businesses(name)").order("requested_at", { ascending: false }) : emptyResult },
      { name: "Billing lifecycle", request: canView("billing") ? supabase.from("billing_lifecycle_events").select("*, businesses(name)").order("created_at", { ascending: false }) : emptyResult },
      { name: "Activity log", request: canView("activity_logs") ? supabase.from("admin_action_audit_logs").select("*").order("created_at", { ascending: false }).limit(100) : emptyResult },
      { name: "Staff permissions", request: isSuperAdmin ? supabase.from("profiles").select("id, email, full_name, role, status, staff_permissions").eq("role", "platform_staff") : emptyResult },
      { name: "Leads", request: canView("customer_health") ? supabase.from("leads").select("id, business_id, created_at") : emptyResult },
      { name: "Support tickets", request: canView("customer_health") ? supabase.from("support_tickets").select("id, business_id, status, created_at") : emptyResult },
      { name: "Websites", request: canView("customer_health") ? supabase.from("websites").select("id, business_id, status, updated_at") : emptyResult },
      { name: "Update requests", request: canView("support") ? supabase.from("monthly_update_requests").select("*, businesses(name, plan)").order("created_at", { ascending: false }).limit(100) : emptyResult },
    ];
    const requests = await Promise.allSettled(sources.map((source) => source.request));

    const setters = [setBusinesses, setProjects, setApprovals, setBillingEvents, setAuditLogs, setStaff, setLeads, setTickets, setWebsites, setUpdateRequests];
    const failures: string[] = [];
    requests.forEach((result: any, index) => {
      if (result.status === "fulfilled" && !result.value.error) setters[index](result.value.data || []);
      else {
        const reason = result.status === "rejected" ? result.reason : result.value.error;
        failures.push(`${sources[index].name}: ${reason?.message || "unavailable"}`);
      }
    });
    if (failures.length) {
      console.warn("Operations data sources unavailable:", failures);
      toast.warning(`Operations data unavailable: ${failures.map((failure) => failure.split(":")[0]).join(", ")}.`, {
        description: "Apply the latest operations migration, then refresh this page.",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOperations();
  }, []);

  const healthRows = useMemo(
    () =>
      businesses.map((business) => {
        const businessLeads = leads.filter((lead) => lead.business_id === business.id);
        const openTickets = tickets.filter((ticket) => ticket.business_id === business.id && !["resolved", "closed"].includes(ticket.status));
        const website = websites.find((item) => item.business_id === business.id);
        const risks: string[] = [];
        if (["unpaid", "past_due"].includes(business.subscription_status) || business.status === "unpaid") risks.push("Payment attention");
        if (["inactive", "suspended", "cancelled"].includes(business.status)) risks.push("Account inactive");
        if (!website) risks.push("No website record");
        if (openTickets.length) risks.push(`${openTickets.length} open support item(s)`);
        if (!businessLeads.length) risks.push("No recorded enquiries yet");
        if (business.trial_ends_at && new Date(business.trial_ends_at).getTime() - Date.now() < 3 * 86400000) risks.push("Trial ending soon");
        const health = calculateCustomerHealth({ onboardingComplete: Boolean(business.onboarding_completed), websiteLive: ["live", "published"].includes(String(website?.status || "")), paymentHealthy: !["unpaid", "past_due"].includes(String(business.subscription_status || "")) && business.status !== "unpaid", recentEngagement: businessLeads.length > 0, openIssues: openTickets.length, overdueApproval: false });
        return { business, risks, health, leads: businessLeads.length, tickets: openTickets.length };
      }).sort((a, b) => b.risks.length - a.risks.length),
    [businesses, leads, tickets, websites],
	  );

  const commandItems = useMemo(() => {
    const items: Array<{
      id: string;
      customer: string;
      business: string;
      planOrService: string;
      status: string;
      owner: string;
      dueDate: string;
      nextAction: string;
      priority: "high" | "medium" | "normal";
      href: string;
    }> = [];

    businesses.forEach((business) => {
      if (["unpaid", "past_due"].includes(String(business.subscription_status || "")) || business.status === "unpaid") {
        items.push({
          id: `payment-${business.id}`,
          customer: business.owner_email || business.email || "Customer",
          business: business.name,
          planOrService: business.plan || "Managed website",
          status: business.subscription_status || business.status,
          owner: "Billing",
          dueDate: "Now",
          nextAction: "Recover payment or confirm grace period",
          priority: "high",
          href: "/admin/operations",
        });
      }
      if (business.custom_domain && (business.custom_domain_status !== "connected" || business.ssl_status !== "issued" || business.custom_domain_error)) {
        items.push({
          id: `domain-${business.id}`,
          customer: business.owner_email || business.email || "Customer",
          business: business.name,
          planOrService: business.plan || "Managed website",
          status: business.custom_domain_error || business.custom_domain_status || "domain_pending",
          owner: "Delivery",
          dueDate: "Before publication",
          nextAction: "Review DNS, verification, SSL, or suspension state",
          priority: "medium",
          href: "/admin/projects",
        });
      }
      if (!business.onboarding_completed) {
        items.push({
          id: `onboarding-${business.id}`,
          customer: business.owner_email || business.email || "Customer",
          business: business.name,
          planOrService: business.plan || "Managed website",
          status: "incomplete_onboarding",
          owner: "Customer",
          dueDate: "Before draft",
          nextAction: "Ask customer to complete onboarding",
          priority: "medium",
          href: "/admin/client-onboarding",
        });
      }
    });

    projects
      .filter((project) => !["live", "launched", "cancelled", "lost"].includes(String(project.status || "")))
      .forEach((project) => {
        items.push({
          id: `project-${project.id}`,
          customer: project.businesses?.name || "Customer",
          business: project.businesses?.name || project.business_id || "Business",
          planOrService: project.type || "Website project",
          status: project.status || "open",
          owner: ["customer_review", "changes_requested"].includes(project.status) ? "Customer" : "Delivery",
          dueDate: project.due_date || project.launch_target_at || "Set due date",
          nextAction: ["customer_review", "changes_requested"].includes(project.status) ? "Collect customer feedback or approval" : "Move project to next delivery stage",
          priority: project.priority === "high" ? "high" : "normal",
          href: "/admin/projects",
        });
      });

    approvals
      .filter((approval) => approval.status === "pending" || approval.status === "changes_requested")
      .forEach((approval) => {
        items.push({
          id: `approval-${approval.id}`,
          customer: approval.businesses?.name || "Customer",
          business: approval.businesses?.name || approval.business_id || "Business",
          planOrService: "Website approval",
          status: approval.status,
          owner: approval.status === "pending" ? "Customer" : "Delivery",
          dueDate: approval.requested_at ? new Date(approval.requested_at).toLocaleDateString() : "Awaiting response",
          nextAction: approval.status === "pending" ? "Follow up for approval decision" : "Review requested changes",
          priority: approval.status === "changes_requested" ? "high" : "medium",
          href: "/admin/operations",
        });
      });

    updateRequests
      .filter((request) => !["completed", "declined", "cancelled"].includes(String(request.status || "")))
      .forEach((request) => {
        items.push({
          id: `update-${request.id}`,
          customer: request.businesses?.name || "Customer",
          business: request.businesses?.name || request.business_id || "Business",
          planOrService: request.businesses?.plan || "Monthly update",
          status: request.status || "submitted",
          owner: request.status === "waiting_for_customer" ? "Customer" : "Support",
          dueDate: request.estimated_response_at ? new Date(request.estimated_response_at).toLocaleDateString() : "2 business days",
          nextAction: request.status === "submitted" ? "Acknowledge and assign update request" : "Move request to next status",
          priority: request.priority === "high" || request.priority === "launch_blocker" ? "high" : "normal",
          href: "/admin/update-requests",
        });
      });

    billingEvents
      .filter((event) => event.status === "open")
      .forEach((event) => {
        items.push({
          id: `billing-${event.id}`,
          customer: event.businesses?.name || "Customer",
          business: event.businesses?.name || event.business_id || "Business",
          planOrService: "Billing",
          status: event.event_type,
          owner: "Billing",
          dueDate: event.due_at ? new Date(event.due_at).toLocaleDateString() : "Now",
          nextAction: "Resolve billing lifecycle event",
          priority: "high",
          href: "/admin/operations",
        });
      });

    const priorityRank = { high: 0, medium: 1, normal: 2 };
    return items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]).slice(0, 25);
  }, [approvals, billingEvents, businesses, projects, updateRequests]);

  const togglePermission = async (member: any, permission: string) => {
    if (!isSuperAdmin) return toast.error("Only Super Admins can change staff permissions");
    const current = Array.isArray(member.staff_permissions) ? member.staff_permissions : [];
    const next = current.includes(permission) ? current.filter((item: string) => item !== permission) : [...current, permission];
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/platform-staff/${member.id}/permissions`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ permissions: next }) });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error || "Permissions could not be updated");
    if (approvalDraft.project_id) {
      await supabase.from("projects").update({ status: "customer_review", updated_at: new Date().toISOString() }).eq("id", approvalDraft.project_id);
    }
    setStaff((rows) => rows.map((row) => row.id === member.id ? { ...row, staff_permissions: next } : row));
    await supabase.from("admin_action_audit_logs").insert({
      actor_user_id: profile?.uid,
      actor_email: profile?.email,
      action_type: "staff.permissions_updated",
      target_type: "profile",
      target_id: member.id,
      target_label: member.email,
      metadata: { permissions: next },
    });
    toast.success("Staff permissions updated");
  };

  const createApproval = async () => {
    if (!approvalDraft.business_id || !approvalDraft.title.trim()) return toast.error("Business and approval title are required");
    setSaving(true);
    const { error } = await supabase.from("customer_approvals").insert({
      ...approvalDraft,
      project_id: approvalDraft.project_id || null,
      preview_url: approvalDraft.preview_url || null,
      requested_by: profile?.uid,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setIsApprovalOpen(false);
    toast.success("Approval request sent to customer portal");
    loadOperations();
  };

  const resolveBillingEvent = async (event: any) => {
    const { error } = await supabase.from("billing_lifecycle_events").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", event.id);
    if (error) return toast.error(error.message);
    setBillingEvents((rows) => rows.map((row) => row.id === event.id ? { ...row, status: "resolved" } : row));
    toast.success("Billing event resolved");
  };

  const updateContractTerm = async (businessId: string, value: string) => {
    if (!isSuperAdmin) return;
    setSavingTermId(businessId);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/businesses/${businessId}/contract-term`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ termMonths: value === "catalogue" ? null : Number(value) }),
    });
    const result = await response.json().catch(() => ({}));
    setSavingTermId(null);
    if (!response.ok) return toast.error(result.error || "Contract term could not be updated");
    setBusinesses((rows) => rows.map((row) => row.id === businessId ? { ...row, commercial_term_months: result.business?.commercial_term_months ?? null } : row));
    toast.success(value === "catalogue" ? "Customer restored to the 12-month catalogue term" : `Customer term set to ${value} months`);
  };

  const updateAutomationMode = async (businessId: string, mode: "off" | "assisted" | "full") => {
    if (!isSuperAdmin) return;
    setSavingModeId(businessId);
    const { error } = await supabase.from("businesses").update({ automation_mode: mode }).eq("id", businessId);
    setSavingModeId(null);
    if (error) return toast.error(error.message);
    setBusinesses((rows) => rows.map((row) => row.id === businessId ? { ...row, automation_mode: mode } : row));
    toast.success(`Automation mode set to ${mode}`);
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">Operations Control</h1>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">Customer retention, production, approvals, billing actions, staff access, and operational history in one place.</p>
        </div>
        <Button variant="outline" onClick={loadOperations} className="rounded-xl"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          canView("customer_health") && ["Customers needing attention", healthRows.filter((row) => row.risks.length > 0).length, HeartPulse],
          canView("delivery") && ["Active delivery", projects.filter((item) => !["live", "cancelled"].includes(item.status)).length, Activity],
          canView("approvals") && ["Pending approvals", approvals.filter((item) => item.status === "pending").length, ShieldCheck],
          canView("billing") && ["Billing attention", billingEvents.filter((item) => item.status === "open").length, CreditCard],
        ].filter(Boolean).map(([label, value, Icon]: any) => (
          <Card key={label} className="rounded-2xl border-slate-200"><CardContent className="p-5"><Icon className="h-5 w-5 text-indigo-600" /><p className="mt-4 text-xs font-bold text-slate-500">{label}</p><p className="text-3xl font-black text-slate-950">{value}</p></CardContent></Card>
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-indigo-600" /> Command Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {commandItems.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_1.2fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-black text-slate-950">{item.business}</p>
                <p className="text-xs font-semibold text-slate-500">{item.customer}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Plan / service</p>
                <p className="text-sm font-bold text-slate-700">{eventLabel(item.planOrService)}</p>
              </div>
              <Badge variant="outline" className="w-fit capitalize">{eventLabel(item.status)}</Badge>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Owner</p>
                <p className="text-sm font-bold text-slate-700">{item.owner}</p>
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">{item.nextAction}</p>
                <p className="text-xs font-semibold text-slate-500">Due: {item.dueDate}</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => window.location.assign(item.href)}>Open</Button>
            </div>
          ))}
          {!commandItems.length && <EmptyState text="No urgent operational items found." />}
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-auto flex-wrap rounded-2xl bg-slate-100 p-1">
          {canView("customer_health") && <TabsTrigger value="health" className="rounded-xl">Customer Signals</TabsTrigger>}
          {canView("approvals") && <TabsTrigger value="approvals" className="rounded-xl">Approvals</TabsTrigger>}
          {canView("billing") && <TabsTrigger value="billing" className="rounded-xl">Billing Lifecycle</TabsTrigger>}
          {canView("activity_logs") && <TabsTrigger value="activity" className="rounded-xl">Activity Log</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="permissions" className="rounded-xl">Staff Permissions</TabsTrigger>}
        </TabsList>

        <TabsContent value="health" className="space-y-3 pt-4">
          {healthRows.map(({ business, risks, health, leads: leadCount, tickets: ticketCount }) => (
            <Card key={business.id} className="rounded-2xl border-slate-200"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1"><p className="font-black text-slate-950">{business.name}</p><p className="text-xs font-semibold text-slate-500">{business.plan} · {business.status} · {leadCount} enquiries · {ticketCount} support items</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">Health {health.score} · {health.status.replace("_", " ")}</p></div>
              {isSuperAdmin && <div className="flex flex-wrap items-center gap-2"><Label htmlFor={`term-${business.id}`} className="whitespace-nowrap text-xs font-bold text-slate-500">Initial term</Label><Select value={String(business.commercial_term_months || "catalogue")} onValueChange={(value) => void updateContractTerm(business.id, value)} disabled={savingTermId === business.id}><SelectTrigger id={`term-${business.id}`} className="h-9 w-32 rounded-xl text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="catalogue">12 months (default)</SelectItem><SelectItem value="3">3 months</SelectItem><SelectItem value="6">6 months</SelectItem><SelectItem value="9">9 months</SelectItem><SelectItem value="12">12 months (override)</SelectItem></SelectContent></Select><Label htmlFor={`mode-${business.id}`} className="whitespace-nowrap text-xs font-bold text-slate-500">Automation</Label><Select value={business.automation_mode || "assisted"} onValueChange={(value) => void updateAutomationMode(business.id, value as "off" | "assisted" | "full")} disabled={savingModeId === business.id}><SelectTrigger id={`mode-${business.id}`} className="h-9 w-28 rounded-xl text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="off">Off</SelectItem><SelectItem value="assisted">Assisted</SelectItem><SelectItem value="full">Full (safe tasks)</SelectItem></SelectContent></Select></div>}
              <div className="flex flex-wrap gap-2">{risks.length ? risks.map((risk) => <Badge key={risk} variant="outline" className="rounded-full">{risk}</Badge>) : <Badge className="bg-emerald-100 text-emerald-700">No attention signal</Badge>}</div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4 pt-4">
          <div className="flex justify-end"><Button onClick={() => setIsApprovalOpen(true)} className="rounded-xl bg-indigo-600"><Plus className="mr-2 h-4 w-4" />Request Approval</Button></div>
          {approvals.map((approval) => <Card key={approval.id} className="rounded-2xl"><CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center"><div className="flex-1"><p className="font-black">{approval.title}</p><p className="text-xs text-slate-500">{approval.businesses?.name} · {approval.version_label || "Current version"}</p>{approval.customer_notes && <p className="mt-2 text-sm text-slate-600">{approval.customer_notes}</p>}</div><Badge className={approval.status === "approved" ? "bg-emerald-100 text-emerald-700" : approval.status === "changes_requested" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}>{eventLabel(approval.status)}</Badge>{approval.status !== "approved" && <Button size="sm" variant="outline" onClick={async () => { const { error } = await supabase.from("customer_approvals").update({ status: "pending", requested_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", approval.id); if (error) toast.error(error.message); else { toast.success("Approval request resent"); loadOperations(); } }} className="rounded-xl">Resend</Button>}</CardContent></Card>)}
          {!approvals.length && <EmptyState text="No customer approval requests yet." />}
        </TabsContent>

        <TabsContent value="billing" className="space-y-3 pt-4">
          {billingEvents.map((event) => <Card key={event.id} className="rounded-2xl"><CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center"><AlertTriangle className={event.status === "open" ? "h-5 w-5 text-amber-500" : "h-5 w-5 text-emerald-500"}/><div className="flex-1"><p className="font-black">{eventLabel(event.event_type)}</p><p className="text-xs text-slate-500">{event.businesses?.name} · {new Date(event.created_at).toLocaleString()}</p></div><Badge variant="outline">{event.status}</Badge>{event.status === "open" && <Button size="sm" variant="outline" onClick={() => resolveBillingEvent(event)} className="rounded-xl"><CheckCircle2 className="mr-2 h-4 w-4"/>Mark Resolved</Button>}</CardContent></Card>)}
          {!billingEvents.length && <EmptyState text="No billing lifecycle events recorded." />}
        </TabsContent>

        <TabsContent value="activity" className="space-y-2 pt-4">
          {auditLogs.map((log) => <div key={log.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"><Activity className="mt-0.5 h-4 w-4 text-indigo-600"/><div><p className="text-sm font-black">{eventLabel(log.action_type)}</p><p className="text-xs text-slate-500">{log.actor_email || "System"} · {log.target_label || log.target_type || "Platform"} · {new Date(log.created_at).toLocaleString()}</p></div></div>)}
          {!auditLogs.length && <EmptyState text="No operational activity has been recorded." />}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4 pt-4">
          {staff.map((member) => <Card key={member.id} className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-indigo-600"/>{member.full_name || member.email}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{STAFF_PERMISSIONS.map((permission) => <div key={permission.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-bold">{permission.label}</p><p className="text-xs text-slate-500">{permission.description}</p></div><Switch checked={(member.staff_permissions || []).includes(permission.id)} onCheckedChange={() => togglePermission(member, permission.id)}/></div>)}</CardContent></Card>)}
          {!staff.length && <EmptyState text="No Platform Staff accounts found." />}
        </TabsContent>
      </Tabs>

      <Dialog open={isApprovalOpen} onOpenChange={setIsApprovalOpen}>
        <DialogContent className="max-w-lg rounded-3xl"><DialogHeader><DialogTitle>Request Customer Approval</DialogTitle><DialogDescription>The request appears in the customer portal and records the response.</DialogDescription></DialogHeader><div className="space-y-4 py-3"><Field label="Customer"><Select value={approvalDraft.business_id} onValueChange={(value) => setApprovalDraft({ ...approvalDraft, business_id: value, project_id: "" })}><SelectTrigger><SelectValue placeholder="Select customer"/></SelectTrigger><SelectContent>{businesses.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Project"><Select value={approvalDraft.project_id || "none"} onValueChange={(value) => setApprovalDraft({ ...approvalDraft, project_id: value === "none" ? "" : value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No project link</SelectItem>{projects.filter((project) => project.business_id === approvalDraft.business_id).map((project) => <SelectItem key={project.id} value={project.id}>{project.title || "Website project"}</SelectItem>)}</SelectContent></Select></Field><Field label="Title"><Input value={approvalDraft.title} onChange={(e) => setApprovalDraft({ ...approvalDraft, title: e.target.value })}/></Field><Field label="Version"><Input value={approvalDraft.version_label} onChange={(e) => setApprovalDraft({ ...approvalDraft, version_label: e.target.value })}/></Field><Field label="Preview URL"><Input value={approvalDraft.preview_url} onChange={(e) => setApprovalDraft({ ...approvalDraft, preview_url: e.target.value })} placeholder="https://..."/></Field><Field label="Instructions"><Textarea value={approvalDraft.description} onChange={(e) => setApprovalDraft({ ...approvalDraft, description: e.target.value })}/></Field></div><DialogFooter><Button variant="outline" onClick={() => setIsApprovalOpen(false)}>Cancel</Button><Button onClick={createApproval} disabled={saving} className="bg-indigo-600">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Send Approval Request</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
