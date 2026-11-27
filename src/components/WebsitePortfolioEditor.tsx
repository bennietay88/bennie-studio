import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getWebsitePortfolio } from "../lib/websitePortfolioApi";
import WebsiteSiteOverview from "./WebsiteSiteOverview";
import { WebsiteEditor } from "./WebsiteEditor";
import { selectPortfolioSite, siteLabel, type PortfolioSite } from "../lib/websitePortfolio";

export default function WebsitePortfolioEditor() {
  const { siteId = "" } = useParams();
  const { profile } = useAuth();
  const businessId = profile?.businessId || "";
  const scope = businessId + ":" + siteId;
  const [result,setResult] = useState<{ scope:string; site:PortfolioSite|null }|null>(null);
  useEffect(()=>{
    let active = true;
    if (!businessId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteId)) {
      setResult({scope,site:null});
      return;
    }
    void (async()=>{
      try {
        const portfolio=await getWebsitePortfolio();
        const site=portfolio.businessId===businessId?selectPortfolioSite(portfolio.sites,businessId,siteId):null;
        if(active) setResult({scope,site:site&&!site.archived_at?site:null});
      } catch { if(active) setResult({scope,site:null}); }
    })();
    return ()=>{active=false;};
  },[businessId,siteId,scope]);
  const current = result?.scope === scope ? result : null;
  return <div className="space-y-4">
    <Link to="/dashboard/websites" className="inline-block text-sm font-semibold text-indigo-600" onClick={e=>{if(current?.site && !window.confirm("Return to My Websites? Unsaved editor changes will be lost."))e.preventDefault();}}>← My Websites</Link>
    {!current ? <p role="status">Loading selected website…</p> : !current.site ? <p role="alert">This website is not available in your workspace.</p> :
      <><h1 className="text-xl font-semibold">{siteLabel(current.site)}</h1><WebsiteSiteOverview key={scope} siteId={siteId} businessId={businessId}/><WebsiteEditor key={scope} websiteIdOverride={siteId}/></>}
  </div>;
}
