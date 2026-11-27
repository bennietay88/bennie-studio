import {useEffect,useState} from "react";
import {useAuth} from "../contexts/AuthContext";
import {supabase} from "../lib/supabase";
import {portfolioRequest} from "../lib/websitePortfolioApi";
import {Button} from "./ui/button";
type State={mode:"owner"|"persona"|"none";roles?:string[];role?:string};
const names:Record<string,string>={staff:"Customer staff",client:"Customer client",affiliate:"Affiliate",platform_staff:"Platform staff",super_admin:"Super Admin"};
export default function InternalRoleTester(){
 const {profile,logout}=useAuth();
 const [factor,setFactor]=useState<{id:string;qr?:string;secret?:string}|null>(null),[code,setCode]=useState("");
 const [state,setState]=useState<State|null>(null),[role,setRole]=useState("staff"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{let active=true;setState(null);if(!profile?.uid)return;portfolioRequest<State>("/api/internal-testing/status").then(v=>{if(active)setState(v);}).catch(()=>{});return()=>{active=false;};},[profile?.uid]);
 if(!state||state.mode==="none")return null;
 async function prepareMfa(){
  setBusy(true);setMessage("");
  try{
   const {data,error}=await supabase.auth.mfa.listFactors();if(error)throw error;
   const verified=data.totp.find(f=>f.status==="verified");
   if(verified){setFactor({id:verified.id});return;}
   const enrolled=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"Internal owner verification"});
   if(enrolled.error)throw enrolled.error;
   setFactor({id:enrolled.data.id,qr:enrolled.data.totp.qr_code,secret:enrolled.data.totp.secret});
  }catch(e){setMessage(e instanceof Error?e.message:"MFA setup failed");}finally{setBusy(false);}
 }
 async function verifyMfa(){
  if(!factor||!/^[0-9]{6}$/.test(code))return;
  setBusy(true);setMessage("");
  try{
   const {error}=await supabase.auth.mfa.challengeAndVerify({factorId:factor.id,code});if(error)throw error;
   setFactor(null);setCode("");setMessage("MFA verified. Select the privileged test role and switch within five minutes.");
  }catch(e){setMessage(e instanceof Error?e.message:"MFA verification failed");}finally{setBusy(false);}
 }
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
 return <section className="mb-3 rounded-xl border border-indigo-300 p-2 space-y-2 text-xs"><strong>Internal production verification</strong>{state.mode==="owner"?<><p>Full-access owner · Business Admin</p><label className="block">Test as role<select className="mt-1 w-full rounded border bg-transparent p-1" value={role} onChange={e=>setRole(e.target.value)}>{state.roles?.map(r=><option key={r} value={r}>{names[r]||r}</option>)}</select></label><Button size="sm" variant="outline" className="w-full" disabled={busy} onClick={()=>void start()}>{busy?"Switching…":"Switch test identity"}</Button><p>Requires a recent owner sign-in. Platform staff and Super Admin also require MFA.</p>{["platform_staff","super_admin"].includes(role)&&<><Button size="sm" variant="outline" className="w-full" disabled={busy} onClick={()=>void prepareMfa()}>Set up / verify MFA</Button>{factor&&<div className="space-y-2">{factor.qr&&<><p>Scan this code with your authenticator app, or enter the setup key manually.</p><img src={factor.qr} alt="Authenticator enrollment QR" className="w-full max-w-40 bg-white p-1"/><p className="break-all select-all">{factor.secret}</p></>}<input aria-label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} maxLength={6} className="w-full rounded border p-1"/><Button size="sm" disabled={busy||code.length!==6} onClick={()=>void verifyMfa()}>Verify code</Button></div>}</>}</>:<><p>Testing as {names[state.role||""]||state.role}. Real role restrictions apply.</p><Button size="sm" variant="outline" className="w-full" onClick={async()=>{await logout();window.location.assign("/login");}}>Return to owner sign-in</Button></>}{message&&<p role="alert">{message}</p>}</section>;
}
