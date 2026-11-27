import { validateWebsiteRedirects } from "../src/lib/websiteRedirects.js";
import { registerWebsiteBackupRoutes } from "./websiteBackupRoutes.js";
import { registerWebsiteOperationsRoutes } from "./websiteOperationsRoutes.js";
import { registerWebsiteReleaseRoutes } from "./websiteReleaseRoutes.js";
import { registerWebsiteDomainRoutes } from "./websiteDomainRoutes.js";
import { z } from "zod";
import { findPlan } from "../src/constants/plans.js";
import { websiteCapacity } from "../src/lib/websiteEntitlements.js";

const mutation = z.object({
  action: z.enum(["create","duplicate","rename","archive","restore"]),
  siteId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100).optional(),
}).strict();
const quota = z.object({websiteLimit:z.number().int().min(0).max(1000)}).strict();

export function registerWebsitePortfolioRoutes(app:any, db:any, authenticate:any, getProfile:any) {
  registerWebsiteDomainRoutes(app,db,authenticate,getProfile);
  registerWebsiteReleaseRoutes(app,db,authenticate,getProfile);
  registerWebsiteOperationsRoutes(app,db,authenticate,getProfile);
  registerWebsiteBackupRoutes(app,db,authenticate,getProfile);
  const enabled = () => process.env.MULTI_SITE_DRAFT_LIFECYCLE === "true";
  async function actor(req:any,res:any) {
    const profile = await getProfile(req.user.id);
    if (profile?.role !== "business_admin" || !profile.business_id || profile.status !== "active") {
      res.status(403).json({error:"Business administrator access required"}); return null;
    }
    return profile;
  }
  const report = (res:any, error:any) => {
    console.error("Website portfolio operation failed", {code:error?.code});
    return res.status(503).json({error:"Website management is temporarily unavailable."});
  };
  app.get("/api/account/websites", authenticate, async (req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    try {
      const profile=await actor(req,res); if(!profile)return;
      const businessId=profile.business_id;
      const {data:business,error:be}=await db.from("businesses").select("id,plan,status,subscription_status").eq("id",businessId).single();
      if(be||!business)throw be||new Error("Business missing");
      const {data:settings,error:se}=await db.from("settings").select("content").eq("id","plans").maybeSingle();
      if(se)throw se;
      const pagePlan=findPlan(settings?.content?.pricing,business.plan);
      let plans=await db.from("plans").select("slug,project_limit,website_limit").eq("slug",business.plan).maybeSingle();
      let schemaReady=!plans.error;
      if(plans.error?.code==="42703"||plans.error?.code==="PGRST204") {
        plans=await db.from("plans").select("slug,project_limit").eq("slug",business.plan).maybeSingle();
      }
      if(plans.error)throw plans.error;
      const base="id,business_id,name,slug,status,is_primary,custom_domain,ssl_status,updated_at,seo,theme";
      let records=await db.from("websites").select(base+",archived_at").eq("business_id",businessId).eq("is_internal_pilot",false).order("updated_at",{ascending:false}).limit(1001);
      if(records.error?.code==="42703"||records.error?.code==="PGRST204"){
        schemaReady=false;
        records=await db.from("websites").select(base).eq("business_id",businessId).eq("is_internal_pilot",false).order("updated_at",{ascending:false}).limit(1001);
      }
      if(records.error)throw records.error;
      const sites=(records.data||[]).map((s:any)=>{const {theme,seo,...rest}=s;const color=(v:unknown,fallback:string)=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;return {...rest,seo:{title:typeof seo?.title==="string"?seo.title:""},preview:{primary:color(theme?.primaryColor,"#4f46e5"),secondary:color(theme?.secondaryColor,"#0f172a"),title:typeof seo?.title==="string"?seo.title.slice(0,100):s.name||"Website",description:typeof seo?.description==="string"?seo.description.slice(0,140):""},archived_at:s.archived_at||null};});
      // Count allocations independently of the paginated portfolio. Include
      // reserved/internal rows, matching the database quota trigger.
      let countQuery=db.from("websites").select("id",{count:"exact",head:true}).eq("business_id",businessId);
      if(schemaReady)countQuery=countQuery.is("archived_at",null);
      const {count,error:ce}=await countQuery;
      if(ce||count===null)throw ce||new Error("Website count unavailable");
      const used=count;
      let effectiveLimit=plans.data?.website_limit;
      if(schemaReady&&enabled()){
        const {data:limit,error:limitError}=await db.rpc("effective_website_limit",{p_business:businessId});
        if(limitError)throw limitError;
        effectiveLimit=limit;
      }
      const capacity=websiteCapacity({websiteLimit:effectiveLimit,websitesUsed:used,projectLimit:plans.data?.project_limit??null,pagesPerWebsite:pagePlan.maxPages,locationPagesPerWebsite:pagePlan.maxLocationPages});
      return res.json({businessId,sites,capacity,lifecycleEnabled:schemaReady&&enabled()&&business.status==="active"&&business.subscription_status==="active"});
    }catch(error){return report(res,error);}
  });
  app.get("/api/account/websites/:siteId/preview",authenticate,async(req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    const id=z.string().uuid().safeParse(req.params.siteId);if(!id.success)return res.status(400).json({error:"Invalid website ID"});
    try{const profile=await actor(req,res);if(!profile)return;
      const {data,error}=await db.from("websites").select("id,business_id,theme,pages,seo,status,updated_at,is_primary,is_internal_pilot").eq("id",id.data).eq("business_id",profile.business_id).eq("is_internal_pilot",false).maybeSingle();
      if(error)throw error;if(!data)return res.status(404).json({error:"Website not found"});
      return res.json({siteId:data.id,businessId:data.business_id,website:data});
    }catch(e){return report(res,e);}
  });
  app.get("/api/account/websites/:siteId/redirects",authenticate,async(req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    if(!enabled())return res.json({enabled:false});
    const id=z.string().uuid().safeParse(req.params.siteId);if(!id.success)return res.status(400).json({error:"Invalid website ID"});
    try{const profile=await actor(req,res);if(!profile)return;
      const {data,error}=await db.from("websites").select("id,business_id,status,seo,updated_at").eq("id",id.data).eq("business_id",profile.business_id).eq("is_primary",false).eq("is_internal_pilot",false).is("archived_at",null).maybeSingle();
      if(error)throw error;if(!data)return res.status(404).json({error:"Secondary website not found"});
      return res.json({enabled:true,siteId:data.id,businessId:data.business_id,editable:data.status==="draft",updatedAt:data.updated_at,rules:validateWebsiteRedirects(data.seo?.siteRedirects)?data.seo.siteRedirects:[]});
    }catch(e){return report(res,e);}
  });
  app.put("/api/account/websites/:siteId/redirects",authenticate,async(req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    if(!enabled())return res.status(503).json({error:"Redirects disabled"});
    const id=z.string().uuid().safeParse(req.params.siteId);const input=z.object({rules:z.unknown(),updatedAt:z.string().datetime({offset:true})}).strict().safeParse(req.body);
    if(!id.success||!input.success||!validateWebsiteRedirects(input.data.rules))return res.status(400).json({error:"Use unique internal paths and avoid redirect chains or loops."});
    try{const profile=await actor(req,res);if(!profile)return;
      const {data:site,error}=await db.from("websites").select("id,business_id,seo,updated_at").eq("id",id.data).eq("business_id",profile.business_id).eq("is_primary",false).eq("is_internal_pilot",false).eq("status","draft").is("archived_at",null).maybeSingle();
      if(error)throw error;if(!site)return res.status(404).json({error:"Secondary draft not found"});
      if(site.updated_at!==input.data.updatedAt)return res.status(409).json({error:"Website changed. Refresh first."});
      const {data:updated,error:ue}=await db.from("websites").update({seo:{...(site.seo||{}),siteRedirects:input.data.rules},updated_at:new Date().toISOString()}).eq("id",site.id).eq("business_id",site.business_id).eq("updated_at",site.updated_at).eq("status","draft").select("id,business_id,updated_at").maybeSingle();
      if(ue)throw ue;if(!updated)return res.status(409).json({error:"Website changed. Refresh first."});
      return res.json({enabled:true,siteId:updated.id,businessId:updated.business_id,editable:true,updatedAt:updated.updated_at,rules:input.data.rules});
    }catch(e){return report(res,e);}
  });
  app.post("/api/account/websites/:siteId/asset-upload",authenticate,async(req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    if(!enabled())return res.status(503).json({error:"Website-specific uploads are disabled."});
    const siteId=z.string().uuid().safeParse(req.params.siteId);
    const body=z.object({mimeType:z.enum(["image/jpeg","image/png","image/webp"]),size:z.number().int().min(1).max(5*1024*1024)}).strict().safeParse(req.body);
    if(!siteId.success||!body.success)return res.status(400).json({error:"Upload JPG, PNG or WebP up to 5 MB."});
    try{
      const profile=await actor(req,res);if(!profile)return;
      const {data:site,error}=await db.from("websites").select("id").eq("id",siteId.data).eq("business_id",profile.business_id).eq("status","draft").eq("is_internal_pilot",false).is("archived_at",null).maybeSingle();
      if(error)throw error;if(!site)return res.status(404).json({error:"Draft website not found."});
      const {data:owner,error:oe}=await db.from("businesses").select("status,subscription_status").eq("id",profile.business_id).single();
      if(oe)throw oe;if(owner.status!=="active"||owner.subscription_status!=="active")return res.status(403).json({error:"Active subscription required"});
      const bucket="website-assets";const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[body.data.mimeType];
      const path="sites/"+profile.business_id+"/"+siteId.data+"/"+crypto.randomUUID()+"."+extension;
      const {data:upload,error:ue}=await db.storage.from(bucket).createSignedUploadUrl(path);
      if(ue||!upload?.token)throw ue||Error("Upload token missing");
      return res.json({bucket,path,token:upload.token,publicUrl:db.storage.from(bucket).getPublicUrl(path).data.publicUrl});
    }catch(error){return report(res,error);}
  });
  app.get("/api/account/websites/:siteId/overview",authenticate,async(req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    const parsed=z.string().uuid().safeParse(req.params.siteId);
    if(!parsed.success)return res.status(400).json({error:"Invalid website ID"});
    const days=z.coerce.number().int().refine(v=>[7,30,90].includes(v)).safeParse(req.query.days??30);
    if(!days.success)return res.status(400).json({error:"Choose a 7, 30 or 90 day period"});
    try{
      const profile=await actor(req,res);if(!profile)return;
      const businessId=profile.business_id, siteId=parsed.data;
      const {data:site,error:siteError}=await db.from("websites").select("id,business_id,name,status").eq("business_id",businessId).eq("id",siteId).eq("is_internal_pilot",false).maybeSingle();
      if(siteError)throw siteError;
      if(!site)return res.status(404).json({error:"Website not found"});
      const since=new Date(Date.now()-days.data*86400000).toISOString();
      const scoped=(table:string)=>db.from(table).select("id",{count:"exact",head:true}).eq("business_id",businessId).eq("website_id",siteId).gte("created_at",since);
      const [views,events,leads,recent]=await Promise.all([
        scoped("page_views").not("page_path","like","%:%"),
        scoped("tracking_events"),
        scoped("leads"),
        db.from("leads").select("id,name,status,created_at,source").eq("business_id",businessId).eq("website_id",siteId).gte("created_at",since).order("created_at",{ascending:false}).limit(10)
      ]);
      for(const result of [views,events,leads,recent])if(result.error)throw result.error;
      let usage=null;
      if(enabled()){
        const {data,error}=await db.rpc("website_resource_usage",{p_business:businessId,p_website:siteId,p_since:since});
        if(error)throw error;usage=data;
      }
      return res.json({siteId,businessId,days:days.data,since,usage,pageViews:views.count??0,interactions:events.count??0,leads:leads.count??0,recentLeads:recent.data||[]});
    }catch(error){return report(res,error);}
  });
  app.post("/api/account/websites", authenticate, async(req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    if(!enabled())return res.status(503).json({error:"Website lifecycle is not enabled for this deployment."});
    const parsed=mutation.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:"Invalid website action"});
    const {action,siteId,name}=parsed.data;
    if((action!=="create"&&!siteId)||(["create","duplicate","rename"].includes(action)&&!name))return res.status(400).json({error:"Missing website details"});
    try {
      const profile=await actor(req,res);if(!profile)return;
      const {data,error}=await db.rpc("manage_website_draft",{p_user_id:req.user.id,p_business_id:profile.business_id,p_action:action,p_site_id:siteId??null,p_name:name??null});
      if(error){
        const messages:Record<string,string>={WEBSITE_LIMIT_REACHED:"Website allowance reached.",ACTIVE_SUBSCRIPTION_REQUIRED:"An active subscription is required.",FORBIDDEN_BUSINESS_ACCESS:"Business administrator access required.",WEBSITE_NOT_FOUND:"Website not found.",WEBSITE_ARCHIVED:"Restore the website before duplicating it.",ONLY_SECONDARY_DRAFTS_CAN_BE_ARCHIVED:"Only secondary draft websites can be archived.",INVALID_WEBSITE_NAME:"Enter a valid website name."};
        if(messages[error.message])return res.status(error.code==="42501"?403:error.code==="P0002"?404:409).json({error:messages[error.message]});
        throw error;
      }
      return res.json({siteId:data});
    }catch(error){return report(res,error);}
  });
  app.get("/api/admin/website-allowances",authenticate,async(req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    try{
      const profile=await getProfile(req.user.id);
      if(profile?.role!=="super_admin"||profile.status!=="active")return res.status(403).json({error:"Super administrator access required"});
      const {data,error}=await db.from("plans").select("slug,name,project_limit,website_limit,is_active").order("sort_order");
      if(error)throw error;
      return res.json({plans:data||[]});
    }catch(error){return report(res,error);}
  });
  app.patch("/api/admin/website-allowances/:slug",authenticate,async(req:any,res:any)=>{
    res.setHeader("Cache-Control","private, no-store");
    const body=quota.safeParse(req.body);
    if(!body.success||typeof req.params.slug!=="string"||!/^[-a-z0-9_]{1,80}$/.test(req.params.slug))return res.status(400).json({error:"Invalid website allowance"});
    try{
      const profile=await getProfile(req.user.id);
      if(profile?.role!=="super_admin"||profile.status!=="active")return res.status(403).json({error:"Super administrator access required"});
      const {data,error}=await db.from("plans").update({website_limit:body.data.websiteLimit}).eq("slug",req.params.slug).select("slug,website_limit,project_limit").maybeSingle();
      if(error)throw error;
      if(!data)return res.status(404).json({error:"Plan not found"});
      return res.json({plan:data});
    }catch(error){return report(res,error);}
  });
}
