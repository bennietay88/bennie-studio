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
   if(profile?.status!=="active"||profile.role!=="business_admin"||!profile.business_id)return res.status(403).json({error:"Business administrator access required"});
   const {data,error}=await db.from("websites").select("id,business_id,name,theme,pages,seo,status,updated_at").eq("id",req.params.siteId).eq("business_id",profile.business_id).eq("is_internal_pilot",false).maybeSingle();
   if(error)throw error;if(!data)return res.status(404).json({error:"Website not found"});
   // Content-only export; excludes account, billing, CRM and hosting credentials.
   const seo=data.seo||{};
   const {title,description,keywords,canonicalUrl,ogImage,favicon}=seo;
   return res.json({format:"bennie-website-content-v1",exportedAt:new Date().toISOString(),website:{id:data.id,name:data.name,theme:data.theme,pages:data.pages,seo:{title,description,keywords,canonicalUrl,ogImage,favicon},updatedAt:data.updated_at}});
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
   const {data,error}=await db.from("websites").select(siteFields).eq("is_primary",false).eq("is_internal_pilot",false).order("updated_at",{ascending:false}).order("id").range(start,start+50);
   if(error)throw error;
   return res.json({enabled:true,sites:(data||[]).slice(0,50),hasMore:(data||[]).length>50});
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
