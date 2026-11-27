import {randomBytes,randomUUID} from "node:crypto";
import {Resolver} from "node:dns/promises";
import {connect} from "node:tls";
import {z} from "zod";
import {classifyTenantHost, getPlatformHosts, getWaasRootDomains, getAcceptedVercelCnames, getPrimaryVercelCname, isValidCustomDomain, normalizeDomainInput, VERCEL_APEX_A} from "../src/lib/tenantDomains.js";
import {ensureVercelProjectDomain, isVercelDomainsConfigured, removeVercelProjectDomain} from "./vercelDomains.js";

const select="id,business_id,status,is_primary,archived_at,custom_domain,domain_challenge,custom_domain_status,custom_domain_verified_at,custom_domain_permission_confirmed,custom_domain_suspended,ssl_status,updated_at";
export function validSecondaryDomain(raw:string):string|null {
  const host=normalizeDomainInput(raw);
  if(!isValidCustomDomain(host)||classifyTenantHost(host).kind!=="custom_domain")return null;
  for(const reserved of [...getPlatformHosts(),...getWaasRootDomains(),"bennietay.com","vercel.app","vercel-dns.com","vercel-dns-0.com"]) {
    if(host===reserved||host.endsWith("."+reserved)||reserved.endsWith("."+host))return null;
  }
  return host;
}
export function txtMatches(records:string[][],challenge:string){return Boolean(challenge)&&records.some(parts=>parts.join("")===challenge);}
function tlsReady(host:string):Promise<boolean>{
  // Never connect to an arbitrary user-controlled IP. Probe the existing
  // configured Vercel apex endpoint with certificate verification and SNI.
  return new Promise(resolve=>{
    const socket=connect({host:VERCEL_APEX_A,port:443,servername:host,rejectUnauthorized:true});
    const finish=(ok:boolean)=>{socket.destroy();resolve(ok);};
    socket.setTimeout(5000,()=>finish(false));
    socket.once("error",()=>finish(false));
    socket.once("secureConnect",()=>finish(socket.authorized));
  });
}
export function registerWebsiteDomainRoutes(app:any,db:any,authenticate:any,getProfile:any){
  const enabled=()=>process.env.MULTI_SITE_DRAFT_LIFECYCLE==="true"&&process.env.MULTI_SITE_DOMAINS==="true";
  async function load(req:any,res:any){
    res.setHeader("Cache-Control","private, no-store");
    const parsed=z.string().uuid().safeParse(req.params.siteId);
    if(!parsed.success){res.status(400).json({error:"Invalid website ID"});return null;}
    const profile=await getProfile(req.user.id);
    if(profile?.role!=="business_admin"||profile.status!=="active"||!profile.business_id){res.status(403).json({error:"Business administrator access required"});return null;}
    const {data:business,error:be}=await db.from("businesses").select("id,status,subscription_status").eq("id",profile.business_id).single();
    if(be)throw be;
    if(business?.status!=="active"||business.subscription_status!=="active"){res.status(403).json({error:"Active subscription required"});return null;}
    const {data:site,error}=await db.from("websites").select(select).eq("id",parsed.data).eq("business_id",business.id).eq("is_internal_pilot",false).is("archived_at",null).maybeSingle();
    if(error)throw error;
    if(!site||site.is_primary){res.status(404).json({error:"Secondary website not found"});return null;}
    return site;
  }
  async function lockDomain(site:any){
    const host=validSecondaryDomain(site.custom_domain||"");
    if(!host)throw Error("Invalid existing website domain");
    const canonical=host.replace(/^www\./,"");
    const token=randomUUID();
    const {error}=await db.from("website_domain_operation_locks").insert({host:canonical,token,website_id:site.id});
    if(error)throw error;
    return async()=>{const {error:e}=await db.from("website_domain_operation_locks").delete().eq("host",canonical).eq("token",token);if(e)console.error("Website domain lock release failed",{code:e.code});};
  }
  async function reload(site:any){
    const {data,error}=await db.from("websites").select(select).eq("id",site.id).eq("business_id",site.business_id).eq("updated_at",site.updated_at).eq("status","draft").is("archived_at",null).maybeSingle();
    if(error)throw error;return data;
  }
  function response(site:any){
    return {siteId:site.id,businessId:site.business_id,enabled:enabled(),domain:site.custom_domain||"",updatedAt:site.updated_at,editable:site.status==="draft"&&!site.custom_domain_suspended,status:site.custom_domain_status||"not_connected",ssl:site.ssl_status||"not_connected",verifiedAt:site.custom_domain_verified_at||null,challenge:site.domain_challenge?{name:"_bennie-verify."+site.custom_domain,value:site.domain_challenge}:null,dns:{a:VERCEL_APEX_A,cname:getPrimaryVercelCname()}};
  }
  function fail(res:any,e:any){
    if(e?.code==="23505")return res.status(409).json({error:"This domain is already reserved."});
    console.error("Website domain operation failed",{code:e?.code});
    return res.status(503).json({error:"Domain management is temporarily unavailable."});
  }
  app.get("/api/account/websites/:siteId/domain",authenticate,async(req:any,res:any)=>{
    if(!enabled())return res.json({enabled:false});
    try{const site=await load(req,res);if(site)return res.json(response(site));}catch(e){return fail(res,e);}
  });
  app.post("/api/account/websites/:siteId/domain",authenticate,async(req:any,res:any)=>{
    if(!enabled())return res.status(503).json({error:"Independent domains are not enabled."});
    const input=z.object({domain:z.string().trim().min(4).max(253),permission:z.literal(true)}).strict().safeParse(req.body);
    const host=input.success?validSecondaryDomain(input.data.domain):null;
    if(!host)return res.status(400).json({error:"Enter a permitted custom hostname and confirm permission."});
    try{
      const site=await load(req,res);if(!site)return;
      if(site.status!=="draft"||site.custom_domain_suspended)return res.status(409).json({error:"Domain changes require an active draft."});
      if(site.custom_domain){
        if(site.custom_domain===host)return res.json(response(site));
        return res.status(409).json({error:"A domain is already reserved. Contact delivery support to change it."});
      }
      const {data,error}=await db.from("websites").update({custom_domain:host,domain_challenge:"bennie-"+randomBytes(32).toString("hex"),custom_domain_permission_confirmed:true,custom_domain_status:"dns_pending",custom_domain_verified_at:null,ssl_status:"pending",updated_at:new Date().toISOString()}).eq("id",site.id).eq("business_id",site.business_id).eq("status","draft").eq("updated_at",site.updated_at).is("archived_at",null).is("custom_domain",null).select(select).maybeSingle();
      if(error)throw error;
      if(!data)return res.status(409).json({error:"Website changed. Reload and try again."});
      return res.json(response(data));
    }catch(e){return fail(res,e);}
  });
  app.patch("/api/account/websites/:siteId/domain",authenticate,async(req:any,res:any)=>{
    if(!enabled())return res.status(503).json({error:"Independent domains are not enabled."});
    const input=z.object({domain:z.string().trim().min(4).max(253).nullable(),permission:z.boolean(),confirmation:z.literal(true),updatedAt:z.string().datetime({offset:true})}).strict().safeParse(req.body);
    if(!input.success)return res.status(400).json({error:"Invalid domain change."});
    const host=input.data.domain===null?null:validSecondaryDomain(input.data.domain);
    if(input.data.domain!==null&&(!host||!input.data.permission))return res.status(400).json({error:"Enter a permitted domain and confirm ownership."});
    try{
      let site=await load(req,res);if(!site)return;
      if(site.status!=="draft"||site.custom_domain_suspended||site.updated_at!==input.data.updatedAt)return res.status(409).json({error:"Unpublish or refresh this website before changing its domain."});
      if(host===site.custom_domain)return res.json(response(site));
      let unlock:(()=>Promise<void>)|undefined;
      try{
        if(site.custom_domain){
          unlock=await lockDomain(site);
          if(!await reload(site))return res.status(409).json({error:"Website changed. Refresh and retry."});
          if(!isVercelDomainsConfigured())return res.status(503).json({error:"Hosting provider is not configured; domain reservation retained."});
          const {data:reset,error:resetError}=await db.from("websites").update({custom_domain_status:"dns_pending",custom_domain_verified_at:null,ssl_status:"pending",updated_at:new Date().toISOString()}).eq("id",site.id).eq("business_id",site.business_id).eq("updated_at",site.updated_at).eq("status","draft").is("archived_at",null).select(select).maybeSingle();
          if(resetError)throw resetError;if(!reset)return res.status(409).json({error:"Website changed. Refresh first."});
          site=reset;
          // Retain reservation and clear verified state before provider deletion.
          await removeVercelProjectDomain(site.custom_domain).catch((e:any)=>{if(Number(e?.status)!==404)throw e;});
        }
      const {data,error}=await db.from("websites").update({custom_domain:host,domain_challenge:host?"bennie-"+randomBytes(32).toString("hex"):null,custom_domain_permission_confirmed:Boolean(host),custom_domain_status:host?"dns_pending":"not_connected",custom_domain_verified_at:null,ssl_status:host?"pending":"not_connected",updated_at:new Date().toISOString()}).eq("id",site.id).eq("business_id",site.business_id).eq("is_primary",false).eq("status","draft").eq("updated_at",site.updated_at).is("archived_at",null).select(select).maybeSingle();
      if(error)throw error;if(!data)return res.status(409).json({error:"Website changed. Refresh and retry."});
      return res.json(response(data));
      }finally{if(unlock)await unlock();}
    }catch(e){return fail(res,e);}
  });
  app.post("/api/account/websites/:siteId/domain/verify",authenticate,async(req:any,res:any)=>{
    if(!enabled())return res.status(503).json({error:"Independent domains are not enabled."});
    try{
      const site=await load(req,res);if(!site)return;
      const host=validSecondaryDomain(site.custom_domain||"");
      if(!host||!site.domain_challenge||!site.custom_domain_permission_confirmed||site.custom_domain_suspended||site.status!=="draft")return res.status(409).json({error:"Reserve a domain for an active draft first."});
      const unlock=await lockDomain(site);
      try{
      if(!await reload(site))return res.status(409).json({error:"Website changed. Refresh and retry."});
      const resolver=new Resolver({timeout:3000,tries:2});
      const [txt,a,cname]=await Promise.all([resolver.resolveTxt("_bennie-verify."+host).catch(()=>[]),resolver.resolve4(host).catch(()=>[]),resolver.resolveCname(host).catch(()=>[])]);
      const owned=txtMatches(txt,site.domain_challenge);
      const pointed=a.includes(VERCEL_APEX_A)||cname.some(v=>getAcceptedVercelCnames().includes(v.toLowerCase().replace(/\.$/,"")));
      let providerVerified=false,ssl=false;
      if(owned&&pointed&&isVercelDomainsConfigured()){
        const provisioned=await ensureVercelProjectDomain(host);
        providerVerified=provisioned.verified;
        if(providerVerified)ssl=await tlsReady(host);
      }
      const now=new Date().toISOString();
      const {data,error}=await db.from("websites").update({custom_domain_status:owned&&pointed?(providerVerified&&ssl?"connected":"ssl_pending"):"dns_pending",custom_domain_verified_at:owned&&pointed&&providerVerified?now:null,ssl_status:ssl?"issued":"pending",ssl_checked_at:now,custom_domain_last_checked_at:now,updated_at:now}).eq("id",site.id).eq("business_id",site.business_id).eq("custom_domain",host).eq("domain_challenge",site.domain_challenge).eq("status","draft").eq("updated_at",site.updated_at).is("archived_at",null).select(select).maybeSingle();
      if(error)throw error;
      if(!data)return res.status(409).json({error:"Website changed during verification. Retry."});
      return res.json({...response(data),checks:{owned,pointed,providerVerified,ssl}});
      }finally{await unlock();}
    }catch(e){return fail(res,e);}
  });
}
