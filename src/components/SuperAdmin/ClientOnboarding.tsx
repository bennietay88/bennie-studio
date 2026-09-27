import React, { useState, useEffect } from "react";
import { UserPlus, Rocket, CheckCircle2, MoreVertical, Shield, Loader2, Plus, Trash2, RefreshCw, Activity, Send, AlertTriangle, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";

const handoverChecklist = [
  "Business details and primary contact methods confirmed",
  "Website preview reviewed and approved",
  "Contact form, WhatsApp CTA, phone, and email links tested",
  "Plan page count, update allowance, and feature visibility confirmed",
  "Domain, SSL, cookie banner, privacy, and footer legal links checked",
  "Lead capture dashboard and enquiry notifications confirmed",
  "Launch support notes, monthly update process, and support channel explained",
  "Self-service website and CRM export explained before service termination",
];

export function ClientOnboarding() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [launchQaByBusiness, setLaunchQaByBusiness] = useState<Record<string, any>>({});
  const [checkingBusinessId, setCheckingBusinessId] = useState<string | null>(null);
  const [requestingApprovalId, setRequestingApprovalId] = useState<string | null>(null);
  const [sendingInviteBusinessId, setSendingInviteBusinessId] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({
    business_id: "",
    current_step: "Profile Initialized",
    status: "In Progress",
    progress: 10,
  });

  const stats = {
    activeOnboarding: sessions.filter(s => s.status === "In Progress").length,
    launchPending: sessions.filter(s => s.progress >= 90 && s.status !== "Completed").length,
    completed: sessions.filter(s => s.status === "Completed").length,
  };

  useEffect(() => {
    fetchSessions();
    fetchBusinesses();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .select("*, businesses(name, owner_id, onboarding_steps)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      const message = error?.message || "Failed to load onboarding queue";
      setLoadError(message);
      toast.error("Failed to load onboarding queue");
    } finally {
      setLoading(false);
    }
  };

  const openSessionConfig = (session: any) => {
    setEditingSession({
      ...session,
      current_step: session.current_step || "Profile Initialized",
      status: session.status || "In Progress",
      progress: Number(session.progress) || 0,
      notes: session.notes || "",
    });
    setIsConfigModalOpen(true);
  };

  const handleUpdateSession = async () => {
    if (!editingSession?.id) return;

    const requestedProgress = Math.max(
      0,
      Math.min(100, Number(editingSession.progress) || 0),
    );
    const status =
      requestedProgress === 100 || editingSession.status === "Completed"
        ? "Completed"
        : editingSession.status;
    const progress = status === "Completed" ? 100 : requestedProgress;

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from("onboarding_sessions")
        .update({
          current_step: editingSession.current_step.trim(),
          status,
          progress,
          notes: editingSession.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingSession.id)
        .select("*, businesses(name, owner_id, onboarding_steps)")
        .single();

      if (error) throw error;

      setSessions((current) =>
        current.map((session) => (session.id === data.id ? data : session)),
      );
      setIsConfigModalOpen(false);
      setEditingSession(null);
      toast.success(status === "Completed" ? "Client handover completed" : "Onboarding queue updated");
    } catch (error: any) {
      console.error("Error updating onboarding session:", error);
      toast.error(error?.message || "Failed to update onboarding session");
    } finally {
      setSaving(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.business_id) {
      toast.error("Business selection is required");
      return;
    }

    const existingSession = sessions.find(
      (session) =>
        session.business_id === newSession.business_id &&
        session.status !== "Completed",
    );
    if (existingSession) {
      toast.error("This business already has an active onboarding session");
      openSessionConfig(existingSession);
      setIsAddModalOpen(false);
      return;
    }

    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .insert([{
          business_id: newSession.business_id,
          current_step: newSession.current_step,
          status: newSession.status,
          progress: newSession.progress
        }])
        .select("*, businesses(name, owner_id, onboarding_steps)")
        .single();

      if (error) throw error;
      
      setSessions((current) => [data, ...current]);
      setIsAddModalOpen(false);
      setNewSession({ business_id: "", current_step: "Profile Initialized", status: "In Progress", progress: 10 });
      toast.success("Onboarding session started");
    } catch (error: any) {
      console.error("Error starting session:", error);
      toast.error(error.message || "Failed to start session");
    } finally {
      setSaving(false);
    }
  };

  const getAdminHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Your admin session has expired.");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const runLaunchQa = async (businessId: string) => {
    try {
      setCheckingBusinessId(businessId);
      const headers = await getAdminHeaders();
      const [readinessResponse, healthResponse] = await Promise.all([
        fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}/launch-readiness`, { headers }),
        fetch(`/api/website-health?businessId=${encodeURIComponent(businessId)}`, { headers }),
      ]);
      const readiness = await readinessResponse.json().catch(() => ({}));
      const health = await healthResponse.json().catch(() => ({}));
      if (!readinessResponse.ok) throw new Error(readiness?.error || "Launch readiness could not be checked.");
      setLaunchQaByBusiness((current) => ({
        ...current,
        [businessId]: {
          ...readiness,
          health: healthResponse.ok ? health : null,
        },
      }));
      toast.success(readiness.ready ? "Launch QA passed" : `Launch QA found ${readiness.blockers?.length || 0} blocker(s)`);
    } catch (error: any) {
      toast.error(error?.message || "Launch QA could not be checked.");
    } finally {
      setCheckingBusinessId(null);
    }
  };

  const resendOnboardingInvite = async (item: any) => {
    try {
      setSendingInviteBusinessId(item.business_id);
      const headers = await getAdminHeaders();
      const response = await fetch(
        `/api/admin/businesses/${encodeURIComponent(item.business_id)}/onboarding-invite`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ requestId: crypto.randomUUID() }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Onboarding invitation could not be sent.");
      setSessions((current) =>
        current.map((session) =>
          session.business_id === item.business_id
            ? {
                ...session,
                businesses: {
                  ...session.businesses,
                  onboarding_steps: {
                    ...(session.businesses?.onboarding_steps || {}),
                    customerAccess: payload.customerAccess,
                  },
                },
              }
            : session,
        ),
      );
      toast.success("Onboarding invitation sent.");
    } catch (error: any) {
      toast.error(error?.message || "Onboarding invitation could not be sent.");
      await fetchSessions();
    } finally {
      setSendingInviteBusinessId(null);
    }
  };

  const copyOnboardingAccess = async (item: any) => {
    const steps = item.businesses?.onboarding_steps || {};
    const access = steps.customerAccess || {};
    const contact = steps.customerContact || {};
    const email = String(access.email || contact.email || "").trim();
    if (!email) return toast.error("No customer email is available.");

    const fallbackUrl =
      window.location.origin + "/" + (item.businesses?.owner_id ? "login" : "signup")
      + "?redirectTo=" + encodeURIComponent("/dashboard/onboarding")
      + "&email=" + encodeURIComponent(email);
    const url = String(access.onboardingUrl || fallbackUrl);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Customer onboarding link copied.");
    } catch {
      toast.error("Could not copy the onboarding link.");
    }
  };

  const requestCustomerApproval = async (businessId: string) => {
    try {
      setRequestingApprovalId(businessId);
      const headers = await getAdminHeaders();
      const response = await fetch(
        `/api/admin/businesses/${encodeURIComponent(businessId)}/approval-request`,
        { method: "POST", headers, body: JSON.stringify({}) },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Approval request could not be created.");
      toast.success("Customer approval request is ready in the customer portal.");
      await fetchSessions();
    } catch (error: any) {
      toast.error(error?.message || "Approval request could not be created.");
    } finally {
      setRequestingApprovalId(null);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      const { error } = await supabase.from("onboarding_sessions").delete().eq("id", id);
      if (error) throw error;
      
      setSessions((current) => current.filter((session) => session.id !== id));
      toast.success("Session removed");
    } catch (error: any) {
      console.error("Error deleting session:", error);
      toast.error("Failed to remove session");
    }
  };

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Client <span className="text-indigo-600">Onboarding</span>
        </h1>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-black uppercase tracking-widest text-xs"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Client Setup
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Onboarding", value: stats.activeOnboarding.toString(), icon: UserPlus, color: "text-blue-600", bgColor: "bg-blue-50" },
          { label: "Launch Pending", value: stats.launchPending.toString(), icon: Rocket, color: "text-purple-600", bgColor: "bg-purple-50" },
          { label: "Completed", value: stats.completed.toString(), icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          { label: "Protected Assets", value: "ALL", icon: Shield, color: "text-amber-600", bgColor: "bg-amber-50" },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-[2rem] border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
             <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</CardTitle>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
             </CardHeader>
             <CardContent className="p-6 pt-0">
                <div className="text-3xl font-black italic text-slate-900 dark:text-white tracking-tighter leading-none">{stat.value}</div>
             </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight dark:text-white">Onboarding Queue</CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Managing the transition from prospect to active subscriber.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y divide-slate-100">
             {loading ? (
               <div className="p-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                  <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Syncing Queue...</p>
               </div>
             ) : loadError ? (
               <div className="p-12 text-center">
                  <p className="font-bold text-rose-600">The onboarding queue could not be loaded.</p>
                  <p className="mx-auto mt-2 max-w-xl break-words text-sm text-slate-500">{loadError}</p>
                  <Button variant="outline" onClick={fetchSessions} className="mt-5 rounded-xl">
                    <RefreshCw className="mr-2 h-4 w-4" /> Retry Queue
                  </Button>
               </div>
             ) : sessions.length === 0 ? (
               <div className="p-20 text-center">
                  <p className="text-slate-400 font-bold text-sm">No active onboarding sessions. Start one to grow!</p>
               </div>
             ) : (
               sessions.map((item) => {
                 const qa = launchQaByBusiness[item.business_id];
                 const onboardingSteps = item.businesses?.onboarding_steps || {};
                 const customerAccess = onboardingSteps.customerAccess || {};
                 const customerContact = onboardingSteps.customerContact || {};
                 const customerEmail = String(customerAccess.email || customerContact.email || "").trim();
                 const accessLabel = String(
                   customerAccess.status || (customerEmail ? "access_pending" : "email_missing"),
                 ).replace(/_/g, " ");
                 return (
                 <div key={item.id} className="border-b border-slate-100 last:border-b-0">
                   <div className="p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                           <UserPlus className="h-6 w-6" />
                        </div>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">{item.businesses?.name || "Unknown Client"}</h3>
                           </div>
                           <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Active Step: {item.current_step}</p>
                           <div className="mt-2 flex flex-wrap items-center gap-2">
                             <Badge variant="outline" className="rounded-full bg-white text-xs font-semibold capitalize text-slate-600">
                               Customer access: {accessLabel}
                             </Badge>
                             <span className="text-xs font-semibold text-slate-500">
                               {customerEmail || "Customer email not captured"}
                             </span>
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="w-48 space-y-1.5">
                           <div className="flex justify-between items-end">
                              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Velocity</p>
                              <p className="text-xs font-black text-slate-900 dark:text-white">{item.progress}%</p>
                           </div>
                           <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", item.progress === 100 ? "bg-emerald-500" : "bg-indigo-600")} style={{ width: `${item.progress}%` }} />
                           </div>
                        </div>

                        <Badge variant="outline" className={cn(
                          "text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full",
                          item.status === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          item.status === "Delayed" ? "bg-rose-50 text-rose-600 border-rose-100" :
                          "bg-indigo-50 text-indigo-600 border-indigo-100"
                        )}>
                          {item.status}
                        </Badge>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runLaunchQa(item.business_id)}
                            disabled={checkingBusinessId === item.business_id}
                            className="rounded-xl"
                          >
                            {checkingBusinessId === item.business_id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Activity className="mr-2 h-3.5 w-3.5" />}
                            Launch QA
                          </Button>
                          {customerEmail && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendOnboardingInvite(item)}
                                disabled={sendingInviteBusinessId === item.business_id}
                                className="rounded-xl"
                              >
                                {sendingInviteBusinessId === item.business_id
                                  ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                  : <Send className="mr-2 h-3.5 w-3.5" />}
                                Resend invite
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyOnboardingAccess(item)}
                                className="rounded-xl"
                              >
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Copy access link
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => requestCustomerApproval(item.business_id)}
                            disabled={requestingApprovalId === item.business_id}
                            className="rounded-xl"
                          >
                            {requestingApprovalId === item.business_id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                            Request Approval
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSession(item.id)}
                            className="rounded-xl hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            aria-label={`Configure onboarding for ${item.businesses?.name || "client"}`}
                            title="Configure onboarding"
                            onClick={() => openSessionConfig(item)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                     </div>
                   </div>

                   {qa && (
                     <div className={cn("mx-8 mb-6 rounded-2xl border p-4", qa.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                       <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                         <div>
                           <p className={cn("text-sm font-black", qa.ready ? "text-emerald-800" : "text-amber-900")}>
                             {qa.ready ? "Ready for launch" : `${qa.blockers?.length || 0} launch blocker(s)`}
                           </p>
                           <p className="mt-1 text-xs font-semibold text-slate-600">
                             Live health: {qa.health?.reachable ? `online · ${qa.health.httpStatus} · ${qa.health.latencyMs}ms` : qa.reachable ? `responding · ${qa.httpStatus || "HTTP"}` : "not confirmed"}
                           </p>
                           {qa.crawler && (
                             <p className="mt-1 text-xs font-semibold text-slate-600">
                               Fresh crawl: {qa.crawler.pageCount || 0} pages · {qa.crawler.resourceCount || 0} live targets · {qa.crawler.brokenResources?.length || 0} broken
                             </p>
                           )}
                         </div>
                         {qa.publicUrl && (
                           <a href={qa.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-black text-indigo-600">
                             Open site <ExternalLink className="ml-1 h-3.5 w-3.5" />
                           </a>
                         )}
                       </div>
                       <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                         {(qa.checks || []).map((check: any) => (
                           <div key={check.id} className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5">
                             {check.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                             <span className="text-xs font-bold text-slate-700">{check.label}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               )})
             )}
           </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-slate-50">
          <CardTitle className="text-xl font-black italic uppercase tracking-tight text-slate-950">
            Customer Handover Checklist
          </CardTitle>
          <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Use this before marking a managed website as launched or ready for monthly support.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-3 md:grid-cols-2">
            {handoverChecklist.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm font-bold leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase italic tracking-tight">Setup New Client Onboarding</DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Initialize the transition process for a new subscriber.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Select Business</Label>
              <Select 
                value={newSession.business_id}
                onValueChange={(val) => setNewSession({...newSession, business_id: val})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose client..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {businesses.map((biz) => (
                    <SelectItem key={biz.id} value={biz.id}>{biz.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Current Phase</Label>
              <Input 
                value={newSession.current_step}
                onChange={(e) => setNewSession({...newSession, current_step: e.target.value})}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateSession} disabled={saving} className="rounded-xl bg-indigo-600 text-xs font-black uppercase tracking-widest">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Launch Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isConfigModalOpen}
        onOpenChange={(open) => {
          setIsConfigModalOpen(open);
          if (!open) setEditingSession(null);
        }}
      >
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              Configure Onboarding Queue
            </DialogTitle>
            <DialogDescription>
              Update the handover progress for {editingSession?.businesses?.name || "this client"}.
            </DialogDescription>
          </DialogHeader>

          {editingSession && (
            <div className="grid gap-4 py-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Current phase</Label>
                <Input
                  value={editingSession.current_step}
                  onChange={(event) =>
                    setEditingSession({ ...editingSession, current_step: event.target.value })
                  }
                  placeholder="e.g. Customer review"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingSession.status}
                  onValueChange={(value) => setEditingSession({ ...editingSession, status: value })}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Delayed">Delayed</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Progress (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingSession.progress}
                  onChange={(event) =>
                    setEditingSession({ ...editingSession, progress: event.target.value })
                  }
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Internal handover notes</Label>
                <Textarea
                  value={editingSession.notes}
                  onChange={(event) =>
                    setEditingSession({ ...editingSession, notes: event.target.value })
                  }
                  placeholder="Outstanding content, approval notes, launch blockers..."
                  className="min-h-28 rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSession}
              disabled={saving || !editingSession?.current_step?.trim()}
              className="rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Queue Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
