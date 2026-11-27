import {useEffect,useState} from "react";
import {Button} from "./ui/button";
import {portfolioRequest,type SiteAction} from "../lib/websitePortfolioApi";
import WebsiteAuditPanel from "./WebsiteAuditPanel";
import WebsiteDomainPanel from "./WebsiteDomainPanel";
import WebsiteReleasePanel from "./WebsiteReleasePanel";
import WebsiteRedirectPanel from "./WebsiteRedirectPanel";
import WebsiteBackupPanel from "./WebsiteBackupPanel";
import WebsiteContentExport from "./WebsiteContentExport";
import WebsiteSiteOverview from "./WebsiteSiteOverview";
import WebsiteAllowanceAdmin from "./WebsiteAllowanceAdmin";
import WebsiteLiveThumbnail from "./WebsiteLiveThumbnail";
import {WebsiteEditor} from "./WebsiteEditor";
import {useAuth} from "../contexts/AuthContext";
type Business={id:string;name:string;plan:string;status:string;subscription_status:string;custom_domain?:string|null};
type Site={id:string;business_id:string;name:string|null;status:string;custom_domain:string|null;custom_domain_status:string|null;custom_domain_suspended:boolean|null;ssl_status:string|null;archived_at:string|null;is_primary:boolean;updated_at:string;businesses?:Business};
type Result={enabled:boolean;sites:Site[];hasMore:boolean};
type Config={businesses:Business[];flags:Record<string,boolean>;domainProviderConfigured:boolean};
type Commercial={businessId:string;business:Business;websiteLimit:number;websitesUsed:number;orders:{id:string;status:string;paid_through:string|null;cancel_at_period_end:boolean}[]};
function CommercialPanel({businessId}:{businessId:string}){
 const [data,setData]=useState<Commercial|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;portfolioRequest<Commercial>("/api/admin/website-management/"+encodeURIComponent(businessId)+"/commercial").then(v=>{if(v.businessId!==businessId)throw Error("Commercial scope changed");if(active)setData(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[businessId,refresh]);
 async function cancel(orderId:string){if(busy||!window.confirm("Cancel renewal for this customer add-on? No website content will be deleted."))return;setBusy(true);setError("");try{await portfolioRequest("/api/account/website-addons/"+encodeURIComponent(orderId)+"/cancel",{method:"POST",body:JSON.stringify({businessId,confirmation:true})});setRefresh(v=>v+1);}catch(e){setError(e instanceof Error?e.message:"Cancellation failed");}finally{setBusy(false);}}
 return <section className="rounded-xl border p-4 space-y-3"><h2 className="font-semibold">Customer website entitlements</h2>{error&&<p role="alert">{error}</p>}{data&&<><p>{data.business.name} · {data.business.plan} · {data.business.subscription_status}</p><p className="text-xl font-semibold">{data.websitesUsed} / {data.websiteLimit} website slots used</p>{data.orders.map(o=><div className="flex flex-wrap items-center gap-3 border-t pt-2 text-sm" key={o.id}><span className="flex-1">{o.status} {o.paid_through&&" · paid through "+new Date(o.paid_through).toLocaleDateString()}{o.cancel_at_period_end&&" · renewal cancelled"}</span><Button size="sm" variant="outline" disabled={busy||o.cancel_at_period_end||!["pending","active","inactive"].includes(o.status)} onClick={()=>void cancel(o.id)}>Cancel add-on</Button></div>)}{!data.orders.length&&<p className="text-sm text-slate-500">No additional website subscriptions.</p>}</>}<Button variant="outline" disabled={busy} onClick={()=>setRefresh(v=>v+1)}>Refresh entitlements</Button></section>;
}
export default function WebsiteOperationsAdmin(){
 const {profile}=useAuth();
 const superAdmin=profile?.role==="super_admin";
 const [page,setPage]=useState(1),[selected,setSelected]=useState<Site|null>(null),[refresh,setRefresh]=useState(0),[tab,setTab]=useState("websites");
 const [businessId,setBusinessId]=useState(""),[kind,setKind]=useState("all"),[state,setState]=useState("all"),[search,setSearch]=useState("");
 const [config,setConfig]=useState<Config|null>(null),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[detail,setDetail]=useState("overview");
 useEffect(()=>{if(!superAdmin)return;let active=true;portfolioRequest<Config>("/api/admin/website-management/config").then(d=>{if(active)setConfig(d);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[superAdmin,refresh]);
 useEffect(()=>{let active=true;setResult(null);const q=new URLSearchParams({page:String(page),kind,state});if(businessId)q.set("businessId",businessId);portfolioRequest<Result>("/api/admin/website-operations?"+q).then(data=>{if(active){setResult(data);setSelected(old=>old?data.sites.find(s=>s.id===old.id)||null:null);}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[page,refresh,businessId,kind,state]);
 const rows=(result?.sites||[]).filter(s=>!search||[s.name,s.businesses?.name,s.id,s.business_id,s.custom_domain].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
 function choose(s:Site){if(detail==="editor"&&!window.confirm("Discard unsaved editor changes?"))return;setSelected(s);setDetail("overview");}
 function changeFilter(fn:()=>void){if(detail==="editor"&&!window.confirm("Discard unsaved editor changes?"))return;fn();setPage(1);setSelected(null);setDetail("overview");}
 async function lifecycle(action:SiteAction,site?:Site){
  const target=site?.business_id||businessId;if(!superAdmin||!target||busy)return;
  let name:string|undefined;if(["create","duplicate","rename"].includes(action)){const v=window.prompt("Website name",action==="duplicate"?(site?.name||"Website")+" copy":site?.name||"");if(!v?.trim())return;name=v.trim();}
  if(!window.confirm(action+" website for the selected customer?"))return;
  setBusy(true);setMessage("");
  try{const v=await portfolioRequest<{siteId:string;businessId:string}>("/api/admin/website-management/"+encodeURIComponent(target)+"/lifecycle",{method:"POST",body:JSON.stringify({action,siteId:site?.id,name,confirmation:true})});if(v.businessId!==target)throw Error("Unexpected customer scope");setMessage("Website operation completed.");setSelected(null);setDetail("overview");setRefresh(n=>n+1);}catch(e){setMessage(e instanceof Error?e.message:"Operation failed");}finally{setBusy(false);}
 }
 async function suspend(site:Site){
  if(busy||site.archived_at||site.is_primary)return;
  const action=site.custom_domain_suspended?"resume":"suspend";if(!window.confirm((action==="suspend"?"Suspend and take offline":"Reactivate as draft")+" this website only?"))return;
  setBusy(true);setMessage("");try{const v=await portfolioRequest<{site:Site}>("/api/admin/website-operations/"+encodeURIComponent(site.id),{method:"POST",body:JSON.stringify({action,confirmation:true,updatedAt:site.updated_at})});if(v.site.id!==site.id||v.site.business_id!==site.business_id)throw Error("Website scope changed");setSelected(null);setRefresh(n=>n+1);}catch(e){setMessage(e instanceof Error?e.message:"Operation failed");}finally{setBusy(false);}
 }
 return <section className="space-y-4"><div className="flex flex-wrap justify-between items-center gap-3"><div><h1 className="text-2xl font-semibold">Website Management</h1><p className="text-sm text-slate-500">Manage all customer websites from one place.</p></div><Button variant="outline" disabled={busy} onClick={()=>{if(detail==="editor"&&!window.confirm("Refresh and discard unsaved editor changes?"))return;setDetail("overview");setRefresh(n=>n+1);}}>Refresh</Button></div>
 <div className="flex flex-wrap gap-2">{["websites",...(superAdmin?["commercial","configuration"]:[])].map(t=><Button key={t} variant={tab===t?"default":"outline"} onClick={()=>{if(detail==="editor"&&!window.confirm("Discard unsaved editor changes?"))return;setTab(t);setDetail("overview");}}>{t==="websites"?"All websites":t==="commercial"?"Plans & billing":"Configuration"}</Button>)}</div>
 {message&&<p role="status" className="rounded border p-3 text-sm">{message}</p>}
 {tab==="commercial"&&superAdmin&&<WebsiteAllowanceAdmin/>}
 {tab==="configuration"&&superAdmin&&<section className="rounded-xl border p-4 space-y-3"><h2 className="font-semibold">Deployment readiness</h2>{config? <><p>Hosting provider credentials: {config.domainProviderConfigured?"Configured":"Missing — domain verification cannot complete"}</p>{Object.entries(config.flags).map(([k,v])=><div key={k} className="flex justify-between border-t pt-2 text-sm"><span>{k}</span><strong>{v?"Enabled":"Disabled"}</strong></div>)}<p className="text-sm text-slate-500">Deployment flags and provider credentials are configured in Vercel, not exposed in the admin portal.</p></>:<p>Configuration unavailable or loading.</p>}</section>}
 {tab==="websites"&&<><div className="flex flex-wrap gap-2 items-center">
 {superAdmin&&<select aria-label="Customer account" className="rounded border bg-transparent p-2" value={businessId} onChange={e=>changeFilter(()=>setBusinessId(e.target.value))}><option value="">All customers</option>{config?.businesses.map(b=><option key={b.id} value={b.id}>{b.name} · {b.subscription_status}</option>)}</select>}
 <select aria-label="Website type" className="rounded border bg-transparent p-2" value={kind} onChange={e=>changeFilter(()=>setKind(e.target.value))}>{["all","primary","secondary"].map(k=><option key={k}>{k}</option>)}</select>
 <select aria-label="Website state" className="rounded border bg-transparent p-2" value={state} onChange={e=>changeFilter(()=>setState(e.target.value))}>{["all","draft","published","archived","suspended"].map(k=><option key={k}>{k}</option>)}</select>
 <input aria-label="Search current page" placeholder="Search current page" className="rounded border bg-transparent p-2" value={search} onChange={e=>setSearch(e.target.value)}/>
 {superAdmin&&<Button disabled={!businessId||busy||!result?.enabled} onClick={()=>void lifecycle("create")}>Create website</Button>}</div>
 {superAdmin&&businessId&&<CommercialPanel key={businessId} businessId={businessId}/>}
 {!result?<p role="status">Loading websites…</p>:!result.enabled?<p>Website operations disabled.</p>:<div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Website / customer</th><th>Type</th><th>Domain</th><th>Status</th><th>DNS / SSL</th><th>Actions</th></tr></thead><tbody>{rows.map(s=><tr key={s.id} className="border-t"><td className="p-3"><strong>{s.name||"Untitled website"}</strong><div className="text-xs text-slate-500">{s.businesses?.name||s.business_id}</div></td><td>{s.is_primary?"Primary":"Secondary"}</td><td className="break-all">{s.custom_domain||(s.is_primary?s.businesses?.custom_domain:"")||"—"}</td><td>{s.archived_at?"Archived":s.custom_domain_suspended?"Suspended":s.status}</td><td>{s.custom_domain_status||"—"} / {s.ssl_status||"—"}</td><td className="p-2"><div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={()=>choose(s)}>Manage</Button>{!s.is_primary&&!s.archived_at&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void suspend(s)}>{s.custom_domain_suspended?"Reactivate":"Suspend"}</Button>}</div></td></tr>)}</tbody></table>{!rows.length&&<p className="p-4">No matching websites.</p>}</div>}
 <div className="flex justify-between"><Button variant="outline" disabled={page===1} onClick={()=>{if(detail==="editor"&&!window.confirm("Discard unsaved editor changes?"))return;setPage(p=>Math.max(1,p-1));setSelected(null);}}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={!result?.hasMore} onClick={()=>{if(detail==="editor"&&!window.confirm("Discard unsaved editor changes?"))return;setPage(p=>p+1);setSelected(null);setDetail("overview");}}>Next</Button></div>
 {selected&&<section className="rounded-xl border p-4 space-y-4" key={selected.id}><div className="flex flex-wrap justify-between gap-2"><div><h2 className="text-xl font-semibold">{selected.name||selected.id}</h2><p className="text-xs break-all">{selected.businesses?.name||selected.business_id} · {selected.id}</p></div><Button variant="outline" onClick={()=>{if(detail!=="editor"||window.confirm("Discard unsaved editor changes?"))setSelected(null);}}>Close workspace</Button></div>
 {superAdmin&&<div className="flex flex-wrap gap-2">{(selected.archived_at?["restore"]:["rename","duplicate",...(!selected.is_primary&&selected.status==="draft"?["archive"]:[])]).map(a=><Button key={a} variant="outline" disabled={busy} onClick={()=>void lifecycle(a as SiteAction,selected)}>{a}</Button>)}</div>}
 <div className="flex flex-wrap gap-2">{(selected.archived_at?["history"]:["overview",...(!selected.is_primary?["release"]:[]),...(superAdmin?["editor","backup","export",...(!selected.is_primary?["domain","redirects"]:[])]:[]),"history"]).map(t=><Button key={t} variant={detail===t?"default":"outline"} onClick={()=>{if(detail==="editor"&&t!==detail&&!window.confirm("Discard unsaved editor changes?"))return;setDetail(t);}}>{t}</Button>)}</div>
 {detail==="overview"&&superAdmin&&<><WebsiteLiveThumbnail site={selected} businessId={selected.business_id}/><WebsiteSiteOverview siteId={selected.id} businessId={selected.business_id}/></>}
 {detail==="overview"&&!superAdmin&&<p>Use release and history for delivery operations.</p>}
 {detail==="overview"&&selected.is_primary&&<p className="text-sm">Primary hosting and launch controls remain in <a className="underline" href="/admin/businesses">Active Sites</a>.</p>}
 {detail==="editor"&&superAdmin&&<WebsiteEditor key={selected.id} businessIdOverride={selected.business_id} websiteIdOverride={selected.is_primary?undefined:selected.id}/>}
 {detail==="domain"&&superAdmin&&<WebsiteDomainPanel siteId={selected.id} businessId={selected.business_id}/>}
 {detail==="redirects"&&superAdmin&&<WebsiteRedirectPanel siteId={selected.id} businessId={selected.business_id}/>}
 {detail==="release"&&<WebsiteReleasePanel staff siteId={selected.id} businessId={selected.business_id}/>}
 {detail==="backup"&&superAdmin&&<WebsiteBackupPanel siteId={selected.id} businessId={selected.business_id}/>}
 {detail==="export"&&superAdmin&&<WebsiteContentExport siteId={selected.id} businessId={selected.business_id}/>}
 {detail==="history"&&<WebsiteAuditPanel siteId={selected.id}/>}
 </section>}</>}
 </section>;
}
