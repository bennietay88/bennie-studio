import {useEffect,useState} from "react";
import {Button} from "./ui/button";
import {portfolioRequest} from "../lib/websitePortfolioApi";
type State={businessId:string;enabled:boolean;price:{id:string;currency:string;amount:number}|null;orders:{id:string;status:string;paid_through:string|null;cancel_at_period_end:boolean}[]};
export default function WebsiteAddonPanel({businessId,onChanged}:{businessId:string;onChanged:()=>void}){
 const [data,setData]=useState<State|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;portfolioRequest<State>("/api/account/website-addons").then(d=>{if(d.businessId!==businessId)throw Error("Billing scope changed");if(active)setData(d);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[businessId,refresh]);
 const price=data?.price;
 const cost=price?new Intl.NumberFormat(undefined,{style:"currency",currency:price.currency.toUpperCase()}).format(price.amount/100):"";
 async function purchase(){
  if(busy||!price||!data?.enabled||!window.confirm("Purchase one additional website slot for "+cost+" per month?"))return;
  setBusy(true);setMessage("");
  try{const {url}=await portfolioRequest<{url:string}>("/api/account/website-addons/checkout",{method:"POST",body:JSON.stringify({priceId:price.id,confirmation:true})});const target=new URL(url);if(target.protocol!=="https:"||target.hostname!=="checkout.stripe.com")throw Error("Invalid checkout destination");window.location.assign(target.href);}catch(e){setMessage(e instanceof Error?e.message:"Checkout unavailable");setBusy(false);}
 }
 async function cancel(orderId:string){
  if(busy||!window.confirm("Cancel this additional website subscription? Existing site content will not be deleted."))return;
  setBusy(true);setMessage("");
  try{await portfolioRequest("/api/account/website-addons/"+encodeURIComponent(orderId)+"/cancel",{method:"POST",body:JSON.stringify({confirmation:true})});setRefresh(v=>v+1);onChanged();}catch(e){setMessage(e instanceof Error?e.message:"Cancellation failed");}finally{setBusy(false);}
 }
 return <section className="mb-4 rounded-xl border p-3 space-y-2"><h3 className="font-semibold">Additional website slots</h3><p className="text-sm text-slate-500">One recurring subscription adds one slot after payment is verified. Downgrades never delete saved sites.</p>{message&&<p role="status">{message}</p>}<div className="flex flex-wrap gap-2 items-center"><Button disabled={busy||!data?.enabled} onClick={()=>void purchase()}>{data?.enabled?"Buy one slot · "+cost+"/month":"Purchases unavailable"}</Button><Button variant="outline" disabled={busy} onClick={()=>{setRefresh(v=>v+1);onChanged();}}>Refresh billing</Button></div>{data?.orders.filter(o=>!["expired","cancelled"].includes(o.status)).map(o=><div key={o.id} className="border-t pt-2 flex flex-wrap gap-2 items-center text-sm"><span className="flex-1">{o.status}{o.cancel_at_period_end?" · ends after current period":""}{o.paid_through?" · paid through "+new Date(o.paid_through).toLocaleDateString():""}</span><Button variant="outline" size="sm" disabled={busy||o.cancel_at_period_end} onClick={()=>void cancel(o.id)}>{o.status==="pending"?"Expire checkout":"Cancel renewal"}</Button></div>)}</section>;
}
export function WebsiteAddonPricingAdmin(){
 const [priceId,setPriceId]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;portfolioRequest<{priceId:string;purchasesEnabled:boolean}>("/api/admin/website-addon-price").then(d=>{if(active){setPriceId(d.priceId);setMessage(d.purchasesEnabled?"Purchases enabled by configuration; price is checked at checkout.":"Purchases disabled or no price configured.");}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[]);
 async function save(){if(busy||!window.confirm("Configure the monthly price for future website purchases? Existing recurring subscriptions retain their price."))return;setBusy(true);try{const d=await portfolioRequest<{priceId:string;purchasesEnabled:boolean}>("/api/admin/website-addon-price",{method:"PATCH",body:JSON.stringify({priceId:priceId.trim()})});setPriceId(d.priceId);setMessage("Validated price saved. "+(d.purchasesEnabled?"Purchases enabled by deployment flag.":"Purchases remain disabled."));}catch(e){setMessage(e instanceof Error?e.message:"Price not saved.");}finally{setBusy(false);}}
 return <section className="border rounded-xl p-3 space-y-2"><h3 className="font-semibold">Additional website monthly price</h3><p className="text-sm text-slate-500">Enter an existing active monthly Stripe Price ID. No default price is created.</p><label className="block text-sm">Stripe Price ID<input className="block border rounded p-2 w-full" value={priceId} onChange={e=>setPriceId(e.target.value)} placeholder="price_…"/></label><Button disabled={busy||!priceId.trim()} onClick={()=>void save()}>Validate and save</Button>{message&&<p role="status" className="text-sm">{message}</p>}</section>;
}
