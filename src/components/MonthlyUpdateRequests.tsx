import React from "react";
import { AlertCircle, CalendarCheck, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { canSubmitMonthlyUpdateRequest, countMonthlyUpdateAllowance } from "../lib/monthlyUpdateAllowance";
import { getLocalSeoLimits } from "../constants/localSeoEngine";
import { PLANS, findPlan, normalizePlans } from "../constants/plans";
import { PLAN_DELIVERY_STANDARDS, legacyPlanToPublicPlanSlug } from "../constants/deliveryStandards";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export default function MonthlyUpdateRequests() {
  const { profile } = useAuth();
  const [business, setBusiness] = React.useState<any>(null);
  const [planSettings, setPlanSettings] = React.useState<any[]>(normalizePlans(PLANS));
  const [requests, setRequests] = React.useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(true);
  const [allowanceSummary, setAllowanceSummary] = React.useState<any>(null);
  const [allowanceLoading, setAllowanceLoading] = React.useState(true);
  const [allowanceError, setAllowanceError] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [requestType, setRequestType] = React.useState("content_update");
  const [priority, setPriority] = React.useState("normal");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [failureCount, setFailureCount] = React.useState(0);
  const [clientRequestId, setClientRequestId] = React.useState("");
  const draftKey = React.useMemo(() => `bts_update_request_draft_${profile?.businessId || "none"}`, [profile?.businessId]);

  React.useEffect(() => {
    const load = async () => {
      if (!profile?.businessId) return;
      const [{ data: businessData }, { data: requestData }, { data: planData }, allowanceResult] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", profile.businessId).maybeSingle(),
        supabase
          .from("monthly_update_requests")
          .select("*")
          .eq("business_id", profile.businessId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("settings").select("content").eq("id", "plans").maybeSingle(),
        supabase.rpc("get_monthly_update_allowance", { p_business_id: profile.businessId }),
      ]);
      if (businessData) setBusiness(businessData);
      if (Array.isArray(requestData)) setRequests(requestData);
      setRequestsLoading(false);
      const allowanceRow = Array.isArray(allowanceResult.data) ? allowanceResult.data[0] : allowanceResult.data;
      if (allowanceResult.error || !allowanceRow) {
        setAllowanceError("Your current update allowance could not be verified. Try refreshing before submitting.");
      } else {
        setAllowanceSummary(allowanceRow);
        setAllowanceError("");
      }
      setAllowanceLoading(false);
      if (Array.isArray(planData?.content?.pricing)) setPlanSettings(normalizePlans(planData.content.pricing));
      try {
        const savedDraft = localStorage.getItem(`bts_update_request_draft_${profile.businessId}`);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          setTitle(draft.title || "");
          setDetails(draft.details || "");
          setRequestType(draft.requestType || "content_update");
          setPriority(draft.priority || "normal");
          setClientRequestId(draft.clientRequestId || "");
        }
      } catch {
        // Draft restore is best effort.
      }
    };
    load();
  }, [profile?.businessId]);

  const currentPlan = findPlan(planSettings, business?.plan || "starter");
  const limits = getLocalSeoLimits(business?.plan || "starter", currentPlan.maxPages, currentPlan);
  const currentAllowancePeriod = new Date().toISOString().slice(0, 7);
  const monthlyAllowance = Math.max(0, Number(currentPlan.monthlyUpdateLimit ?? 1));
  const usedAllowance = countMonthlyUpdateAllowance(requests, currentAllowancePeriod);
  const verifiedAllowance = Math.max(0, Number(allowanceSummary?.base_allowance ?? monthlyAllowance) + Number(allowanceSummary?.extra_allowance || 0));
  const verifiedUsedAllowance = Number.isFinite(Number(allowanceSummary?.used_allowance)) ? Number(allowanceSummary.used_allowance) : usedAllowance;
  const remainingAllowance = Math.max(0, Number(allowanceSummary?.remaining_allowance ?? (verifiedAllowance - verifiedUsedAllowance)));
  const canSubmitRequest = !allowanceError && !allowanceLoading && canSubmitMonthlyUpdateRequest({ loading: requestsLoading, allowance: verifiedAllowance, used: verifiedUsedAllowance });
  const activeRequests = requests.filter((item) => ["submitted", "acknowledged", "in_progress", "waiting_for_customer"].includes(String(item.status || "")));
  const completedThisMonth = requests.filter((item) =>
    item.status === "completed" && String(item.completed_at || item.updated_at || "").startsWith(currentAllowancePeriod)
  );
  const awaitingCustomer = requests.filter((item) => item.status === "waiting_for_customer");
  const publicPlanSlug = legacyPlanToPublicPlanSlug(business?.plan);
  const updateStandard = PLAN_DELIVERY_STANDARDS[publicPlanSlug];

  const submitRequest = async () => {
    if (submitting) return;
    if (!canSubmitRequest) {
      toast.error(allowanceError || (requestsLoading || allowanceLoading ? "Loading your request allowance. Try again shortly." : "Your monthly update allowance has been reached."));
      return;
    }
    if (!profile?.businessId) {
      toast.error("Business profile missing.");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a request title.");
      return;
    }

    const stableRequestId = clientRequestId || crypto.randomUUID();
    if (!clientRequestId) setClientRequestId(stableRequestId);
    const draft = { title, details, requestType, priority, clientRequestId: stableRequestId, savedAt: new Date().toISOString() };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setSubmitError("");
    setSubmitting(true);
    const payload = {
      business_id: profile.businessId,
      profile_id: profile.uid,
      request_type: "monthly_update",
      update_category: requestType,
      priority,
      status: "submitted",
      title,
      details,
      allowance_period: new Date().toISOString().slice(0, 7),
      client_request_id: stableRequestId,
      submitted_at: new Date().toISOString(),
      customer_draft: draft,
    };

    try {
      const { data, error } = await supabase.rpc("submit_monthly_update_request", { p_request: payload });

      if (error) throw error;

      setRequests((prev) => [data, ...prev.filter((request) => request.id !== data.id)]);
      const { data: refreshedAllowance } = await supabase.rpc("get_monthly_update_allowance", { p_business_id: profile.businessId });
      const refreshedRow = Array.isArray(refreshedAllowance) ? refreshedAllowance[0] : refreshedAllowance;
      if (refreshedRow) setAllowanceSummary(refreshedRow);
      toast.success("Monthly update request submitted.");
      localStorage.removeItem(draftKey);
      setTitle("");
      setDetails("");
      setRequestType("content_update");
      setPriority("normal");
      setClientRequestId("");
      setFailureCount(0);
    } catch (error: any) {
      const nextFailureCount = failureCount + 1;
      setFailureCount(nextFailureCount);
      const message = error?.message || "Request not submitted.";
      setSubmitError(message);
      console.error("Monthly update request submission failed:", error);
      toast.error(message.includes("monthly_update_allowance_exceeded")
        ? "Your monthly update allowance has been reached. Your draft is saved in this browser."
        : "Request not submitted. Your draft is saved in this browser.");
      if (nextFailureCount >= 3 && profile.businessId) {
        await supabase.from("support_tickets").insert({
          user_id: profile.uid,
          subject: "Repeated monthly update request submission failure",
          status: "open",
          priority: "high",
        }).then(({ error: supportError }) => {
          if (supportError) console.warn("Support notification for update request failure skipped:", supportError.message);
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Badge className="mb-4 bg-indigo-50 text-indigo-700">Website Support</Badge>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Monthly Update Requests</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
          Request content, SEO, CTA, local page, image, or service updates based on your website plan. Complex redesigns, new applications, ecommerce, or integrations outside your plan are scoped separately before work begins.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Your managed website support activity">
        {[
          ["Updates in progress", activeRequests.length, "Submitted, acknowledged or being worked on"],
          ["Completed this month", completedThisMonth.length, "Based only on completed request records"],
          ["Needs your response", awaitingCustomer.length, "Your studio is waiting on you"],
        ].map(([label, value, explanation]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{explanation}</p></div>)}
      </section>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" /> New Request
            </CardTitle>
            <CardDescription>{limits.monthlyUpdates}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Remaining allowance</p>
                <p className="mt-1 text-lg font-black text-slate-950">{remainingAllowance} / {verifiedAllowance}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{verifiedUsedAllowance} used this month{Number(allowanceSummary?.extra_allowance || 0) > 0 ? ` · includes ${allowanceSummary.extra_allowance} approved extra` : ""}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Estimated response</p>
                <p className="mt-1 text-lg font-black text-slate-950">{updateStandard.targetUpdateTurnaround.replace(/^.*?within\s+/i, "")}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Draft safety</p>
                <p className="mt-1 text-lg font-black text-slate-950">Saved locally on failure</p>
              </div>
            </div>
            {allowanceError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{allowanceError}</div>}
            {submitError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-black text-rose-800">Request not submitted.</p>
                    <p className="mt-1 text-sm font-semibold text-rose-700">Your draft is preserved below. Retry when ready.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Request title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Update homepage hero copy" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Request type</Label>
                <select
                  value={requestType}
                  onChange={(event) => setRequestType(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                >
                  <option value="content_update">Content update</option>
                  <option value="seo_update">SEO update</option>
                  <option value="local_page">Location page</option>
                  <option value="image_change">Image change</option>
                  <option value="cta_change">CTA change</option>
                  <option value="bug_fix">Bug fix</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="launch_blocker">Launch blocker</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Describe exactly what should change." className="min-h-[160px]" />
            </div>
            <Button onClick={submitRequest} disabled={submitting || !canSubmitRequest} className="w-full rounded-xl bg-indigo-600 font-black">
              {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : submitError ? <RefreshCw className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              {submitError ? "Retry Submission" : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-indigo-600" /> Request History
            </CardTitle>
            <CardDescription>Real service records only: when we acknowledge, work on or complete an update, its status changes here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-10 text-center">
                <p className="font-black text-slate-950">No requests yet</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Your submitted update requests will appear here.</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-950">{request.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="capitalize">{String(request.update_category || request.request_type || "update").replace(/_/g, " ")}</Badge>
                        <Badge variant="outline" className="capitalize">{String(request.priority || "normal").replace(/_/g, " ")}</Badge>
                      </div>
	                      <p className="mt-1 text-sm font-semibold text-slate-500">{request.details}</p>
	                      {request.admin_response && <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm font-bold text-indigo-800">Admin response: {request.admin_response}</p>}
	                      {request.customer_response && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">Your response: {request.customer_response}</p>}
	                      {request.completion_details && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Completed: {request.completion_details}</p>}
	                      {request.estimated_response_at && <p className="mt-2 text-xs font-bold text-slate-400">Estimated response: {new Date(request.estimated_response_at).toLocaleDateString()}</p>}
	                    </div>
                    <Badge variant="outline" className="capitalize">{String(request.status || "submitted").replace(/_/g, " ")}</Badge>
                  </div>
                  {["submitted","acknowledged","in_progress","waiting_for_customer","completed"].includes(String(request.status)) && (
                    <div className="mt-4" aria-label={`Current delivery status: ${String(request.status).replace(/_/g, " ")}`}>
                      <div className="flex gap-1">
                        {["submitted","acknowledged","in_progress","completed"].map((step, i) => {
                          const rank: Record<string,number> = {submitted:0,acknowledged:1,in_progress:2,waiting_for_customer:2,completed:3};
                          return <span key={step} className={`h-2 flex-1 rounded-full ${i <= (rank[String(request.status)] ?? 0) ? "bg-indigo-600" : "bg-slate-100"}`} />;
                        })}
                      </div>
                      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                        <span>Submitted {request.submitted_at ? new Date(request.submitted_at).toLocaleDateString() : ""}</span>
                        {request.status === "waiting_for_customer" ? <span className="font-semibold text-amber-700">Your response is needed · SLA paused</span> : null}
                        {request.status === "completed" && request.completed_at ? <span>Completed {new Date(request.completed_at).toLocaleDateString()}</span> : null}
                      </div>
                    </div>
                  )}
                  {request.status === "waiting_for_customer" && (
                    <CustomerUpdateResponse
                      requestId={request.id}
                      onResponded={(updated) => setRequests((previous) => previous.map((item) => item.id === updated.id ? updated : item))}
                    />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CustomerUpdateResponse({ requestId, onResponded }: { requestId: string; onResponded: (request: any) => void }) {
  const [response, setResponse] = React.useState("");
  const [idempotencyKey, setIdempotencyKey] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const submitResponse = async () => {
    if (sending || response.trim().length < 2) return;
    const stableKey = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(stableKey);
    setSending(true);
    const { data, error } = await supabase.rpc("customer_respond_monthly_update_request", {
      p_request_id: requestId,
      p_response: response.trim(),
      p_idempotency_key: stableKey,
    });
    setSending(false);
    if (error) {
      toast.error("Your response was not saved. Please retry.");
      return;
    }
    const updated = Array.isArray(data) ? data[0] : data;
    if (updated) onResponded(updated);
    setResponse("");
    setIdempotencyKey("");
    toast.success("Your response was sent. The request SLA has resumed.");
  };

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <label className="block text-sm font-bold text-amber-950" htmlFor={`update-response-${requestId}`}>Reply to the studio
        <Textarea
          id={`update-response-${requestId}`}
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          placeholder="Add the missing details or answer the question above."
          className="mt-2 min-h-20 bg-white"
          maxLength={5000}
        />
      </label>
      <Button size="sm" disabled={sending || response.trim().length < 2} onClick={() => void submitResponse()} className="rounded-xl bg-indigo-600">
        {sending ? "Sending response…" : "Send response and resume request"}
      </Button>
    </div>
  );
}
