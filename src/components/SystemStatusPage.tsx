import React from "react";
import { AlertTriangle, CheckCircle2, Database, RefreshCw, Server, Shield, Trash2, Wifi, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "../lib/supabase";
import { clearClientErrorLogs, readClientErrorLogs, type ClientErrorLogEntry } from "../lib/clientErrorLog";
import { toast } from "sonner";

type StatusItem = {
  name: string;
  status: "ok" | "warn" | "error";
  detail: string;
  icon: React.ElementType;
};

export function SystemStatusPage() {
  const [items, setItems] = React.useState<StatusItem[]>([]);
  const [logs, setLogs] = React.useState<ClientErrorLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const next: StatusItem[] = [];

    try {
      const response = await fetch("/api/health-check");
      const payload = await response.json().catch(() => null);
      next.push({
        name: "API Health",
        status: response.ok && payload?.status === "ok" ? "ok" : "error",
        detail: response.ok ? `Online at ${new Date(payload.timestamp).toLocaleString()}` : `HTTP ${response.status}`,
        icon: Server,
      });
    } catch (error: any) {
      next.push({ name: "API Health", status: "error", detail: error.message || "API unreachable", icon: Server });
    }

    try {
      const { error } = await supabase.from("settings").select("id").limit(1);
      next.push({
        name: "Supabase",
        status: error ? "error" : "ok",
        detail: error ? error.message : "Database query succeeded",
        icon: Database,
      });
    } catch (error: any) {
      next.push({ name: "Supabase", status: "error", detail: error.message || "Database unavailable", icon: Database });
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const systemResponse = await fetch("/api/system/status", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const systemPayload = await systemResponse.json().catch(() => null);
      next.push({
        name: "Schema Version",
        status: systemPayload?.schema?.ok ? "ok" : "warn",
        detail: systemPayload?.schema?.ok
          ? `Required migration applied: ${systemPayload.schema.requiredVersion}`
          : systemPayload?.schema?.message || "Apply the latest Supabase migration.",
        icon: Database,
      });

      const response = await fetch("/api/ai/usage", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      next.push({
        name: "AI-assisted editing",
        status: response.ok ? "ok" : "warn",
        detail: response.ok ? "Content service responding" : `Needs login/configuration: HTTP ${response.status}`,
        icon: Shield,
      });
    } catch (error: any) {
      next.push({ name: "AI-assisted editing", status: "warn", detail: error.message || "Unable to check the content service", icon: Shield });
    }

    next.push({
      name: "Client Environment",
      status: import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY ? "ok" : "error",
      detail: import.meta.env.VITE_SUPABASE_URL ? "Public env variables loaded" : "Missing VITE_SUPABASE_URL or anon key",
      icon: Wifi,
    });

    setItems(next);
    setLogs(readClientErrorLogs());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const statusBadge = (status: StatusItem["status"]) => {
    if (status === "ok") return <Badge className="bg-emerald-50 text-emerald-700 border-none">OK</Badge>;
    if (status === "warn") return <Badge className="bg-amber-50 text-amber-700 border-none">Check</Badge>;
    return <Badge className="bg-rose-50 text-rose-700 border-none">Error</Badge>;
  };

  const statusIcon = (status: StatusItem["status"]) => {
    if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    if (status === "warn") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    return <XCircle className="h-5 w-5 text-rose-600" />;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">System Status</h1>
          <p className="mt-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            Deployment health, integrations, and recent client-side errors.
          </p>
        </div>
        <Button onClick={refresh} disabled={loading} className="gap-2 rounded-xl bg-slate-950 text-white">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Checks
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.name} className="rounded-2xl border-slate-100">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  {statusBadge(item.status)}
                </div>
                <div className="mb-2 flex items-center gap-2">
                  {statusIcon(item.status)}
                  <h3 className="font-black text-slate-900">{item.name}</h3>
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-500">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
          <div>
            <CardTitle className="text-xl font-black italic uppercase">Error Log Viewer</CardTitle>
            <CardDescription>Recent browser/runtime errors recorded by the app shell.</CardDescription>
          </div>
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => {
              clearClientErrorLogs();
              setLogs([]);
              toast.success("Client error logs cleared.");
            }}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold uppercase tracking-widest text-slate-400">
              No client errors recorded in this browser.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="grid gap-3 p-5 md:grid-cols-[140px_1fr_160px]">
                  <Badge className="w-fit bg-slate-100 text-slate-700 border-none">{log.level}</Badge>
                  <div>
                    <p className="font-bold text-slate-900">{log.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{log.details || log.source}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{log.route}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
