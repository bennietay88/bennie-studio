import React from "react";
import { Activity, BarChart3, CalendarCheck2, CreditCard, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { FunnelEvent, FunnelStep, generateFunnelInsights, summarizeFunnelAnalytics } from "../../lib/funnelEngine";
import { FlowCanvas } from "./FlowCanvas";

const money = (value: number, currency = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);
const number = (value: number) => new Intl.NumberFormat().format(Math.round(value || 0));

export function FunnelAnalyticsDashboard({
  steps,
  connections,
  events,
  currency = "USD",
}: {
  steps: FunnelStep[];
  connections: Array<{ id: string; source_step_id: string; target_step_id: string; label?: string | null }>;
  events: FunnelEvent[];
  currency?: string;
}) {
  const summary = React.useMemo(() => summarizeFunnelAnalytics(events, steps), [events, steps]);
  const insights = React.useMemo(() => generateFunnelInsights(summary, steps), [summary, steps]);

  const graphNodes = steps.map((step) => {
    const metric = summary.byStep[step.id];
    return {
      id: step.id,
      title: step.name,
      subtitle: step.step_type.replace(/_/g, " "),
      kind: "Performance",
      x: Number(step.position_x),
      y: Number(step.position_y),
      badge: metric?.views ? `${metric.dropOffRate.toFixed(0)}% drop-off` : "No traffic yet",
      tone: metric?.dropOffRate >= 80 ? "rose" as const : metric?.dropOffRate >= 60 ? "amber" as const : "indigo" as const,
      metrics: [
        { label: "Views", value: number(metric?.views || 0) },
        { label: "Converted", value: number(metric?.conversions || 0) },
        { label: "Rate", value: `${(metric?.conversionRate || 0).toFixed(1)}%` },
        { label: "Revenue", value: money(metric?.revenue || 0, currency) },
      ],
    };
  });

  const graphEdges = connections.map((edge) => ({ id: edge.id, source: edge.source_step_id, target: edge.target_step_id, label: edge.label }));

  const stats = [
    { label: "Visitors", value: number(summary.visitors), icon: Users },
    { label: "Leads", value: number(summary.leads), icon: MousePointerClick },
    { label: "Bookings", value: number(summary.appointments), icon: CalendarCheck2 },
    { label: "Purchases", value: number(summary.purchases), icon: CreditCard },
    { label: "Revenue", value: money(summary.revenue, currency), icon: TrendingUp },
    { label: "Conversion", value: `${summary.conversionRate.toFixed(1)}%`, icon: Activity },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-3xl border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Live conversion map</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">The same funnel, with performance overlaid</h2>
          </div>
          <Badge variant="outline">Events: {number(events.length)}</Badge>
        </div>
        <FlowCanvas nodes={graphNodes} edges={graphEdges} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden rounded-[2rem] border-slate-200">
          <div className="border-b border-slate-100 p-6">
            <h3 className="text-lg font-black text-slate-950">Step conversion</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Where visitors continue, convert, or disappear into the internet wilderness.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr><th className="px-6 py-3">Step</th><th>Views</th><th>Converted</th><th>Conversion</th><th>Drop-off</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {steps.map((step) => {
                  const metric = summary.byStep[step.id];
                  return (
                    <tr key={step.id} className="border-t border-slate-100 text-sm font-semibold text-slate-700">
                      <td className="px-6 py-4 font-black text-slate-950">{step.name}</td>
                      <td>{number(metric?.views || 0)}</td>
                      <td>{number(metric?.conversions || 0)}</td>
                      <td>{(metric?.conversionRate || 0).toFixed(1)}%</td>
                      <td>{(metric?.dropOffRate || 0).toFixed(1)}%</td>
                      <td>{money(metric?.revenue || 0, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 p-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-black text-slate-950">Funnel intelligence</h3>
          </div>
          <div className="mt-5 space-y-4">
            {insights.map((insight) => (
              <div key={insight.title} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={insight.severity === "critical" ? "border-rose-200 bg-rose-50 text-rose-700" : insight.severity === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-indigo-200 bg-indigo-50 text-indigo-700"}>{insight.severity}</Badge>
                  <Badge variant="outline">{insight.confidence} confidence</Badge>
                </div>
                <p className="mt-3 text-sm font-black text-slate-950">{insight.title}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{insight.observation}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{insight.recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { title: "Traffic sources", rows: summary.bySource },
          { title: "Device performance", rows: summary.byDevice },
        ].map((section) => (
          <Card key={section.title} className="rounded-[2rem] border-slate-200 p-6">
            <h3 className="font-black text-slate-950">{section.title}</h3>
            <div className="mt-4 space-y-3">
              {section.rows.length ? section.rows.slice(0, 8).map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="truncate text-sm font-bold text-slate-700">{row.key}</span>
                  <span className="text-xs font-black text-slate-500">{number(row.visitors)} visitors</span>
                  <span className="text-xs font-black text-indigo-600">{number(row.conversions)} conv.</span>
                </div>
              )) : <p className="text-sm font-semibold text-slate-400">No attribution data yet.</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
