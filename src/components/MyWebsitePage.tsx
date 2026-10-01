import React from "react";
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, FileEdit, Globe, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Badge } from "./ui/badge";

export function MyWebsitePage() {
  const { profile, business } = useAuth();
  const [website, setWebsite] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [liveHealth, setLiveHealth] = React.useState<any>(null);
  const [healthLoading, setHealthLoading] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.businessId) { setLoading(false); return; }
    let active = true;
    supabase.from("websites").select("id,status,updated_at,pages,seo").eq("business_id", profile.businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("Your website status could not be loaded. Please retry shortly.");
        setWebsite(data || null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [profile?.businessId]);

  React.useEffect(() => {
    if (!profile?.businessId || !website?.id) return;
    let active = true;
    const check = async () => {
      setHealthLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`/api/website-health?businessId=${profile.businessId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (active && response.ok) setLiveHealth(payload);
      } catch {
        // Health status is supplementary and should not block the customer dashboard.
      } finally {
        if (active) setHealthLoading(false);
      }
    };
    void check();
    return () => { active = false; };
  }, [profile?.businessId, website?.id, website?.updated_at]);

  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  const siteUrl = (business as any)?.custom_domain ? `https://${(business as any).custom_domain}` : (business as any)?.site_url || "";
  const buttonHealth = website?.seo?.buttonHealth || {};
  const deliveryQuality = website?.seo?.deliveryQuality || {};
  const launchGate = website?.seo?.launchGate || {};
  const release = website?.seo?.publishedVersion || null;
  const healthChecks = [
    {
      label: "Live reachability",
      ok: liveHealth ? Boolean(liveHealth.reachable) : false,
      detail: healthLoading
        ? "Checking current site..."
        : liveHealth
          ? `${liveHealth.httpStatus || "No HTTP status"} · ${liveHealth.latencyMs || 0}ms · checked ${new Date(liveHealth.checkedAt).toLocaleTimeString()}`
          : "Live check pending",
    },
    {
      label: "Critical CTA health",
      ok: Number(buttonHealth.criticalBroken ?? buttonHealth.critical ?? 0) === 0,
      detail: buttonHealth.checkedAt || buttonHealth.updatedAt
        ? `Last checked ${new Date(buttonHealth.checkedAt || buttonHealth.updatedAt).toLocaleDateString()}`
        : "Checked during website QA",
    },
    {
      label: "Responsive QA",
      ok: Boolean(deliveryQuality.responsiveQaApproved),
      detail: deliveryQuality.responsiveQaApproved ? "Desktop and mobile review approved" : "Pending delivery-team review",
    },
    {
      label: "Creative review",
      ok: Boolean(deliveryQuality.internalCreativeReviewApproved),
      detail: deliveryQuality.internalCreativeReviewApproved ? "Internal art direction approved" : "Pending internal review",
    },
    {
      label: "Customer approval",
      ok: Boolean(deliveryQuality.customerApprovalRecorded),
      detail: deliveryQuality.customerApprovalRecorded ? "Final approval recorded" : "Approval required before launch",
    },
  ];
  const healthyCount = healthChecks.filter((check) => check.ok).length;
  const isLive = ["live", "published"].includes(String(website?.status || ""));
  const needsApproval = Boolean(website) && !Boolean(deliveryQuality.customerApprovalRecorded) && !isLive;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">My Website</h1>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
          See what needs your attention, open your website, and request changes. Technical checks stay available when you need them.
        </p>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0efff]"><Globe className="h-7 w-7 text-[#6252f4]" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-950">{business?.name || "Business website"}</h2>
              <Badge className={isLive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{website?.status || "Not created"}</Badge>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {website ? `${website.pages?.length || 0} pages · Updated ${new Date(website.updated_at).toLocaleDateString()}` : "Complete onboarding to create the first draft."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.businessId && website && <a href={`/w/${profile.businessId}?draft=1`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl bg-[#0d1426] px-4 text-sm font-bold text-white hover:bg-[#5746e8]"><ExternalLink className="mr-2 h-4 w-4" />Open Preview</a>}
            {siteUrl && <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800 hover:border-[#b9b1ff]"><Globe className="mr-2 h-4 w-4" />Live Site</a>}
          </div>
        </div>
      </section>

      <section className={`rounded-3xl border p-6 ${needsApproval ? "border-amber-200 bg-amber-50" : "border-emerald-100 bg-emerald-50/60"}`}>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${needsApproval ? "text-amber-700" : "text-emerald-700"}`}>Needs your attention</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">{needsApproval ? "Your latest website draft is ready for review." : "Nothing is waiting for your approval right now."}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {needsApproval ? "Review the current version and send one clear round of feedback so the build can keep moving." : "You can still request an update whenever your content, offer, contact details, or priorities change."}
            </p>
          </div>
          <Link to={needsApproval ? "/dashboard/approvals" : "/dashboard/update-requests"} className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#0d1426] px-5 text-sm font-bold text-white hover:bg-[#5746e8]">
            {needsApproval ? "Review website" : "Request an update"}
          </Link>
        </div>
      </section>

      {liveHealth?.delivery && (
        <section className="rounded-3xl border border-[#dfdcff] bg-[#f7f6ff] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6252f4]">Bennie Studio is working on</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black capitalize text-slate-950">{String(liveHealth.delivery.status || "in progress").replace(/_/g, " ")}</h2>
                {liveHealth.delivery.priority && <Badge variant="outline" className="capitalize">{liveHealth.delivery.priority} priority</Badge>}
              </div>
              <p className="mt-2 text-sm text-slate-600">We update this stage as your website moves through production, review, approval and launch.</p>
            </div>
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target launch</p>
              <p className="mt-1 text-lg font-black text-slate-950">{liveHealth.delivery.targetLaunchDate ? new Date(`${liveHealth.delivery.targetLaunchDate}T00:00:00`).toLocaleDateString() : "Being scheduled"}</p>
              <p className="mt-1 text-xs text-slate-500">Feedback or domain dependencies can move this date.</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/dashboard/approvals" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#b9b1ff] hover:shadow-sm"><ShieldCheck className="h-5 w-5 text-[#6252f4]"/><h3 className="mt-4 font-black">Review & approve</h3><p className="mt-1 text-sm leading-6 text-slate-500">Approve the latest version or submit consolidated feedback.</p></Link>
        <Link to="/dashboard/update-requests" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#b9b1ff] hover:shadow-sm"><MessageSquare className="h-5 w-5 text-[#6252f4]"/><h3 className="mt-4 font-black">Request a change</h3><p className="mt-1 text-sm leading-6 text-slate-500">Send content, image, offer, or contact-detail changes to the team.</p></Link>
        <Link to="/dashboard/website" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#b9b1ff] hover:shadow-sm"><FileEdit className="h-5 w-5 text-[#6252f4]"/><h3 className="mt-4 font-black">Advanced editor</h3><p className="mt-1 text-sm leading-6 text-slate-500">Open editing controls only when you need hands-on access.</p></Link>
      </div>

      <details className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#6252f4]" />
              <h2 className="text-lg font-black text-slate-950">Technical site status</h2>
              <Badge className={healthyCount === healthChecks.length ? "border-none bg-emerald-100 text-emerald-700" : "border-none bg-amber-100 text-amber-700"}>{healthyCount}/{healthChecks.length} ready</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">Detailed reachability, QA, approval and release information.</p>
          </div>
          <span className="text-sm font-bold text-[#6252f4] group-open:hidden">View details</span>
          <span className="hidden text-sm font-bold text-[#6252f4] group-open:inline">Hide details</span>
        </summary>
        <div className="mt-6 border-t border-slate-200 pt-6">
          {release && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Published release</p>
              <p className="mt-1 text-sm font-black text-slate-900">{release.id || "Current release"}</p>
              <p className="mt-1 text-xs text-slate-500">{release.publishedAt ? new Date(release.publishedAt).toLocaleString() : ""}</p>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {healthChecks.map((check) => (
              <div key={check.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  {check.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  <p className="text-sm font-black text-slate-900">{check.label}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{check.detail}</p>
              </div>
            ))}
          </div>
          {website?.status === "published" && launchGate?.ready === true && <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">This release passed the Bennie Studio launch gate before publication.</p>}
        </div>
      </details>
    </div>
  );
}
