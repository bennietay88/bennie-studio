import {resolveSiteBusiness} from "./websiteAdminScope.js";
import {z} from "zod";
const uuid=z.string().uuid();
const activeStaff=(p:any)=>p?.status==="active"&&(p.role==="super_admin"||(p.role==="platform_staff"&&p.staff_permissions?.includes("delivery")));
const enabled=()=>process.env.MULTI_SITE_DRAFT_LIFECYCLE==="true";
const siteFields="id,business_id,name,status,custom_domain,custom_domain_status,custom_domain_suspended,ssl_status,archived_at,is_primary,updated_at";
export function registerWebsiteOperationsRoutes(app:any,db:any,authenticate:any,getProfile:any){
 const fail=(res:any,e:any)=>{console.error("Website operations failed",{code:e?.code});return res.status(503).json({error:"Website operation unavailable."});};
 app.get("/api/account/websites/:siteId/export",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  if(!uuid.safeParse(req.params.siteId).success)return res.status(400).json({error:"Invalid website ID"});
  try{
   const profile=await getProfile(req.user.id);
   const businessId=await resolveSiteBusiness(db,profile,req.params.siteId);
   if(!businessId)return res.status(403).json({error:"Business administrator access required"});
   const {data,error}=await db.from("websites").select("id,business_id,name,theme,pages,seo,status,updated_at").eq("id",req.params.siteId).eq("business_id",businessId).eq("is_internal_pilot",false).maybeSingle();
   if(error)throw error;if(!data)return res.status(404).json({error:"Website not found"});
   // Content-only export; excludes account, billing, CRM and hosting credentials.
   const seo=data.seo||{};
   const {title,description,keywords,canonicalUrl,ogImage,favicon}=seo;
   return res.json({format:"bennie-website-content-v1",businessId:data.business_id,exportedAt:new Date().toISOString(),website:{id:data.id,name:data.name,theme:data.theme,pages:data.pages,seo:{title,description,keywords,canonicalUrl,ogImage,favicon},updatedAt:data.updated_at}});
  }catch(e){return fail(res,e);}
 });
 app.get("/api/admin/website-operations",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  try{
   if(!activeStaff(await getProfile(req.user.id)))return res.status(403).json({error:"Delivery access required"});
   if(!enabled())return res.json({enabled:false,sites:[],hasMore:false});
   const page=z.coerce.number().int().min(1).max(10000).safeParse(req.query.page??1);
   if(!page.success)return res.status(400).json({error:"Invalid page"});
   const start=(page.data-1)*50;
   const filters=z.object({businessId:uuid.optional(),kind:z.enum(["all","primary","secondary"]).default("all"),state:z.enum(["all","draft","published","archived","suspended"]).default("all")}).safeParse(req.query);
   if(!filters.success)return res.status(400).json({error:"Invalid website filters"});
   let query=db.from("websites").select(siteFields+",businesses(name,status,subscription_status,plan)").eq("is_internal_pilot",false);
   if(filters.data.businessId)query=query.eq("business_id",filters.data.businessId);
   if(filters.data.kind!=="all")query=query.eq("is_primary",filters.data.kind==="primary");
   if(filters.data.state==="archived")query=query.not("archived_at","is",null);
   else if(filters.data.state!=="all"){query=query.is("archived_at",null);if(filters.data.state==="suspended")query=query.eq("custom_domain_suspended",true);else query=query.eq("status",filters.data.state);}
   const {data,error}=await query.order("updated_at",{ascending:false}).order("id").range(start,start+50);
   if(error)throw error;
   return res.json({enabled:true,sites:(data||[]).slice(0,50),hasMore:(data||[]).length>50});
  }catch(e){return fail(res,e);}
 });
 app.get("/api/admin/website-management/config",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  try{
   const p=await getProfile(req.user.id);if(p?.status!=="active"||p.role!=="super_admin")return res.status(403).json({error:"Super administrator required"});
   const {data,error}=await db.from("businesses").select("id,name,plan,status,subscription_status").order("name").limit(1000);if(error)throw error;
   const flags=Object.fromEntries(["MULTI_SITE_DRAFT_LIFECYCLE","MULTI_SITE_DOMAINS","MULTI_SITE_PUBLICATION","MULTI_SITE_MEDIA_BACKUP","MULTI_SITE_ADDON_BILLING"].map(k=>[k,process.env[k]==="true"]));
   return res.json({businesses:data||[],flags,domainProviderConfigured:Boolean((process.env.VERCEL_TOKEN||process.env.VERCEL_API_TOKEN)&&(process.env.VERCEL_PROJECT_ID||process.env.VERCEL_PROJECT_NAME||process.env.VERCEL_PROJECT_SLUG))});
  }catch(e){return fail(res,e);}
 });
 app.get("/api/admin/website-management/:businessId/commercial",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  if(!uuid.safeParse(req.params.businessId).success)return res.status(400).json({error:"Invalid business ID"});
  try{
   const p=await getProfile(req.user.id);if(p?.status!=="active"||p.role!=="super_admin")return res.status(403).json({error:"Super administrator required"});
   const businessId=req.params.businessId;
   const [b,cap,count,orders]=await Promise.all([db.from("businesses").select("id,name,plan,status,subscription_status").eq("id",businessId).maybeSingle(),db.rpc("effective_website_limit",{p_business:businessId}),db.from("websites").select("id",{head:true,count:"exact"}).eq("business_id",businessId).is("archived_at",null),db.from("website_addon_orders").select("id,status,paid_through,cancel_at_period_end,created_at").eq("business_id",businessId).order("created_at",{ascending:false}).limit(100)]);
   for(const result of [b,cap,count,orders])if(result.error)throw result.error;
   if(!b.data)return res.status(404).json({error:"Business not found"});
   return res.json({businessId,business:b.data,websiteLimit:cap.data,websitesUsed:count.count??0,orders:orders.data||[]});
  }catch(e){return fail(res,e);}
 });
 app.post("/api/admin/website-management/:businessId/lifecycle",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  if(!enabled())return res.status(503).json({error:"Website lifecycle disabled"});
  const body=z.object({action:z.enum(["create","duplicate","rename","archive","restore"]),siteId:uuid.optional(),name:z.string().trim().min(1).max(100).optional(),confirmation:z.literal(true)}).strict().safeParse(req.body);
  if(!uuid.safeParse(req.params.businessId).success||!body.success)return res.status(400).json({error:"Invalid website operation"});
  const {action,siteId,name}=body.data;
  if((action!=="create"&&!siteId)||(["create","duplicate","rename"].includes(action)&&!name))return res.status(400).json({error:"Missing website details"});
  try{
   const p=await getProfile(req.user.id);if(p?.status!=="active"||p.role!=="super_admin")return res.status(403).json({error:"Super administrator required"});
   const {data,error}=await db.rpc("manage_website_draft",{p_user_id:req.user.id,p_business_id:req.params.businessId,p_action:action,p_site_id:siteId??null,p_name:name??null});
   if(error){if(["23514","42501","P0002"].includes(error.code))return res.status(error.code==="42501"?403:error.code==="P0002"?404:409).json({error:error.message});throw error;}
   return res.json({siteId:data,businessId:req.params.businessId});
  }catch(e){return fail(res,e);}
 });
 app.get("/api/admin/website-operations/:siteId/audit",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  if(!enabled())return res.status(503).json({error:"Website lifecycle disabled"});
  if(!uuid.safeParse(req.params.siteId).success)return res.status(400).json({error:"Invalid website ID"});
  try{const profile=await getProfile(req.user.id);if(profile?.status!=="active"||(profile.role!=="super_admin"&&!(profile.role==="platform_staff"&&profile.staff_permissions?.includes("activity_logs"))))return res.status(403).json({error:"Audit access required"});
   const {data,error}=await db.from("website_lifecycle_audit").select("id,action,actor_id,created_at,details").eq("website_id",req.params.siteId).order("created_at",{ascending:false}).limit(100);
   if(error)throw error;return res.json({siteId:req.params.siteId,events:data||[]});
  }catch(e){return fail(res,e);}
 });
 app.get("/api/admin/website-commercial-audit",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  if(!enabled())return res.status(503).json({error:"Website lifecycle disabled"});
  try{const profile=await getProfile(req.user.id);if(profile?.status!=="active"||profile.role!=="super_admin")return res.status(403).json({error:"Super administrator access required"});
   const {data,error}=await db.from("website_lifecycle_audit").select("id,action,business_id,actor_id,created_at,details").or("action.like.website_addon_%,action.eq.plan_website_limit_changed").order("created_at",{ascending:false}).limit(100);
   if(error)throw error;return res.json({events:data||[]});
  }catch(e){return fail(res,e);}
 });
 app.post("/api/admin/website-operations/:siteId",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  if(!enabled())return res.status(503).json({error:"Website lifecycle is disabled"});
  const input=z.object({action:z.enum(["suspend","resume"]),confirmation:z.literal(true),updatedAt:z.string().datetime({offset:true})}).strict().safeParse(req.body);
  if(!uuid.safeParse(req.params.siteId).success||!input.success)return res.status(400).json({error:"Invalid site operation"});
  try{
   if(!activeStaff(await getProfile(req.user.id)))return res.status(403).json({error:"Delivery access required"});
   const {data:site,error:se}=await db.from("websites").select(siteFields).eq("id",req.params.siteId).eq("is_primary",false).eq("is_internal_pilot",false).is("archived_at",null).maybeSingle();
   if(se)throw se;if(!site)return res.status(404).json({error:"Website not found"});
   if(site.updated_at!==input.data.updatedAt)return res.status(409).json({error:"Website changed. Refresh first."});
   const suspend=input.data.action==="suspend";
   if(Boolean(site.custom_domain_suspended)===suspend)return res.json({site});
   // Suspending a live site atomically takes it offline. Resuming never publishes.
   const {data,error}=await db.from("websites").update({status:"draft",custom_domain_suspended:suspend,custom_domain_verified_at:null,custom_domain_status:"dns_pending",ssl_status:"pending",updated_at:new Date().toISOString()}).eq("id",site.id).eq("business_id",site.business_id).eq("updated_at",site.updated_at).eq("is_primary",false).is("archived_at",null).select(siteFields).maybeSingle();
   if(error)throw error;if(!data)return res.status(409).json({error:"Website changed. Refresh first."});
   return res.json({site:data});
  }catch(e){return fail(res,e);}
 });
}
