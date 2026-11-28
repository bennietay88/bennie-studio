import React from "react";
import {supabase} from "../../lib/supabase";
import {COMMERCIAL_PILOTS} from "../../lib/commercialExecution";
import {Button} from "../ui/button";
import {Textarea} from "../ui/textarea";
export function PilotReleaseControls(){
 const [releases,setReleases]=React.useState<Record<string,any>|null>(null);
 const [notes,setNotes]=React.useState<Record<string,string>>({});
 const [confirmation,setConfirmation]=React.useState("");
 const [error,setError]=React.useState("");
 const [busy,setBusy]=React.useState(false);
 async function request(method="GET",body?:unknown){
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error("Sign in first");
  const res=await fetch("/api/admin/commercial-pilot-controls",{method,headers:{Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},cache:"no-store",...(body?{body:JSON.stringify(body)}:{})});
  const result=await res.json();if(!res.ok)throw Error(result.error||"Release settings unavailable");return result;
 }
 async function load(){setBusy(true);setError("");try{const r=await request();setReleases(r.releases);setNotes(Object.fromEntries(Object.entries(r.releases).map(([id,value])=>[id,(value as any)?.terms||""])));}catch(e:any){setError(e.message);setReleases(null);}finally{setBusy(false);}}
 async function save(id:string,enabled:boolean){if(confirmation!=="APPROVE COMMERCIAL PILOT"||!window.confirm(enabled?"Approve this service for individually reviewed quotations? No public prices change, no email is sent and no charge is made.":"Pause new quote approvals and checkout access? Existing Stripe sessions and subscriptions must be reconciled separately."))return;
 setBusy(true);setError("");try{await request("PATCH",{id,enabled,terms:notes[id],confirmation});setConfirmation("");await load();}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 return <details className="rounded-xl border p-4" onToggle={e=>{if(e.currentTarget.open&&!releases&&!busy)void load();}}><summary className="cursor-pointer font-semibold">Owner-only commercial pilot release controls</summary><p className="my-3 text-sm text-slate-500">Default disabled. Approve each service's pricing, scope, support, cancellation and compatibility rules only after Stripe test-mode verification. Approval enables individual quote review, not automatic purchasing or sending.</p>{error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}
 {releases&&<div className="space-y-3">{COMMERCIAL_PILOTS.map(p=><div key={p.id} className="rounded-lg border p-3"><h4 className="font-semibold">{p.name} · {releases[p.id]?.enabled?"Enabled for reviewed quotes":"Disabled"}</h4><p className="text-xs text-slate-500">{releases[p.id]?.approvedAt?"Last decision "+new Date(releases[p.id].approvedAt).toLocaleString():"No recorded approval"}</p><label className="mt-2 block text-sm">Approved service terms / decision record<Textarea value={notes[p.id]||""} onChange={e=>setNotes(n=>({...n,[p.id]:e.target.value}))} placeholder="Record commercial approval, delivery limits, cancellation and test evidence" /></label><Button className="mt-2" disabled={busy||confirmation!=="APPROVE COMMERCIAL PILOT"||(notes[p.id]||"").trim().length<20} variant="outline" onClick={()=>void save(p.id,!releases[p.id]?.enabled)}>{releases[p.id]?.enabled?"Pause new sales":"Enable reviewed quotes"}</Button></div>)}
 <label className="block text-sm">Type APPROVE COMMERCIAL PILOT to confirm a change<input className="mt-1 block w-full rounded border bg-transparent p-2" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label></div>}
 <Button variant="ghost" disabled={busy} onClick={()=>void load()}>{busy?"Loading…":"Refresh release status"}</Button></details>
}
