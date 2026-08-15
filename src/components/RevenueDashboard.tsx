import React from "react";
import { AlertCircle, CreditCard, DollarSign, Loader2, RefreshCw, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface MRRMetrics {
  mrr: number;
  activeCustomers: number;
  averageRevenuePerUser: number;
  growthRate: number | null;
  isLive: boolean;
  source?: string;
}

export function RevenueDashboard() {
  const [metrics, setMetrics] = React.useState<MRRMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchMetrics = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/platform/mrr-metrics", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || "Revenue data could not be loaded");
      setMetrics(payload.data);
    } catch (loadError: any) {
      setError(loadError.message || "Revenue data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void fetchMetrics(); }, [fetchMetrics]);

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (error || !metrics) return <Card className="rounded-3xl border-rose-200 bg-rose-50"><CardContent className="py-12 text-center"><AlertCircle className="mx-auto h-9 w-9 text-rose-600" /><h2 className="mt-4 text-xl font-black text-slate-950">Revenue data unavailable</h2><p className="mt-2 text-sm font-semibold text-slate-600">{error}</p><Button variant="outline" onClick={() => void fetchMetrics()} className="mt-5 rounded-xl">Try again</Button></CardContent></Card>;

  return <div className="space-y-7 pt-4">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">Revenue</h1><Badge variant="outline" className="rounded-full">{metrics.isLive ? "Live Stripe subscriptions" : "Active database subscriptions"}</Badge></div><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Only active recurring subscriptions are included. Trials, proposals, setup fees, and projected revenue are shown elsewhere.</p></div><Button variant="outline" onClick={() => void fetchMetrics()} className="rounded-xl"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button></div>
    <div className="grid gap-4 sm:grid-cols-3"><Metric icon={DollarSign} label="Actual MRR" value={`$${metrics.mrr.toLocaleString()}`} note={metrics.isLive ? "Calculated from active Stripe subscriptions" : "Calculated from active subscription records"} /><Metric icon={Users} label="Active subscriptions" value={String(metrics.activeCustomers)} note="Trials are excluded" /><Metric icon={CreditCard} label="Average MRR per customer" value={`$${metrics.averageRevenuePerUser.toLocaleString()}`} note={metrics.activeCustomers ? "Actual MRR divided by active customers" : "Not enough data yet"} /></div>
    <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader className="border-b border-slate-100"><CardTitle className="text-base">Revenue history</CardTitle></CardHeader><CardContent className="p-8 text-center"><p className="font-black text-slate-700">Not enough historical snapshots yet</p><p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">Month-over-month growth and churn will appear only after comparable subscription snapshots exist. Bennie Studio will not infer a trend from the current balance.</p></CardContent></Card>
  </div>;
}

function Metric({ icon: Icon, label, value, note }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string }) {
  return <Card className="rounded-3xl border-slate-200 shadow-sm"><CardContent className="p-6"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><Icon className="h-5 w-5 text-indigo-600" /></div><p className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{note}</p></CardContent></Card>;
}
