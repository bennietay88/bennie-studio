import React from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, Filter, PauseCircle, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { cn, formatDate } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

type UpdateRequest = {
  id: string;
  business_id: string;
  status: "draft" | "submitted" | "acknowledged" | "in_progress" | "waiting_for_customer" | "completed" | "declined" | "cancelled";
  title: string;
  details?: string;
  update_category?: string;
  request_type?: string;
  priority?: "normal" | "high" | "launch_blocker";
  allowance_period?: string;
  customer_draft?: Record<string, any>;
  customer_response?: string | null;
  customer_response_at?: string | null;
  estimated_response_at?: string | null;
  sla_paused_at?: string | null;
  sla_paused_seconds?: number;
  escalated_at?: string | null;
  escalation_reason?: string | null;
  scope_classification?: "included" | "clarification" | "out_of_scope" | null;
  scope_notes?: string | null;
  admin_response?: string | null;
  created_at: string;
  completed_at?: string | null;
  business?: { name?: string; plan?: string; subdomain?: string; custom_domain?: string };
};

const statusOptions: UpdateRequest["status"][] = ["submitted", "acknowledged", "in_progress", "waiting_for_customer", "completed", "declined", "cancelled"];
const scopeOptions = ["included", "clarification", "out_of_scope"] as const;

export function MonthlyUpdateQueue() {
  const { profile } = useAuth();
  const [requests, setRequests] = React.useState<UpdateRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [workingId, setWorkingId] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [scopeDrafts, setScopeDrafts] = React.useState<Record<string, { classification: string; notes: string }>>({});
  const [responseDrafts, setResponseDrafts] = React.useState<Record<string, string>>({});
  const [escalationDrafts, setEscalationDrafts] = React.useState<Record<string, string>>({});
  const [overrideDrafts, setOverrideDrafts] = React.useState<Record<string, string>>({});
  const [overrideKeys, setOverrideKeys] = React.useState<Record<string, string>>({});
  const [overrideHistory, setOverrideHistory] = React.useState<Record<string, any[]>>({});
  const [revokeDrafts, setRevokeDrafts] = React.useState<Record<string, string>>({});
  const canManage = profile?.role === "super_admin" || (profile?.staffPermissions || []).some((permission) => ["delivery", "customer_health"].includes(permission));
  const isSuperAdmin = profile?.role === "super_admin";

  const loadRequests = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("monthly_update_requests")
      .select("*, business:business_id(name, plan, subdomain, custom_domain)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Failed to load monthly update requests:", error);
      toast.error("Failed to load update requests.");
      setRequests([]);
    } else {
      setRequests((data || []) as UpdateRequest[]);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { void loadRequests(); }, [loadRequests]);

  const saveRequest = async (request: UpdateRequest, change: Record<string, any>) => {
    if (!canManage || workingId) return;
    if (change.p_status === "waiting_for_customer" && String(change.p_admin_response || "").trim().length < 10) {
      toast.error("Add a clear customer message before pausing the SLA.");
      return;
    }
    setWorkingId(request.id);
    const { data, error } = await supabase.rpc("admin_update_monthly_update_request", {
      p_request_id: request.id,
      p_status: change.p_status ?? null,
      p_scope_classification: change.p_scope_classification ?? null,
      p_scope_notes: change.p_scope_notes ?? null,
      p_admin_response: change.p_admin_response ?? null,
    });
    setWorkingId("");
    if (error) {
      console.error("Update request action failed:", error);
      toast.error(error.message || "Failed to update request.");
      return;
    }
    const updated = Array.isArray(data) ? data[0] : data;
    if (updated) setRequests((previous) => previous.map((item) => item.id === request.id ? { ...item, ...updated, business: item.business } : item));
    if (change.p_scope_classification) toast.success("Request scope classification saved to the audit trail.");
    else toast.success(`Request marked ${String(change.p_status).replace(/_/g, " ")}.`);
  };

  const escalate = async (request: UpdateRequest) => {
    const reason = escalationDrafts[request.id]?.trim() || "";
    if (reason.length < 10) return toast.error("Explain why this overdue request needs internal review.");
    setWorkingId(request.id);
    const { data, error } = await supabase.rpc("escalate_monthly_update_request", { p_request_id: request.id, p_reason: reason });
    setWorkingId("");
    if (error) return toast.error(error.message || "The request could not be escalated.");
    const updated = Array.isArray(data) ? data[0] : data;
    if (updated) setRequests((previous) => previous.map((item) => item.id === request.id ? { ...item, ...updated, business: item.business } : item));
    toast.success("Escalated to Bennie Studio platform admins.");
  };

  const grantAllowance = async (request: UpdateRequest) => {
    const reason = overrideDrafts[request.business_id]?.trim() || "";
    const currentPeriod = new Date().toISOString().slice(0, 7);
    if (request.allowance_period !== currentPeriod) return toast.error("Only the current allowance period can be overridden.");
    if (reason.length < 10) return toast.error("Add a reason of at least 10 characters for the audit record.");
    setWorkingId(request.business_id);
    const idempotencyKey = overrideKeys[request.business_id] || crypto.randomUUID();
    if (!overrideKeys[request.business_id]) setOverrideKeys((previous) => ({ ...previous, [request.business_id]: idempotencyKey }));
    const { error } = await supabase.rpc("grant_monthly_update_allowance_override", {
      p_business_id: request.business_id,
      p_allowance_period: currentPeriod,
      p_allowance_delta: 1,
      p_reason: reason,
      p_idempotency_key: idempotencyKey,
    });
    setWorkingId("");
    if (error) return toast.error(error.message || "Allowance override was not saved.");
    setOverrideDrafts((previous) => ({ ...previous, [request.business_id]: "" }));
    setOverrideKeys((previous) => ({ ...previous, [request.business_id]: "" }));
    toast.success("One extra update slot was granted and audit logged.");
  };

  const loadOverrideHistory = async (request: UpdateRequest) => {
    const { data, error } = await supabase.rpc("list_monthly_update_allowance_overrides", { p_business_id: request.business_id });
    if (error) return toast.error(error.message || "Allowance history could not be loaded.");
    setOverrideHistory((previous) => ({ ...previous, [request.business_id]: Array.isArray(data) ? data : data ? [data] : [] }));
  };

  const revokeAllowance = async (businessId: string, overrideId: string) => {
    const reason = revokeDrafts[overrideId]?.trim() || "";
    if (reason.length < 10) return toast.error("Add a reason of at least 10 characters for the audit record.");
    setWorkingId(overrideId);
    const { data, error } = await supabase.rpc("revoke_monthly_update_allowance_override", { p_override_id: overrideId, p_reason: reason });
    setWorkingId("");
    if (error) return toast.error(error.message || "Allowance override could not be revoked.");
    const revoked = Array.isArray(data) ? data[0] : data;
    if (revoked) setOverrideHistory((previous) => ({
      ...previous,
      [businessId]: (previous[businessId] || []).map((item) => item.id === overrideId ? { ...item, ...revoked } : item),
    }));
    toast.success("Allowance override revoked and audit logged.");
  };

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const haystack = [request.title, request.details, request.update_category, request.priority, request.status, request.scope_classification, request.business?.name, request.business?.plan].join(" ").toLowerCase();
    return matchesStatus && haystack.includes(searchQuery.toLowerCase());
  });
  const now = Date.now();
  const active = requests.filter((request) => !["completed", "declined", "cancelled"].includes(request.status));
  const overdue = active.filter((request) => request.status !== "waiting_for_customer" && request.estimated_response_at && Date.parse(request.estimated_response_at) <= now);
  const stats = [
    { label: "Submitted", value: requests.filter((item) => item.status === "submitted").length, icon: Clock, tone: "text-blue-600 bg-blue-50" },
    { label: "In Progress", value: requests.filter((item) => item.status === "in_progress").length, icon: Wrench, tone: "text-amber-600 bg-amber-50" },
    { label: "Waiting · Paused", value: requests.filter((item) => item.status === "waiting_for_customer").length, icon: PauseCircle, tone: "text-amber-700 bg-amber-50" },
    { label: "Overdue SLA", value: overdue.length, icon: AlertTriangle, tone: "text-rose-600 bg-rose-50" },
    { label: "Completed", value: requests.filter((item) => item.status === "completed").length, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-4 border-indigo-100 bg-indigo-50 text-indigo-700">Managed Website Service</Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Monthly Update Queue</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">Review scope, respond to customers, pause SLAs while waiting, and escalate overdue work internally.</p>
        </div>
        <Button onClick={() => void loadRequests()} variant="outline" className="rounded-2xl font-semibold">Refresh Queue</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-3xl border-slate-100"><CardContent className="p-6">
            <div className={cn("mb-5 flex h-11 w-11 items-center justify-center rounded-2xl", stat.tone)}><stat.icon className="h-5 w-5" /></div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{stat.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="rounded-3xl border-slate-100">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><CardTitle>Request Review</CardTitle><CardDescription>Scope and status changes are recorded with the staff actor and timestamp.</CardDescription></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search requests..." className="h-11 rounded-2xl pl-9" /></div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium">
                <option value="all">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <div className="rounded-2xl bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">Loading update requests...</div> : filteredRequests.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-10 text-center"><CalendarCheck className="mx-auto mb-4 h-10 w-10 text-slate-300" /><p className="font-semibold text-slate-950">No update requests found</p><p className="mt-1 text-sm font-semibold text-slate-500">Requests submitted by customers will appear here.</p></div>
          ) : filteredRequests.map((request) => {
            const isPaused = request.status === "waiting_for_customer";
            const requestOverdue = !isPaused && !["completed", "declined", "cancelled"].includes(request.status) && Boolean(request.estimated_response_at && Date.parse(request.estimated_response_at) <= now);
            const scope = scopeDrafts[request.id] || { classification: request.scope_classification || "", notes: request.scope_notes || "" };
            return (
              <div key={request.id} className="space-y-4 rounded-3xl border border-slate-100 p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge className="capitalize bg-slate-100 text-slate-700">{request.status.replace(/_/g, " ")}</Badge>
                      {isPaused && <Badge className="bg-amber-100 text-amber-800">SLA paused for customer</Badge>}
                      {requestOverdue && <Badge className="bg-rose-100 text-rose-700">Overdue</Badge>}
                      {request.escalated_at && <Badge className="bg-purple-100 text-purple-800">Escalated internally</Badge>}
                      {request.scope_classification && <Badge variant="outline" className="capitalize">Scope: {request.scope_classification.replace(/_/g, " ")}</Badge>}
                      <Badge className={cn("capitalize", request.priority === "launch_blocker" ? "bg-rose-100 text-rose-700" : request.priority === "high" ? "bg-amber-100 text-amber-700" : "bg-indigo-50 text-indigo-700")}>{(request.priority || "normal").replace(/_/g, " ")}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-950">{request.title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{request.details || "No details provided."}</p>
                    {request.admin_response && <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm font-bold text-indigo-800">Customer message: {request.admin_response}</p>}
                    {request.customer_response && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Latest customer response: {request.customer_response}</p>}
                    {request.scope_notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">Scope note: {request.scope_notes}</p>}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                      <span>{request.business?.name || request.business_id}</span><span>Plan: {(request.business?.plan || "unknown").toUpperCase()}</span><span>Period: {request.allowance_period || "current"}</span>
                      <span>Submitted: {formatDate(new Date(request.created_at).getTime())}</span>
                      <span>{isPaused ? `Paused since ${request.sla_paused_at ? formatDate(Date.parse(request.sla_paused_at)) : "customer follow-up"}` : `Response due ${request.estimated_response_at ? formatDate(Date.parse(request.estimated_response_at)) : "not set"}`}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button disabled={!canManage || Boolean(workingId)} size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => void saveRequest(request, { p_status: "in_progress" })}>In Progress</Button>
                    <Button disabled={!canManage || Boolean(workingId)} size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => void saveRequest(request, { p_status: "waiting_for_customer", p_admin_response: responseDrafts[request.id] })}>Needs Info</Button>
                    <Button disabled={!canManage || Boolean(workingId)} size="sm" className="rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700" onClick={() => void saveRequest(request, { p_status: "completed" })}>Done</Button>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wide text-slate-500" htmlFor={`update-admin-response-${request.id}`}>Customer-facing reply</label>
                    <Textarea id={`update-admin-response-${request.id}`} value={responseDrafts[request.id] ?? request.admin_response ?? ""} onChange={(event) => setResponseDrafts((previous) => ({ ...previous, [request.id]: event.target.value }))} maxLength={5000} placeholder="Explain the clarification or next step. Required when pausing the SLA." className="min-h-20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wide text-slate-500" htmlFor={`update-scope-${request.id}`}>Scope classification</label>
                    <select id={`update-scope-${request.id}`} value={scope.classification} onChange={(event) => setScopeDrafts((previous) => ({ ...previous, [request.id]: { ...scope, classification: event.target.value } }))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                      <option value="">Not classified</option>{scopeOptions.map((option) => <option value={option} key={option}>{option.replace(/_/g, " ")}</option>)}
                    </select>
                    <Textarea value={scope.notes} onChange={(event) => setScopeDrafts((previous) => ({ ...previous, [request.id]: { ...scope, notes: event.target.value } }))} maxLength={2000} placeholder="Record why the request fits this scope. Required to save a classification." className="min-h-16" />
                    <Button disabled={!canManage || Boolean(workingId) || !scope.classification} size="sm" variant="outline" className="rounded-xl" onClick={() => void saveRequest(request, { p_scope_classification: scope.classification, p_scope_notes: scope.notes })}>Save scope classification</Button>
                  </div>
                </div>

                {requestOverdue && !request.escalated_at && canManage && (
                  <div className="grid gap-2 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="text-xs font-black uppercase tracking-wide text-rose-800" htmlFor={`update-escalation-${request.id}`}>Internal escalation reason
                      <Textarea id={`update-escalation-${request.id}`} value={escalationDrafts[request.id] || ""} onChange={(event) => setEscalationDrafts((previous) => ({ ...previous, [request.id]: event.target.value }))} maxLength={500} placeholder="Why does this overdue request need platform-admin attention?" className="mt-2 min-h-16 bg-white" />
                    </label>
                    <Button disabled={Boolean(workingId)} size="sm" onClick={() => void escalate(request)} className="rounded-xl bg-rose-700">Escalate internally</Button>
                  </div>
                )}

                {isSuperAdmin && request.allowance_period === new Date().toISOString().slice(0, 7) && (
                  <div className="grid gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="text-xs font-black uppercase tracking-wide text-indigo-900" htmlFor={`update-override-${request.id}`}>Allowance override reason · one extra slot
                      <Textarea id={`update-override-${request.id}`} value={overrideDrafts[request.business_id] || ""} onChange={(event) => { setOverrideDrafts((previous) => ({ ...previous, [request.business_id]: event.target.value })); setOverrideKeys((previous) => ({ ...previous, [request.business_id]: "" })); }} maxLength={500} placeholder="Provide the business reason for the exception." className="mt-2 min-h-16 bg-white" />
                    </label>
                    <Button disabled={Boolean(workingId)} size="sm" variant="outline" onClick={() => void grantAllowance(request)} className="rounded-xl border-indigo-300">Grant one extra slot</Button>
                  </div>
                )}
                {isSuperAdmin && (
                  <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <Button size="sm" variant="outline" onClick={() => void loadOverrideHistory(request)} className="rounded-xl">Review allowance exception history</Button>
                    {(overrideHistory[request.business_id] || []).map((override) => (
                      <div key={override.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                        <div className="text-xs font-semibold text-slate-600">
                          <p className="font-black text-slate-900">+{override.allowance_delta} slot · {override.allowance_period} · {override.revoked_at ? "Revoked" : "Active"}</p>
                          <p className="mt-1">Granted {override.granted_at ? formatDate(Date.parse(override.granted_at)) : ""}: {override.reason}</p>
                          {override.revoke_reason && <p className="mt-1">Revocation reason: {override.revoke_reason}</p>}
                        </div>
                        {!override.revoked_at && <Textarea value={revokeDrafts[override.id] || ""} onChange={(event) => setRevokeDrafts((previous) => ({ ...previous, [override.id]: event.target.value }))} maxLength={500} placeholder="Reason to revoke this exception" className="min-h-16" />}
                        {!override.revoked_at && <Button size="sm" variant="outline" disabled={Boolean(workingId)} onClick={() => void revokeAllowance(request.business_id, override.id)} className="rounded-xl">Revoke override</Button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
