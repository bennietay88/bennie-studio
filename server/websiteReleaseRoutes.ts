import {z} from "zod";
import {evaluateWorldClassLaunchGate} from "../src/constants/deliveryStandards.js";
import {auditWebsiteButtons} from "../src/lib/websiteButtons.js";
import {assessWebsiteDesign} from "../src/lib/designQa.js";
import {releaseReviewBlockers,releaseDomainBlockers} from "../src/lib/siteReleasePolicy.js";
import type {Website} from "../src/types.js";

const fields="id,business_id,name,status,theme,pages,seo,updated_at,release_revision,submitted_revision,internal_approved_revision,customer_approved_revision,internal_approved_by,customer_approved_by,internal_approved_at,customer_approved_at,released_at,custom_domain,custom_domain_status,custom_domain_verified_at,custom_domain_permission_confirmed,custom_domain_suspended,ssl_status";
const actionSchema=z.object({action:z.enum(["submit","internal_approve","customer_approve","publish","unpublish"]),revision:z.string().uuid(),confirmation:z.literal(true)}).strict();
function enabled(){return ["MULTI_SITE_DRAFT_LIFECYCLE","MULTI_SITE_DOMAINS","MULTI_SITE_PUBLICATION"].every(k=>process.env[k]==="true");}
function internal(profile:any){return profile?.status==="active"&&(profile.role==="super_admin"||(profile.role==="platform_staff"&&Array.isArray(profile.staff_permissions)&&profile.staff_permissions.includes("delivery")));}
function website(site:any):Website{return {id:site.id,businessId:site.business_id,theme:site.theme||{},pages:site.pages||[],seo:site.seo||{},status:site.status,updatedAt:Date.parse(site.updated_at)} as Website;}
function review(site:any){return {revision:site.release_revision,internalRevision:site.internal_approved_revision,customerRevision:site.customer_approved_revision};}
function checks(site:any,assumeApprovals=false){
 const w=website(site);
 const gate=evaluateWorldClassLaunchGate({website:w,buttonIssues:auditWebsiteButtons(w),designProductionReady:assessWebsiteDesign(w).productionReady,internalCreativeReviewApproved:assumeApprovals||site.internal_approved_revision===site.release_revision,responsiveQaApproved:assumeApprovals||site.internal_approved_revision===site.release_revision,customerApprovalRecorded:assumeApprovals||site.customer_approved_revision===site.release_revision});
 return {blockers:[...new Set([...gate.blockers,...releaseDomainBlockers(site),...(assumeApprovals?[]:releaseReviewBlockers(review(site)))])],warnings:gate.warnings};
}
function response(site:any,staff:boolean){
 return {enabled:true,siteId:site.id,businessId:site.business_id,name:site.name,status:site.status,staff,revision:site.release_revision,submitted:site.submitted_revision===site.release_revision,internalApproved:site.internal_approved_revision===site.release_revision,customerApproved:site.customer_approved_revision===site.release_revision,releasedAt:site.released_at, ...checks(site)};
}
export function registerWebsiteReleaseRoutes(app:any,db:any,authenticate:any,getProfile:any){
 async function load(req:any,res:any){
  const id=z.string().uuid().safeParse(req.params.siteId);
  if(!id.success){res.status(400).json({error:"Invalid website ID"});return null;}
  const profile=await getProfile(req.user.id);
  const staff=internal(profile);
  const customer=profile?.role==="business_admin"&&profile.status==="active"&&profile.business_id;
  if(!staff&&!customer){res.status(403).json({error:"Website release access required"});return null;}
  let query=db.from("websites").select(fields).eq("id",id.data).eq("is_primary",false).eq("is_internal_pilot",false).is("archived_at",null);
  if(!staff)query=query.eq("business_id",profile.business_id);
  const {data:site,error}=await query.maybeSingle();
  if(error)throw error;
  if(!site){res.status(404).json({error:"Website not found"});return null;}
  const {data:owner,error:oe}=await db.from("businesses").select("id,status,subscription_status").eq("id",site.business_id).single();
  if(oe)throw oe;
  return {site,staff,owner};
 }
 function fail(res:any,e:any){console.error("Website release operation failed",{code:e?.code});return res.status(503).json({error:"Website release is temporarily unavailable."});}
 app.get("/api/account/websites/:siteId/release",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  if(!enabled())return res.json({enabled:false});
  try{const loaded=await load(req,res);if(loaded)return res.json(response(loaded.site,loaded.staff));}catch(e){return fail(res,e);}
 });
 app.get("/api/admin/website-release-queue",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  try{
   if(!internal(await getProfile(req.user.id)))return res.status(403).json({error:"Delivery staff access required"});
   if(!enabled())return res.json({enabled:false,sites:[]});
   const {data,error}=await db.from("websites").select("id,business_id,name,status,release_revision,submitted_revision,internal_approved_revision,customer_approved_revision,updated_at").eq("is_primary",false).eq("is_internal_pilot",false).is("archived_at",null).not("submitted_revision","is",null).order("updated_at",{ascending:false}).limit(100);
   if(error)throw error;return res.json({enabled:true,sites:data||[]});
  }catch(e){return fail(res,e);}
 });
 app.post("/api/account/websites/:siteId/release",authenticate,async(req:any,res:any)=>{
  res.setHeader("Cache-Control","private, no-store");
  if(!enabled())return res.status(503).json({error:"Independent publication is not enabled."});
  const input=actionSchema.safeParse(req.body);
  if(!input.success)return res.status(400).json({error:"Invalid release action"});
  try{
   const loaded=await load(req,res);if(!loaded)return;
   const {site,staff,owner}=loaded;
   const {action,revision}=input.data;
   const staffAction=["internal_approve","publish","unpublish"].includes(action);
   if(staffAction!==staff)return res.status(403).json({error:"This action requires the appropriate reviewer role."});
   if(site.release_revision!==revision)return res.status(409).json({error:"Website revision changed. Refresh and review again."});
   if(action!=="unpublish"&&(owner.status!=="active"||owner.subscription_status!=="active"))return res.status(403).json({error:"Active subscription required"});
   if(action==="publish"){
     const {data:allowed,error:qe}=await db.rpc("website_slot_available",{p_business:site.business_id,p_website:site.id});
     if(qe)throw qe;if(!allowed)return res.status(409).json({error:"Website allowance exceeded. Restore available capacity before publication."});
   }
   if(action==="unpublish"?site.status!=="published":site.status!=="draft")return res.status(409).json({error:"Website is not in the required publication state."});
   const now=new Date().toISOString();let patch:Record<string,unknown>={updated_at:now};
   if(action==="submit")patch={...patch,submitted_revision:revision,internal_approved_revision:null,customer_approved_revision:null,internal_approved_by:null,customer_approved_by:null,internal_approved_at:null,customer_approved_at:null};
   if(action==="internal_approve"){
    if(site.submitted_revision!==revision)return res.status(409).json({error:"Customer must submit the current revision first."});
    const gate=checks(site,true);if(gate.blockers.length)return res.status(409).json({error:gate.blockers[0],blockers:gate.blockers});
    patch={...patch,internal_approved_revision:revision,internal_approved_by:req.user.id,internal_approved_at:now,customer_approved_revision:null,customer_approved_by:null,customer_approved_at:null};
   }
   if(action==="customer_approve"){
    if(site.submitted_revision!==revision||site.internal_approved_revision!==revision||site.internal_approved_by===req.user.id)return res.status(409).json({error:"Independent internal approval is required first."});
    patch={...patch,customer_approved_revision:revision,customer_approved_by:req.user.id,customer_approved_at:now};
   }
   if(action==="publish"){
    const gate=checks(site);if(site.submitted_revision!==revision||gate.blockers.length)return res.status(409).json({error:gate.blockers[0]||"Submission required",blockers:gate.blockers});
    patch={...patch,status:"published",released_at:now};
   }
   if(action==="unpublish")patch={...patch,status:"draft"};
   // Compare all approval metadata via updated_at as well as content revision;
   // the database trigger independently rejects unapproved publication.
   const {data,error}=await db.from("websites").update(patch).eq("id",site.id).eq("business_id",site.business_id).eq("release_revision",revision).eq("updated_at",site.updated_at).eq("status",site.status).is("archived_at",null).select(fields).maybeSingle();
   if(error)throw error;
   if(!data)return res.status(409).json({error:"Website changed during review. Refresh and try again."});
   return res.json(response(data,staff));
  }catch(e){return fail(res,e);}
 });
}
