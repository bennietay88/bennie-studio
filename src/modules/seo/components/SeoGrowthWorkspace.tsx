import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, RefreshCw, Search, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../../contexts/AuthContext";
import { cn } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { getSeoWorkspace, requestSeoAudit } from "../api";
import type { SeoModuleKey, SeoWorkspaceData } from "../types";
import { SeoOverview } from "./SeoOverview";
import { SeoDataModuleView, SeoOpportunitiesView, SeoReportsView, SeoTasksView, SeoTechnicalView } from "./SeoModuleViews";

const ROUTES: Array<{ module: SeoModuleKey; path: string; label: string }> = [
  { module: "overview", path: "overview", label: "Overview" },
  { module: "opportunities", path: "opportunities", label: "Opportunities" },
  { module: "technical", path: "technical", label: "Technical" },
  { module: "keywords", path: "keywords", label: "Keywords" },
  { module: "competitors", path: "competitors", label: "Competitors" },
  { module: "content", path: "content", label: "Content" },
  { module: "local_seo", path: "local-seo", label: "Local SEO" },
  { module: "backlinks", path: "authority", label: "Authority" },
  { module: "ai_visibility", path: "ai-visibility", label: "AI Visibility" },
  { module: "tasks", path: "tasks", label: "Tasks" },
  { module: "reports", path: "reports", label: "Reports" },
];

const readSection = (pathname: string) => pathname.split("/seo/")[1]?.split("/")[0] || "overview";

export default function SeoGrowthWorkspace() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = React.useState<SeoWorkspaceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [auditBusy, setAuditBusy] = React.useState(false);
  const section = readSection(location.pathname);
  const visibleRoutes = React.useMemo(() => {
    if (!data) return [];
    const enabledModules = new Set(data.access.modules
      .filter((module) => module.enabled && module.customer_visible)
      .map((module) => module.module_key));
    return ROUTES.filter((route) => enabledModules.has(route.module));
  }, [data]);

  const refresh = React.useCallback(async () => {
    if (!profile?.businessId) return;
    try {
      setError(null);
      const workspace = await getSeoWorkspace(profile.businessId);
      setData(workspace);
    } catch (requestError: any) {
      setError(requestError.message || "Could not load SEO Growth.");
    } finally {
      setLoading(false);
    }
  }, [profile?.businessId]);

  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => {
    if (!data?.latestAudit || !["queued", "running"].includes(data.latestAudit.status)) return;
    const timer = window.setInterval(() => { void refresh(); }, 4000);
    return () => window.clearInterval(timer);
  }, [data?.latestAudit, refresh]);
  React.useEffect(() => {
    if (!data?.access.activated || visibleRoutes.length === 0) return;
    if (!visibleRoutes.some((route) => route.path === section)) {
      navigate(`/dashboard/seo/${visibleRoutes[0].path}`, { replace: true });
    }
  }, [data?.access.activated, navigate, section, visibleRoutes]);

  const handleAudit = async () => {
    if (!data?.project) return;
    setAuditBusy(true);
    try {
      await requestSeoAudit(data.project.id);
      toast.success("SEO audit started. Results will update here.");
      await refresh();
    } catch (requestError: any) {
      toast.error(requestError.message || "Could not start the SEO audit.");
    } finally {
      setAuditBusy(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[500px] items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-indigo-600" /><span className="ml-3 text-sm font-bold text-slate-600">Loading SEO Growth…</span></div>;
  }
  if (error || !data) {
    return (
      <Card className="m-6 rounded-3xl border-rose-200 bg-rose-50">
        <CardContent className="p-8"><p className="font-bold text-rose-900">SEO Growth could not load</p><p className="mt-2 text-sm text-rose-700">{error}</p><Button onClick={() => void refresh()} className="mt-5 rounded-full">Try again</Button></CardContent>
      </Card>
    );
  }

  if (!data.access.activated || !data.project) {
    const price = data.access.addonPrices?.US;
    const included = data.access.accessMode === "included" || data.access.reason?.includes("included");
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Card className="overflow-hidden rounded-[2.5rem] border-indigo-100 shadow-xl shadow-indigo-100/60">
          <div className="bg-slate-950 p-9 text-white sm:p-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-950"><Lock className="h-6 w-6" /></div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">SEO Growth</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">Find the opportunity, prepare the work, and measure what happened.</h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-200">{data.access.reason}</p>
          </div>
          <CardContent className="grid gap-8 p-9 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">What Bennie Studio manages</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["Technical audit with visible evidence", "Search opportunities and 90-day priorities", "Content, local SEO, and authority workflow", "Tasks, approvals, implementation, and reports"].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700"><ShieldCheck className="h-5 w-5 shrink-0 text-indigo-600" />{item}</div>
                ))}
              </div>
            </div>
            <div className="min-w-64 rounded-3xl border border-indigo-100 bg-indigo-50 p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{included ? "Included in your service" : "Optional managed add-on"}</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{included ? "Activation needed" : price ? `${price.currency === "USD" ? "US$" : price.currency} ${price.amount}/mo` : "Contact us"}</p>
              <Button onClick={() => navigate(included ? "/dashboard/support" : "/dashboard/billing")} className="mt-5 min-h-12 w-full rounded-full bg-slate-950 font-bold text-white shadow-lg hover:bg-indigo-700">
                {included ? "Request activation" : "View SEO add-on"}<ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (visibleRoutes.length === 0) {
    return <Card className="m-6 rounded-3xl border-amber-200 bg-amber-50"><CardContent className="p-8"><p className="font-bold text-amber-900">No customer SEO sections are enabled.</p><p className="mt-2 text-sm text-amber-700">Ask the platform administrator to enable at least one SEO module for this website.</p></CardContent></Card>;
  }

  return (
    <div className="min-h-full bg-slate-50/50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200"><Search className="h-5 w-5" /></div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">SEO Growth</p></div>
              <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{data.project.name}</h1>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">Monitor what is measurable, act on evidence, and keep recommendations separate from real search and enquiry results.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => void refresh()} className="min-h-11 rounded-full px-5 font-bold"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
              <Button onClick={handleAudit} disabled={auditBusy || ["queued", "running"].includes(data.latestAudit?.status || "")} className="min-h-11 rounded-full bg-slate-950 px-6 font-bold text-white shadow-lg shadow-slate-200 hover:bg-indigo-700"><Sparkles className="mr-2 h-4 w-4" />Run SEO audit</Button>
            </div>
          </div>
          <nav className="mt-8 flex gap-2 overflow-x-auto border-t border-slate-100 pt-5" aria-label="SEO Growth sections">
            {visibleRoutes.map((route) => (
              <NavLink key={route.path} to={`/dashboard/seo/${route.path}`} className={({ isActive }) => cn("whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition", isActive ? "bg-slate-950 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>{route.label}</NavLink>
            ))}
          </nav>
        </header>

        <main className="mt-8">
          {section === "overview" && <SeoOverview data={data} auditBusy={auditBusy} onAudit={handleAudit} onOpen={(next) => navigate(`/dashboard/seo/${next}`)} />}
          {section === "opportunities" && <SeoOpportunitiesView data={data} onRefresh={refresh} />}
          {section === "technical" && <SeoTechnicalView data={data} />}
          {section === "tasks" && <SeoTasksView data={data} />}
          {section === "reports" && <SeoReportsView data={data} />}
          {["keywords", "competitors", "content", "local-seo", "authority", "ai-visibility"].includes(section) && <SeoDataModuleView section={section} data={data} />}
        </main>
      </div>
    </div>
  );
}
