import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Copy, ExternalLink, Filter, Plus, Rocket, Route, Users } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { FUNNEL_TEMPLATES, buildTemplateGraph, slugifyFunnel, type FunnelRecord, type FunnelObjective } from "../../lib/funnelEngine";
import { FunnelAiStrategist } from "./FunnelAiStrategist";
import { toast } from "sonner";

type FunnelRow = FunnelRecord & { stepCount?: number; eventCount?: number; leadCount?: number };

export function FunnelsDashboard({
  businessIdOverride,
  adminMode = false,
  onOpenFunnel,
}: {
  businessIdOverride?: string | null;
  adminMode?: boolean;
  onOpenFunnel?: (funnelId: string) => void;
}) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const businessId = businessIdOverride || profile?.businessId || null;
  const [funnels, setFunnels] = React.useState<FunnelRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [templateKey, setTemplateKey] = React.useState(FUNNEL_TEMPLATES[0].key);
  const [accessMode, setAccessMode] = React.useState<"managed"|"collaborative"|"self_managed">("managed");
  const [businessAccessMode, setBusinessAccessMode] = React.useState<"managed"|"collaborative"|"self_managed">("managed");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const load = React.useCallback(async () => {
    if (!businessId) {
      setFunnels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data, error }, { data: businessRow }] = await Promise.all([
        supabase
          .from("funnels")
          .select("*")
          .eq("business_id", businessId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("businesses")
          .select("sales_funnels_access_mode")
          .eq("id", businessId)
          .maybeSingle(),
      ]);
      if (error) throw error;

      const resolvedMode = (businessRow?.sales_funnels_access_mode || "managed") as "managed"|"collaborative"|"self_managed";
      setBusinessAccessMode(resolvedMode);
      setAccessMode(resolvedMode);
      const rows = (data || []) as FunnelRow[];
      const ids = rows.map((row) => row.id);
      if (!ids.length) {
        setFunnels(rows);
        return;
      }
      const [{ data: steps }, { data: events }, { data: submissions }] = await Promise.all([
        supabase.from("funnel_steps").select("funnel_id").in("funnel_id", ids),
        supabase.from("funnel_events").select("funnel_id,event_type").in("funnel_id", ids),
        supabase.from("funnel_submissions").select("funnel_id,lead_id").in("funnel_id", ids),
      ]);
      setFunnels(rows.map((row) => ({
        ...row,
        stepCount: (steps || []).filter((item: any) => item.funnel_id === row.id).length,
        eventCount: (events || []).filter((item: any) => item.funnel_id === row.id && item.event_type === "step_view").length,
        leadCount: new Set((submissions || []).filter((item: any) => item.funnel_id === row.id && item.lead_id).map((item: any) => item.lead_id)).size,
      })));
    } catch (error: any) {
      console.error("Funnels could not load:", error);
      toast.error("Sales funnels could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  React.useEffect(() => { void load(); }, [load]);

  const createFunnel = async () => {
    if (!businessId || !name.trim()) return;
    setCreating(true);
    try {
      const template = FUNNEL_TEMPLATES.find((item) => item.key === templateKey) || FUNNEL_TEMPLATES[0];
      const funnelId = crypto.randomUUID();
      const slugBase = slugifyFunnel(name);
      const slug = funnels.some((funnel) => funnel.slug === slugBase) ? `${slugBase}-${Date.now().toString().slice(-5)}` : slugBase;
      const { error: funnelError } = await supabase.from("funnels").insert({
        id: funnelId,
        business_id: businessId,
        name: name.trim(),
        slug,
        objective: template.objective,
        status: "draft",
        access_mode: accessMode,
        template_key: template.key,
        description: `${template.name} funnel`,
        created_by: profile?.uid || null,
      });
      if (funnelError) throw funnelError;

      const graph = buildTemplateGraph(template.key, businessId, funnelId);
      const { error: stepError } = await supabase.from("funnel_steps").insert(graph.steps);
      if (stepError) throw stepError;
      const { error: connectionError } = await supabase.from("funnel_connections").insert(graph.connections);
      if (connectionError) throw connectionError;

      toast.success("Funnel created");
      setCreateOpen(false);
      setName("");
      await load();
      if (onOpenFunnel) onOpenFunnel(funnelId);
      else navigate(`/dashboard/funnels/${funnelId}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Funnel could not be created.");
    } finally {
      setCreating(false);
    }
  };

  const duplicateFunnel = async (funnel: FunnelRow) => {
    if (!businessId) return;
    try {
      const [{ data: steps }, { data: connections }] = await Promise.all([
        supabase.from("funnel_steps").select("*").eq("funnel_id", funnel.id),
        supabase.from("funnel_connections").select("*").eq("funnel_id", funnel.id),
      ]);
      const newId = crypto.randomUUID();
      const nameCopy = `${funnel.name} Copy`;
      const { error } = await supabase.from("funnels").insert({
        business_id: businessId,
        id: newId,
        name: nameCopy,
        slug: `${slugifyFunnel(nameCopy)}-${Date.now().toString().slice(-4)}`,
        objective: funnel.objective,
        status: "draft",
        access_mode: funnel.access_mode,
        template_key: funnel.template_key,
        description: funnel.description,
        settings: funnel.settings || {},
        created_by: profile?.uid || null,
      });
      if (error) throw error;
      const idMap = new Map<string,string>();
      const copiedSteps = (steps || []).map((step: any) => {
        const id = crypto.randomUUID();
        idMap.set(step.id, id);
        const { created_at, updated_at, ...rest } = step;
        return { ...rest, id, funnel_id: newId, status: "draft" };
      });
      if (copiedSteps.length) await supabase.from("funnel_steps").insert(copiedSteps);
      const copiedEdges = (connections || []).map((edge: any) => {
        const { created_at, ...rest } = edge;
        return { ...rest, id: crypto.randomUUID(), funnel_id: newId, source_step_id: idMap.get(edge.source_step_id), target_step_id: idMap.get(edge.target_step_id) };
      }).filter((edge: any) => edge.source_step_id && edge.target_step_id);
      if (copiedEdges.length) await supabase.from("funnel_connections").insert(copiedEdges);
      toast.success("Funnel duplicated");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Funnel could not be duplicated.");
    }
  };

  const openFunnel = (id: string) => {
    if (onOpenFunnel) onOpenFunnel(id);
    else navigate(`/dashboard/funnels/${id}`);
  };

  const filtered = statusFilter === "all" ? funnels : funnels.filter((funnel) => funnel.status === statusFilter);
  const canCreate = adminMode || (profile?.role === "business_admin" && businessAccessMode !== "managed");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600"><Route className="h-5 w-5" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Custom acquisition system</span></div>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Sales Funnels</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">Build campaign journeys, connect steps visually, capture leads, automate follow-up and measure the actual conversion path.</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl bg-white"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All funnels</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
          </Select>
          {canCreate ? <FunnelAiStrategist businessId={businessId || ""} accessMode={businessAccessMode} onCreated={(id)=>{void load();openFunnel(id);}} /> : null}
          {canCreate ? <Button onClick={() => setCreateOpen(true)} className="rounded-xl bg-indigo-600 font-black"><Plus className="mr-2 h-4 w-4" />New Funnel</Button> : <Badge className="border-0 bg-slate-900 px-3 py-2 text-white">Managed by Bennie Studio</Badge>}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-64 animate-pulse rounded-[2rem] bg-slate-100" />)}</div>
      ) : filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((funnel) => (
            <Card key={funnel.id} className="group rounded-[2rem] border-slate-200 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge variant="outline" className={funnel.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}>{funnel.status}</Badge>
                  <h2 className="mt-4 truncate text-xl font-black text-slate-950">{funnel.name}</h2>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{funnel.objective} · {funnel.access_mode.replace("_"," ")}</p>
                </div>
                <Rocket className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Steps</p><p className="mt-1 text-lg font-black text-slate-950">{funnel.stepCount || 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Views</p><p className="mt-1 text-lg font-black text-slate-950">{funnel.eventCount || 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Leads</p><p className="mt-1 text-lg font-black text-slate-950">{funnel.leadCount || 0}</p></div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button onClick={() => openFunnel(funnel.id)} className="flex-1 rounded-xl bg-slate-950 font-black">Open Builder</Button>
                {(adminMode || (profile?.role === "business_admin" && businessAccessMode !== "managed" && funnel.access_mode !== "managed")) ? <Button variant="outline" onClick={() => void duplicateFunnel(funnel)} className="rounded-xl"><Copy className="h-4 w-4" /></Button> : null}
                {funnel.status === "published" ? <Button variant="outline" onClick={() => window.open(`/f/${businessId}/${funnel.slug}`, "_blank")} className="rounded-xl"><ExternalLink className="h-4 w-4" /></Button> : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-[2rem] border-dashed border-slate-300 p-14 text-center">
          <Route className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-950">No funnels here yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">Start from a proven funnel structure, then adapt the offer, routing and pages to the real customer.</p>
          {canCreate ? <Button onClick={() => setCreateOpen(true)} className="mt-6 rounded-xl bg-indigo-600"><Plus className="mr-2 h-4 w-4" />Create first funnel</Button> : null}
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[2rem] sm:max-w-xl">
          <DialogHeader><DialogTitle>Create Sales Funnel</DialogTitle><DialogDescription>Choose the journey first. The pages, analytics and automations will all use this same graph.</DialogDescription></DialogHeader>
          <div className="space-y-5 py-3">
            <div className="space-y-2"><Label>Funnel name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Invisalign Consultation Campaign" className="h-12 rounded-xl" /></div>
            <div className="space-y-2"><Label>Starting structure</Label><Select value={templateKey} onValueChange={setTemplateKey}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{FUNNEL_TEMPLATES.map((template) => <SelectItem key={template.key} value={template.key}>{template.name} · {template.steps.length} steps</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Customer access</Label><Select value={accessMode} onValueChange={(value: any) => setAccessMode(value)}><SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="managed">Managed · Bennie Studio edits</SelectItem><SelectItem value="collaborative">Collaborative · customer can edit</SelectItem><SelectItem value="self_managed">Self-managed · customer full builder access</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancel</Button><Button disabled={!name.trim() || creating} onClick={() => void createFunnel()} className="rounded-xl bg-indigo-600">{creating ? "Creating…" : "Create Funnel"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
