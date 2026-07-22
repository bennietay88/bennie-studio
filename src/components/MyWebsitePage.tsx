import React from "react";
import { ExternalLink, FileEdit, Globe, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Badge } from "./ui/badge";

export function MyWebsitePage() {
  const { profile, business } = useAuth();
  const [website, setWebsite] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!profile?.businessId) { setLoading(false); return; }
    let active = true;
    supabase.from("websites").select("id,status,updated_at,pages").eq("business_id", profile.businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("Your website status could not be loaded. Please retry shortly.");
        setWebsite(data || null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [profile?.businessId]);

  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  const siteUrl = (business as any)?.custom_domain ? `https://${(business as any).custom_domain}` : (business as any)?.site_url || "";
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black text-slate-950">My Website</h1><p className="mt-1 text-sm font-semibold text-slate-500">Review status, open the current version, request changes, or enter Development mode when you need editing tools.</p></div>
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50"><Globe className="h-7 w-7 text-indigo-600" /></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-slate-950">{business?.name || "Business website"}</h2><Badge className={website?.status === "live" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{website?.status || "Not created"}</Badge></div><p className="mt-1 text-sm font-semibold text-slate-500">{website ? `${website.pages?.length || 0} pages · Updated ${new Date(website.updated_at).toLocaleDateString()}` : "Complete onboarding to create the first draft."}</p></div>
          <div className="flex flex-wrap gap-2">
            {profile?.businessId && website && <a href={`/w/${profile.businessId}?draft=1`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white"><ExternalLink className="mr-2 h-4 w-4" />Open Preview</a>}
            {siteUrl && <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-800"><Globe className="mr-2 h-4 w-4" />Live Site</a>}
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/dashboard/approvals" className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300"><ShieldCheck className="h-5 w-5 text-indigo-600"/><h3 className="mt-4 font-black">Review & Approval</h3><p className="mt-1 text-sm text-slate-500">Approve the latest version or submit consolidated feedback.</p></Link>
        <Link to="/dashboard/update-requests" className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300"><MessageSquare className="h-5 w-5 text-indigo-600"/><h3 className="mt-4 font-black">Request an Update</h3><p className="mt-1 text-sm text-slate-500">Send content, image, or contact-detail changes to the team.</p></Link>
        <Link to="/dashboard/website" className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300"><FileEdit className="h-5 w-5 text-indigo-600"/><h3 className="mt-4 font-black">Development Editor</h3><p className="mt-1 text-sm text-slate-500">Open advanced editing controls when Development mode is enabled.</p></Link>
      </div>
    </div>
  );
}
