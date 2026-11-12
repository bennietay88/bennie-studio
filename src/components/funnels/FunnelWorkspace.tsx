import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BarChart3, ExternalLink, GitBranch, Globe2, ListChecks, Plus, Save, Settings2, Trash2, Users, Workflow } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useFunnelTier } from "../../hooks/useFunnelTier";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { FlowCanvas, type FlowCanvasEdge, type FlowCanvasNode } from "./FlowCanvas";
import { FunnelAnalyticsDashboard } from "./FunnelAnalyticsDashboard";
import { FunnelAutomationBuilder } from "./FunnelAutomationBuilder";
import { FunnelStepEditor } from "./FunnelStepEditor";
import { DEFAULT_FUNNEL_PAGE_CONTENT, FUNNEL_STEP_LABELS, type FunnelConnection, type FunnelEvent, type FunnelRecord, type FunnelStep, type FunnelStepType, slugifyFunnel } from "../../lib/funnelEngine";
import { toast } from "sonner";

const terminalTypes = new Set<FunnelStepType>(["thank_you","confirmation"]);

export function FunnelWorkspace({
  funnelIdOverride,
  adminMode = false,
  onBack,
}: {
  funnelIdOverride?: string | null;
  adminMode?: boolean;
  onBack?: () => void;
}) {
  const params = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { access } = useFunnelTier();
  const funnelId = funnelIdOverride || params.funnelId || "";
  const [funnel, setFunnel] = React.useState<FunnelRecord | null>(null);
  const [steps, setSteps] = React.useState<FunnelStep[]>([]);
  const [connections, setConnections] = React.useState<FunnelConnection[]>([]);
  const [events, setEvents] = React.useState<FunnelEvent[]>([]);
  const [variants, setVariants] = React.useState<any[]>([]);
  const [submissions, setSubmissions] = React.useState<any[]>([]);
  const [selectedStepId, setSelectedStepId] = React.useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = React.useState<string | null>(null);
  const [addStepOpen, setAddStepOpen] = React.useState(false);
  const [newStepType, setNewStepType] = React.useState<FunnelStepType>("landing");
  const [newStepName, setNewStepName] = React.useState("New Landing Page");
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [businessAccessMode, setBusinessAccessMode] = React.useState<"managed"|"collaborative"|"self_managed">("managed");

  const readOnly = Boolean(
    funnel &&
    !adminMode &&
    profile?.role !== "super_admin" &&
    (
      profile?.role !== "business_admin" ||
      !access?.active ||
      businessAccessMode === "managed" ||
      funnel.access_mode === "managed"
    )
  );

  const load = React.useCallback(async () => {
    if (!funnelId) return;
    setLoading(true);
    try {
      const [{ data: funnelData, error: funnelError }, { data: stepData }, { data: connectionData }, { data: eventData }, { data: submissionData }, { data: variantData }] = await Promise.all([
        supabase.from("funnels").select("*").eq("id", funnelId).single(),
        supabase.from("funnel_steps").select("*").eq("funnel_id", funnelId).order("sort_order"),
        supabase.from("funnel_connections").select("*").eq("funnel_id", funnelId).order("priority"),
        supabase.from("funnel_events").select("*").eq("funnel_id", funnelId).gte("created_at", new Date(Date.now()-90*24*60*60*1000).toISOString()).order("created_at", { ascending: false }).limit(5000),
        supabase.from("funnel_submissions").select("*,leads(id,name,email,phone,status,automation_score,automation_temperature)").eq("funnel_id", funnelId).order("created_at", { ascending: false }).limit(200),
        supabase.from("funnel_variants").select("id,step_id,name,status").eq("funnel_id",funnelId).eq("status","active"),
      ]);
      if (funnelError) throw funnelError;
      setFunnel(funnelData as FunnelRecord);
      const { data: businessModeRow } = await supabase
        .from("businesses")
        .select("sales_funnels_access_mode")
        .eq("id", funnelData.business_id)
        .maybeSingle();
      setBusinessAccessMode((businessModeRow?.sales_funnels_access_mode || "managed") as "managed"|"collaborative"|"self_managed");
      setSteps((stepData || []) as FunnelStep[]);
      setConnections((connectionData || []) as FunnelConnection[]);
      setEvents((eventData || []) as FunnelEvent[]);
      setVariants(variantData || []);
      setSubmissions(submissionData || []);
      setSelectedStepId((current) => current && (stepData || []).some((step: any) => step.id === current) ? current : (stepData || []).find((step: any) => step.is_entry)?.id || (stepData || [])[0]?.id || null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Funnel workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [funnelId]);

  React.useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="min-h-[60vh] animate-pulse rounded-[2rem] bg-slate-100" />;
  if (!funnel) return <Card className="rounded-[2rem] p-12 text-center"><p className="font-black text-slate-900">Funnel not found.</p></Card>;

  const selectedStep = steps.find((step) => step.id === selectedStepId) || null;
  const moveNode = (id: string, x: number, y: number) => setSteps((current) => current.map((step) => step.id === id ? { ...step, position_x: x, position_y: y } : step));
  const commitMove = async (id: string, x: number, y: number) => {
    if (readOnly) return;
    await supabase.from("funnel_steps").update({ position_x: x, position_y: y, updated_at: new Date().toISOString() }).eq("id", id);
  };

  const connect = async (source: string, target: string) => {
    if (readOnly || source === target || connections.some((edge) => edge.source_step_id === source && edge.target_step_id === target)) { setConnectingFrom(null); return; }
    const { data, error } = await supabase.from("funnel_connections").insert({ funnel_id: funnel.id, business_id: funnel.business_id, source_step_id: source, target_step_id: target, condition_type: "always", condition_config: {}, priority: connections.filter((edge) => edge.source_step_id === source).length }).select("*").single();
    if (error) return toast.error(error.message);
    setConnections((current) => [...current, data as FunnelConnection]);
    setConnectingFrom(null);
  };

  const deleteEdge = async (id: string) => {
    if (readOnly) return;
    await supabase.from("funnel_connections").delete().eq("id", id);
    setConnections((current) => current.filter((edge) => edge.id !== id));
  };

  const addStep = async () => {
    if (readOnly) return;
    if (!adminMode && (steps.length >= (access?.limits.maxSteps ?? 0) ||
      (access?.tier === "free" && !["lead_form","thank_you"].includes(newStepType)))) {
      return toast.error("This step is not included in your funnel plan.");
    }
    const name = newStepName.trim() || FUNNEL_STEP_LABELS[newStepType];
    const slugBase = slugifyFunnel(name);
    const slug = steps.some((step) => step.slug === slugBase) ? `${slugBase}-${steps.length+1}` : slugBase;
    const payload = {
      id: crypto.randomUUID(),
      funnel_id: funnel.id,
      business_id: funnel.business_id,
      step_type: newStepType,
      name,
      slug,
      position_x: 140 + (steps.length % 4) * 300,
      position_y: 150 + Math.floor(steps.length / 4) * 220,
      is_entry: steps.length === 0,
      status: "draft",
      page_content: DEFAULT_FUNNEL_PAGE_CONTENT[newStepType],
      settings: {},
      sort_order: steps.length,
    };
    const { data, error } = await supabase.from("funnel_steps").insert(payload).select("*").single();
    if (error) return toast.error(error.message);
    setSteps((current) => [...current, data as FunnelStep]);
    setSelectedStepId(data.id);
    setAddStepOpen(false);
  };

  const updateConnection = async (edge: FunnelConnection, patch: Partial<FunnelConnection>) => {
    if (readOnly) return;
    const updated = { ...edge, ...patch };
    setConnections((current) => current.map((item) => item.id === edge.id ? updated : item));
    const { id, funnel_id, business_id, source_step_id, target_step_id, ...persisted } = updated as any;
    const { error } = await supabase.from("funnel_connections").update(persisted).eq("id", edge.id);
    if (error) toast.error(error.message);
  };

  const validatePublish = () => {
    const problems: string[] = [];
    if (!steps.length) problems.push("Add at least one funnel step.");
    if (!steps.some((step) => step.is_entry)) problems.push("Choose an entry step.");
    if (!steps.some((step) => terminalTypes.has(step.step_type))) problems.push("Add a confirmation or thank-you step.");
    const slugs = steps.map((step) => step.slug);
    if (new Set(slugs).size !== slugs.length) problems.push("Each step needs a unique URL slug.");
    for (const step of steps) {
      if (!step.page_content?.headline) problems.push(`${step.name} needs a headline.`);
      if (!terminalTypes.has(step.step_type) && !connections.some((edge) => edge.source_step_id === step.id)) problems.push(`${step.name} has no next connection.`);
    }
    return problems;
  };

  const setPublished = async (publish: boolean) => {
    if (readOnly) return;
    if (publish) {
      const problems = validatePublish();
      if (problems.length) return toast.error(problems[0]);
    }
    if (import.meta.env.VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true") {
      const { error } = await supabase.rpc("publish_funnel_safely", {
        p_funnel_id: funnel.id, p_publish: publish,
      });
      if (error) return toast.error(error.message);
    } else {
      // Keep pre-migration customer publishing operational.
      const status = publish ? "published" : "draft";
      const { error: funnelError } = await supabase.from("funnels")
        .update({ status, published_at: publish ? new Date().toISOString() : null,
          updated_at: new Date().toISOString() }).eq("id", funnel.id);
      if (funnelError) return toast.error(funnelError.message);
      const { error: stepsError } = await supabase.from("funnel_steps")
        .update({ status }).eq("funnel_id", funnel.id);
      if (stepsError) return toast.error("Funnel status changed, but some steps could not be published. Please retry.");
    }
    await load();
    toast.success(publish ? "Funnel published" : "Funnel returned to draft");
  };

  const saveSettings = async () => {
    if (readOnly) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase.from("funnels").update({ name: funnel.name, description: funnel.description, objective: funnel.objective, access_mode: funnel.access_mode, primary_domain: funnel.primary_domain, settings: funnel.settings || {}, updated_at: new Date().toISOString() }).eq("id", funnel.id);
      if (error) throw error;
      toast.success("Funnel settings saved");
    } catch (error: any) { toast.error(error.message); } finally { setSavingSettings(false); }
  };

  const graphNodes: FlowCanvasNode[] = steps.map((step) => {
    const stepEvents = events.filter((event) => event.step_id === step.id);
    const views = stepEvents.filter((event) => event.event_type === "step_view").length;
    const conversions = stepEvents.filter((event) => ["form_submitted","appointment_booked","checkout_started","purchase_completed"].includes(event.event_type)).length;
    return { id: step.id, title: step.name, subtitle: step.page_content?.headline || FUNNEL_STEP_LABELS[step.step_type], kind: FUNNEL_STEP_LABELS[step.step_type], x: Number(step.position_x), y: Number(step.position_y), badge: step.is_entry ? "Entry" : step.status, tone: step.is_entry ? "emerald" : "slate", metrics: [{ label: "Views", value: String(views) }, { label: "Conv.", value: String(conversions) }] };
  });
  const graphEdges: FlowCanvasEdge[] = connections.map((edge) => ({ id: edge.id, source: edge.source_step_id, target: edge.target_step_id, label: edge.label || (edge.condition_type === "always" ? "Next" : edge.condition_type) }));

  const back = () => onBack ? onBack() : navigate("/dashboard/funnels");
  const publicUrl = `/f/${funnel.business_id}/${funnel.slug}`;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button type="button" onClick={back} className="text-xs font-black uppercase tracking-wider text-indigo-600">← All funnels</button>
          <div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black tracking-tight text-slate-950">{funnel.name}</h1><Badge variant="outline" className={funnel.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>{funnel.status}</Badge><Badge variant="outline">{businessAccessMode.replace("_"," ")} account</Badge><Badge variant="outline">{funnel.access_mode.replace("_"," ")} funnel</Badge>{readOnly ? <Badge className="border-0 bg-slate-900 text-white">Read only</Badge> : null}</div>
          <p className="mt-2 text-sm font-semibold text-slate-500">{funnel.description || "Custom conversion journey"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {funnel.status === "published" ? <Button variant="outline" onClick={() => window.open(publicUrl,"_blank")} className="rounded-xl"><ExternalLink className="mr-2 h-4 w-4" />Open live funnel</Button> : null}
          {!readOnly ? <Button onClick={() => void setPublished(funnel.status !== "published")} className={funnel.status === "published" ? "rounded-xl bg-slate-900" : "rounded-xl bg-emerald-600"}><Globe2 className="mr-2 h-4 w-4" />{funnel.status === "published" ? "Unpublish" : "Publish"}</Button> : null}
        </div>
      </div>

      <Tabs defaultValue="flow" className="space-y-6">
        <TabsList className="h-auto flex-wrap rounded-2xl border border-slate-200 bg-white p-1">
          <TabsTrigger value="flow" className="rounded-xl"><GitBranch className="mr-2 h-4 w-4" />Flow</TabsTrigger>
          <TabsTrigger value="pages" className="rounded-xl"><ListChecks className="mr-2 h-4 w-4" />Pages</TabsTrigger>
          <TabsTrigger value="leads" className="rounded-xl"><Users className="mr-2 h-4 w-4" />Leads</TabsTrigger>
          {(adminMode || access?.limits.workflows) ? <TabsTrigger value="automations" className="rounded-xl"><Workflow className="mr-2 h-4 w-4" />Automations</TabsTrigger> : null}
          <TabsTrigger value="analytics" className="rounded-xl"><BarChart3 className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl"><Settings2 className="mr-2 h-4 w-4" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-black text-slate-950">Funnel Flow</h2><p className="text-xs font-semibold text-slate-500">Drag steps to arrange them. Connect nodes to define where visitors go next.</p></div>
            {!readOnly && (adminMode || steps.length < (access?.limits.maxSteps ?? 0)) ? <Button onClick={() => {if (access?.tier === "free" && !adminMode) setNewStepType("lead_form"); setAddStepOpen(true);}} variant="outline" className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Add step</Button> : null}
          </div>
          <FlowCanvas nodes={graphNodes} edges={graphEdges} editable={!readOnly} selectedNodeId={selectedStepId} connectingFrom={connectingFrom} onSelectNode={setSelectedStepId} onMoveNode={moveNode} onMoveNodeCommit={(id,x,y)=>void commitMove(id,x,y)} onStartConnection={(id)=>setConnectingFrom((current)=>current===id?null:id)} onCompleteConnection={(source,target)=>void connect(source,target)} onDeleteEdge={(id)=>void deleteEdge(id)} />

          <Card className="rounded-[2rem] border-slate-200 p-6">
            <h3 className="font-black text-slate-950">Routing rules</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Connections can always continue, branch on a form answer, or branch on lead score.</p>
            <div className="mt-5 space-y-3">
              {connections.map((edge) => {
                const source = steps.find((step)=>step.id===edge.source_step_id);
                const target = steps.find((step)=>step.id===edge.target_step_id);
                return (
                  <div key={edge.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[1fr_auto_1fr_160px_1.5fr_auto] lg:items-center">
                    <span className="font-black text-slate-900">{source?.name || "Unknown"}</span><span className="text-slate-300">→</span><span className="font-black text-slate-900">{target?.name || "Unknown"}</span>
                    <Select disabled={readOnly} value={edge.condition_type} onValueChange={(value:any)=>void updateConnection(edge,{condition_type:value,condition_config:value==="always"?{}:edge.condition_config||{}})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="always">Always</SelectItem><SelectItem value="field">Form field</SelectItem><SelectItem value="score">Lead score</SelectItem><SelectItem value="purchased">Purchased</SelectItem><SelectItem value="not_purchased">Not purchased</SelectItem></SelectContent></Select>
                    {edge.condition_type === "field" ? <div className="grid grid-cols-3 gap-2"><Input disabled={readOnly} placeholder="field" value={edge.condition_config?.field||""} onChange={(e)=>void updateConnection(edge,{condition_config:{...edge.condition_config,field:e.target.value}})} /><Select disabled={readOnly} value={edge.condition_config?.operator||"equals"} onValueChange={(value)=>void updateConnection(edge,{condition_config:{...edge.condition_config,operator:value}})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="equals">equals</SelectItem><SelectItem value="contains">contains</SelectItem><SelectItem value="gt">&gt;</SelectItem><SelectItem value="lt">&lt;</SelectItem></SelectContent></Select><Input disabled={readOnly} placeholder="value" value={edge.condition_config?.value??""} onChange={(e)=>void updateConnection(edge,{condition_config:{...edge.condition_config,value:e.target.value}})} /></div> : edge.condition_type === "score" ? <div className="grid grid-cols-2 gap-2"><Input disabled={readOnly} type="number" placeholder="Min" value={edge.condition_config?.min??""} onChange={(e)=>void updateConnection(edge,{condition_config:{...edge.condition_config,min:Number(e.target.value)}})} /><Input disabled={readOnly} type="number" placeholder="Max" value={edge.condition_config?.max??""} onChange={(e)=>void updateConnection(edge,{condition_config:{...edge.condition_config,max:Number(e.target.value)}})} /></div> : <Input disabled={readOnly} placeholder="Connection label" value={edge.label||""} onChange={(e)=>void updateConnection(edge,{label:e.target.value})} />}
                    {!readOnly ? <Button variant="outline" onClick={()=>void deleteEdge(edge.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button> : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <Card className="h-fit rounded-[2rem] border-slate-200 p-4">
              <p className="px-2 pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Funnel steps</p>
              <div className="space-y-1">{steps.map((step) => <button key={step.id} type="button" onClick={()=>setSelectedStepId(step.id)} className={`w-full rounded-xl px-3 py-3 text-left text-sm font-bold transition ${selectedStepId===step.id?"bg-indigo-50 text-indigo-700":"text-slate-600 hover:bg-slate-50"}`}><span className="block">{step.name}</span><span className="mt-1 block text-[9px] font-black uppercase tracking-wider opacity-60">{FUNNEL_STEP_LABELS[step.step_type]}</span></button>)}</div>
            </Card>
            {selectedStep ? <FunnelStepEditor step={selectedStep} readOnly={readOnly} allowVariants={adminMode || Boolean(access?.limits.variants)} allowCheckout={adminMode || Boolean(access?.limits.checkout)} onSaved={(updated)=>setSteps((current)=>current.map((step)=>step.id===updated.id?updated:step))} /> : <Card className="rounded-[2rem] p-12 text-center">Select a step.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="leads">
          <Card className="overflow-hidden rounded-[2rem] border-slate-200">
            <div className="border-b border-slate-100 p-6"><h2 className="text-xl font-black text-slate-950">Funnel submissions</h2><p className="mt-1 text-xs font-semibold text-slate-500">Submissions create or update the existing Bennie Studio lead record. There is no second CRM.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="px-6 py-3">Lead</th><th>Step</th><th>Status</th><th>Score</th><th>Submitted</th></tr></thead><tbody>{submissions.map((submission)=><tr key={submission.id} className="border-t border-slate-100 text-sm font-semibold text-slate-600"><td className="px-6 py-4"><p className="font-black text-slate-950">{submission.leads?.name || submission.data?.name || "Anonymous"}</p><p className="text-xs text-slate-400">{submission.leads?.email || submission.data?.email || ""}</p></td><td>{steps.find((step)=>step.id===submission.step_id)?.name || "Step"}</td><td>{submission.leads?.status || "captured"}</td><td>{submission.leads?.automation_score ?? "—"} {submission.leads?.automation_temperature ? <Badge variant="outline" className="ml-1">{submission.leads.automation_temperature}</Badge>:null}</td><td>{new Date(submission.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>
            {!submissions.length ? <p className="p-8 text-sm font-semibold text-slate-400">No submissions yet.</p> : null}
          </Card>
        </TabsContent>

        {(adminMode || access?.limits.workflows) ? <TabsContent value="automations"><FunnelAutomationBuilder businessId={funnel.business_id} funnelId={funnel.id} readOnly={readOnly} /></TabsContent> : null}
        <TabsContent value="analytics"><FunnelAnalyticsDashboard steps={steps} connections={connections} events={events} variants={variants} currency={funnel.settings?.currency || "USD"} basic={!adminMode && access?.tier === "free"} /></TabsContent>

        <TabsContent value="settings">
          <Card className="max-w-3xl rounded-[2rem] border-slate-200 p-7">
            <h2 className="text-xl font-black text-slate-950">Funnel settings</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input disabled={readOnly} value={funnel.name} onChange={(e)=>setFunnel({...funnel,name:e.target.value})} /></div>
              <div className="space-y-2"><Label>Objective</Label><Select disabled={readOnly} value={funnel.objective} onValueChange={(value:any)=>setFunnel({...funnel,objective:value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["lead","appointment","quote","application","sale","subscription"].map((item)=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Customer access</Label><Select disabled={readOnly || !adminMode} value={funnel.access_mode} onValueChange={(value:any)=>setFunnel({...funnel,access_mode:value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="managed">Managed</SelectItem><SelectItem value="collaborative">Collaborative</SelectItem><SelectItem value="self_managed">Self-managed</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Reporting currency</Label><Select disabled={readOnly} value={funnel.settings?.currency || "USD"} onValueChange={(value)=>setFunnel({...funnel,settings:{...(funnel.settings||{}),currency:value}})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USD","MYR","SGD","GBP"].map((item)=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea disabled={readOnly} value={funnel.description || ""} onChange={(e)=>setFunnel({...funnel,description:e.target.value})} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Custom domain / route note</Label><Input disabled={readOnly} value={funnel.primary_domain || ""} onChange={(e)=>setFunnel({...funnel,primary_domain:e.target.value})} placeholder="Optional custom domain mapping" /></div>
            </div>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hosted URL</p><p className="mt-2 break-all font-mono text-xs font-bold text-indigo-600">{window.location.origin}{publicUrl}</p></div>
            {!readOnly ? <Button onClick={()=>void saveSettings()} disabled={savingSettings} className="mt-6 rounded-xl bg-indigo-600"><Save className="mr-2 h-4 w-4" />{savingSettings?"Saving…":"Save settings"}</Button>:null}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
        <DialogContent className="rounded-[2rem]"><DialogHeader><DialogTitle>Add funnel step</DialogTitle><DialogDescription>Add the real next action in the customer journey.</DialogDescription></DialogHeader><div className="space-y-4 py-3"><div className="space-y-2"><Label>Step type</Label><Select value={newStepType} onValueChange={(value:any)=>{setNewStepType(value);setNewStepName(FUNNEL_STEP_LABELS[value as FunnelStepType]);}}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FUNNEL_STEP_LABELS).filter(([value]) => adminMode || access?.tier !== "free" || ["lead_form","thank_you"].includes(value)).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Name</Label><Input value={newStepName} onChange={(e)=>setNewStepName(e.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={()=>setAddStepOpen(false)}>Cancel</Button><Button onClick={()=>void addStep()} className="bg-indigo-600">Add step</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
