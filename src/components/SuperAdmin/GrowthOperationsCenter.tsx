import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FlaskConical,
  LayoutTemplate,
  Loader2,
  MessageCircle,
  RefreshCw,
  Rocket,
  Send,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { NICHE_TEMPLATES, getRecommendedNicheTemplate } from "../../constants/nicheTemplates";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

type LoadState = {
  prospects: any[];
  leads: any[];
  tasks: any[];
  proposals: any[];
  projects: any[];
  businesses: any[];
  reports: any[];
  integrations: any[];
  signals: any[];
  experiments: any[];
  kits: any[];
  testimonials: any[];
};

const EMPTY_STATE: LoadState = {
  prospects: [], leads: [], tasks: [], proposals: [], projects: [], businesses: [],
  reports: [], integrations: [], signals: [], experiments: [], kits: [], testimonials: [],
};

const label = (value?: string) => String(value || "Not set").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateTime = (value?: string) => value ? new Date(value).toLocaleString() : "Not scheduled";
const isOpen = (status?: string) => !["completed", "dismissed", "won", "lost", "cancelled", "launched", "live"].includes(String(status || "").toLowerCase());

export function GrowthOperationsCenter() {
  const [data, setData] = useState<LoadState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [reportWorkflowEnabled, setReportWorkflowEnabled] = useState(false);
  const [reportActionLoading, setReportActionLoading] = useState(false);
  const [experiment, setExperiment] = useState({ name: "", templateId: "", hypothesis: "", event: "lead_submitted" });

  const load = useCallback(async () => {
    setLoading(true);
    const sources = [
      ["prospects", supabase.from("prospects").select("*").order("created_at", { ascending: false }).limit(150)],
      ["leads", supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(150)],
      ["tasks", supabase.from("sales_tasks").select("*").order("due_at", { ascending: true }).limit(150)],
      ["proposals", supabase.from("proposals").select("*").order("updated_at", { ascending: false }).limit(100)],
      ["projects", supabase.from("projects").select("*, businesses(name)").order("updated_at", { ascending: false }).limit(100)],
      ["businesses", supabase.from("businesses").select("id,name,plan,status").order("created_at", { ascending: false })],
      ["reports", supabase.from("monthly_growth_reports").select("*, businesses(name)").order("report_month", { ascending: false }).limit(100)],
      ["integrations", supabase.from("customer_growth_integrations").select("*").order("updated_at", { ascending: false })],
      ["signals", supabase.from("customer_health_signals").select("*").eq("status", "open").order("occurred_at", { ascending: false })],
      ["experiments", supabase.from("template_experiments").select("*").order("created_at", { ascending: false })],
      ["kits", supabase.from("vertical_delivery_kits").select("*").order("name")],
      ["testimonials", supabase.from("customer_testimonials").select("*").order("created_at", { ascending: false }).limit(100)],
    ] as const;
    const results = await Promise.allSettled(sources.map(([, request]) => request));
    const next = { ...EMPTY_STATE };
    const missing: string[] = [];
    results.forEach((result: any, index) => {
      const key = sources[index][0] as keyof LoadState;
      if (result.status === "fulfilled" && !result.value.error) next[key] = result.value.data || [];
      else missing.push(key);
    });
    setData(next);
    const { data: sessionData } = await supabase.auth.getSession();
    const flagResponse = await fetch("/api/admin/launch-flags", {
      headers: sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {},
    }).catch(() => null);
    if (flagResponse?.ok) {
      const flagData = await flagResponse.json();
      setReportWorkflowEnabled(flagData.flags?.monthly_reporting_workflow === true);
    }
    if (missing.length) toast.warning("Some growth operations data is not available yet.", { description: "Apply the latest Supabase migration, then refresh." });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const today = useMemo(() => {
    const now = Date.now();
    const responseDue = data.leads.filter((lead) => !lead.first_response_at && !["won", "lost", "closed"].includes(lead.status));
    const dueTasks = data.tasks.filter((task) => task.status === "open" && (!task.due_at || new Date(task.due_at).getTime() <= now));
    const engagedProposals = data.proposals.filter((proposal) => proposal.last_viewed_at && isOpen(proposal.status));
    const blockers = data.projects.filter((project) => project.capacity_status === "blocked" || project.launch_blocker);
    return { responseDue, dueTasks, engagedProposals, blockers };
  }, [data]);

  const previewQueue = data.prospects.filter((prospect) => !prospect.design_preview_url && prospect.status !== "lost");
  const funnel = {
    prospects: data.prospects.filter((prospect) => prospect.status !== "lost").length,
    previews: data.prospects.filter((prospect) => prospect.design_preview_url && prospect.status !== "lost").length,
    enquiries: data.leads.filter((lead) => !["spam", "lost"].includes(String(lead.status || "").toLowerCase())).length,
    proposals: data.proposals.filter((proposal) => !["lost", "cancelled"].includes(String(proposal.status || "").toLowerCase())).length,
    customers: data.businesses.filter((business) => !["cancelled", "paused"].includes(String(business.status || "").toLowerCase())).length,
  };
  const businessName = (id?: string) => data.businesses.find((business) => business.id === id)?.name || "Customer";

  const generatePreview = (prospect: any) => {
    const existing = Boolean(prospect.domain) && prospect.website_status !== "no_website";
    const domain = existing ? (String(prospect.domain).startsWith("http") ? prospect.domain : "https://" + prospect.domain) : "";
    const params = new URLSearchParams({ sales: "1", prospectId: String(prospect.id), mode: existing ? "website" : "business",
      business: String(prospect.name || ""), website: domain, location: String(prospect.location || ""), service: String(prospect.industry || "") });
    window.open("/generate-preview?" + params.toString(), "_blank", "noopener,noreferrer");
    toast.info("Complete and save the verified design concept for Follow-Up 1.");
  };

  const openWhatsApp = async (prospect: any) => {
    if (!prospect.contact_whatsapp && !prospect.contact_phone) return toast.error("This prospect has no WhatsApp number.");
    if (!prospect.design_preview_url) return toast.error("Save the verified design preview before sharing it.");
    const phone = String(prospect.contact_whatsapp || prospect.contact_phone).replace(/\D/g, "");
    const message = `Hi ${prospect.name}, I prepared a short website direction for your business based on what a customer needs to see before enquiring: ${prospect.design_preview_url}`;
    await supabase.from("sales_tasks").insert({
      prospect_id: prospect.id,
      title: `Follow up on preview with ${prospect.name}`,
      task_type: "preview_follow_up",
      priority: "high",
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "Confirm the prospect opened the personalised preview and offer a short fit call.",
      metadata: { previewUrl: prospect.design_preview_url, channel: "whatsapp" },
    });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    toast.success("Follow-up task created for tomorrow");
    await load();
  };

  const updateProject = async (projectId: string, updates: Record<string, unknown>) => {
    setSavingId(projectId);
    const { error } = await supabase.from("projects").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", projectId);
    setSavingId("");
    if (error) toast.error(error.message); else { toast.success("Delivery plan updated"); await load(); }
  };

  const createExperiment = async () => {
    if (!experiment.name || !experiment.templateId || !experiment.hypothesis) return toast.error("Add a name, template, and hypothesis.");
    const { error } = await supabase.from("template_experiments").insert({
      name: experiment.name,
      template_id: experiment.templateId,
      hypothesis: experiment.hypothesis,
      primary_event: experiment.event,
      minimum_sessions: 200,
      variant_a: { label: "Current" },
      variant_b: { label: "Proposed" },
    });
    if (error) return toast.error(error.message);
    setExperiment({ name: "", templateId: "", hypothesis: "", event: "lead_submitted" });
    toast.success("Experiment saved as a draft");
    await load();
  };

  const runMonthlyReportDrafts = async () => {
    if (!reportWorkflowEnabled) return toast.error("Enable the monthly report workflow in Release controls first.");
    setReportActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/monthly-growth-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Monthly report drafts could not be generated.");
      toast.success(`${result.created} draft report(s) created for ${result.month}.`, { description: `${result.alreadyExists} existing report(s) left unchanged.` });
      await load();
    } catch (reason: any) {
      toast.error(reason.message || "Monthly report drafts could not be generated.");
    } finally { setReportActionLoading(false); }
  };

  const publishMonthlyReport = async (reportId: string) => {
    if (!reportWorkflowEnabled) return toast.error("Enable the monthly report workflow in Release controls first.");
    setReportActionLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/monthly-growth-reports/${reportId}/publish`, {
        method: "POST",
        headers: sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {},
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Report could not be published.");
      toast.success("Report published to the customer dashboard. No email was sent.");
      await load();
    } catch (reason: any) {
      toast.error(reason.message || "Report could not be published.");
    } finally { setReportActionLoading(false); }
  };

  if (loading) return <div className="grid min-h-72 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">P0–P2 revenue operations</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Growth Operations</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">Respond, personalise, follow up, deliver, and retain from one evidence-based workspace.</p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Clock3} label="Needs first response" value={today.responseDue.length} attention={today.responseDue.length > 0} />
        <Metric icon={Send} label="Due sales actions" value={today.dueTasks.length} attention={today.dueTasks.length > 0} />
        <Metric icon={Target} label="Viewed proposals" value={today.engagedProposals.length} />
        <Metric icon={AlertCircle} label="Delivery blockers" value={today.blockers.length} attention={today.blockers.length > 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl border-indigo-100 bg-indigo-50/60 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Rocket className="h-5 w-5 text-indigo-600" />30-day Growth Sprint</CardTitle><p className="text-sm font-semibold text-slate-600">A short operating cadence for acquiring and launching the next customers.</p></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["Week 1", "Choose one niche and prepare five evidence-based reviews.", "/admin/website_reviews"],
              ["Week 2", "Send previews and personally follow up with every qualified reply.", "/admin/outreach_lab"],
              ["Week 3", "Run calls, send proposals, and record objections in the pipeline.", "/admin/proposals_deals"],
              ["Week 4", "Launch paid work quickly, capture proof, and ask for introductions.", "/admin/projects"],
            ].map(([week, copy, href]) => <button key={week} type="button" onClick={() => window.location.assign(href)} className="rounded-2xl border border-indigo-100 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">{week}</p><p className="mt-2 text-sm font-bold leading-5 text-slate-800">{copy}</p><span className="mt-3 inline-flex text-xs font-black text-indigo-600">Open workspace <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></span></button>)}
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Target className="h-5 w-5 text-indigo-600" />Funnel snapshot</CardTitle><p className="text-sm font-semibold text-slate-500">Recorded volumes only; no invented conversion rates.</p></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5 xl:grid-cols-2"><Fact label="Prospects" value={String(funnel.prospects)} /><Fact label="Previews" value={String(funnel.previews)} /><Fact label="Enquiries" value={String(funnel.enquiries)} /><Fact label="Proposals" value={String(funnel.proposals)} /><Fact label="Customers" value={String(funnel.customers)} /></CardContent></Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="h-auto flex-wrap rounded-2xl bg-slate-100 p-1">
          <TabsTrigger value="today" className="rounded-xl">Today</TabsTrigger>
          <TabsTrigger value="previews" className="rounded-xl">Preview queue</TabsTrigger>
          <TabsTrigger value="delivery" className="rounded-xl">Delivery capacity</TabsTrigger>
          <TabsTrigger value="customers" className="rounded-xl">Customer growth</TabsTrigger>
          <TabsTrigger value="experiments" className="rounded-xl">Experiments & kits</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="grid gap-4 pt-4 xl:grid-cols-2">
          <ActionList title="New enquiries" icon={Users} empty="Every new enquiry has a recorded response." rows={today.responseDue.map((lead) => ({
            id: lead.id, title: lead.name || lead.email || "New enquiry", detail: `${lead.email || "No email"} · received ${dateTime(lead.created_at)}`, action: "Open inbox", href: "/admin/inbound_leads",
          }))} />
          <ActionList title="Sales tasks due" icon={CheckCircle2} empty="No overdue sales tasks." rows={today.dueTasks.map((task) => ({
            id: task.id, title: task.title, detail: `${label(task.priority)} priority · ${dateTime(task.due_at)}`, action: "Open automation", href: "/admin/sales_automation",
          }))} />
          <ActionList title="Proposal intent" icon={Target} empty="No open proposal has a recorded view yet." rows={today.engagedProposals.map((proposal) => ({
            id: proposal.id, title: proposal.title || proposal.package_name || "Proposal", detail: `${proposal.view_count || 1} recorded view(s) · last ${dateTime(proposal.last_viewed_at)}`, action: "Open pipeline", href: "/admin/proposals_deals",
          }))} />
          <ActionList title="Launch blockers" icon={Rocket} empty="No launch blocker is recorded." rows={today.blockers.map((project) => ({
            id: project.id, title: project.businesses?.name || project.title || "Website project", detail: project.launch_blocker || "Project marked blocked", action: "Open project", href: "/admin/projects",
          }))} />
        </TabsContent>

        <TabsContent value="previews" className="space-y-4 pt-4">
          <SectionIntro title="Turn research into a concrete preview" copy="Generate a personalised direction from stored prospect data, then create a human follow-up task. Sending remains approval-first." />
          {previewQueue.map((prospect) => (
            <Card key={prospect.id} className="rounded-3xl border-slate-200"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1"><p className="font-black text-slate-950">{prospect.name}</p><p className="text-xs font-semibold text-slate-500">{prospect.industry || "Industry not set"} · {prospect.location || "Location not set"}</p></div>
              <Badge variant="outline" className="w-fit rounded-full">{getRecommendedNicheTemplate({ industry: prospect.industry })?.customerName || "Recommended template"}</Badge>
              <Button disabled={savingId === prospect.id} className="rounded-xl bg-indigo-600" onClick={() => void generatePreview(prospect)}>{savingId === prospect.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LayoutTemplate className="mr-2 h-4 w-4" />}Generate preview</Button>
            </CardContent></Card>
          ))}
          {!previewQueue.length && <Empty text="No prospect is waiting for a preview." />}
          {!!data.prospects.filter((prospect) => prospect.design_preview_url && prospect.status !== "lost").length && <div className="space-y-3 pt-3"><h3 className="text-lg font-black">Ready to send</h3>{data.prospects.filter((prospect) => prospect.design_preview_url && prospect.status !== "lost").slice(0, 12).map((prospect) => <Card key={prospect.id} className="rounded-2xl"><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center"><div className="flex-1"><p className="font-black">{prospect.name}</p><p className="truncate text-xs text-slate-500">{prospect.design_preview_url}</p></div><Button variant="outline" className="rounded-xl" onClick={() => window.open(prospect.design_preview_url, "_blank", "noopener,noreferrer")}>Preview <ArrowUpRight className="ml-2 h-4 w-4" /></Button><Button className="rounded-xl bg-emerald-600" onClick={() => void openWhatsApp(prospect)}><MessageCircle className="mr-2 h-4 w-4" />Prepare WhatsApp</Button></CardContent></Card>)}</div>}
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4 pt-4">
          <SectionIntro title="Capacity before promises" copy="Set a real launch target, surface customer dependencies, and make blockers visible before another project is sold." />
          {data.projects.map((project) => <Card key={project.id} className="rounded-3xl"><CardContent className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.8fr_1fr_1.4fr_auto] lg:items-end"><div><p className="font-black">{project.businesses?.name || project.title || "Website project"}</p><p className="text-xs text-slate-500">{label(project.status)} · {project.package_name || project.type || "Managed website"}</p></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity</p><Select value={project.capacity_status || "planned"} onValueChange={(value) => void updateProject(project.id, { capacity_status: value })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["planned","in_progress","waiting_customer","blocked","ready","launched"].map((status) => <SelectItem key={status} value={status}>{label(status)}</SelectItem>)}</SelectContent></Select></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Launch target</p><Input type="datetime-local" className="rounded-xl" defaultValue={project.launch_target_at ? new Date(project.launch_target_at).toISOString().slice(0,16) : ""} onBlur={(event) => event.target.value && void updateProject(project.id, { launch_target_at: new Date(event.target.value).toISOString() })} /></div><div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Blocker / dependency</p><Input className="rounded-xl" defaultValue={project.launch_blocker || ""} placeholder="No blocker recorded" onBlur={(event) => event.target.value !== (project.launch_blocker || "") && void updateProject(project.id, { launch_blocker: event.target.value || null })} /></div>{savingId === project.id ? <Loader2 className="mb-2 h-5 w-5 animate-spin text-indigo-600" /> : <Badge variant="outline" className="mb-1 w-fit">Saved</Badge>}</CardContent></Card>)}
          {!data.projects.length && <Empty text="No delivery project has been created yet." />}
        </TabsContent>

        <TabsContent value="customers" className="grid gap-4 pt-4 xl:grid-cols-2">
          <Card className="rounded-3xl border-indigo-100 bg-indigo-50/40 xl:col-span-2"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-indigo-600" />Monthly website reports</CardTitle><p className="mt-1 text-sm font-semibold text-slate-500">Drafts use measured page views, enquiry events and completed update records. A reviewer must publish each draft. Publishing makes it visible in the customer dashboard; it never sends email.</p></div><Button disabled={!reportWorkflowEnabled || reportActionLoading} onClick={() => void runMonthlyReportDrafts()} className="rounded-xl bg-indigo-600">{reportActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Generate last month’s drafts</Button></div></CardHeader><CardContent className="space-y-3">{data.reports.filter((report) => report.source_kind === "scheduled").map((report) => <div key={report.id} className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white p-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><p className="font-black text-slate-950">{businessName(report.business_id)} · {report.report_month}</p><p className="mt-1 text-sm text-slate-700">{report.summary || "Not enough verified data yet."}</p><p className="mt-1 text-xs font-semibold text-slate-500">{Number(report.payload?.measured?.pageViews || 0)} measured page views · {Number(report.payload?.measured?.enquiries || 0)} recorded enquiries · {Array.isArray(report.payload?.completedWork) ? report.payload.completedWork.length : 0} completed updates · v{report.report_version || 1}</p><p className="mt-1 text-xs font-bold text-slate-500">{label(report.status)} · {report.status === "published" ? "Customer dashboard only · no email sent" : "Human review required"}</p></div>{report.status === "draft" && <Button disabled={!reportWorkflowEnabled || reportActionLoading} onClick={() => void publishMonthlyReport(report.id)} className="rounded-xl bg-emerald-600">Review and publish</Button>}</div>)}{!data.reports.some((report) => report.source_kind === "scheduled") && <Empty text={reportWorkflowEnabled ? "No scheduled monthly report drafts exist yet." : "The monthly report workflow is off. Enable it from the admin release controls after migration and staging checks."} />}</CardContent></Card>
          {data.businesses.map((business) => {
            const report = data.reports.find((item) => item.business_id === business.id);
            const integration = data.integrations.find((item) => item.business_id === business.id);
            const signals = data.signals.filter((item) => item.business_id === business.id);
            return <Card key={business.id} className="rounded-3xl"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{business.name}</CardTitle><p className="mt-1 text-xs font-semibold text-slate-500">{business.plan || "Plan not set"} · {label(business.status)}</p></div><Badge className={signals.some((signal) => signal.severity === "urgent") ? "bg-rose-100 text-rose-700" : signals.length ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>{signals.length ? `${signals.length} open signal(s)` : "No open signal"}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Fact label="Latest measured report" value={report ? `${report.report_month} · ${report.lead_count || 0} enquiries` : "Not enough data yet"} /><Fact label="Google Business Profile" value={integration?.status === "connected" ? `Connected · synced ${dateTime(integration.last_synced_at)}` : "Not connected"} /></div>{signals.map((signal) => <div key={signal.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-black text-amber-950">{signal.title}</p><p className="mt-1 text-xs font-semibold text-amber-800">{signal.evidence || "Evidence must be added before actioning this signal."}</p>{signal.recommended_action && <p className="mt-2 text-xs font-black text-amber-950">Next: {signal.recommended_action}</p>}</div>)}{!signals.length && <p className="text-sm font-semibold text-slate-500">No evidence-based opportunity is currently recorded.</p>}</CardContent></Card>;
          })}
          {!data.businesses.length && <Empty text="No customer business exists yet." />}
          <Card className="rounded-3xl border-emerald-100 bg-emerald-50/50 xl:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Proof and referral queue</CardTitle><p className="text-sm font-semibold text-slate-600">Turn completed work into the evidence that makes the next sale easier.</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Fact label="Proof records" value={String(data.testimonials.length)} /><Fact label="Published proof" value={String(data.testimonials.filter((item) => item.status === "published" || item.is_published).length)} /><div className="rounded-2xl border border-emerald-200 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Next action</p><p className="mt-2 text-sm font-bold leading-5 text-slate-800">Ask every launched customer for one approved change summary and one introduction.</p><Button className="mt-3 rounded-xl bg-emerald-600" onClick={() => window.location.assign("/admin/affiliates")}>Open partner referrals <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="experiments" className="grid gap-6 pt-4 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-indigo-600" />New measured experiment</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={experiment.name} onChange={(event) => setExperiment({ ...experiment, name: event.target.value })} placeholder="Experiment name" className="rounded-xl" /><Select value={experiment.templateId} onValueChange={(templateId) => setExperiment({ ...experiment, templateId })}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose template" /></SelectTrigger><SelectContent>{Object.values(NICHE_TEMPLATES).filter((template, index, templates) => templates.findIndex((item) => item.id === template.id) === index).map((template) => <SelectItem key={template.id} value={template.id}>{template.customerName || template.name}</SelectItem>)}</SelectContent></Select><Textarea value={experiment.hypothesis} onChange={(event) => setExperiment({ ...experiment, hypothesis: event.target.value })} placeholder="If we change X, we expect more recorded enquiry events because…" className="rounded-xl" /><Select value={experiment.event} onValueChange={(event) => setExperiment({ ...experiment, event })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lead_submitted">Lead submitted</SelectItem><SelectItem value="whatsapp_clicked">WhatsApp clicked</SelectItem><SelectItem value="booking_completed">Booking completed</SelectItem><SelectItem value="checkout_started">Checkout started</SelectItem></SelectContent></Select><p className="text-xs font-semibold text-slate-500">Drafts require at least 200 recorded sessions before a result can be interpreted. No uplift is claimed before sufficient data exists.</p><Button className="w-full rounded-xl bg-indigo-600" onClick={() => void createExperiment()}>Save draft experiment</Button></CardContent></Card>
          <div className="space-y-4"><SectionIntro title="Reusable vertical delivery kits" copy="Standardise inputs, proof, and launch checks while keeping each customer website personalised." />{data.kits.map((kit) => <Card key={kit.id} className="rounded-3xl"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{kit.name}</p><p className="text-xs font-semibold text-slate-500">{kit.market} · {kit.template_id}</p></div><Badge variant="outline" className="rounded-full">{label(kit.status)}</Badge></div><div className="mt-4 grid gap-3 md:grid-cols-3"><KitList label="Required inputs" values={kit.required_inputs} /><KitList label="Proof needed" values={kit.proof_requirements} /><KitList label="Launch checks" values={kit.launch_checklist} /></div></CardContent></Card>)}{!data.kits.length && <Empty text="Apply the growth operations migration to seed delivery kits." />}<SectionIntro title="Experiment register" copy="Only tracked events are valid outcomes." />{data.experiments.map((item) => <Card key={item.id} className="rounded-2xl"><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center"><div className="flex-1"><p className="font-black">{item.name}</p><p className="text-xs text-slate-500">{item.hypothesis}</p></div><Badge variant="outline">{label(item.primary_event)}</Badge><Badge>{label(item.status)}</Badge></CardContent></Card>)}</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ icon: Icon, label: metricLabel, value, attention = false }: { icon: React.ElementType; label: string; value: number; attention?: boolean }) {
  return <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-5"><Icon className={`h-5 w-5 ${attention ? "text-rose-600" : "text-indigo-600"}`} /><p className="mt-4 text-xs font-bold text-slate-500">{metricLabel}</p><p className={`mt-1 text-4xl font-black ${attention ? "text-rose-600" : "text-slate-950"}`}>{value}</p></CardContent></Card>;
}

function ActionList({ title, icon: Icon, rows, empty }: { title: string; icon: React.ElementType; rows: Array<{ id: string; title: string; detail: string; action: string; href: string }>; empty: string }) {
  return <Card className="rounded-3xl"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-indigo-600" />{title}</CardTitle></CardHeader><CardContent className="space-y-3">{rows.map((row) => <div key={row.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-black text-slate-950">{row.title}</p><p className="text-xs font-semibold text-slate-500">{row.detail}</p></div><Button variant="outline" className="rounded-xl" onClick={() => window.location.assign(row.href)}>{row.action}</Button></div>)}{!rows.length && <p className="py-8 text-center text-sm font-semibold text-slate-500">{empty}</p>}</CardContent></Card>;
}

function SectionIntro({ title, copy }: { title: string; copy: string }) { return <div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">{copy}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">{text}</div>; }
function Fact({ label: factLabel, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{factLabel}</p><p className="mt-2 text-sm font-black text-slate-900">{value}</p></div>; }
function KitList({ label: kitLabel, values }: { label: string; values: unknown }) { const items = Array.isArray(values) ? values : []; return <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kitLabel}</p><ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600">{items.slice(0,4).map((item) => <li key={String(item)}>• {String(item)}</li>)}</ul></div>; }
