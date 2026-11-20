import type { Express, Request, Response } from "express";
import { z } from "zod";
import { scoreProspect } from "../src/lib/prospectScoring.js";
import { buildOutreachReport, deterministicVariant, reviewOutreachTasks, type OutreachDataset } from "../src/lib/outreachCompletion.js";
import { prepareExperimentCopy } from "../src/lib/outreachExperiments.js";
import { salesEmailPermissionBlockReason } from "../src/lib/salesAutomation.js";
import { canManageSalesOperations } from "./salesOperations.js";

/** Server-only, authenticated outreach research and reporting. Never sends email. */
type Dependencies = {
  app: Express;
  db: any;
  authenticate: any;
  getProfileForUser: (userId: string) => Promise<any>;
  getStripe: () => Promise<any>;
  rateLimit: (options: {windowMs:number;max:number;keyPrefix:string;key?:(req:any)=>string}) => any;
};
function checked<T extends {error: unknown}>(result:T):T {
  if(result.error) throw result.error;
  return result;
}
const oneId=z.string().uuid();
const safeText=z.string().trim().max(1000);
const scoreControl=z.object({
  dryRun:z.boolean().default(true),
  offset:z.number().int().nonnegative().default(0),
  limit:z.number().int().min(1).max(100).default(50),
  onlyUnscored:z.boolean().default(true),
});
const taskControl=z.object({
  taskIds:z.array(oneId).min(1).max(50),
  dryRun:z.boolean().default(true),
});
const filterSchema=z.object({
  from:z.string().datetime({offset:true}).optional(),
  to:z.string().datetime({offset:true}).optional(),
  country:z.string().max(2).optional(),
  industry:z.string().max(90).optional(),
  tier:z.string().max(30).optional(),
  websiteStatus:z.string().max(30).optional(),
  provider:z.string().max(30).optional(),
  template:z.string().max(120).optional(),
  campaign:z.string().max(150).optional(),
  segment:z.string().max(120).optional(),
});
const websiteEvidence=z.object({
  prospectId:oneId,
  websiteStatus:z.enum(["unknown","no_website","weak","average","strong"]),
  sourceUrl:z.string().url().max(2048),
  method:z.string().trim().min(8).max(300),
  finding:z.string().trim().min(15).max(3000),
  confidence:z.enum(["low","medium","high"]),
  verifiedAt:z.string().datetime({offset:true}),
  // The operator must attest to real research; the server cannot establish a no-site fact from a missing domain.
  reviewedEvidence:z.literal(true),
});
const experimentSchema=z.object({
  name:z.string().trim().min(3).max(140),
  hypothesis:z.string().trim().min(8).max(2000),
  segment:z.string().trim().min(1).max(120).default("all"),
  primaryMetric:z.enum(["human_reply","positive_reply","meeting","verified_payment"]).default("human_reply"),
  variantA:z.object({subject:z.string().trim().min(4).max(240),body:z.string().trim().min(20).max(12000)}),
  variantB:z.object({subject:z.string().trim().min(4).max(240),body:z.string().trim().min(20).max(12000)}),
});
const manualAttribution=z.object({
  prospectId:oneId.optional(),
  leadId:oneId.optional(),
  businessId:oneId.optional(),
  proposalId:oneId.optional(),
  messageId:oneId.optional(),
  eventType:z.enum(["qualified_conversation","meeting_confirmed","proposal_sent","proposal_accepted","customer_won","customer_lost"]),
  occurredAt:z.string().datetime({offset:true}),
  notes:z.string().trim().min(8).max(3000),
  evidenceUrl:z.string().url().max(2048).optional(),
  amount:z.number().nonnegative().optional(),
  currency:z.string().regex(/^[A-Z]{3}$/).optional(),
}).refine(value=>Boolean(value.prospectId||value.leadId),{message:"Prospect or lead is required"})
 .refine(value=>value.amount==null||(value.currency!=null),{message:"Currency required with an amount"});
const paymentReconcile=z.object({prospectId:oneId,invoiceId:z.string().min(5).max(150).regex(/^in_[A-Za-z0-9]+$/)});
const timestampOk=(value:string)=>Date.parse(value)<=Date.now()+60_000;
function requestPayload<T>(schema:z.ZodType<T>,value:unknown,res:Response):T|null{
  const result=schema.safeParse(value);
  if(!result.success){res.status(400).json({error:"Invalid input",details:result.error.issues.map(x=>({path:x.path.join("."),message:x.message})).slice(0,8)});return null;}
  return result.data;
}
async function getAll(db:any,table:string,columns="*",max=12000){
  const batch=500;const rows:any[]=[];
  for(let offset=0;offset<max;offset+=batch){
    const result=checked(await db.from(table).select(columns).order("created_at",{ascending:true}).range(offset,offset+batch-1));
    rows.push(...(result.data||[]));
    if((result.data||[]).length<batch)return rows;
  }
  throw new Error("DATASET_LIMIT_EXCEEDED");
}
async function ensureExists(db:any,table:string,id:string,select="id"){
  const r=checked(await db.from(table).select(select).eq("id",id).maybeSingle());
  if(!r.data)throw new Error("LINKED_RECORD_NOT_FOUND");
  return r.data;
}
export function registerOutreachCompletionRoutes({app,db,authenticate,getProfileForUser,getStripe,rateLimit}:Dependencies){
  const salesOnly=async (req:any,res:Response,next:any)=>{
    try{
      const profile=await getProfileForUser(req.user.id);
      if(!canManageSalesOperations(profile))return res.status(403).json({error:"Sales access required"});
      return next();
    }catch{return res.status(503).json({error:"Sales authorization unavailable"});}
  };
  const throttle=rateLimit({windowMs:60_000,max:30,keyPrefix:"outreach-completion",key:(req:any)=>req.user?.id||"anonymous"});
  const gate=[authenticate,salesOnly,throttle];
  const replyError=(res:Response,error:unknown,context:string)=>{
    const msg=String(error instanceof Error?error.message:"").slice(0,100);
    if(msg==="LINKED_RECORD_NOT_FOUND")return res.status(404).json({error:"Linked record not found"});
    if(msg==="DATASET_LIMIT_EXCEEDED")return res.status(413).json({error:"Reporting data exceeds the safety limit. Narrow the date range or use an approved paginated export."});
    console.error("[OutreachCompletion]",context,msg);
    return res.status(503).json({error:"Outreach "+context+" is unavailable. Check the migration and database diagnostics."});
  };
  app.get("/api/admin/outreach-completion/report",...gate,async (req:any,res:Response)=>{
    const input=requestPayload(filterSchema,req.query,res);
    if(!input)return;
    if(input.from&&input.to&&input.from>input.to)return res.status(400).json({error:"Invalid date range"});
    try{
      const [prospects,messages,tasks,leads,bookings,proposals,businesses,attribution,experiments,assignments,suppressions]=await Promise.all([
        getAll(db,"prospects"),getAll(db,"sales_messages"),getAll(db,"sales_tasks"),
        getAll(db,"leads"),getAll(db,"sales_call_bookings"),getAll(db,"proposals"),
        getAll(db,"businesses","id,name,created_at,status"),
        getAll(db,"outreach_attribution_events"),getAll(db,"outreach_experiments"),
        getAll(db,"outreach_experiment_assignments"),getAll(db,"sales_suppressions"),
      ]);
      const dataset:OutreachDataset={prospects,messages,tasks,leads,bookings,proposals,businesses,attribution,experiments,assignments};
      const report=buildOutreachReport(dataset,input);
      const taskReview=reviewOutreachTasks(tasks,prospects,leads,suppressions,messages);
      return res.json({report,taskReview:{summary:taskReview.summary,items:taskReview.items.slice(0,300)},datasetTruncated:false});
    }catch(e){return replyError(res,e,"reporting");}
  });
  app.post("/api/admin/outreach-completion/rescore",...gate,async (req:any,res:Response)=>{
    const input=requestPayload(scoreControl,req.body,res);
    if(!input)return;
    try{
      const {data,error}=await db.from("prospects").select("*").order("created_at",{ascending:true}).range(input.offset,input.offset+input.limit-1);
      if(error)throw error;
      const rows=(data||[]).filter((p:any)=>!input.onlyUnscored||p.qualification_score_version!=="v2");
      const preview=rows.map((p:any)=>{
        const score=scoreProspect(p);
        return {id:p.id,name:p.name,priorScore:p.qualification_score??null,
          score:score.score,category:score.category,componentScores:score.componentScores,
          nextAction:score.recommendedNextAction,verifiedEvidenceCount:score.factors.filter(x=>x.evidence?.verified).length};
      });
      if(!input.dryRun){
        for(const p of rows){
          const score=scoreProspect(p);
          const changes={qualification_score:score.score,qualification_category:score.category,
            score_factors:score.factors,qualification_component_scores:score.componentScores,
            recommended_next_action:score.recommendedNextAction,qualification_score_version:score.version,
            scoring_version:score.version,scored_at:score.calculatedAt,
            qualification_calculated_at:score.calculatedAt,updated_at:score.calculatedAt};
          checked(await db.from("prospects").update(changes).eq("id",p.id));
          checked(await db.from("outreach_evidence_audit").insert({prospect_id:p.id,actor_id:req.user.id,
            event_type:"qualification_scored",previous_record:{score:p.qualification_score,category:p.qualification_category},
            new_record:{score:score.score,category:score.category,version:score.version}}));
        }
      }
      return res.json({dryRun:input.dryRun,processed:rows.length,offset:input.offset,nextOffset:input.offset+input.limit,
        preview,warning:"Unknown evidence scores zero. This operation does not verify facts, confer contact permission or send emails."});
    }catch(e){return replyError(res,e,"rescoring");}
  });
  app.post("/api/admin/outreach-completion/website-evidence",...gate,async (req:any,res:Response)=>{
    const input=requestPayload(websiteEvidence,req.body,res);
    if(!input)return;
    if(!timestampOk(input.verifiedAt))return res.status(400).json({error:"Verification cannot be future-dated"});
    try{
      const p=await ensureExists(db,"prospects",input.prospectId,"*");
      const record={website_status:input.websiteStatus,website_evidence_source_url:input.sourceUrl,
        website_verified_at:input.verifiedAt,website_verification_method:input.method,
        website_finding:input.finding,website_evidence_confidence:input.confidence,
        website_verified_by:req.user.id,updated_at:new Date().toISOString()};
      checked(await db.from("prospects").update(record).eq("id",p.id));
      checked(await db.from("outreach_evidence_audit").insert({prospect_id:p.id,actor_id:req.user.id,
        event_type:"website_verified",source_url:input.sourceUrl,
        previous_record:{status:p.website_status,source:p.website_evidence_source_url},
        new_record:record}));
      return res.json({success:true,prospectId:p.id,websiteStatus:input.websiteStatus,
        note:"Operator-reviewed evidence saved. This does not itself authorize outreach."});
    }catch(e){return replyError(res,e,"evidence review");}
  });
  app.post("/api/admin/outreach-completion/tasks/reconcile",...gate,async (req:any,res:Response)=>{
    const input=requestPayload(taskControl,req.body,res);
    if(!input)return;
    try{
      const [tasks,prospects,leads,suppressions,messages]=await Promise.all([
        getAll(db,"sales_tasks"),getAll(db,"prospects"),getAll(db,"leads"),
        getAll(db,"sales_suppressions"),getAll(db,"sales_messages")]);
      const report=reviewOutreachTasks(tasks,prospects,leads,suppressions,messages);
      const mapped=new Map(report.items.map(item=>[item.id,item]));
      const choices=input.taskIds.map(id=>mapped.get(id));
      if(choices.some(item=>!item))return res.status(409).json({error:"Some tasks are not open or no longer exist"});
      const eligible=new Set(["duplicate_candidate","closed_contact","suppressed_contact","superseded_by_reply"]);
      const blocked=choices.filter(item=>!eligible.has(item!.category));
      if(blocked.length)return res.status(409).json({error:"Some tasks need manual action rather than dismissal",blocked});
      if(!input.dryRun){
        for(const row of choices){
          const task=tasks.find(t=>t.id===row!.id);
          const result=checked(await db.from("sales_tasks").update({status:"dismissed",
            notes:[task?.notes||"","Operator reviewed as "+row!.category+" on "+new Date().toISOString()].filter(Boolean).join("\n"),
            updated_at:new Date().toISOString()}).eq("id",row!.id).eq("status","open").select("id"));
          if(!result.data?.length)throw new Error("TASK_CHANGED_DURING_REVIEW");
          if(row!.prospectId)checked(await db.from("outreach_evidence_audit").insert({
            prospect_id:row!.prospectId,actor_id:req.user.id,event_type:"task_reviewed",
            previous_record:{taskId:row!.id,status:"open"},
            new_record:{status:"dismissed",reason:row!.category}}));
        }
      }
      return res.json({dryRun:input.dryRun,reviewed:choices,mutated:input.dryRun?0:choices.length});
    }catch(e){return replyError(res,e,"task reconciliation");}
  });
  app.post("/api/admin/outreach-completion/experiments",...gate,async (req:any,res:Response)=>{
    const input=requestPayload(experimentSchema,req.body,res);
    if(!input)return;
    if(JSON.stringify(input.variantA)===JSON.stringify(input.variantB))
      return res.status(400).json({error:"Experiment variants must differ"});
    try{
      const value={name:input.name,hypothesis:input.hypothesis,segment:input.segment,
        primary_metric:input.primaryMetric,variant_a:input.variantA,variant_b:input.variantB,
        status:"draft",created_by:req.user.id};
      const row=checked(await db.from("outreach_experiments").insert(value).select("*").single()).data;
      return res.status(201).json({experiment:row,
        note:"Draft saved only. Assignments are for measurement; no message is queued or sent."});
    }catch(e){return replyError(res,e,"experiment creation");}
  });
  app.post("/api/admin/outreach-completion/experiments/:id/assign",...gate,async (req:any,res:Response)=>{
    const id=requestPayload(oneId,req.params.id,res);
    const body=requestPayload(z.object({prospectIds:z.array(oneId).min(1).max(100)}),req.body,res);
    if(!id||!body)return;
    try{
      const exp=await ensureExists(db,"outreach_experiments",id,"id,status");
      if(!["draft","paused"].includes(exp.status))return res.status(409).json({error:"Assignment changes require a draft or paused experiment"});
      const rows=[];
      for(const prospectId of new Set(body.prospectIds)){
        await ensureExists(db,"prospects",prospectId);
        const {data:existing,error}=await db.from("outreach_experiment_assignments").select("variant")
          .eq("experiment_id",id).eq("prospect_id",prospectId).maybeSingle();
        if(error)throw error;
        const variant=existing?.variant||deterministicVariant(id,prospectId);
        if(!existing)checked(await db.from("outreach_experiment_assignments").insert({experiment_id:id,prospect_id:prospectId,variant,assigned_by:req.user.id}));
        rows.push({prospectId,variant});
      }
      return res.json({assigned:rows,note:"No automatic outreach, enrolment or provider request occurred."});
    }catch(e){return replyError(res,e,"experiment assignment");}
  });
  app.post("/api/admin/outreach-completion/attribution",...gate,async (req:any,res:Response)=>{
    const input=requestPayload(manualAttribution,req.body,res);
    if(!input)return;
    if(!timestampOk(input.occurredAt))return res.status(400).json({error:"The event date cannot be in the future"});
    try{
      if(input.prospectId)await ensureExists(db,"prospects",input.prospectId);
      if(input.leadId)await ensureExists(db,"leads",input.leadId);
      if(input.proposalId){const p=await ensureExists(db,"proposals",input.proposalId,"id,prospect_id,lead_id");
        if((input.prospectId&&p.prospect_id!==input.prospectId)||(input.leadId&&p.lead_id!==input.leadId))
          return res.status(409).json({error:"Proposal does not match the contact"});}
      if(input.businessId)await ensureExists(db,"businesses",input.businessId);
      const value={prospect_id:input.prospectId||null,lead_id:input.leadId||null,business_id:input.businessId||null,
        proposal_id:input.proposalId||null,message_id:input.messageId||null,event_type:input.eventType,
        occurred_at:input.occurredAt,amount:input.amount??null,currency:input.currency??null,
        evidence_url:input.evidenceUrl??null,notes:input.notes,provider_verified:false,
        verification_source:"manual",created_by:req.user.id};
      const event=checked(await db.from("outreach_attribution_events").insert(value).select("*").single()).data;
      return res.status(201).json({event,note:"Manually attested milestone; not a verified payment."});
    }catch(e){return replyError(res,e,"attribution");}
  });
  app.post("/api/admin/outreach-completion/reconcile-stripe-invoice",...gate,async (req:any,res:Response)=>{
    const input=requestPayload(paymentReconcile,req.body,res);
    if(!input)return;
    try{
      const prospect=await ensureExists(db,"prospects",input.prospectId,"id,converted_business_id");
      if(!prospect.converted_business_id)return res.status(409).json({error:"Prospect has no confirmed converted business"});
      const business=await ensureExists(db,"businesses",prospect.converted_business_id,"id,stripe_customer_id");
      if(!business.stripe_customer_id)return res.status(409).json({error:"Converted business has no verified Stripe customer ID"});
      const stripe=await getStripe();
      const invoice=await stripe.invoices.retrieve(input.invoiceId);
      const customerId=typeof invoice.customer==="string"?invoice.customer:invoice.customer?.id;
      if(invoice.status!=="paid"||!customerId||customerId!==business.stripe_customer_id)
        return res.status(409).json({error:"Paid Stripe invoice does not match the converted business"});
      const sourceKey="stripe:invoice:"+invoice.id;
      const {data:existing,error:lookupError}=await db.from("outreach_attribution_events").select("id").eq("source_event_key",sourceKey).maybeSingle();
      if(lookupError)throw lookupError;
      if(existing)return res.json({alreadyRecorded:true,id:existing.id});
      const amount=Math.round(Number(invoice.amount_paid||0))/100;
      const currency=String(invoice.currency||"").toUpperCase();
      const event=checked(await db.from("outreach_attribution_events").insert({
        prospect_id:prospect.id,business_id:business.id,event_type:"payment_verified",occurred_at:new Date(Number(invoice.status_transitions?.paid_at||invoice.created)*1000).toISOString(),
        amount,currency,provider_verified:true,verification_source:"stripe",source_event_key:sourceKey,
        notes:"Stripe invoice retrieved and matched to converted business customer ID.",created_by:req.user.id,
      }).select("*").single()).data;
      return res.json({event,verified:true});
    }catch(e){return replyError(res,e,"Stripe reconciliation");}
  });
  // Explicit experiment activation never queues mail. Both variants require at least one assigned prospect.
  app.post("/api/admin/outreach-completion/experiments/:id/state",...gate,async(req:any,res:Response)=>{
    const id=requestPayload(oneId,req.params.id,res);
    const input=requestPayload(z.object({status:z.enum(["active","paused","completed"])}),req.body,res);
    if(!id||!input)return;
    try{
      const experiment=await ensureExists(db,"outreach_experiments",id,"*");
      const allowed:Record<string,string[]>={draft:["active","paused"],paused:["active","completed"],active:["paused","completed"],completed:[]};
      if(!allowed[experiment.status]?.includes(input.status))
        return res.status(409).json({error:"Experiment cannot transition to that state"});
      if(input.status==="active"){
        const {data:assigned,error}=await db.from("outreach_experiment_assignments")
          .select("variant").eq("experiment_id",id);
        if(error)throw error;
        const sides=new Set((assigned||[]).map((item:any)=>item.variant));
        if(!sides.has("A")||!sides.has("B"))return res.status(409).json({error:"Assign a prospect to both A and B before activation"});
      }
      const now=new Date().toISOString();
      const updated=checked(await db.from("outreach_experiments").update({status:input.status,updated_at:now,
        ...(input.status==="active"&&!experiment.started_at?{started_at:now}:{}),
        ...(input.status==="completed"?{completed_at:now}:{})})
        .eq("id",id).eq("status",experiment.status).select("*").single()).data;
      return res.json({experiment:updated,note:"No emails sent or queued. Manual send and permission evidence are always required."});
    }catch(e){return replyError(res,e,"experiment state");}
  });
  app.get("/api/admin/outreach-completion/experiments/:id/preview/:prospectId",...gate,async(req:any,res:Response)=>{
    const id=requestPayload(oneId,req.params.id,res);
    const prospectId=requestPayload(oneId,req.params.prospectId,res);
    if(!id||!prospectId)return;
    try{
      const [experiment,prospect]=await Promise.all([
        ensureExists(db,"outreach_experiments",id,"*"),
        ensureExists(db,"prospects",prospectId,"*"),
      ]);
      const {data:assigned,error}=await db.from("outreach_experiment_assignments")
        .select("variant").eq("experiment_id",id).eq("prospect_id",prospectId).maybeSingle();
      if(error)throw error;
      if(!assigned)return res.status(409).json({error:"Prospect is not assigned to this experiment"});
      const copy=prepareExperimentCopy(experiment,assigned.variant,prospect);
      const reason=salesEmailPermissionBlockReason(prospect,new Date());
      return res.json({copy,prospect:{id:prospect.id,name:prospect.name,contact_email:prospect.contact_email},
        permissionEligible:reason===null,permissionBlockReason:reason,
        note:"Copy preview only. Sending requires explicit operator confirmation and all send-time safety checks."});
    }catch(e){return replyError(res,e,"experiment preview");}
  });

}
