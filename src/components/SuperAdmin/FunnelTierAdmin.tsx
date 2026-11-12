import React from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import type { FunnelTierConfig, FunnelLimits } from "../../lib/funnelTiers";

type Business = { id: string; name: string; plan: string; status: string; subscription_status: string; custom_enabled_features?: string[] };
type Entitlement = { id: string; business_id: string; tier: string; status: string; source: string; limit_overrides: Partial<FunnelLimits> };
export function FunnelTierAdmin() {
  const [config, setConfig] = React.useState<FunnelTierConfig | null>(null);
  const [businesses, setBusinesses] = React.useState<Business[]>([]);
  const [entitlements, setEntitlements] = React.useState<Entitlement[]>([]);
  const [businessId, setBusinessId] = React.useState("");
  const [override, setOverride] = React.useState<Record<string,Partial<FunnelLimits>>>({});
  const [busy, setBusy] = React.useState(false);
  const api = React.useCallback(async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Super Admin session expired.");
    const result = await fetch(path, {
      ...init, cache: "no-store", headers: {
        Authorization: "Bearer " + session.access_token,
        ...(init?.body ? {"Content-Type":"application/json"} : {}),
      },
    });
    const body = await result.json().catch(() => ({}));
    if (!result.ok) throw new Error(body.error || "Request failed.");
    return body;
  }, []);
  const load = React.useCallback(async () => {
    try {
      const data = await api("/api/admin/funnel-tiers");
      setConfig(data.config); setBusinesses(data.businesses || []);
      setEntitlements(data.entitlements || []);
    } catch(error:any) { toast.error(error.message); }
  }, [api]);
  React.useEffect(() => { void load(); }, [load]);
  const save = async () => {
    if (!config) return;
    setBusy(true);
    try {
      await api("/api/admin/funnel-tiers/config",{method:"PATCH",body:JSON.stringify(config)});
      toast.success("Funnel plan configuration saved."); await load();
    } catch(error:any) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  const grant = async () => {
    if (!businessId || !window.confirm("Grant this customer a complimentary $0/month funnel entitlement?")) return;
    setBusy(true);
    try {
      await api("/api/admin/funnel-tiers/grant",{method:"POST",body:JSON.stringify({businessId})});
      toast.success("Complimentary funnel access granted."); setBusinessId(""); await load();
    } catch(error:any) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  const editLimit = (tier: "free" | "paid", key: keyof FunnelLimits, value: number | boolean) => {
    if (!config) return;
    setConfig({ ...config, [tier]: { ...config[tier], [key]: value } });
  };
  const changeEntitlement = async (businessId: string, action: "limits" | "revoke") => {
    const entry = entitlements.find((row)=>row.business_id===businessId);
    if (!entry) return;
    if (!window.confirm(action === "revoke" ? "Revoke this free entitlement and unpublish its funnels?" : "Apply these customer limit overrides?")) return;
    setBusy(true);
    try {
      const body = action === "limits" ? JSON.stringify({overrides:override[businessId] ?? entry.limit_overrides ?? {}}) : undefined;
      await api("/api/admin/funnel-tiers/"+businessId+"/"+action,{
        method: action === "limits" ? "PATCH" : "POST", ...(body ? {body}:{}),
      });
      toast.success(action==="revoke"?"Complimentary access revoked.":"Customer limits saved.");
      await load();
    } catch(error:any){toast.error(error.message);} finally {setBusy(false);}
  };
  const eligible = businesses.filter((business) => {
    if (business.status !== "active" || !["active","trialing"].includes(business.subscription_status)) return false;
    const existing = entitlements.find((entry) => entry.business_id === business.id);
    return !existing && !(business.custom_enabled_features || []).includes("sales_funnels");
  });
  return <Card className="space-y-6 rounded-2xl p-6 sm:p-8">
    <div><h2 className="text-xl font-bold text-slate-950">Unified Sales Funnel Plans</h2>
      <p className="mt-2 text-sm text-slate-600">The existing engine serves both tiers. One-time setup is $0. New paid orders stay closed until approved and verified.</p></div>
    {config ? <>
      <div className="grid gap-5 lg:grid-cols-2">
        {(["free","paid"] as const).map((tier)=><div key={tier} className="space-y-4 rounded-xl border p-4">
          <h3 className="text-lg font-bold capitalize">{tier} tier</h3>
          <div className="grid grid-cols-2 gap-3">{(["maxFunnels","maxSteps"] as const).map((key)=>
            <div key={key} className="space-y-1"><Label>{key === "maxFunnels" ? "Max funnels" : "Steps per funnel"}</Label>
              <Input type="number" min={0} max={100} value={config[tier][key]}
                onChange={(e)=>editLimit(tier,key,Number(e.target.value))} /></div>)}</div>
          <div className="grid grid-cols-2 gap-3">{(["workflows","checkout","variants","ai"] as const).map((key)=>
            <label key={key} className="flex items-center gap-2 text-sm capitalize">
              <input type="checkbox" checked={config[tier][key]} onChange={(e)=>editLimit(tier,key,e.target.checked)} />{key}</label>)}</div>
        </div>)}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1"><Label>Paid monthly price (USD)</Label>
          <Input type="number" min={1} max={999} step="0.01" value={config.paidMonthlyUsd}
            onChange={(e)=>setConfig({...config,paidMonthlyUsd:Number(e.target.value)})} /></div>
        <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox"
          checked={config.enabled} onChange={(e)=>setConfig({...config,enabled:e.target.checked})} />
          Allow new paid checkouts</label>
        <Button disabled={busy} onClick={()=>void save()} className="bg-indigo-600">Save plans</Button>
      </div>
    </>:<p className="text-sm text-slate-500">Loading plan controls…</p>}
    <div className="border-t pt-5">
      <h3 className="font-semibold">Grant complimentary access</h3>
      <p className="mt-1 text-xs text-slate-500">Existing custom and paid entitlements are preserved; select only an eligible active customer.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <select className="min-h-10 min-w-[260px] flex-1 rounded-md border bg-white px-3 text-sm" value={businessId}
          onChange={(e)=>setBusinessId(e.target.value)}>
          <option value="">Select active customer</option>
          {eligible.map((item)=><option key={item.id} value={item.id}>{item.name} ({item.plan})</option>)}
        </select>
        <Button variant="outline" disabled={!businessId || busy} onClick={()=>void grant()}>Grant free funnel</Button>
      </div>
    </div>
    <div className="border-t pt-5">
      <h3 className="font-semibold">Entitlement ledger</h3>
      <div className="mt-3 space-y-2">{entitlements.length ? entitlements.map((row)=>
        <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <span className="font-medium">{businesses.find((item)=>item.id===row.business_id)?.name || row.business_id}</span>
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{row.tier}</Badge><Badge variant="outline">{row.status}</Badge>
            <label className="text-xs text-slate-600">Funnels <Input className="mt-1 w-20" type="number" min={0} max={100}
              value={(override[row.business_id]?.maxFunnels ?? row.limit_overrides?.maxFunnels ?? config?.[row.tier as "free"|"paid"]?.maxFunnels ?? 1)}
              onChange={(e)=>setOverride((old)=>({...old,[row.business_id]:{...(old[row.business_id]??row.limit_overrides??{}),maxFunnels:Number(e.target.value)}}))} /></label>
            <label className="text-xs text-slate-600">Steps <Input className="mt-1 w-20" type="number" min={0} max={100}
              value={(override[row.business_id]?.maxSteps ?? row.limit_overrides?.maxSteps ?? config?.[row.tier as "free"|"paid"]?.maxSteps ?? 2)}
              onChange={(e)=>setOverride((old)=>({...old,[row.business_id]:{...(old[row.business_id]??row.limit_overrides??{}),maxSteps:Number(e.target.value)}}))} /></label>
            <Button size="sm" variant="outline" disabled={busy} onClick={()=>void changeEntitlement(row.business_id,"limits")}>Save limits</Button>
            {row.tier==="free" && row.status==="active" ? <Button size="sm" variant="outline" disabled={busy} onClick={()=>void changeEntitlement(row.business_id,"revoke")}>Revoke free</Button> : null}
          </span>
        </div>) : <p className="text-sm text-slate-500">No unified funnel entitlements yet.</p>}</div>
    </div>
  </Card>;
}