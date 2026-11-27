import {useEffect,useState} from "react";
import {Button} from "./ui/button";
import {portfolioRequest} from "../lib/websitePortfolioApi";
type Site={id:string;business_id:string;name:string|null;status:string;custom_domain:string|null;custom_domain_status:string|null;custom_domain_suspended:boolean|null;ssl_status:string|null;archived_at:string|null;updated_at:string};
type Result={enabled:boolean;sites:Site[];hasMore:boolean};
export default function WebsiteOperationsAdmin(){
 const [page,setPage]=useState(1);
 const [refresh,setRefresh]=useState(0);
 const [result,setResult]=useState<{page:number;refresh:number;data:Result}|null>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;setMessage("");portfolioRequest<Result>("/api/admin/website-operations?page="+page).then(data=>{if(active)setResult({page,refresh,data});}).catch(e=>{if(active)setMessage(e instanceof Error?e.message:"Unable to load websites.");});return()=>{active=false;};},[page,refresh]);
 const current=result?.page===page&&result.refresh===refresh?result.data:null;
 async function act(site:Site){
  if(busy||site.archived_at||!current?.enabled)return;
  const action=site.custom_domain_suspended?"resume":"suspend";
  if(!window.confirm((action==="suspend"?"Suspend and take offline":"Reactivate as draft (does not publish)")+" this website only: "+(site.name||site.id)+"?"))return;
  setBusy(true);setMessage("");
  try{
   const response=await portfolioRequest<{site:Site}>("/api/admin/website-operations/"+encodeURIComponent(site.id),{method:"POST",body:JSON.stringify({action,confirmation:true,updatedAt:site.updated_at})});
   if(response.site?.id!==site.id||response.site.business_id!==site.business_id)throw new Error("Unexpected website scope. Refresh before retrying.");
   setRefresh(v=>v+1);
  }catch(e){setMessage(e instanceof Error?e.message:"Website operation failed.");setResult(null);}
  finally{setBusy(false);}
 }
 return <section className="space-y-4 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold">Website Operations</h1><p className="text-sm text-slate-500">Manage independent secondary websites across customer accounts. Primary managed websites retain their existing operations workflow.</p></div><Button variant="outline" disabled={busy} onClick={()=>setRefresh(v=>v+1)}>Refresh</Button></div>
 {message&&<p role="alert" className="text-sm text-red-600">{message}</p>}
 {!current?<p role="status">{message?"Refresh to retry.":"Loading websites…"}</p>:!current.enabled?<p>Independent website operations are disabled in this environment.</p>:<>
 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Website / customer ID</th><th className="p-2">Domain</th><th className="p-2">Status</th><th className="p-2">DNS / SSL</th><th className="p-2">Action</th></tr></thead><tbody>{current.sites.map(site=><tr key={site.id} className="border-t"><td className="p-2"><strong>{site.name||"Untitled website"}</strong><div className="break-all text-xs text-slate-500">{site.business_id}</div><div className="break-all text-xs text-slate-500">{site.id}</div></td><td className="p-2 break-all">{site.custom_domain||"Not connected"}</td><td className="p-2">{site.archived_at?"Archived":site.custom_domain_suspended?"Suspended":site.status}</td><td className="p-2">{site.custom_domain_status||"—"} / {site.ssl_status||"—"}</td><td className="p-2"><Button size="sm" variant="outline" disabled={busy||Boolean(site.archived_at)} onClick={()=>void act(site)}>{site.custom_domain_suspended?"Reactivate":"Suspend"}</Button></td></tr>)}</tbody></table></div>
 {!current.sites.length&&<p>No secondary websites on this page.</p>}
 <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={busy||page===1} onClick={()=>setPage(v=>v-1)}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={busy||!current.hasMore||page>=10000} onClick={()=>setPage(v=>v+1)}>Next</Button></div></>}
 </section>;
}
