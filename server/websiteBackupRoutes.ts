import {z} from "zod";
const id=z.string().uuid();
const enabled=()=>process.env.MULTI_SITE_DRAFT_LIFECYCLE==="true";
export function registerWebsiteBackupRoutes(app:any,db:any,authenticate:any,getProfile:any){
 async function scope(req:any,res:any){
  res.setHeader("Cache-Control","private, no-store");
  if(!enabled()){res.status(503).json({error:"Website backups are not enabled."});return null;}
  if(!id.safeParse(req.params.siteId).success){res.status(400).json({error:"Invalid website ID"});return null;}
  const p=await getProfile(req.user.id);
  if(p?.status!=="active"||p.role!=="business_admin"||!p.business_id){res.status(403).json({error:"Business administrator access required"});return null;}
  const {data,error}=await db.from("websites").select("id,business_id,status,is_primary,updated_at,pages,theme,seo").eq("id",req.params.siteId).eq("business_id",p.business_id).eq("is_internal_pilot",false).is("archived_at",null).maybeSingle();
  if(error)throw error;if(!data){res.status(404).json({error:"Website not found"});return null;}return data;
 }
 const fail=(res:any,e:any)=>{console.error("Website backup failed",{code:e?.code});return res.status(e?.code==="40001"?409:503).json({error:e?.code==="40001"?"Website changed. Refresh and retry.":"Website backup operation unavailable."});};
 app.get("/api/account/websites/:siteId/backups",authenticate,async(req:any,res:any)=>{
  try{const site=await scope(req,res);if(!site)return;
   const {data,error}=await db.from("website_content_backups").select("id,created_at,content_bytes").eq("business_id",site.business_id).eq("website_id",site.id).order("created_at",{ascending:false}).limit(30);
   if(error)throw error;
   return res.json({siteId:site.id,businessId:site.business_id,updatedAt:site.updated_at,canRestore:!site.is_primary&&site.status==="draft",contentBytes:Buffer.byteLength(JSON.stringify({pages:site.pages,theme:site.theme,seo:site.seo})),backups:data||[]});
  }catch(e){return fail(res,e);}
 });
 app.post("/api/account/websites/:siteId/backups",authenticate,async(req:any,res:any)=>{
  const input=z.object({action:z.enum(["create","restore"]),backupId:id.optional(),updatedAt:z.string().datetime({offset:true}),confirmation:z.literal(true)}).strict().safeParse(req.body);
  if(!input.success||(input.data.action==="restore"&&!input.data.backupId))return res.status(400).json({error:"Invalid backup operation"});
  try{const site=await scope(req,res);if(!site)return;
   if(input.data.action==="restore"&&(site.is_primary||site.status!=="draft"))return res.status(409).json({error:"Restore is available only for secondary drafts."});
   const {data,error}=await db.rpc("manage_website_content_backup",{p_actor:req.user.id,p_business:site.business_id,p_website:site.id,p_action:input.data.action,p_backup:input.data.backupId??null,p_updated:input.data.updatedAt});
   if(error)throw error;return res.json({siteId:site.id,businessId:site.business_id,backupId:data});
  }catch(e){return fail(res,e);}
 });
}
