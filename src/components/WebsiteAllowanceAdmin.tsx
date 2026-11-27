import { WebsiteAddonPricingAdmin } from "./WebsiteAddonPanel";
import { useEffect,useState } from "react";
import { getWebsiteAllowances,saveWebsiteAllowance,type WebsiteAllowance } from "../lib/websitePortfolioApi";
import { Button } from "./ui/button";
export default function WebsiteAllowanceAdmin(){
  const [plans,setPlans]=useState<WebsiteAllowance[]>([]);
  const [values,setValues]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState<string|null>(null);
  useEffect(()=>{let active=true;getWebsiteAllowances().then(({plans})=>{if(active){setPlans(plans);setValues(Object.fromEntries(plans.map(p=>[p.slug,String(p.website_limit)])));}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[]);
  async function save(plan:WebsiteAllowance){
    const raw=values[plan.slug]??"";
    const n=Number(raw);
    if(!raw.trim()||!Number.isInteger(n)||n<0||n>1000){setMessage("Enter an integer from 0 to 1000.");return;}
    if(!window.confirm("Change website slots for this plan? Existing project and page limits will not change."))return;
    setBusy(plan.slug);setMessage("");
    try{const {plan:updated}=await saveWebsiteAllowance(plan.slug,n);setPlans(old=>old.map(p=>p.slug===updated.slug?{...p,...updated}:p));setMessage("Website allowance saved.");}catch(e){setMessage(e instanceof Error?e.message:"Unable to save.");}finally{setBusy(null);}
  }
  return <section className="space-y-4 rounded-2xl border bg-white p-5 dark:bg-slate-900">
    <div><h2 className="text-xl font-semibold">Website allowances</h2><p className="text-sm text-slate-500">Independent website slots. Project limits and pages per website are unchanged. Reducing a limit does not delete existing websites.</p></div>
    {message&&<p role="status" className="text-sm">{message}</p>}
    <WebsiteAddonPricingAdmin />
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Plan</th><th className="p-2">Project limit</th><th className="p-2">Website slots</th><th className="p-2">Action</th></tr></thead><tbody>{plans.map(p=><tr key={p.slug} className="border-t"><td className="p-2">{p.name} {!p.is_active&&"(Inactive)"}</td><td className="p-2">{p.project_limit??"—"}</td><td className="p-2"><input className="w-24 rounded border bg-transparent p-2" aria-label={p.name+" website slots"} type="number" min={0} max={1000} step={1} value={values[p.slug]??""} onChange={e=>setValues(v=>({...v,[p.slug]:e.target.value}))}/></td><td className="p-2"><Button size="sm" disabled={busy!==null||values[p.slug]===String(p.website_limit)} onClick={()=>void save(p)}>Save</Button></td></tr>)}</tbody></table></div>
  </section>;
}
