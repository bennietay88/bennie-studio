import React from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

const getHeaders=async()=>{const {data:{session}}=await supabase.auth.getSession();return session?.access_token?{Authorization:`Bearer ${session.access_token}`}:{};};

export default function OtcWaiverPanel(){
 const [data,setData]=React.useState<any>({waivers:[],businesses:[]});
 const [busy,setBusy]=React.useState(false);
 const [error,setError]=React.useState("");
 const [selected,setSelected]=React.useState("");
 const [search,setSearch]=React.useState("");
 const [reason,setReason]=React.useState("");
 const [globalReason,setGlobalReason]=React.useState("");
 const [loaded,setLoaded]=React.useState(false);
 const load=React.useCallback(async()=>{
  const r=await fetch("/api/admin/otc-waivers",{headers:await getHeaders(),cache:"no-store"});
  const result=await r.json();
  if(!r.ok)throw new Error(result.error||"Cannot load OTC waiver settings.");
  setData(result);setLoaded(true);
 },[]);
 React.useEffect(()=>{void load().catch((e)=>setError(e.message));},[load]);
 const global=data.waivers.find((x:any)=>x.scope==="global");
 const customer=data.waivers.find((x:any)=>x.scope==="customer"&&x.business_id===selected);
 const save=async(kind:"global"|"customer",waived:boolean)=>{
  const note=(kind==="global"?globalReason:reason).trim();
  if(kind==="customer"&&!selected)return setError("Select a customer.");
  if(waived&&!note)return setError("Provide a reason for granting a waiver.");
  if(kind==="global"&&!window.confirm(waived?"Waive the OTC for every NEW order across ALL plans and currencies?":"Stop waiving OTC for new orders globally?"))return;
  setBusy(true);setError("");
  try{
   const uri=kind==="global"?"/api/admin/otc-waivers/global":`/api/admin/otc-waivers/customers/${selected}`;
   const r=await fetch(uri,{method:"PATCH",headers:{"Content-Type":"application/json",...(await getHeaders())},body:JSON.stringify({waived,reason:note})});
   const output=await r.json();
   if(!r.ok)throw new Error(output.error||"Could not update waiver.");
   await load();
   setReason("");setGlobalReason("");
   toast.success(waived?"OTC waiver enabled":"OTC waiver removed");
  }catch(e:any){setError(e.message||"Unable to save waiver.");}finally{setBusy(false);}
 };
 return <Card className="rounded-3xl border-indigo-200 shadow-sm"><CardHeader><CardTitle>One-time setup fee (OTC) waivers</CardTitle>
   <p className="text-sm text-slate-600">Super Admin only. A global waiver covers all new orders; a customer waiver applies only to that existing customer account. Monthly pricing and subscription terms do not change. No Stripe configuration is edited.</p></CardHeader>
  <CardContent className="space-y-5">
   {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
   <div className="rounded-xl border border-slate-200 p-4 space-y-3">
    <div className="flex items-center justify-between"><p className="font-bold">Global OTC waiver</p><Badge variant="outline">{global?.waived?"ON":"OFF"}</Badge></div>
    <p className="text-xs text-slate-500">{global?.waived?"Setup is waived on all NEW checkouts.":"Normal setup fees apply unless a customer-specific waiver exists."}</p>
    <Input aria-label="Reason for global OTC waiver" value={globalReason} onChange={e=>setGlobalReason(e.target.value)} placeholder="Reason (required when enabling)"/>
    <Button disabled={!loaded||busy} onClick={()=>void save("global",!global?.waived)}>{global?.waived?"Disable global waiver":"Waive all new OTC charges"}</Button>
   </div>
   <div className="rounded-xl border border-slate-200 p-4 space-y-3">
    <p className="font-bold">Customer-specific OTC waiver</p><p className="text-xs text-slate-500">Select an existing customer. This setting never waives monthly recurring charges.</p>
    <Input aria-label="Search customers" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by customer name"/>
    <select aria-label="Customer for OTC waiver" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}>
     <option value="">Select customer</option>
     {data.businesses.filter((x:any)=>String(x.name).toLowerCase().includes(search.toLowerCase())).map((x:any)=><option key={x.id} value={x.id}>{x.name} · {x.id.slice(0,8)}</option>)}
    </select>
    {selected&&<p className="text-xs font-semibold text-slate-600">Customer OTC waiver: {customer?.waived?"ON":"OFF"}{global?.waived?" (global waiver also enabled)":""}</p>}
    <Input aria-label="Reason for customer OTC waiver" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (required when enabling)"/>
    <Button variant="outline" disabled={!selected||busy} onClick={()=>void save("customer",!customer?.waived)}>{customer?.waived?"Remove this customer's waiver":"Waive this customer's OTC"}</Button>
   </div>
   <p className="text-xs text-slate-500">All changes are recorded in the Super Admin audit log. Historical payments and existing subscriptions remain unchanged.</p>
  </CardContent>
 </Card>;
}