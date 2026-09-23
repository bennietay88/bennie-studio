import React from "react";
import { Play, Plus, Save, TimerReset, Workflow, Zap } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { FlowCanvas, type FlowCanvasEdge, type FlowCanvasNode } from "./FlowCanvas";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";

const NODE_LIBRARY = [
  { kind: "trigger", type: "form_submitted", name: "Form submitted" },
  { kind: "trigger", type: "appointment_booked", name: "Appointment booked" },
  { kind: "trigger", type: "purchase_completed", name: "Purchase completed" },
  { kind: "action", type: "send_email", name: "Send email" },
  { kind: "action", type: "update_lead_status", name: "Update lead status" },
  { kind: "action", type: "add_score", name: "Adjust lead score" },
  { kind: "action", type: "add_tag", name: "Add lead tag" },
  { kind: "action", type: "notify_team", name: "Notify team" },
  { kind: "condition", type: "lead_score", name: "Lead score condition" },
  { kind: "delay", type: "wait_hours", name: "Wait" },
] as const;

export function FunnelAutomationBuilder({
  businessId,
  funnelId,
  readOnly = false,
}: {
  businessId: string;
  funnelId: string;
  readOnly?: boolean;
}) {
  const [workflows, setWorkflows] = React.useState<any[]>([]);
  const [workflowId, setWorkflowId] = React.useState<string>("");
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [edges, setEdges] = React.useState<any[]>([]);
  const [runs, setRuns] = React.useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = React.useState<string | null>(null);

  const loadWorkflows = React.useCallback(async () => {
    const { data } = await supabase.from("funnel_workflows").select("*").eq("business_id", businessId).eq("funnel_id", funnelId).order("updated_at", { ascending: false });
    setWorkflows(data || []);
    if (!workflowId && data?.[0]?.id) setWorkflowId(data[0].id);
  }, [businessId, funnelId, workflowId]);

  const loadGraph = React.useCallback(async () => {
    if (!workflowId) { setNodes([]); setEdges([]); setRuns([]); return; }
    const [{ data: nodeData }, { data: edgeData }, { data: runData }] = await Promise.all([
      supabase.from("funnel_workflow_nodes").select("*").eq("workflow_id", workflowId),
      supabase.from("funnel_workflow_connections").select("*").eq("workflow_id", workflowId),
      supabase.from("funnel_workflow_runs").select("*").eq("workflow_id", workflowId).order("started_at", { ascending: false }).limit(20),
    ]);
    setNodes(nodeData || []);
    setEdges(edgeData || []);
    setRuns(runData || []);
  }, [workflowId]);

  React.useEffect(() => { void loadWorkflows(); }, [loadWorkflows]);
  React.useEffect(() => { void loadGraph(); }, [loadGraph]);

  const createWorkflow = async () => {
    if (readOnly) return;
    const id = crypto.randomUUID();
    const { error } = await supabase.from("funnel_workflows").insert({ id, business_id: businessId, funnel_id: funnelId, name: `Follow-up Workflow ${workflows.length + 1}`, status: "draft" });
    if (error) return toast.error(error.message);
    const triggerId = crypto.randomUUID();
    await supabase.from("funnel_workflow_nodes").insert({ id: triggerId, workflow_id: id, business_id: businessId, node_kind: "trigger", action_type: "form_submitted", name: "Form submitted", position_x: 100, position_y: 180, config: {} });
    await loadWorkflows();
    setWorkflowId(id);
  };

  const addNode = async (libraryKey: string) => {
    if (!workflowId || readOnly) return;
    const item = NODE_LIBRARY.find((entry) => `${entry.kind}:${entry.type}` === libraryKey);
    if (!item) return;
    const id = crypto.randomUUID();
    const config = item.kind === "delay" ? { hours: 24 } : item.type === "add_score" ? { amount: 10 } : item.type === "update_lead_status" ? { status: "contacted" } : item.type === "send_email" ? { subject: "Thanks for your enquiry", body: "Thanks for getting in touch. We will follow up shortly." } : item.type === "lead_score" ? { operator: "gte", value: 60 } : {};
    const { data, error } = await supabase.from("funnel_workflow_nodes").insert({ id, workflow_id: workflowId, business_id: businessId, node_kind: item.kind, action_type: item.type, name: item.name, position_x: 120 + nodes.length * 90, position_y: 160 + (nodes.length % 3) * 180, config }).select("*").single();
    if (error) return toast.error(error.message);
    setNodes((current) => [...current, data]);
  };

  const updateNodePosition = (nodeId: string, x: number, y: number) => setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, position_x: x, position_y: y } : node));
  const commitNodePosition = async (nodeId: string, x: number, y: number) => {
    if (readOnly) return;
    await supabase.from("funnel_workflow_nodes").update({ position_x: x, position_y: y, updated_at: new Date().toISOString() }).eq("id", nodeId);
  };

  const connect = async (source: string, target: string) => {
    if (!workflowId || source === target || readOnly) return;
    if (edges.some((edge) => edge.source_node_id === source && edge.target_node_id === target)) { setConnectingFrom(null); return; }
    const { data, error } = await supabase.from("funnel_workflow_connections").insert({ workflow_id: workflowId, business_id: businessId, source_node_id: source, target_node_id: target, branch_key: "next" }).select("*").single();
    if (error) return toast.error(error.message);
    setEdges((current) => [...current, data]);
    setConnectingFrom(null);
  };

  const deleteEdge = async (edgeId: string) => {
    if (readOnly) return;
    await supabase.from("funnel_workflow_connections").delete().eq("id", edgeId);
    setEdges((current) => current.filter((edge) => edge.id !== edgeId));
  };

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const saveNode = async () => {
    if (!selectedNode || readOnly) return;
    const { error } = await supabase.from("funnel_workflow_nodes").update({ name: selectedNode.name, config: selectedNode.config, updated_at: new Date().toISOString() }).eq("id", selectedNode.id);
    if (error) return toast.error(error.message);
    toast.success("Automation node saved");
  };

  const activeWorkflow = workflows.find((workflow) => workflow.id === workflowId);
  const setWorkflowStatus = async (status: string) => {
    if (!workflowId || readOnly) return;
    const { error } = await supabase.from("funnel_workflows").update({ status, updated_at: new Date().toISOString() }).eq("id", workflowId);
    if (error) return toast.error(error.message);
    setWorkflows((current) => current.map((workflow) => workflow.id === workflowId ? { ...workflow, status } : workflow));
  };

  const graphNodes: FlowCanvasNode[] = nodes.map((node) => ({
    id: node.id,
    title: node.name,
    subtitle: node.action_type.replace(/_/g," "),
    kind: node.node_kind,
    x: Number(node.position_x),
    y: Number(node.position_y),
    tone: node.node_kind === "trigger" ? "emerald" : node.node_kind === "condition" ? "amber" : node.node_kind === "delay" ? "slate" : "indigo",
    badge: node.node_kind,
  }));
  const graphEdges: FlowCanvasEdge[] = edges.map((edge) => ({ id: edge.id, source: edge.source_node_id, target: edge.target_node_id, label: edge.label, branchKey: edge.branch_key }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={workflowId} onValueChange={setWorkflowId}><SelectTrigger className="w-64 rounded-xl bg-white"><SelectValue placeholder="Select workflow" /></SelectTrigger><SelectContent>{workflows.map((workflow) => <SelectItem key={workflow.id} value={workflow.id}>{workflow.name}</SelectItem>)}</SelectContent></Select>
          {!readOnly ? <Button variant="outline" onClick={() => void createWorkflow()} className="rounded-xl"><Plus className="mr-2 h-4 w-4" />New workflow</Button> : null}
        </div>
        {activeWorkflow ? <div className="flex items-center gap-2"><Badge variant="outline">{activeWorkflow.status}</Badge>{!readOnly ? <Button onClick={() => void setWorkflowStatus(activeWorkflow.status === "active" ? "paused" : "active")} className="rounded-xl bg-slate-950"><Play className="mr-2 h-4 w-4" />{activeWorkflow.status === "active" ? "Pause" : "Activate"}</Button> : null}</div> : null}
      </div>

      {workflowId ? (
        <>
          {!readOnly ? <Card className="rounded-2xl border-slate-200 p-4"><div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-xs font-black uppercase tracking-wider text-slate-400">Add node</span>{NODE_LIBRARY.map((item) => <Button key={`${item.kind}:${item.type}`} size="sm" variant="outline" onClick={() => void addNode(`${item.kind}:${item.type}`)} className="rounded-full">{item.kind === "delay" ? <TimerReset className="mr-1.5 h-3.5 w-3.5" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}{item.name}</Button>)}</div></Card> : null}
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <FlowCanvas
              nodes={graphNodes}
              edges={graphEdges}
              editable={!readOnly}
              selectedNodeId={selectedNodeId}
              connectingFrom={connectingFrom}
              onSelectNode={setSelectedNodeId}
              onMoveNode={updateNodePosition}
              onMoveNodeCommit={(id,x,y) => void commitNodePosition(id,x,y)}
              onStartConnection={(id) => setConnectingFrom((current) => current === id ? null : id)}
              onCompleteConnection={(source,target) => void connect(source,target)}
              onDeleteEdge={(id) => void deleteEdge(id)}
            />
            <Card className="h-fit rounded-[2rem] border-slate-200 p-5">
              <div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-indigo-600" /><h3 className="font-black text-slate-950">Node settings</h3></div>
              {selectedNode ? (
                <div className="mt-5 space-y-4">
                  <div><Label>Name</Label><Input disabled={readOnly} value={selectedNode.name} onChange={(e) => setNodes((current) => current.map((node) => node.id === selectedNode.id ? { ...node, name: e.target.value } : node))} /></div>
                  <div><Label>Type</Label><div className="mt-1 rounded-xl bg-slate-50 p-3 text-xs font-black text-slate-600">{selectedNode.node_kind} · {selectedNode.action_type}</div></div>
                  {selectedNode.action_type === "send_email" ? <><div><Label>Subject</Label><Input disabled={readOnly} value={selectedNode.config?.subject || ""} onChange={(e) => setNodes((current)=>current.map((node)=>node.id===selectedNode.id?{...node,config:{...node.config,subject:e.target.value}}:node))} /></div><div><Label>Email body</Label><Textarea disabled={readOnly} value={selectedNode.config?.body || ""} onChange={(e) => setNodes((current)=>current.map((node)=>node.id===selectedNode.id?{...node,config:{...node.config,body:e.target.value}}:node))} /></div></> : null}
                  {selectedNode.action_type === "wait_hours" ? <div><Label>Hours to wait</Label><Input disabled={readOnly} type="number" min="1" value={selectedNode.config?.hours || 24} onChange={(e) => setNodes((current)=>current.map((node)=>node.id===selectedNode.id?{...node,config:{...node.config,hours:Number(e.target.value)}}:node))} /></div> : null}
                  {selectedNode.action_type === "add_score" ? <div><Label>Score adjustment</Label><Input disabled={readOnly} type="number" value={selectedNode.config?.amount || 10} onChange={(e) => setNodes((current)=>current.map((node)=>node.id===selectedNode.id?{...node,config:{...node.config,amount:Number(e.target.value)}}:node))} /></div> : null}
                  {selectedNode.action_type === "update_lead_status" ? <div><Label>Lead status</Label><Input disabled={readOnly} value={selectedNode.config?.status || "contacted"} onChange={(e) => setNodes((current)=>current.map((node)=>node.id===selectedNode.id?{...node,config:{...node.config,status:e.target.value}}:node))} /></div> : null}
                  {selectedNode.action_type === "lead_score" ? <div className="grid grid-cols-2 gap-2"><div><Label>Operator</Label><Select disabled={readOnly} value={selectedNode.config?.operator || "gte"} onValueChange={(value)=>setNodes((current)=>current.map((node)=>node.id===selectedNode.id?{...node,config:{...node.config,operator:value}}:node))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gte">≥</SelectItem><SelectItem value="lte">≤</SelectItem></SelectContent></Select></div><div><Label>Score</Label><Input disabled={readOnly} type="number" value={selectedNode.config?.value || 60} onChange={(e)=>setNodes((current)=>current.map((node)=>node.id===selectedNode.id?{...node,config:{...node.config,value:Number(e.target.value)}}:node))} /></div></div> : null}
                  {!readOnly ? <Button onClick={() => void saveNode()} className="w-full rounded-xl bg-indigo-600"><Save className="mr-2 h-4 w-4" />Save node</Button> : null}
                </div>
              ) : <p className="mt-5 text-sm font-semibold leading-6 text-slate-500">Select a node to configure its trigger, action, delay or condition.</p>}
            </Card>
          </div>

          <Card className="rounded-[2rem] border-slate-200 p-6">
            <h3 className="font-black text-slate-950">Recent workflow runs</h3>
            <div className="mt-4 space-y-2">
              {runs.length ? runs.map((run) => <div key={run.id} className="grid gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 sm:grid-cols-[1fr_auto_auto]"><span>{run.trigger_event || "Manual / resumed"}</span><Badge variant="outline">{run.status}</Badge><span>{new Date(run.started_at).toLocaleString()}</span></div>) : <p className="text-sm font-semibold text-slate-400">No runs yet. Active workflows start when their trigger event occurs.</p>}
            </div>
          </Card>
        </>
      ) : <Card className="rounded-[2rem] border-dashed p-12 text-center"><Workflow className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 font-black text-slate-950">Create a workflow to automate follow-up.</p></Card>}
    </div>
  );
}
