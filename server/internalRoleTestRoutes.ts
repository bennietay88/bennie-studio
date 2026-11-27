import {randomBytes} from "node:crypto";
import {z} from "zod";
import {DEFAULT_PLATFORM_STAFF_PERMISSIONS} from "../src/constants/staffPermissions.js";
const roles=["staff","client","affiliate","platform_staff","super_admin"] as const;
const roleSchema=z.enum(roles);
const checked=(r:any)=>{if(r.error)throw r.error;return r.data;};
export function isAuthorizedTestOwner(profile:any,registry:any,business:any,userId:string){
 return profile?.id===userId&&profile.status==="active"&&profile.role==="business_admin"&&registry?.owner_id===userId&&registry.enabled===true&&registry.business_id===profile.business_id&&business?.id===registry.business_id&&business.owner_id===userId&&business.internal_access_mode==="owner"&&business.status==="active";
}
// The bearer token has already been validated by authenticate. Read claims
// from that exact session, not the user's last sign-in on a different device.
export function recentRoleSession(token:string,userId:string,privileged:boolean,now=Date.now()){
 try{
  const claims=JSON.parse(Buffer.from(token.split(".")[1],"base64url").toString("utf8"));
  if(claims.sub!==userId||typeof claims.session_id!=="string"||!claims.session_id||!Array.isArray(claims.amr))return false;
  if(privileged&&claims.aal!=="aal2")return false;
  return claims.amr.some((m:any)=>["password","otp","oauth","totp","mfa/totp","mfa/phone","webauthn","mfa/webauthn"].includes(m.method)&&Number.isFinite(m.timestamp)&&now-m.timestamp*1000>=-30000&&now-m.timestamp*1000<=300000);
 }catch{return false;}
}
export function registerInternalRoleTestRoutes(app:any,db:any,authenticate:any,getProfile:any){
 async function ownerContext(req:any){
  const uid=req.user.id;
  const registry=checked(await db.from("internal_role_test_owners").select("owner_id,business_id,enabled").eq("owner_id",uid).maybeSingle());
  if(!registry?.enabled)return null;
  const profile=await getProfile(uid);
  const business=checked(await db.from("businesses").select("id,owner_id,internal_access_mode,status").eq("id",registry.business_id).maybeSingle());
  return isAuthorizedTestOwner(profile,registry,business,uid)?registry:null;
 }
 app.get("/api/internal-testing/status",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  try{
   const owner=await ownerContext(req);
   if(owner)return res.json({mode:"owner",roles});
   const persona=checked(await db.from("internal_role_test_personas").select("role").eq("persona_id",req.user.id).maybeSingle());
   return res.json(persona?{mode:"persona",role:persona.role}:{mode:"none"});
  }catch{return res.status(503).json({error:"Internal verification unavailable"});}
 });
 app.post("/api/internal-testing/switch",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  const body=z.object({role:roleSchema,confirmation:z.literal(true)}).strict().safeParse(req.body);
  if(!body.success)return res.status(400).json({error:"Invalid verification role"});
  try{
   const owner=await ownerContext(req);
   if(!owner)return res.status(403).json({error:"Internal owner authorization required"});
   const role=body.data.role;
   const privileged=role==="super_admin"||role==="platform_staff";
   const token=String(req.headers.authorization||"").split(" ")[1]||"";
   if(!recentRoleSession(token,req.user.id,privileged))return res.status(403).json({error:privileged?"Verify MFA in your current owner session before starting a privileged test role.":"Sign out and sign in again before switching roles."});
   // Verify that the owner session still exists (not only that its JWT is valid).
   const claims=JSON.parse(Buffer.from(token.split(".")[1],"base64url").toString("utf8"));
   const {data:sessionActive,error:sessionError}=await db.rpc("internal_role_session_active",{p_owner:req.user.id,p_session:claims.session_id});
   if(sessionError||sessionActive!==true)return res.status(403).json({error:"Owner session is no longer active."});
   const customer=role==="staff"||role==="client";
   let record=checked(await db.from("internal_role_test_personas").select("persona_id,role").eq("owner_id",owner.owner_id).eq("role",role).maybeSingle());
   if(!record){
    const email="verification-"+role.replace("_","-")+"-"+randomBytes(12).toString("hex")+"@example.invalid";
    const created=await db.auth.admin.createUser({email,password:randomBytes(48).toString("base64url"),email_confirm:true,app_metadata:{internal_verification:true}});
    const user=created.data?.user;if(created.error||!user)throw created.error||Error("Persona creation failed");
    try{
     checked(await db.from("profiles").upsert({id:user.id,email,role,status:"active",business_id:customer?owner.business_id:null,default_account_id:null,onboarding_completed:true,staff_permissions:role==="platform_staff"?DEFAULT_PLATFORM_STAFF_PERMISSIONS:[]},{onConflict:"id"}));
     if(role==="affiliate")checked(await db.from("affiliates").insert({uid:user.id,business_id:null,referral_code:"INTERNAL-"+randomBytes(8).toString("hex").toUpperCase(),status:"active",admin_notes:"Internal verification only; no real referrals or payouts"}));
     record=checked(await db.from("internal_role_test_personas").insert({owner_id:owner.owner_id,persona_id:user.id,role}).select("persona_id,role").single());
    }catch(e){await db.auth.admin.deleteUser(user.id);throw e;}
   }
   const persona=checked(await db.from("profiles").select("id,email,role,status,business_id").eq("id",record.persona_id).single());
   if(persona.status!=="active"||persona.role!==role||persona.business_id!==(customer?owner.business_id:null))return res.status(409).json({error:"Test persona configuration changed. Administrator review required."});
   const authUser=checked(await db.auth.admin.getUserById(persona.id))?.user;
   if(!authUser||authUser.email!==persona.email||authUser.app_metadata?.internal_verification!==true)throw Error("Test persona identity mismatch");
   checked(await db.from("internal_role_test_audit").insert({owner_id:owner.owner_id,persona_id:persona.id,role}));
   const link=await db.auth.admin.generateLink({type:"magiclink",email:persona.email});
   const tokenHash=link.data?.properties?.hashed_token;
   if(link.error||!tokenHash)throw Error("Could not issue role session");
   return res.json({tokenHash,role});
  }catch(e){console.error("Internal role verification failed",{code:(e as any)?.code});return res.status(503).json({error:"Unable to start role verification."});}
 });
}
