import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CreditCard, Gift, Route, ShieldCheck } from "lucide-react";
import { useFunnelTier } from "../../hooks/useFunnelTier";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

export function FunnelPlansPortal() {
  const { access, loading, refresh } = useFunnelTier();
  const [busy, setBusy] = React.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  React.useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;
    if (checkout === "returned") toast.info("Checkout returned. Paid features are enabled only after verified payment.");
    if (checkout === "cancelled") toast.info("Checkout was cancelled.");
    const next = new URLSearchParams(searchParams);
    next.delete("checkout"); setSearchParams(next, { replace: true });
    void refresh();
  }, [searchParams, setSearchParams, refresh]);
  const post = async (action: "checkout" | "cancel") => {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in.");
      const res = await fetch("/api/customer/funnel-tier/" + action, {
        method: "POST", headers: { Authorization: "Bearer " + session.access_token },
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Unable to process your request.");
      if (action === "checkout" && result.url) { window.location.assign(result.url); return; }
      toast.success("Cancellation scheduled for the end of your current term.");
      await refresh();
    } catch(error: any) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-5xl space-y-7 pb-14">
    <div><div className="flex items-center gap-2 text-indigo-700"><Route className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest">Sales Funnels</span></div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">One engine. The right level of access.</h1>
      <p className="mt-3 text-slate-600">Create a focused customer journey, capture enquiries in your Bennie Studio CRM and see what converts.</p>
    </div>
    {loading ? <Card className="p-8">Loading your plan…</Card> : !access ? <Card className="p-8">Your plan is temporarily unavailable. Please refresh.</Card> : <>
      <Card className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div><p className="text-xs font-bold uppercase text-slate-500">Your funnel access</p>
          <p className="mt-2 text-xl font-bold capitalize">{access.tier === "none" ? "Not yet enabled" : access.tier === "legacy" ? "Existing custom access" : access.tier}</p>
          <p className="mt-1 text-sm text-slate-500">Status: {access.status.replace(/_/g," ")}</p></div>
        {access.active ? <Link to="/dashboard/funnels" className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">Open Sales Funnels</Link> : <Badge variant="outline">Access inactive</Badge>}
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="space-y-5 rounded-2xl p-7">
          <Gift className="h-7 w-7 text-indigo-600" />
          <div><h2 className="text-2xl font-bold">Complimentary</h2>
            <p className="mt-1 text-3xl font-bold">$0 <span className="text-sm font-medium text-slate-500">/ month</span></p>
            <p className="mt-2 text-sm text-slate-600">One managed two-step lead funnel when included in your plan or granted by Bennie Studio.</p></div>
          <div className="space-y-2 text-sm text-slate-700">
            <p>One funnel, two steps</p><p>Lead capture into your existing CRM</p><p>Basic funnel reporting</p><p>Managed customer delivery</p>
          </div>
          <p className="text-xs text-slate-500">Complimentary access is assigned by Bennie Studio. No credit card is needed.</p>
        </Card>
        <Card className="space-y-5 rounded-2xl border-indigo-200 p-7">
          <CreditCard className="h-7 w-7 text-indigo-600" />
          <div><h2 className="text-2xl font-bold">Paid</h2>
            <p className="mt-1 text-3xl font-bold">{"$" + access.monthlyUsd.toFixed(2)} <span className="text-sm font-medium text-slate-500">/ month, USD</span></p>
            <p className="mt-2 text-sm text-slate-600">No one-time setup charge. Advanced conversion journeys through the same engine.</p></div>
          <div className="space-y-2 text-sm text-slate-700">
            <p>Up to 3 funnels and 10 steps per funnel by default</p><p>Advanced conversion analytics and A/B variants</p><p>Conditional journeys and eligible automation tools</p><p>Checkout where separately configured</p>
          </div>
          {access.tier === "paid" && access.active ?
            <Button disabled={busy || access.cancelAtPeriodEnd} variant="outline" onClick={() => { if(window.confirm("Schedule funnel plan cancellation at period end?")) void post("cancel"); }}>
              {access.cancelAtPeriodEnd ? "Cancellation scheduled" : "Cancel at period end"}</Button>
          : access.tier === "legacy" ? <p className="text-sm text-slate-500">Your existing custom entitlement remains unchanged.</p>
          : <Button className="bg-indigo-600" disabled={busy || !access.enabled}
              onClick={() => void post("checkout")}>{!access.enabled ? "Paid orders temporarily closed" : busy ? "Processing…" : "Upgrade to Paid"}</Button>}
        </Card>
      </div>
      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        Payment, automation and checkout capabilities are subject to verified account entitlements. Ad spend, extra custom design and third-party charges are excluded.</p>
    </>}
  </div>;
}