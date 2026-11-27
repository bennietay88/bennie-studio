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
  const enabled = () => process.env.MULTI_SITE_DRAFT_LIFECYCLE === "true";
  async function actor(req:any,res:any) {
    const profile = await getProfile(req.user.id);
    if (profile.role !== "business_admin" || !profile.business_id || profile.status !== "active") {
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
      const base="id,business_id,name,slug,status,is_primary,custom_domain,ssl_status,updated_at,seo";
      let records=await db.from("websites").select(base+",archived_at").eq("business_id",businessId).eq("is_internal_pilot",false).order("updated_at",{ascending:false}).limit(1001);
      if(records.error?.code==="42703"||records.error?.code==="PGRST204"){
        schemaReady=false;
        records=await db.from("websites").select(base).eq("business_id",businessId).eq("is_internal_pilot",false).order("updated_at",{ascending:false}).limit(1001);
      }
      if(records.error)throw records.error;
      const sites=(records.data||[]).map((s:any)=>({...s,seo:{title:typeof s.seo?.title==="string"?s.seo.title:""},archived_at:s.archived_at||null}));
      // Count allocations independently of the paginated portfolio. Include
      // reserved/internal rows, matching the database quota trigger.
      let countQuery=db.from("websites").select("id",{count:"exact",head:true}).eq("business_id",businessId);
      if(schemaReady)countQuery=countQuery.is("archived_at",null);
      const {count,error:ce}=await countQuery;
      if(ce||count===null)throw ce||new Error("Website count unavailable");
      const used=count;
      const capacity=websiteCapacity({websiteLimit:plans.data?.website_limit,websitesUsed:used,projectLimit:plans.data?.project_limit??null,pagesPerWebsite:pagePlan.maxPages,locationPagesPerWebsite:pagePlan.maxLocationPages});
      return res.json({businessId,sites,capacity,lifecycleEnabled:schemaReady&&enabled()&&business.status==="active"&&business.subscription_status==="active"});
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
      return res.json({siteId,businessId,days:days.data,since,pageViews:views.count??0,interactions:events.count??0,leads:leads.count??0,recentLeads:recent.data||[]});
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
      if(profile.role!=="super_admin")return res.status(403).json({error:"Super administrator access required"});
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
      if(profile.role!=="super_admin")return res.status(403).json({error:"Super administrator access required"});
      const {data,error}=await db.from("plans").update({website_limit:body.data.websiteLimit}).eq("slug",req.params.slug).select("slug,website_limit,project_limit").maybeSingle();
      if(error)throw error;
      if(!data)return res.status(404).json({error:"Plan not found"});
      return res.json({plan:data});
    }catch(error){return report(res,error);}
  });
}
