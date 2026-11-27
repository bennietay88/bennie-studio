import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
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
        const {data,error}=await supabase.from("websites").select("id,business_id,slug,status,updated_at,seo").eq("business_id",businessId).eq("id",siteId).maybeSingle();
        if(active) setResult({scope,site:error||!data?null:selectPortfolioSite([data as PortfolioSite],businessId,siteId)});
      } catch { if(active) setResult({scope,site:null}); }
    })();
    return ()=>{active=false;};
  },[businessId,siteId,scope]);
  const current = result?.scope === scope ? result : null;
  return <div className="space-y-4">
    <Link to="/dashboard/websites" className="inline-block text-sm font-semibold text-indigo-600" onClick={e=>{if(current?.site && !window.confirm("Return to My Websites? Unsaved editor changes will be lost."))e.preventDefault();}}>← My Websites</Link>
    {!current ? <p role="status">Loading selected website…</p> : !current.site ? <p role="alert">This website is not available in your workspace.</p> :
      <><h1 className="text-xl font-semibold">{siteLabel(current.site)}</h1><WebsiteEditor key={scope} websiteIdOverride={siteId}/></>}
  </div>;
}
