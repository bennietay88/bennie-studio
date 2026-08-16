import React from "react";
import { ArrowRight, CheckCircle2, FileSearch, Link2, ListTodo, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { SeoIssue, SeoWorkspaceData } from "../types";
import { createSeoTask } from "../api";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

const tone = (value: string) => {
  if (["critical", "high", "urgent"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["medium", "pending", "awaiting_approval"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (["completed", "validated", "published", "connected"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const EmptyState = ({ title, detail }: { title: string; detail: string }) => (
  <Card className="rounded-[2rem] border-dashed border-slate-300 shadow-none">
    <CardContent className="p-12 text-center">
      <FileSearch className="mx-auto h-9 w-9 text-slate-300" />
      <h3 className="mt-5 text-lg font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">{detail}</p>
    </CardContent>
  </Card>
);

const IssueCard = ({ issue }: { issue: SeoIssue }) => (
  <Card className="rounded-3xl border-slate-200 shadow-sm">
    <CardContent className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h3 className="text-lg font-black tracking-tight text-slate-950">{issue.title}</h3>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">What we found</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{issue.what_we_found}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Why it matters</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{issue.why_it_matters}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">Recommended improvement</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{issue.recommended_action}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={`rounded-full capitalize ${tone(issue.severity)}`}>{issue.severity}</Badge>
          <Badge variant="outline" className={`rounded-full capitalize ${tone(issue.status)}`}>{issue.status.replaceAll("_", " ")}</Badge>
        </div>
      </div>
      {issue.affected_urls.length > 0 && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Evidence URL</p>
          <p className="mt-2 break-all text-xs font-semibold text-slate-600">{issue.affected_urls[0]}</p>
        </div>
      )}
    </CardContent>
  </Card>
);

export function SeoOpportunitiesView({ data, onRefresh }: { data: SeoWorkspaceData; onRefresh: () => Promise<void> }) {
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const requestImprovement = async (id: string) => {
    setBusyId(id);
    try {
      const result = await createSeoTask(id);
      toast.success(result.task?.approval_state === "pending" ? "Improvement requested for review." : "Improvement added to the work queue.");
      await onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Could not request this improvement.");
    } finally {
      setBusyId(null);
    }
  };

  if (data.opportunities.length === 0) {
    return <EmptyState title="No evidence-backed opportunities yet" detail="Run an audit or connect search data. Recommendations will appear only when Bennie Studio has an observation to support them." />;
  }

  return (
    <div className="space-y-4">
      {data.opportunities.map((item) => (
        <Card key={item.id} className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={`rounded-full capitalize ${tone(item.priority)}`}>{item.priority} priority</Badge>
                  <Badge variant="outline" className="rounded-full capitalize">{item.module_key.replaceAll("_", " ")}</Badge>
                  <Badge variant="outline" className={`rounded-full capitalize ${tone(item.status)}`}>{item.status.replaceAll("_", " ")}</Badge>
                </div>
                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600"><strong className="text-slate-900">What we found:</strong> {item.what_we_found}</p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600"><strong className="text-slate-900">Why it matters:</strong> {item.why_it_matters}</p>
                <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-950">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Recommended action</span><br />
                  {item.recommended_action}
                </div>
              </div>
              <Button
                onClick={() => requestImprovement(item.id)}
                disabled={busyId === item.id || ["planned", "in_progress", "completed"].includes(item.status)}
                className="min-h-12 shrink-0 rounded-full bg-slate-950 px-6 font-bold text-white shadow-lg shadow-slate-200 hover:bg-indigo-700"
              >
                {busyId === item.id ? "Requesting…" : ["planned", "in_progress", "completed"].includes(item.status) ? "Already in workflow" : "Request this improvement"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SeoTechnicalView({ data }: { data: SeoWorkspaceData }) {
  if (data.issues.length === 0) {
    return <EmptyState title="No technical findings yet" detail="Run the technical audit to collect observable evidence from the current website. No result is invented before the scan completes." />;
  }
  return <div className="space-y-4">{data.issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}</div>;
}

export function SeoTasksView({ data }: { data: SeoWorkspaceData }) {
  if (data.tasks.length === 0) {
    return <EmptyState title="No SEO work is queued" detail="Choose an evidence-backed opportunity and request the improvement. It will move into the operational task and approval workflow." />;
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {data.tasks.map((task) => (
        <Card key={task.id} className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <ListTodo className="h-5 w-5 shrink-0 text-indigo-600" />
              <div className="flex flex-wrap justify-end gap-2">
                <Badge variant="outline" className={`rounded-full capitalize ${tone(task.priority)}`}>{task.priority}</Badge>
                <Badge variant="outline" className={`rounded-full capitalize ${tone(task.status)}`}>{task.status.replaceAll("_", " ")}</Badge>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-black text-slate-950">{task.title}</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{task.recommended_action || task.description}</p>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-500">
              {task.approval_state === "approved" || task.approval_state === "not_required" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Sparkles className="h-4 w-4 text-amber-600" />}
              Approval: {task.approval_state.replaceAll("_", " ")}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SeoReportsView({ data }: { data: SeoWorkspaceData }) {
  if (data.reports.length === 0) {
    return <EmptyState title="No monthly SEO report yet" detail="Reports will use measured search and enquiry data, completed work, and evidence-based observations. Until enough data exists, Bennie Studio will show that plainly." />;
  }
  return (
    <div className="space-y-4">
      {data.reports.map((report) => (
        <Card key={report.id} className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">Monthly SEO summary</p><CardTitle className="mt-2 text-xl font-black">{report.report_month}</CardTitle></div>
            <Badge variant="outline" className={`rounded-full capitalize ${tone(report.status)}`}>{report.status}</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Results</p><p className="mt-2 text-sm font-semibold text-slate-700">{Object.keys(report.measured_results || {}).length ? "Measured data recorded" : "Not enough data yet"}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">What changed</p><p className="mt-2 text-sm font-semibold text-slate-700">{report.work_completed?.length || 0} completed items</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Next</p><p className="mt-2 text-sm font-semibold text-slate-700">{report.next_priorities?.length || 0} priorities</p></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SeoDataModuleView({ section, data }: { section: string; data: SeoWorkspaceData }) {
  const config: Record<string, { title: string; detail: string; icon: React.ElementType; rows: Array<Record<string, any>> }> = {
    keywords: { title: "No keywords are tracked yet", detail: "Add keyword themes manually or connect a supported search provider. Rankings will never be fabricated.", icon: Search, rows: data.keywords as any },
    competitors: { title: "No competitors are being monitored", detail: "Add a real competitor domain before Bennie Studio compares observable pages, keywords, links, or visibility.", icon: FileSearch, rows: data.competitors },
    content: { title: "No SEO content is in production", detail: "Content starts from an approved opportunity, then moves through brief, draft, review, approval, publishing, and monitoring.", icon: Sparkles, rows: data.contentItems },
    "local-seo": { title: "No local search pages are configured", detail: "Existing Local SEO work is reused here. Add a real location and service brief before preparing a local page.", icon: Search, rows: data.localSeoPages },
    authority: { title: "No backlink provider is connected", detail: "Authority data appears only after a real backlink source is connected or a verified link is recorded.", icon: Link2, rows: data.backlinks },
    "ai-visibility": { title: "No AI visibility observations yet", detail: "Bennie Studio will distinguish observed, estimated, and inferred visibility. It will not fabricate AI-search mentions.", icon: Sparkles, rows: data.aiVisibility },
  };
  const current = config[section] || config.keywords;
  if (current.rows.length === 0) return <EmptyState title={current.title} detail={current.detail} />;
  const Icon = current.icon;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {current.rows.map((row, index) => (
        <Card key={String(row.id || index)} className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <Icon className="h-5 w-5 text-indigo-600" />
            <h3 className="mt-4 text-lg font-black text-slate-950">{row.keyword || row.name || row.title || row.source_url || row.query || "Observed item"}</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{row.cluster || row.domain || row.status || row.observation_type || "Recorded evidence"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
