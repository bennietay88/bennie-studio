import {useEffect,useState} from "react";
import {portfolioRequest} from "../lib/websitePortfolioApi";
import {Button} from "./ui/button";

type DomainResult={enabled:false}|{enabled:true;siteId:string;businessId:string;domain:string;status:string;ssl:string;verifiedAt:string|null;challenge:{name:string;value:string}|null;dns:{a:string;cname:string};checks?:{owned:boolean;pointed:boolean;providerVerified:boolean;ssl:boolean}};
export default function WebsiteDomainPanel({siteId,businessId}:{siteId:string;businessId:string}){
 const [state,setState]=useState<DomainResult|null>(null);
 const [domain,setDomain]=useState("");
 const [permission,setPermission]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [refresh,setRefresh]=useState(0);
 const path="/api/account/websites/"+encodeURIComponent(siteId)+"/domain";
 function validate(data:DomainResult){if(data.enabled&&(data.siteId!==siteId||data.businessId!==businessId))throw new Error("Website scope changed.");return data;}
 useEffect(()=>{let active=true;setState(null);setError("");portfolioRequest<DomainResult>(path).then(data=>{if(active)setState(validate(data));}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load domain.");});return()=>{active=false;};},[path,businessId,refresh]);
 async function action(verify:boolean){
   if(busy||!state?.enabled)return;
   if(!verify&&(!domain.trim()||!permission))return;
   setBusy(true);setError("");
   try{const data=await portfolioRequest<DomainResult>(path+(verify?"/verify":""),{method:"POST",body:JSON.stringify(verify?{}:{domain:domain.trim(),permission})});setState(validate(data));}
   catch(e){setError(e instanceof Error?e.message:"Domain operation failed.");}finally{setBusy(false);}
 }
 return <section className="rounded-xl border p-4 space-y-4">
 <div><h2 className="font-semibold">Domain &amp; SSL</h2><p className="text-sm text-slate-500">Connect a domain to this website only. Domain readiness does not publish the website.</p></div>
 {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
 {!state?<Button variant="outline" onClick={()=>setRefresh(v=>v+1)}>Reload domain status</Button>:!state.enabled?<p className="text-sm text-slate-500">Independent domain management is not enabled in this environment.</p>:!state.domain?<div className="space-y-3"><label className="block text-sm">Custom hostname<input className="mt-1 block w-full rounded border bg-transparent p-2" placeholder="www.example.com" value={domain} onChange={e=>setDomain(e.target.value)}/></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/>I own this domain or have permission to connect it.</label><Button disabled={busy||!permission||!domain.trim()} onClick={()=>void action(false)}>Reserve domain</Button></div>:<div className="space-y-3">
 <div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Hostname</p><strong className="break-all">{state.domain}</strong></div><div><p className="text-xs text-slate-500">Domain status</p><strong>{state.status.replaceAll("_"," ")}</strong></div><div><p className="text-xs text-slate-500">SSL status</p><strong>{state.ssl}</strong></div></div>
 <p className="text-sm">Add the ownership TXT record and either the A record or a compatible CNAME at your DNS provider. Use the full hostnames shown below.</p>
 <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th>Type</th><th>Hostname</th><th>Value</th></tr></thead><tbody>{state.challenge&&<tr className="border-t"><td>TXT</td><td className="break-all p-2">{state.challenge.name}</td><td className="break-all p-2 font-mono text-xs">{state.challenge.value}</td></tr>}<tr className="border-t"><td>A</td><td className="p-2">{state.domain}</td><td>{state.dns.a}</td></tr><tr className="border-t"><td>CNAME (alternative)</td><td className="p-2">{state.domain}</td><td>{state.dns.cname}</td></tr></tbody></table></div>
 <p className="text-xs text-slate-500">An apex hostname may require an A record instead of CNAME. Do not remove the ownership TXT record.</p>
 {state.checks&&<ul className="text-sm space-y-1">{Object.entries({Ownership:state.checks.owned,"DNS pointing":state.checks.pointed,"Hosting verification":state.checks.providerVerified,"TLS certificate":state.checks.ssl}).map(([label,ok])=><li key={label}>{label}: {ok?"Passed":"Pending"}</li>)}</ul>}
 <Button disabled={busy} onClick={()=>void action(true)}>{busy?"Checking…":"Verify DNS & SSL"}</Button>
 <p className="text-xs text-slate-500">Contact delivery support to change or release a reserved domain.</p>
 </div>}
 </section>;
}
