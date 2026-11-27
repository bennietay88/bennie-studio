import {useEffect,useState} from "react";
import {useAuth} from "../contexts/AuthContext";
import {supabase} from "../lib/supabase";
import {portfolioRequest} from "../lib/websitePortfolioApi";
import {Button} from "./ui/button";
type State={mode:"owner"|"persona"|"none";roles?:string[];role?:string};
const names:Record<string,string>={staff:"Customer staff",client:"Customer client",affiliate:"Affiliate",platform_staff:"Platform staff",super_admin:"Super Admin"};
export default function InternalRoleTester(){
 const {profile,logout}=useAuth();
 const [state,setState]=useState<State|null>(null),[role,setRole]=useState("staff"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{let active=true;setState(null);if(!profile?.uid)return;portfolioRequest<State>("/api/internal-testing/status").then(v=>{if(active)setState(v);}).catch(()=>{});return()=>{active=false;};},[profile?.uid]);
 if(!state||state.mode==="none")return null;
 async function start(){
  if(busy||!window.confirm("Switch to an actual "+(names[role]||role)+" test identity? This replaces your current owner session. Return by signing in to your personal account."))return;
  setBusy(true);setMessage("");
  try{
   const result=await portfolioRequest<{tokenHash:string;role:string}>("/api/internal-testing/switch",{method:"POST",body:JSON.stringify({role,confirmation:true})});
   if(result.role!==role)throw Error("Role selection changed.");
   const {error}=await supabase.auth.verifyOtp({token_hash:result.tokenHash,type:"email"});
   if(error)throw Error("Unable to start role session. Sign in again.");
   window.location.assign(["super_admin","platform_staff"].includes(role)?"/admin":"/dashboard");
  }catch(e){setMessage(e instanceof Error?e.message:"Switch failed");}finally{setBusy(false);}
 }
 return <section className="mb-3 rounded-xl border border-indigo-300 p-2 space-y-2 text-xs"><strong>Internal production verification</strong>{state.mode==="owner"?<><p>Full-access owner · Business Admin</p><label className="block">Test as role<select className="mt-1 w-full rounded border bg-transparent p-1" value={role} onChange={e=>setRole(e.target.value)}>{state.roles?.map(r=><option key={r} value={r}>{names[r]||r}</option>)}</select></label><Button size="sm" variant="outline" className="w-full" disabled={busy} onClick={()=>void start()}>{busy?"Switching…":"Switch test identity"}</Button><p>Requires a recent owner sign-in.</p></>:<><p>Testing as {names[state.role||""]||state.role}. Real role restrictions apply.</p><Button size="sm" variant="outline" className="w-full" onClick={async()=>{await logout();window.location.assign("/login");}}>Return to owner sign-in</Button></>}{message&&<p role="alert">{message}</p>}</section>;
}
