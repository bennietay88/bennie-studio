import React from "react";
import { CalendarCheck, CheckCircle2, Clock, Filter, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { cn, formatDate } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

type UpdateRequest = {
  id: string;
  business_id: string;
  profile_id?: string;
  request_type?: string;
  update_category?: string;
  priority?: "normal" | "high" | "launch_blocker";
  status: "draft" | "submitted" | "acknowledged" | "in_progress" | "waiting_for_customer" | "completed" | "declined" | "cancelled";
  customer_draft?: Record<string, any>;
  title: string;
  details?: string;
  allowance_period?: string;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  business?: {
    name?: string;
    plan?: string;
    subdomain?: string;
    custom_domain?: string;
  };
};

const statusOptions: UpdateRequest["status"][] = ["submitted", "acknowledged", "in_progress", "waiting_for_customer", "completed", "cancelled"];

export function MonthlyUpdateQueue() {
  const [requests, setRequests] = React.useState<UpdateRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

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

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateStatus = async (request: UpdateRequest, status: UpdateRequest["status"]) => {
    const payload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "completed") payload.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from("monthly_update_requests")
      .update(payload)
      .eq("id", request.id);

    if (error) {
      toast.error("Failed to update request status.");
      return;
    }

    setRequests((prev) => prev.map((item) => item.id === request.id ? { ...item, ...payload } as UpdateRequest : item));
    toast.success(`Request marked ${status.replace(/_/g, " ")}.`);
  };

  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const haystack = [
      request.title,
      request.details,
      request.update_category,
      request.priority,
      request.status,
      request.business?.name,
      request.business?.plan,
    ].join(" ").toLowerCase();
    return matchesStatus && haystack.includes(searchQuery.toLowerCase());
  });

  const stats = {
    submitted: requests.filter((item) => item.status === "submitted").length,
    inProgress: requests.filter((item) => item.status === "in_progress").length,
    blockers: requests.filter((item) => item.priority === "launch_blocker").length,
    completed: requests.filter((item) => item.status === "completed").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-4 bg-indigo-50 text-indigo-700 border-indigo-100">Managed Website Service</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">Monthly Update Queue</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
            Review customer change requests, prioritize launch blockers, and move updates through the managed service workflow.
          </p>
        </div>
        <Button onClick={loadRequests} variant="outline" className="rounded-2xl font-black">
          Refresh Queue
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Submitted", value: stats.submitted, icon: Clock, tone: "text-blue-600 bg-blue-50" },
          { label: "In Progress", value: stats.inProgress, icon: Wrench, tone: "text-amber-600 bg-amber-50" },
          { label: "Launch Blockers", value: stats.blockers, icon: Filter, tone: "text-rose-600 bg-rose-50" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-3xl border-slate-100">
            <CardContent className="p-6">
              <div className={cn("mb-5 flex h-11 w-11 items-center justify-center rounded-2xl", stat.tone)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-slate-100">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Request Review</CardTitle>
              <CardDescription>Filter by status and search by customer, request type, or details.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search requests..."
                  className="h-11 rounded-2xl pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">Loading update requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-10 text-center">
              <CalendarCheck className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <p className="font-black text-slate-950">No update requests found</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">Requests submitted by customers will appear here.</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="rounded-3xl border border-slate-100 p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge className="capitalize bg-slate-100 text-slate-700">{request.status.replace(/_/g, " ")}</Badge>
                      <Badge className={cn(
                        "capitalize",
                        request.priority === "launch_blocker" ? "bg-rose-100 text-rose-700" :
                          request.priority === "high" ? "bg-amber-100 text-amber-700" :
                            "bg-indigo-50 text-indigo-700",
                      )}>
                        {(request.priority || "normal").replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{String(request.update_category || request.request_type || "update").replace(/_/g, " ")}</Badge>
                    </div>
                    <h3 className="text-lg font-black text-slate-950">{request.title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{request.details || "No details provided."}</p>
                    {(request.customer_draft?.page || request.customer_draft?.section) && (
                      <p className="mt-2 text-xs font-black text-indigo-600">
                        {[request.customer_draft?.page && `Page: ${request.customer_draft.page}`, request.customer_draft?.section && `Section: ${request.customer_draft.section}`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                      <span>{request.business?.name || request.business_id}</span>
                      <span>Plan: {(request.business?.plan || "unknown").toUpperCase()}</span>
                      <span>Period: {request.allowance_period || "current"}</span>
                      <span>Submitted: {formatDate(new Date(request.created_at).getTime())}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => updateStatus(request, "in_progress")}>
                      In Progress
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => updateStatus(request, "waiting_for_customer")}>
                      Needs Info
                    </Button>
                    <Button size="sm" className="rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700" onClick={() => updateStatus(request, "completed")}>
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
