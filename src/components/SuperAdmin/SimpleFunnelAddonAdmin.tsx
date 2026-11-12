import React from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import type { SimpleFunnelAddonConfig } from "../../lib/simpleFunnelAddon";

type Item = { id: string; business_id: string; business_name: string; business_plan: string;
  offer_name: string; audience: string; offer_description: string; contact_email: string;
  mode: string; status: string; funnel_id: string | null; approval_notes: string | null;
  setup_fee_usd: number; monthly_fee_usd: number; };
export function SimpleFunnelAddonAdmin({ onOpenFunnel }: {
  onOpenFunnel: (businessId: string, funnelId: string) => void;
}) {
  const [config, setConfig] = React.useState<SimpleFunnelAddonConfig | null>(null);
  const [items, setItems] = React.useState<Item[]>([]);
  const [busy, setBusy] = React.useState(false);
  const call = React.useCallback(async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Admin session expired.");
    const response = await fetch(path, { ...init, cache: "no-store",
      headers: { Authorization: "Bearer " + session.access_token,
        ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || "Request failed.");
    return json;
  }, []);
  const load = React.useCallback(async () => {
    try {
      const data = await call("/api/admin/simple-funnel-addons");
      setConfig(data.config);
      setItems(data.addons || []);
    } catch (error: any) { toast.error(error.message); }
  }, [call]);
  React.useEffect(() => { void load(); }, [load]);
  const save = async () => {
    if (!config) return;
    setBusy(true);
    try {
      await call("/api/admin/simple-funnel-addons/config",
        { method: "PATCH", body: JSON.stringify(config) });
      toast.success("Add-on configuration saved."); await load();
    } catch (error: any) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  const advance = async (item: Item, status?: string) => {
    setBusy(true);
    try {
      const result = await call("/api/admin/simple-funnel-addons/" + item.id + (status ? "/status" : "/provision"), {
        method: status ? "PATCH" : "POST",
        ...(status ? { body: JSON.stringify({ status }) } : {}),
      });
      toast.success(status ? "Delivery status updated." : "Draft provisioned.");
      await load();
      if (result.funnelId) onOpenFunnel(item.business_id, result.funnelId);
    } catch (error: any) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <Card className="rounded-2xl p-6">
      <h2 className="text-xl font-bold">Simple Sales Funnel — Add-on Settings</h2>
      <p className="mt-2 text-sm text-slate-600">One two-page managed funnel per customer. New sales are disabled by default. USD charges apply only to newly purchased add-ons.</p>
      {config && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(["standardSetupUsd", "growthSetupUsd", "monthlyUsd"] as const).map((key) =>
          <div key={key} className="space-y-2"><Label htmlFor={key}>{key === "standardSetupUsd" ? "Standard setup USD" : key === "growthSetupUsd" ? "Growth setup USD" : "Monthly USD"}</Label>
            <Input id={key} type="number" min={key === "monthlyUsd" ? 1 : 0} max={9999} step="0.01" value={config[key]}
              onChange={(event) => setConfig({ ...config, [key]: Number(event.target.value) })} /></div>)}
        <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <input type="checkbox" checked={config.includeGrowthPartner} onChange={(e) => setConfig({ ...config, includeGrowthPartner: e.target.checked })} />
          Included for Growth Partner
        </label>
        <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} />
          Open new add-on orders
        </label>
        <div className="flex items-center gap-2"><Button disabled={busy} onClick={() => void save()}>Save pricing and availability</Button></div>
      </div>}
    </Card>
    <Card className="rounded-2xl p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-xl font-bold">Funnel Fulfilment Queue</h2>
        <Button variant="outline" onClick={() => void load()}>Refresh</Button>
      </div>
      <p className="mt-2 text-sm text-slate-600">Stripe-confirmed paid orders and included Growth Partner requests appear here. Drafts are managed by Bennie Studio.</p>
      <div className="mt-5 space-y-4">{items.length === 0 ? <p className="text-sm text-slate-500">No add-on requests yet.</p> :
        items.map((item) => <div key={item.id} className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold">{item.business_name}</h3>
            <p className="text-sm text-slate-600">{item.offer_name} · {item.business_plan}</p></div>
            <Badge variant="outline">{item.status.replace(/_/g, " ")}</Badge></div>
          <p className="text-sm text-slate-600">{item.offer_description}</p>
          <p className="text-xs text-slate-500">{item.mode} · Setup {"$" + item.setup_fee_usd} · {"$" + item.monthly_fee_usd}/mo · {item.contact_email}</p>
          {item.approval_notes && <p className="rounded-lg bg-slate-50 p-3 text-sm">Customer notes: {item.approval_notes}</p>}
          <div className="flex flex-wrap gap-2">
            {item.status === "queued" && !item.funnel_id && <Button size="sm" disabled={busy} onClick={() => void advance(item)}>Create two-page draft</Button>}
            {item.funnel_id && <Button size="sm" variant="outline" onClick={() => onOpenFunnel(item.business_id, item.funnel_id)}>Open funnel</Button>}
            {item.funnel_id && ["queued", "revision_requested", "paused"].includes(item.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => void advance(item, "in_production")}>Resume build</Button>}
            {item.status === "in_production" && <Button size="sm" disabled={busy} onClick={() => void advance(item, "approval_required")}>Mark ready for customer review</Button>}
            {item.status === "approved" && <Button size="sm" disabled={busy} onClick={() => void advance(item, "active")}>Mark live after publishing</Button>}
            {item.status === "active" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void advance(item, "paused")}>Pause</Button>}
          </div>
        </div>)}</div>
    </Card>
  </div>;
}
