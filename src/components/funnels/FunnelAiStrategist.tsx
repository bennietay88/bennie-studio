import React from "react";
import { BrainCircuit, Plus, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DEFAULT_FUNNEL_PAGE_CONTENT, FUNNEL_STEP_LABELS, slugifyFunnel, type FunnelObjective, type FunnelStepType } from "../../lib/funnelEngine";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";

type StrategyStep = {
  type: FunnelStepType;
  name: string;
  headline: string;
  subheadline?: string;
  ctaLabel?: string;
  rationale?: string;
};

type Strategy = {
  name: string;
  objective: FunnelObjective;
  rationale: string;
  steps: StrategyStep[];
  cautions?: string[];
};

export function FunnelAiStrategist({
  businessId,
  accessMode,
  onCreated,
}: {
  businessId: string;
  accessMode: "managed" | "collaborative" | "self_managed";
  onCreated?: (funnelId: string) => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [offer, setOffer] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [trafficSource, setTrafficSource] = React.useState("Meta Ads");
  const [objective, setObjective] = React.useState<FunnelObjective>("lead");
  const [objections, setObjections] = React.useState("");
  const [strategy, setStrategy] = React.useState<Strategy | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const generate = async () => {
    if (!offer.trim() || !audience.trim()) {
      toast.error("Add the real offer and target audience first.");
      return;
    }
    setGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again before using the funnel strategist.");
      const response = await fetch("/api/funnels/strategy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          offer: offer.trim(),
          audience: audience.trim(),
          trafficSource,
          objective,
          knownObjections: objections.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.strategy) throw new Error(body?.error || "Funnel strategy could not be generated.");
      setStrategy(body.strategy as Strategy);
    } catch (error: any) {
      toast.error(error?.message || "Funnel strategy could not be generated.");
    } finally {
      setGenerating(false);
    }
  };

  const create = async () => {
    if (!strategy) return;
    setCreating(true);
    try {
      const funnelId = crypto.randomUUID();
      const slug = `${slugifyFunnel(strategy.name)}-${Date.now().toString().slice(-4)}`;
      const { error: funnelError } = await supabase.from("funnels").insert({
        id: funnelId,
        business_id: businessId,
        name: strategy.name,
        slug,
        objective: strategy.objective,
        status: "draft",
        access_mode: accessMode,
        template_key: "ai-strategy",
        description: strategy.rationale,
        settings: { aiStrategy: { offer, audience, trafficSource, knownObjections: objections } },
        created_by: profile?.uid || null,
      });
      if (funnelError) throw funnelError;

      const steps = strategy.steps.map((item, index) => {
        const id = crypto.randomUUID();
        const base = DEFAULT_FUNNEL_PAGE_CONTENT[item.type] || DEFAULT_FUNNEL_PAGE_CONTENT.custom;
        return {
          id,
          funnel_id: funnelId,
          business_id: businessId,
          step_type: item.type,
          name: item.name || FUNNEL_STEP_LABELS[item.type],
          slug: index === 0 ? "start" : slugifyFunnel(item.name || FUNNEL_STEP_LABELS[item.type]),
          position_x: 100 + index * 300,
          position_y: 160,
          is_entry: index === 0,
          status: "draft",
          page_content: {
            ...base,
            headline: item.headline || base.headline,
            subheadline: item.subheadline || base.subheadline,
            ctaLabel: item.ctaLabel || base.ctaLabel,
          },
          settings: { aiRationale: item.rationale || null },
          sort_order: index,
        };
      });
      const { error: stepError } = await supabase.from("funnel_steps").insert(steps);
      if (stepError) throw stepError;

      const connections = steps.slice(0, -1).map((step, index) => ({
        id: crypto.randomUUID(),
        funnel_id: funnelId,
        business_id: businessId,
        source_step_id: step.id,
        target_step_id: steps[index + 1].id,
        condition_type: "always",
        condition_config: {},
        priority: index,
        label: null,
      }));
      if (connections.length) {
        const { error: connectionError } = await supabase.from("funnel_connections").insert(connections);
        if (connectionError) throw connectionError;
      }

      toast.success("AI strategy created as a draft funnel");
      setOpen(false);
      setStrategy(null);
      onCreated?.(funnelId);
    } catch (error: any) {
      toast.error(error?.message || "Draft funnel could not be created.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="rounded-xl bg-white font-black">
        <BrainCircuit className="mr-2 h-4 w-4 text-violet-600" />
        AI Strategy
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Funnel Strategist</DialogTitle>
          <DialogDescription>
            Draft a conversion journey from verified business context and the offer you provide. It may propose structure and wording, but it must not invent prices, results, testimonials, guarantees, or availability.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label>Real offer</Label><Input value={offer} onChange={(e)=>setOffer(e.target.value)} placeholder="e.g. Invisalign consultation" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Target audience</Label><Input value={audience} onChange={(e)=>setAudience(e.target.value)} placeholder="e.g. Adults considering discreet orthodontic treatment" /></div>
          <div className="space-y-2"><Label>Traffic source</Label><Select value={trafficSource} onValueChange={setTrafficSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Meta Ads","Google Ads","Organic Search","Email","LinkedIn","TikTok Ads","Referral","Other"].map((item)=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Primary objective</Label><Select value={objective} onValueChange={(value:any)=>setObjective(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["lead","appointment","quote","application","sale","subscription"].map((item)=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2 md:col-span-2"><Label>Known objections <span className="font-normal text-slate-400">optional</span></Label><Textarea value={objections} onChange={(e)=>setObjections(e.target.value)} placeholder="Only include objections you actually know from customers or sales conversations." /></div>
        </div>

        {!strategy ? (
          <Button onClick={()=>void generate()} disabled={generating} className="w-full rounded-xl bg-violet-600 font-black">
            <Sparkles className="mr-2 h-4 w-4" />{generating ? "Building strategy…" : "Generate funnel strategy"}
          </Button>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
              <div className="flex flex-wrap items-center gap-2"><Badge className="border-0 bg-violet-600 text-white">{strategy.objective}</Badge><Badge variant="outline">{strategy.steps.length} steps</Badge></div>
              <h3 className="mt-3 text-xl font-black text-slate-950">{strategy.name}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{strategy.rationale}</p>
            </div>
            <div className="space-y-3">
              {strategy.steps.map((step,index)=>(
                <div key={`${step.type}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[44px_1fr]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{index+1}</div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{FUNNEL_STEP_LABELS[step.type]}</p><p className="mt-1 font-black text-slate-950">{step.name}</p><p className="mt-1 text-sm font-semibold text-slate-600">{step.headline}</p>{step.rationale ? <p className="mt-2 text-xs leading-5 text-slate-500">{step.rationale}</p> : null}</div>
                </div>
              ))}
            </div>
            {strategy.cautions?.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-amber-700">Verify before publishing</p><ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-amber-900">{strategy.cautions.map((item)=><li key={item}>• {item}</li>)}</ul></div> : null}
          </div>
        )}

        <DialogFooter>
          {strategy ? <><Button variant="outline" onClick={()=>setStrategy(null)} className="rounded-xl">Revise brief</Button><Button onClick={()=>void create()} disabled={creating} className="rounded-xl bg-indigo-600 font-black"><Plus className="mr-2 h-4 w-4" />{creating ? "Creating…" : "Create draft funnel"}</Button></> : null}
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}
