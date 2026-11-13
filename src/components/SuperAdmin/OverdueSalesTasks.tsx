import React from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type Task = {
  id: string;
  lead_id: string | null;
  prospect_id: string | null;
  title: string;
  task_type: string;
  priority: string;
  notes: string | null;
  due_at: string;
  lead: { id: string; name: string; email: string; status: string; automation_next_action: string | null } | null;
  prospect: { id: string; name: string; contact_email: string; outreach_status: string } | null;
};

function dueAge(iso: string, now: number) {
  const days = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "Due today";
  return days === 1 ? "1 day overdue" : days + " days overdue";
}

export function OverdueSalesTasks() {
  const [page, setPage] = React.useState(1);
  const [result, setResult] = React.useState<{ tasks: Task[]; total: number; pageSize: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [refresh, setRefresh] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/admin/revenue-health/overdue-tasks?page=" + page, {
        headers: { Authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to load overdue sales tasks.");
      if (active) setResult(payload);
    })().catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load overdue tasks."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, refresh]);

  const now = Date.now();
  const totalPages = Math.max(1, Math.ceil((result?.total || 0) / (result?.pageSize || 50)));
  return <main className="min-w-0 space-y-6 pt-4">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-indigo-600">Sales operations / Follow-up queue</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Overdue follow-ups</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">All open overdue sales tasks across inbound leads and prospects. Same criteria as the Sales Pipeline overview, not only prospect outreach.</p>
      </div>
      <Button type="button" variant="outline" onClick={() => setRefresh((n) => n + 1)}><RefreshCw className="mr-2 h-4 w-4" />Refresh queue</Button>
    </header>
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-slate-800"><CalendarClock className="mr-2 inline h-5 w-5 text-rose-600" />{result?.total ?? "—"} overdue task{result?.total === 1 ? "" : "s"}</p>
          <p className="text-xs text-slate-500">Showing oldest due first · {result ? `Page ${page} of ${totalPages}` : "Loading"}</p>
        </div>
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-rose-700">{error}</p>}
        {loading && <div role="status" className="flex items-center gap-2 py-12 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Loading overdue tasks…</div>}
        {!loading && !error && result && result.tasks.length === 0 && <p className="py-12 text-sm text-slate-600">No overdue tasks found on this page.</p>}
        {!loading && !error && result && <ol className="mt-5 divide-y divide-slate-200" aria-label="Overdue sales tasks">
          {result.tasks.map((task) => {
            const label = task.lead?.name || task.prospect?.name || "Unlinked CRM task";
            const href = task.lead_id
              ? "/admin/inbound_leads?lead=" + encodeURIComponent(task.lead_id)
              : task.prospect_id
                ? "/admin/prospect_explorer?prospect=" + encodeURIComponent(task.prospect_id)
                : null;
            return <li key={task.id} className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">{dueAge(task.due_at, now)}</span>
                  <span className="text-xs font-semibold uppercase text-slate-500">{task.lead_id ? "Inbound lead" : task.prospect_id ? "Prospect" : "General task"}</span>
                  <span className="text-xs text-slate-500">{new Date(task.due_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 font-semibold text-slate-900">{task.title || "Follow up"} · {label}</p>
                <p className="mt-1 text-sm text-slate-600">{task.notes || task.lead?.automation_next_action || "Review the record and plan the next action."}</p>
              </div>
              {href ? <Link to={href} className="inline-flex shrink-0 items-center rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Open CRM record <ChevronRight className="ml-1.5 h-4 w-4" /></Link> : <span className="text-xs text-slate-500">No CRM link attached</span>}
            </li>;
          })}
        </ol>}
        {result && totalPages > 1 && <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <Button type="button" variant="outline" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
          <span className="text-xs text-slate-600">Page {page} of {totalPages}</span>
          <Button type="button" variant="outline" disabled={loading || page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div>}
      </CardContent>
    </Card>
  </main>;
}
