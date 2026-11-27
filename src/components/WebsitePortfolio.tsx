import WebsiteAddonPanel from "./WebsiteAddonPanel";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Grid2X2, List, Search, Star, RefreshCw, Plus, ArrowUpRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getWebsitePortfolio, changeWebsite, type PortfolioResponse, type SiteAction } from "../lib/websitePortfolioApi";
import { filterPortfolioSites, siteLabel, type PortfolioSite } from "../lib/websitePortfolio";
import { Button } from "./ui/button";

export default function WebsitePortfolio() {
  const { profile, user } = useAuth();
  const businessId = profile?.businessId || "";
  const [result, setResult] = useState<{ tenant: string; sites: PortfolioSite[]; error: string; response?: PortfolioResponse } | null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const storageKey = user?.id && businessId ? "bt-portfolio-favorites:" + user.id + ":" + businessId : "";
  const [preferences, setPreferences] = useState<{ key: string; ids: string[] }>({key:"",ids:[]});
  useEffect(() => {
    let ids: string[] = [];
    if (storageKey) try {
      const raw: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(raw)) ids = raw.filter((v): v is string => typeof v === "string");
    } catch { /* Local preferences are optional. */ }
    setPreferences({key:storageKey,ids});
  }, [storageKey]);
  const favorites = preferences.key === storageKey ? preferences.ids : [];
  const toggleFavorite = (id: string) => {
    if (!storageKey) return;
    const ids = favorites.includes(id) ? favorites.filter(v => v !== id) : [...favorites,id];
    setPreferences({key:storageKey,ids});
    try { localStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* Session state still works. */ }
  };
  useEffect(() => {
    let active = true;
    if (!businessId) return;
    setResult(null);
    void (async () => {
      try {
        const response=await getWebsitePortfolio();
        if(!active)return;
        if(response.businessId!==businessId)throw new Error("Workspace changed");
        setResult({tenant:businessId,sites:response.sites,error:"",response});
      } catch {
        if (active) setResult({tenant:businessId,sites:[],error:"Websites could not be loaded. Please retry."});
      }
    })();
    return () => { active = false; };
  },[businessId,refresh]);
  const current = result?.tenant === businessId ? result : null;
  const sites = current?.sites || [];
  const capacity=current?.response?.capacity;
  const enabled=Boolean(current?.response?.lifecycleEnabled);
  const canAdd=enabled && (capacity?.websitesRemaining || 0)>0;
  async function act(action:SiteAction,site?:PortfolioSite){
    if(busy||!enabled)return;
    let name:string|undefined;
    if(action==="create"||action==="duplicate"||action==="rename"){
      const value=window.prompt("Website name",site?(action==="duplicate"?siteLabel(site)+" copy":siteLabel(site)):"");
      if(value===null)return;
      name=value.trim();if(!name||name.length>100){setNotice("Enter a name of 1–100 characters.");return;}
    }
    if(action==="archive"&&!window.confirm("Archive this draft website and release its slot?"))return;
    setBusy(true);setNotice("");
    try{await changeWebsite(action,site?.id,name);setNotice("Website updated.");setRefresh(v=>v+1);}catch(e){setNotice(e instanceof Error?e.message:"Website operation failed.");}finally{setBusy(false);}
  }
  const visible = filterPortfolioSites(sites,businessId,query,status).filter(site => !onlyFavorites || favorites.includes(site.id));
  return <main className="mx-auto max-w-7xl space-y-6 p-1 sm:p-4">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Website workspace</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">My Websites</h1>
      <p className="mt-2 text-sm text-slate-500">Find and manage the websites associated with your business.</p></div>
      <Button variant="outline" onClick={()=>setRefresh(v=>v+1)}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
    </header>
    <section className="rounded-2xl border bg-white p-4 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
          <input aria-label="Search websites" className="h-10 w-full rounded-xl border bg-transparent pl-9 pr-3 text-sm" placeholder="Search websites" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <select aria-label="Website status" className="h-10 rounded-xl border bg-transparent px-3 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
        <Button variant={onlyFavorites?"default":"outline"} aria-pressed={onlyFavorites} onClick={()=>setOnlyFavorites(v=>!v)}><Star className="mr-2 h-4 w-4"/>Favorites</Button>
        <div className="flex gap-1"><Button aria-label="Grid view" aria-pressed={view==="grid"} variant={view==="grid"?"default":"outline"} onClick={()=>setView("grid")}><Grid2X2 className="h-4 w-4"/></Button><Button aria-label="List view" aria-pressed={view==="list"} variant={view==="list"?"default":"outline"} onClick={()=>setView("list")}><List className="h-4 w-4"/></Button></div>
      </div>
    </section>
    <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Website portfolio</h2><p className="text-sm text-slate-500">{current && !current.error ? sites.length + " website records" : "Website records"}</p></div>
        <Button disabled={!canAdd||busy} onClick={()=>void act("create")}><Plus className="mr-2 h-4 w-4"/>Create site</Button>
      </div>
      {capacity&&<div className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800 sm:grid-cols-3"><div><strong>{capacity.websitesUsed} / {capacity.websiteLimit}</strong><p>Website slots</p></div><div><strong>{capacity.projectLimit??"Not configured"}</strong><p>Project limit</p></div><div><strong>{capacity.pagesPerWebsite}</strong><p>Pages per website</p></div></div>}
      {enabled&&<WebsiteAddonPanel key={businessId} businessId={businessId} onChanged={()=>setRefresh(v=>v+1)}/>}
      {notice&&<p role="status" className="mb-3 text-sm">{notice}</p>}
      {!businessId ? <p role="status" className="text-sm text-slate-500">No business is linked to this account.</p> : !current ? <p role="status" className="text-sm text-slate-500">Loading websites…</p> : current.error ? <p role="alert" className="text-sm text-red-600">{current.error}</p> : sites.length===0 ? <div className="rounded-xl border border-dashed p-8 text-center"><Globe className="mx-auto mb-3 h-8 w-8 text-slate-400"/><p>No websites yet.</p><Link className="mt-3 inline-block text-sm font-semibold text-indigo-600" to="/dashboard/website">Open existing website setup</Link></div> : visible.length===0 ? <p className="p-6 text-center text-sm text-slate-500">No websites match your filters.</p> :
      <div className={view==="grid"?"grid gap-4 sm:grid-cols-2 xl:grid-cols-3":"space-y-3"}>
        {visible.map(site=><article key={site.id} className={"overflow-hidden rounded-xl border "+(view==="list"?"flex flex-wrap items-center gap-3 p-3":"p-3")}>
          {view==="grid" && <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-indigo-50 text-indigo-700 dark:from-slate-800 dark:to-indigo-950"><div className="text-center"><Globe className="mx-auto h-10 w-10 opacity-70"/><span className="mt-2 block text-xs text-slate-500">Website identity</span></div></div>}
          <div className="min-w-0 flex-1 py-2">
            <div className="flex items-center gap-2"><h3 className="flex-1 truncate font-semibold" title={siteLabel(site)}>{siteLabel(site)}</h3>
              <button type="button" aria-label={favorites.includes(site.id)?"Remove favorite":"Add favorite"} aria-pressed={favorites.includes(site.id)} onClick={()=>toggleFavorite(site.id)} className="rounded p-1 text-amber-600"><Star className={"h-4 w-4 "+(favorites.includes(site.id)?"fill-current":"")}/></button></div>
            <p className="text-xs text-slate-500">{site.custom_domain || site.slug || "No domain connected"}</p>
            <p className="mt-1 text-xs font-medium">{site.archived_at?"Archived":site.status==="published"?"Published":site.status==="draft"?"Draft":site.status}{site.is_primary?" · Primary":""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
          {!site.archived_at&&<Link className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium" to={"/dashboard/websites/"+encodeURIComponent(site.id)}>Manage site <ArrowUpRight className="h-4 w-4"/></Link>}
          <Button size="sm" variant="outline" disabled={!enabled||busy} onClick={()=>void act("rename",site)}>Rename</Button>
          {!site.archived_at&&<Button size="sm" variant="outline" disabled={!canAdd||busy} onClick={()=>void act("duplicate",site)}>Duplicate</Button>}
          {site.archived_at?<Button size="sm" variant="outline" disabled={!canAdd||busy} onClick={()=>void act("restore",site)}>Restore</Button>:!site.is_primary&&site.status==="draft"?<Button size="sm" variant="outline" disabled={!enabled||busy} onClick={()=>void act("archive",site)}>Archive</Button>:null}
          </div>
        </article>)}
      </div>}
      <p className="mt-4 text-xs text-slate-500">{enabled?"Publishing, domains and additional services depend on your website and subscription settings.":"Website lifecycle is not enabled for this workspace."}</p>
    </section>
  </main>;
}
