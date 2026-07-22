import React from "react";
import { AlertCircle, CalendarCheck, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { getLocalSeoLimits } from "../constants/localSeoEngine";
import { PLANS, findPlan, normalizePlans } from "../constants/plans";
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
  const [title, setTitle] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [requestType, setRequestType] = React.useState("content_update");
  const [priority, setPriority] = React.useState("normal");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [failureCount, setFailureCount] = React.useState(0);
  const draftKey = React.useMemo(() => `bts_update_request_draft_${profile?.businessId || "none"}`, [profile?.businessId]);

  React.useEffect(() => {
    const load = async () => {
      if (!profile?.businessId) return;
      const [{ data: businessData }, { data: requestData }, { data: planData }] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", profile.businessId).maybeSingle(),
        supabase
          .from("monthly_update_requests")
          .select("*")
          .eq("business_id", profile.businessId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("settings").select("content").eq("id", "plans").maybeSingle(),
      ]);
      if (businessData) setBusiness(businessData);
      if (Array.isArray(requestData)) setRequests(requestData);
      if (Array.isArray(planData?.content?.pricing)) setPlanSettings(normalizePlans(planData.content.pricing));
      try {
        const savedDraft = localStorage.getItem(`bts_update_request_draft_${profile.businessId}`);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          setTitle(draft.title || "");
          setDetails(draft.details || "");
          setRequestType(draft.requestType || "content_update");
          setPriority(draft.priority || "normal");
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
  const monthlyAllowance = Number(String(currentPlan.monthlyUpdates || limits.monthlyUpdates || "").match(/\d+/)?.[0] || 1);
  const usedAllowance = requests.filter((request) =>
    request.allowance_period === currentAllowancePeriod &&
    !["declined", "cancelled"].includes(String(request.status || "")),
  ).length;
  const remainingAllowance = Math.max(0, monthlyAllowance - usedAllowance);

  const submitRequest = async () => {
    if (submitting) return;
    if (!profile?.businessId) {
      toast.error("Business profile missing.");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a request title.");
      return;
    }

    const draft = { title, details, requestType, priority, savedAt: new Date().toISOString() };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setSubmitError("");
    setSubmitting(true);
    const clientRequestId = crypto.randomUUID();
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
      client_request_id: clientRequestId,
      submitted_at: new Date().toISOString(),
      estimated_response_at: new Date(Date.now() + 2 * 86400000).toISOString(),
      customer_draft: draft,
    };

    try {
      const { data, error } = await supabase
        .from("monthly_update_requests")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setRequests((prev) => [data, ...prev]);
      toast.success("Monthly update request submitted.");
      localStorage.removeItem(draftKey);
      setTitle("");
      setDetails("");
      setRequestType("content_update");
      setPriority("normal");
      setFailureCount(0);
    } catch (error: any) {
      const nextFailureCount = failureCount + 1;
      setFailureCount(nextFailureCount);
      setSubmitError(error?.message || "Request not submitted.");
      console.error("Monthly update request submission failed:", error);
      toast.error("Request not submitted. Your draft is saved in this browser.");
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
          Request content, SEO, CTA, local page, image, or service updates based on your website plan.
        </p>
      </div>

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
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining allowance</p>
                <p className="mt-1 text-lg font-black text-slate-950">{remainingAllowance} / {monthlyAllowance}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{usedAllowance} used this month</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estimated response</p>
                <p className="mt-1 text-lg font-black text-slate-950">2 business days</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Draft safety</p>
                <p className="mt-1 text-lg font-black text-slate-950">Saved locally on failure</p>
              </div>
            </div>
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
            <Button onClick={submitRequest} disabled={submitting} className="w-full rounded-xl bg-indigo-600 font-black">
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
            <CardDescription>Track updates you have asked for.</CardDescription>
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
	                      {request.completion_details && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Completed: {request.completion_details}</p>}
	                      {request.estimated_response_at && <p className="mt-2 text-xs font-bold text-slate-400">Estimated response: {new Date(request.estimated_response_at).toLocaleDateString()}</p>}
	                    </div>
                    <Badge variant="outline" className="capitalize">{request.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
