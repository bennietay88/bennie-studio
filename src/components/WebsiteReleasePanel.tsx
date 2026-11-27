import {useEffect,useState} from "react";
import {Button} from "./ui/button";
import {portfolioRequest} from "../lib/websitePortfolioApi";

type Action="submit"|"internal_approve"|"customer_approve"|"publish"|"unpublish";
type Release={enabled:false}|{enabled:true;siteId:string;businessId:string;name:string;status:string;staff:boolean;revision:string;submitted:boolean;internalApproved:boolean;customerApproved:boolean;releasedAt:string|null;blockers:string[];warnings:string[]};
type QueueSite={id:string;business_id:string;name:string|null;status:string;release_revision:string;submitted_revision:string;internal_approved_revision:string|null;customer_approved_revision:string|null};
const labels:Record<Action,string>={submit:"Submit saved draft for review",internal_approve:"Approve internal QA",customer_approve:"Approve reviewed revision",publish:"Publish website",unpublish:"Unpublish website"};
const confirmations:Record<Action,string>={submit:"Submit the saved website revision? Unsaved editor changes are not included.",internal_approve:"Confirm that you personally reviewed this saved revision on desktop and mobile, checked evidence, content, design and technical quality.",customer_approve:"Confirm that you reviewed and approve this exact saved website revision for launch.",publish:"Publish this approved revision to its connected domain?",unpublish:"Take this website offline? A new approval cycle will be required to publish again."};

export default function WebsiteReleasePanel({siteId,businessId,staff=false,onChanged}:{siteId:string;businessId:string;staff?:boolean;onChanged?:()=>void}){
 const [result,setResult]=useState<Release|null>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const path="/api/account/websites/"+encodeURIComponent(siteId)+"/release";
 function checked(data:Release){if(data.enabled&&(data.siteId!==siteId||data.businessId!==businessId||data.staff!==staff))throw new Error("Website review scope changed.");return data;}
 useEffect(()=>{let active=true;setResult(null);setMessage("");portfolioRequest<Release>(path).then(data=>{if(active)setResult(checked(data));}).catch(e=>{if(active)setMessage(e instanceof Error?e.message:"Unable to load release.");});return()=>{active=false;};},[path,businessId,staff,refresh]);
 async function act(action:Action){
  if(busy||!result?.enabled||!window.confirm(confirmations[action]))return;
  setBusy(true);setMessage("");
  try{const data=checked(await portfolioRequest<Release>(path,{method:"POST",body:JSON.stringify({action,revision:result.revision,confirmation:true})}));setResult(data);setMessage("Release state updated.");onChanged?.();}
  catch(e){setMessage(e instanceof Error?e.message:"Release action failed. Refresh the status.");}finally{setBusy(false);}
 }
 const actions:Action[]=!result?.enabled?[]:result.status==="published"?(staff?["unpublish"]:[]):staff?(result.submitted?(result.internalApproved?(result.customerApproved&&result.blockers.length===0?["publish"]:[]):["internal_approve"]):[]):!result.submitted?["submit"]:result.internalApproved&&!result.customerApproved?["customer_approve"]:[];
 return <section className="rounded-xl border p-4 space-y-3">
 <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold">Website release &amp; approval</h2><p className="text-sm text-slate-500">Approvals apply to saved content only. Editing a draft invalidates previous approvals.</p></div><Button variant="outline" disabled={busy} onClick={()=>setRefresh(v=>v+1)}>Refresh status</Button></div>
 {message&&<p role="status" className="text-sm">{message}</p>}
 {!result?<p className="text-sm text-slate-500">Release state unavailable or loading.</p>:!result.enabled?<p className="text-sm text-slate-500">Independent publishing is not enabled in this environment.</p>:<>
 <div className="text-xs break-all">Saved revision: {result.revision} · {result.status}</div>
 <div className="grid gap-2 sm:grid-cols-3">{[["Submitted",result.submitted],["Internal QA",result.internalApproved],["Customer approval",result.customerApproved]].map(([label,ok])=><div className="rounded-lg border p-2 text-sm" key={String(label)}>{label}: <strong>{ok?"Complete":"Pending"}</strong></div>)}</div>
 <a className="inline-block text-sm font-semibold text-indigo-600" href={"/w/"+encodeURIComponent(businessId)+"?draft=1&website="+encodeURIComponent(siteId)} target="_blank" rel="noopener noreferrer">Open saved website preview</a>
 {result.blockers.length>0&&<div><h3 className="text-sm font-semibold">Launch blockers</h3><ul className="list-disc pl-5 text-sm">{result.blockers.map(b=><li key={b}>{b}</li>)}</ul></div>}
 {result.warnings.length>0&&<div><h3 className="text-sm font-semibold">Review warnings</h3><ul className="list-disc pl-5 text-sm">{result.warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
 <div className="flex flex-wrap gap-2">{actions.map(action=><Button key={action} disabled={busy} onClick={()=>void act(action)}>{labels[action]}</Button>)}</div>
 </>}
 </section>;
}
export function WebsiteReleaseQueue(){
 const [sites,setSites]=useState<QueueSite[]>([]);
 const [selected,setSelected]=useState("");
 const [message,setMessage]=useState("");
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;portfolioRequest<{enabled:boolean;sites:QueueSite[]}>("/api/admin/website-release-queue").then(data=>{if(active){setSites(data.sites);setMessage(data.enabled?"":"Independent release queue is disabled.");}}).catch(e=>{if(active)setMessage(e instanceof Error?e.message:"Unable to load queue.");});return()=>{active=false;};},[refresh]);
 const site=sites.find(s=>s.id===selected);
 return <section className="space-y-4 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Independent website delivery queue</h2><p className="text-sm text-slate-500">Review submitted revisions and release approved websites.</p></div><Button variant="outline" onClick={()=>setRefresh(v=>v+1)}>Refresh queue</Button></div>{message&&<p role="status" className="text-sm">{message}</p>}
 <label className="block text-sm">Select submitted website<select className="mt-1 block w-full rounded border bg-transparent p-2" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose website</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name||s.id} · {s.status} · {s.customer_approved_revision===s.release_revision?"Customer approved":s.internal_approved_revision===s.release_revision?"Awaiting customer":"Awaiting QA"}</option>)}</select></label>
 {site&&<WebsiteReleasePanel key={site.id} siteId={site.id} businessId={site.business_id} staff onChanged={()=>setRefresh(v=>v+1)}/>}</section>;
}
