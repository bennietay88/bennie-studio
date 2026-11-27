import { WorkspaceState } from "./ui/WorkspaceState";
import WebsiteRedirectPanel from "./WebsiteRedirectPanel";
import WebsiteBackupPanel from "./WebsiteBackupPanel";
import WebsiteContentExport from "./WebsiteContentExport";
import WebsiteReleasePanel from "./WebsiteReleasePanel";
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getWebsitePortfolio } from "../lib/websitePortfolioApi";
import WebsiteSiteOverview from "./WebsiteSiteOverview";
import WebsiteDomainPanel from "./WebsiteDomainPanel";
import { WebsiteEditor } from "./WebsiteEditor";
import { selectPortfolioSite, siteLabel, type PortfolioSite } from "../lib/websitePortfolio";

export default function WebsitePortfolioEditor() {
  const { siteId = "" } = useParams();
  const navigate = useNavigate();
  const [retry,setRetry] = useState(0);
  const { profile } = useAuth();
  const businessId = profile?.businessId || "";
  const scope = businessId + ":" + siteId;
  const [result,setResult] = useState<{ scope:string; site:PortfolioSite|null; sites?:PortfolioSite[]; error?:boolean }|null>(null);
  useEffect(()=>{
    let active = true;
    if (!businessId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteId)) {
      setResult({scope,site:null});
      return;
    }
    setResult(null);
    void (async()=>{
      try {
        const portfolio=await getWebsitePortfolio();
        const site=portfolio.businessId===businessId?selectPortfolioSite(portfolio.sites,businessId,siteId):null;
        if(active) setResult({scope,site:site&&!site.archived_at?site:null,sites:portfolio.businessId===businessId?portfolio.sites.filter(item=>item.business_id===businessId&&!item.archived_at):[]});
      } catch { if(active) setResult({scope,site:null,error:true}); }
    })();
    return ()=>{active=false;};
  },[businessId,siteId,scope,retry]);
  const current = result?.scope === scope ? result : null;
  return <div className="space-y-4">
    <Link to="/dashboard/websites" className="inline-block text-sm font-semibold text-indigo-600" onClick={e=>{if(current?.site && !window.confirm("Return to My Websites? Unsaved editor changes will be lost."))e.preventDefault();}}>← My Websites</Link>
    {!current ? <WorkspaceState kind="loading" title="Loading selected website…"/> : !current.site ? <WorkspaceState kind="error" title={current.error?"Could not load website":"This website is not available in your workspace."} actionLabel={current.error?"Retry":undefined} onAction={current.error?()=>setRetry(v=>v+1):undefined}/> :
      <><header className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-card p-4"><div><p className="text-sm text-muted-foreground">Selected website</p><h1 className="text-2xl font-semibold">{siteLabel(current.site)}</h1><p className="text-sm text-muted-foreground">{current.site.is_primary?"Primary website":"Secondary website"} · {current.site.status}</p></div><label className="grid gap-1 text-sm font-medium">Switch website<select aria-label="Switch website" className="min-h-11 max-w-full rounded-lg border bg-card px-3" value={siteId} onChange={event=>{const next=event.target.value;if(next!==siteId&&window.confirm("Switch websites? Unsaved editor changes will be lost."))navigate("/dashboard/websites/"+encodeURIComponent(next));}}>{current.sites?.map(site=><option key={site.id} value={site.id}>{siteLabel(site)}</option>)}</select></label></header>{current.site.is_primary===false&&<WebsiteDomainPanel key={scope} siteId={siteId} businessId={businessId}/>}{current.site.is_primary===false&&<WebsiteReleasePanel key={"release:"+scope} siteId={siteId} businessId={businessId}/>}{current.site.is_primary===false&&<WebsiteRedirectPanel key={"redirect:"+scope} siteId={siteId} businessId={businessId}/>}<WebsiteBackupPanel key={"backup:"+scope} siteId={siteId} businessId={businessId}/><WebsiteContentExport key={"export:"+scope} siteId={siteId} businessId={businessId}/><WebsiteSiteOverview key={scope} siteId={siteId} businessId={businessId}/><WebsiteEditor key={scope} websiteIdOverride={siteId}/></>}
  </div>;
}
