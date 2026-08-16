import React from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Search, Wrench } from "lucide-react";
import type { SeoWorkspaceData } from "../types";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

const ResultCard = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <Card className="rounded-3xl border-slate-200 shadow-sm">
    <CardContent className="p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{note}</p>
    </CardContent>
  </Card>
);

const priorityTone = (priority: string) => {
  if (priority === "high" || priority === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

export function SeoOverview({
  data,
  auditBusy,
  onAudit,
  onOpen,
}: {
  data: SeoWorkspaceData;
  auditBusy: boolean;
  onAudit: () => void;
  onOpen: (section: string) => void;
}) {
  const audit = data.latestAudit;
  const components = audit?.health_explanation?.components || [];
  const openIssues = data.issues.filter((issue) => !["validated", "dismissed"].includes(issue.status));
  const nextOpportunity = data.opportunities.find((item) => !["completed", "dismissed"].includes(item.status));
  const auditInProgress = audit?.status === "queued" || audit?.status === "running";

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Measured results</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Your search activity</h2>
          </div>
          <p className="max-w-xl text-sm font-medium leading-6 text-slate-500">
            Numbers appear only when they come from connected search or website tracking. Missing data stays missing.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ResultCard
            label="Organic leads"
            value={data.measuredResults.organicLeads === null ? "Not enough data" : String(data.measuredResults.organicLeads)}
            note="Requires a reliable organic source on tracked enquiries."
          />
          <ResultCard
            label="Search clicks"
            value={data.measuredResults.organicClicks === null ? "Not connected" : String(data.measuredResults.organicClicks)}
            note="Measured through a connected search provider."
          />
          <ResultCard
            label="Tracked keywords"
            value={String(data.measuredResults.trackedKeywords)}
            note={data.measuredResults.trackedKeywords ? "Keywords currently monitored." : "No keyword tracker is configured yet."}
          />
          <ResultCard
            label="Work completed"
            value={String(data.measuredResults.completedTasks)}
            note="SEO tasks marked completed in Bennie Studio."
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-950 p-7 text-white">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Technical search health</p>
                <CardTitle className="mt-3 text-2xl font-black text-white">
                  {audit?.health_score === null || audit?.health_score === undefined
                    ? "Run the first evidence-based audit"
                    : `${audit.health_score} / 100`}
                </CardTitle>
                <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-300">
                  {audit?.summary || "This is calculated only from observable technical checks—not from AI opinion, estimated traffic, or an invented business score."}
                </p>
              </div>
              <Button
                onClick={onAudit}
                disabled={auditBusy || auditInProgress}
                className="min-h-12 rounded-full bg-white px-6 font-bold text-slate-950 shadow-lg shadow-black/20 hover:bg-indigo-50"
              >
                <Search className="mr-2 h-4 w-4" />
                {auditBusy || auditInProgress ? "Audit in progress" : audit ? "Run audit again" : "Run first audit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-7">
            {components.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {components.map((item) => (
                  <div key={item.key} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    {item.passed
                      ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{item.evidence} · {item.weight} configured points</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-4 text-sm font-bold text-slate-700">No technical evidence collected yet</p>
                <p className="mt-2 text-sm text-slate-500">Run an audit to inspect the current page response and search essentials.</p>
              </div>
            )}
            {audit?.health_explanation?.methodology && (
              <p className="mt-5 rounded-2xl bg-indigo-50 p-4 text-xs font-semibold leading-5 text-indigo-800">
                Method: {audit.health_explanation.methodology}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 shadow-sm">
          <CardHeader className="p-7 pb-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">What needs attention</p>
            <CardTitle className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {openIssues.length ? `${openIssues.length} observed ${openIssues.length === 1 ? "issue" : "issues"}` : "No open technical issues"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-7 pt-3">
            {openIssues.slice(0, 4).map((issue) => (
              <button
                type="button"
                key={issue.id}
                onClick={() => onOpen("technical")}
                className="flex w-full items-start justify-between gap-4 rounded-2xl border border-slate-100 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{issue.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{issue.what_we_found}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 rounded-full capitalize ${priorityTone(issue.severity)}`}>{issue.severity}</Badge>
              </button>
            ))}
            {openIssues.length === 0 && (
              <div className="rounded-2xl bg-emerald-50 p-5">
                <p className="text-sm font-bold text-emerald-900">Nothing open from the latest completed audit.</p>
                <p className="mt-2 text-xs font-medium leading-5 text-emerald-700">This does not promise rankings. Continue monitoring real search and enquiry data.</p>
              </div>
            )}
            <Button variant="outline" onClick={() => onOpen("technical")} className="min-h-11 w-full rounded-full font-bold">
              Review technical evidence <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2rem] border-indigo-100 bg-gradient-to-br from-indigo-50 to-white shadow-sm">
        <CardContent className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Recommended next improvement</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                {nextOpportunity?.title || "We need more evidence before recommending a change"}
              </h3>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
                {nextOpportunity?.recommended_action || "Run the technical audit and connect search data. Bennie Studio will not invent a recommendation without a supporting observation."}
              </p>
            </div>
          </div>
          <Button onClick={() => onOpen("opportunities")} className="min-h-12 shrink-0 rounded-full bg-slate-950 px-7 font-bold text-white shadow-xl shadow-slate-300 hover:bg-indigo-700">
            View opportunities <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
