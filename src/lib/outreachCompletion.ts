/**
 * Bennie Studio outreach reporting and task-review calculations.
 * Pure, evidence-first helpers: no provider calls, sends, or database writes.
 */
export type OutreachRow = Record<string, any>;
export type OutreachFilters = {
  from?: string; to?: string; country?: string; industry?: string;
  tier?: string; websiteStatus?: string; provider?: string;
  template?: string; campaign?: string; segment?: string;
};
export type OutreachDataset = {
  prospects: OutreachRow[];
  messages: OutreachRow[];
  tasks: OutreachRow[];
  leads: OutreachRow[];
  bookings: OutreachRow[];
  proposals: OutreachRow[];
  businesses: OutreachRow[];
  attribution: OutreachRow[];
  experiments: OutreachRow[];
  assignments: OutreachRow[];
  costs?: OutreachRow[];
};
const CLOSED = new Set(["won","lost","closed","converted","paid","unsubscribed","invalid","suppressed"]);
const HUMAN = new Set(["interested","question","objection","not_interested","not_now","unsubscribe"]);
const AUTO = new Set(["automatic_reply","delivery_notification"]);
const asText = (value: unknown) => String(value ?? "").trim();
const lower = (value: unknown) => asText(value).toLowerCase();
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const isoTime = (value: unknown) => value ? new Date(String(value)).getTime() : NaN;
const inside = (value: unknown, from?: string, to?: string) => {
  if (!from && !to) return true;
  const time = isoTime(value);
  if (!Number.isFinite(time)) return false;
  return (!from || time >= Date.parse(from)) && (!to || time <= Date.parse(to));
};
const day = (value: unknown) => {
  const t = isoTime(value); return Number.isFinite(t) ? new Date(t).toISOString().slice(0,10) : "unknown";
};
export function startOfWeek(value: unknown) {
  const t = isoTime(value);
  if (!Number.isFinite(t)) return "unknown";
  const date = new Date(t);
  date.setUTCHours(0,0,0,0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0,10);
}
const pct = (a: number, b: number) => b ? Math.round(a / b * 1000) / 10 : null;
export function isHumanReply(message: OutreachRow) {
  return lower(message.direction) === "inbound" && HUMAN.has(lower(message.classification));
}
export function isAutomaticReply(message: OutreachRow) {
  return lower(message.direction) === "inbound" && AUTO.has(lower(message.classification));
}
export function deliveryEvidence(message: OutreachRow) {
  const state = lower(message.delivery_state);
  const confirmed = Boolean(message.delivery_confirmed_at) || state === "delivery_confirmed";
  const accepted = Boolean(message.provider_accepted_at) || confirmed
    || ["provider_accepted","delivery_unconfirmed","bounced","complained","rejected"].includes(state);
  const bounced = ["bounced","complained","rejected"].includes(state)
    || ["bounced","complained"].includes(lower(message.status));
  const complained = state === "complained" || lower(message.status) === "complained";
  const unconfirmed = accepted && !confirmed && !bounced;
  return { confirmed, accepted, bounced, complained, unconfirmed,
    failed: lower(message.status) === "failed" || state === "failed",
    uncertain: state === "uncertain" };
}
export function eligibleProspectForContact(p: OutreachRow) {
  if (CLOSED.has(lower(p.status)) || CLOSED.has(lower(p.outreach_status))) return false;
  if (p.marketing_consent !== true || !p.consent_email || lower(p.consent_email) !== lower(p.contact_email)) return false;
  if (!p.consent_timestamp || !asText(p.consent_source)) return false;
  if (!["US","GB","SG","MY"].includes(asText(p.contact_jurisdiction).toUpperCase())) return false;
  if (!["business","individual"].includes(lower(p.contact_recipient_type))) return false;
  return lower(p.contact_lawful_basis) === "consent";
}
function breakdown(messages: OutreachRow[], key: (message: OutreachRow) => string,
  humanReplyMessageIds: Set<string>, max = 30) {
  const groups = new Map<string, {key:string; sent:number; accepted:number; delivered:number; unconfirmed:number; bounced:number; replied:number; positive:number}>();
  for (const message of messages) {
    const label = key(message) || "Unknown";
    const existing = groups.get(label) || {key:label,sent:0,accepted:0,delivered:0,unconfirmed:0,bounced:0,replied:0,positive:0};
    const state = deliveryEvidence(message);
    if (message.sent_at) existing.sent++;
    if (state.accepted) existing.accepted++;
    if (state.confirmed) existing.delivered++;
    if (state.unconfirmed) existing.unconfirmed++;
    if (state.bounced) existing.bounced++;
    if (humanReplyMessageIds.has(asText(message.id))) existing.replied++;
    groups.set(label,existing);
  }
  return Array.from(groups.values()).sort((a,b)=>b.sent-a.sent).slice(0,max)
    .map(v=>({...v,replyRate:pct(v.replied,v.sent),confirmedDeliveryRate:pct(v.delivered,v.accepted)}));
}
/** No single inbox or provider event is ever used as proof of a sale. */
export function buildOutreachReport(data: OutreachDataset, filters: OutreachFilters = {}) {
  const byProspect = new Map(data.prospects.map(p=>[asText(p.id),p]));
  const byBusiness = new Map(data.businesses.map(b=>[asText(b.id),b]));
  const pMatch=(p:OutreachRow)=>{
    if(filters.country && asText(p.contact_jurisdiction).toUpperCase()!==filters.country.toUpperCase())return false;
    if(filters.industry && !lower(p.industry).includes(filters.industry.toLowerCase()))return false;
    if(filters.tier && lower(p.qualification_category)!==filters.tier.toLowerCase())return false;
    if(filters.websiteStatus && lower(p.website_status)!==filters.websiteStatus.toLowerCase())return false;
    if(filters.segment && !lower(p.tags?.join?.(",")||p.website_status).includes(filters.segment.toLowerCase()))return false;
    return true;
  };
  const hasProspectFilter=Boolean(filters.country||filters.industry||filters.tier||filters.websiteStatus||filters.segment);
  const prospects=data.prospects.filter(p=>pMatch(p)&&inside(p.created_at,filters.from,filters.to));
  const matchingIds=new Set(data.prospects.filter(pMatch).map(p=>asText(p.id)));
  const outbound=data.messages.filter(m=>lower(m.direction)==="outbound"&&lower(m.channel)==="email"
    &&inside(m.sent_at||m.attempted_at||m.created_at,filters.from,filters.to)
    &&(!hasProspectFilter||matchingIds.has(asText(m.prospect_id)))
    &&(!filters.provider||lower(m.provider_name)===filters.provider.toLowerCase())
    &&(!filters.template||lower(m.provider_payload?.templateId)===filters.template.toLowerCase())
    &&(!filters.campaign||lower(m.campaign_id)===filters.campaign.toLowerCase()));
  const sentIds=new Set(outbound.map(m=>asText(m.id)));
  const human=data.messages.filter(m=>isHumanReply(m)
    &&inside(m.sent_at||m.created_at,filters.from,filters.to)
    &&(!hasProspectFilter||matchingIds.has(asText(m.prospect_id))));
  const automatic=data.messages.filter(m=>isAutomaticReply(m)
    &&inside(m.sent_at||m.created_at,filters.from,filters.to)
    &&(!hasProspectFilter||matchingIds.has(asText(m.prospect_id))));
  const unmatched=data.messages.filter(m=>lower(m.direction)==="inbound" && !HUMAN.has(lower(m.classification))
    && !AUTO.has(lower(m.classification)) && inside(m.sent_at||m.created_at,filters.from,filters.to));
  const repliedIds=new Set(human.map(m=>asText(m.reply_to_message_id)).filter(id=>sentIds.has(id)));
  const positiveIds=new Set(human.filter(m=>lower(m.classification)==="interested")
    .map(m=>asText(m.reply_to_message_id)).filter(id=>sentIds.has(id)));
  const accepted=outbound.filter(m=>deliveryEvidence(m).accepted).length;
  const confirmed=outbound.filter(m=>deliveryEvidence(m).confirmed).length;
  const bounced=outbound.filter(m=>deliveryEvidence(m).bounced).length;
  const complaints=outbound.filter(m=>deliveryEvidence(m).complained).length;
  const unconfirmed=outbound.filter(m=>deliveryEvidence(m).unconfirmed).length;
  const booked=data.bookings.filter(b=>(!hasProspectFilter||matchingIds.has(asText(b.prospect_id)))&&inside(b.start_at,filters.from,filters.to)
    &&["booked","completed"].includes(lower(b.status)));
  const proposals=data.proposals.filter(p=>(!hasProspectFilter||matchingIds.has(asText(p.prospect_id)))&&inside(p.created_at,filters.from,filters.to));
  const converted=prospects.filter(p=>Boolean(p.converted_business_id));
  const verifiedPayments=data.attribution.filter(e=>e.event_type==="payment_verified"&&e.provider_verified===true
    &&(!hasProspectFilter||matchingIds.has(asText(e.prospect_id)))
    &&inside(e.occurred_at,filters.from,filters.to));
  const sums=new Map<string,number>();
  for(const e of verifiedPayments){const currency=asText(e.currency).toUpperCase()||"UNKNOWN";sums.set(currency,(sums.get(currency)||0)+number(e.amount));}
  // Spend is a verified manual ledger, not a fabricated acquisition cost or a currency-converted forecast.
  // Avoid cross-segment comparisons when the cost source has no compatible attribution dimension.
  const costCompatible = !(filters.industry||filters.tier||filters.websiteStatus||filters.segment||filters.provider||filters.template);
  const relevantCosts = costCompatible ? (data.costs||[]).filter(cost=>
    (!filters.country||asText(cost.market).toUpperCase()===filters.country.toUpperCase()) &&
    (!filters.campaign||asText(cost.campaign_id)===filters.campaign) &&
    (!filters.from||String(cost.period_end)>=filters.from.slice(0,10)) &&
    (!filters.to||String(cost.period_start)<=filters.to.slice(0,10))
  ):[];
  const costByCurrency=new Map<string,number>();
  const costByCampaign=new Map<string,{campaign:string;currency:string;spend:number;entries:number}>();
  for(const cost of relevantCosts){
    const currency=asText(cost.currency).toUpperCase();
    const amount=number(cost.amount);
    if(!/^[A-Z]{3}$/.test(currency)||amount<0)continue;
    costByCurrency.set(currency,(costByCurrency.get(currency)||0)+amount);
    const campaign=asText(cost.campaign_id)||"Unattributed cost";
    const key=campaign+"|"+currency;
    const existing=costByCampaign.get(key)||{campaign,currency,spend:0,entries:0};
    existing.spend+=amount;existing.entries++;
    costByCampaign.set(key,existing);
  }
  const taskReviews=reviewOutreachTasks(data.tasks, data.prospects, data.leads, [], data.messages);
  const emailProspects=new Set(outbound.filter(m=>m.sent_at&&m.prospect_id).map(m=>asText(m.prospect_id)));
  const humanProspects=new Set(human.map(m=>asText(m.prospect_id)).filter(Boolean));
  const paidProspects=new Set(verifiedPayments.map(m=>asText(m.prospect_id)).filter(Boolean));
  const provider=(m:OutreachRow)=>asText(m.provider_name)||"Unknown provider";
  const template=(m:OutreachRow)=>asText(m.provider_payload?.templateId)||"Unattributed template";
  const campaign=(m:OutreachRow)=>asText(m.campaign_id)||"No campaign";
  const segment=(m:OutreachRow)=>{const p=byProspect.get(asText(m.prospect_id));return asText(p?.website_status)||"Unknown";};
  const scope=(m:OutreachRow)=>byProspect.get(asText(m.prospect_id))||{};
  const trends=breakdown(outbound, m=>startOfWeek(m.sent_at||m.created_at),repliedIds,104).sort((a,b)=>a.key.localeCompare(b.key));
  // Attach separately grounded commercial milestones by actual cohort dates.
  const cohorts=trends.map(w=>({ ...w,
    meetings:booked.filter(b=>startOfWeek(b.start_at)===w.key).length,
    proposals:proposals.filter(p=>startOfWeek(p.created_at)===w.key).length,
    verifiedPayments:verifiedPayments.filter(e=>startOfWeek(e.occurred_at)===w.key).length,
  }));
  const byExperiment=data.experiments.map(exp=>{
    const assignments=data.assignments.filter(a=>a.experiment_id===exp.id);
    const variant=(name:string)=>{
      const members=new Set(assignments.filter(a=>a.variant===name).map(a=>asText(a.prospect_id)));
      const items=outbound.filter(m=>m.outreach_experiment_id===exp.id&&m.outreach_experiment_variant===name&&members.has(asText(m.prospect_id)));
      const ids=new Set(items.map(m=>asText(m.id)));const responses=human.filter(m=>ids.has(asText(m.reply_to_message_id)));
      return {variant:name,assigned:members.size,sent:items.filter(m=>m.sent_at).length,
        humanReplies:responses.length,positiveReplies:responses.filter(m=>m.classification==="interested").length,
        replyRate:pct(new Set(responses.map(m=>m.reply_to_message_id)).size,items.filter(m=>m.sent_at).length)};
    };
    return {id:exp.id,name:exp.name,status:exp.status,segment:exp.segment,variants:[variant("A"),variant("B")],
      note:"Descriptive only. Assignment is deterministic; no statistically significant winner is asserted."};
  });
  return {
    generatedAt:new Date().toISOString(),filters,
    scope:{prospectRecords:prospects.length,messageRecords:outbound.length,attributionRecords:verifiedPayments.length},
    metrics:{prospects:prospects.length,verifiedWebsite:prospects.filter(p=>Boolean(p.website_verified_at)).length,
      scoredV2:prospects.filter(p=>p.qualification_score_version==="v2").length,
      tierA:prospects.filter(p=>p.qualification_category==="tier_a").length,
      tierB:prospects.filter(p=>p.qualification_category==="tier_b").length,
      tierC:prospects.filter(p=>p.qualification_category==="tier_c").length,
      contactEligible:prospects.filter(eligibleProspectForContact).length,
      sent:outbound.filter(m=>m.sent_at).length,uniqueContacted:emailProspects.size,
      accepted,confirmedDelivery:confirmed,unconfirmed,bounced,complaints,
      failed:outbound.filter(m=>deliveryEvidence(m).failed).length,
      humanReplies:human.length,automaticReplies:automatic.length,unclassifiedReplies:unmatched.length,
      linkedHumanReplyMessages:repliedIds.size,positiveReplyMessages:positiveIds.size,
      confirmedDeliveryRate:pct(confirmed,accepted),linkedHumanReplyRate:pct(repliedIds.size,outbound.filter(m=>m.sent_at).length),
      bookedConsultations:booked.length,proposals:proposals.length,convertedBusinesses:converted.length,
      paymentVerified:verifiedPayments.length,verifiedRevenueByCurrency:Object.fromEntries(sums),
      acquisitionSpendByCurrency:Object.fromEntries(costByCurrency),acquisitionCostEntries:relevantCosts.length,
      openTasks:taskReviews.summary.open,overdueTasks:taskReviews.summary.overdue},
    funnel:[{stage:"Prospects",count:prospects.length},
      {stage:"Website verified",count:prospects.filter(p=>Boolean(p.website_verified_at)).length},
      {stage:"Contact eligible",count:prospects.filter(eligibleProspectForContact).length},
      {stage:"Unique contacted",count:emailProspects.size},
      {stage:"Human response linked",count:humanProspects.size},
      {stage:"Consultation recorded",count:new Set(booked.map(b=>asText(b.prospect_id||b.lead_id))).size},
      {stage:"Proposal recorded",count:new Set(proposals.map(p=>asText(p.prospect_id||p.lead_id))).size},
      {stage:"Converted business",count:converted.length},
      {stage:"Verified Stripe payment",count:paidProspects.size}],
    cohorts,
    breakdowns:{provider:breakdown(outbound,provider,repliedIds),
      country:breakdown(outbound,m=>asText(scope(m).contact_jurisdiction)||"Unknown",repliedIds),
      industry:breakdown(outbound,m=>asText(scope(m).industry)||"Unknown",repliedIds),
      tier:breakdown(outbound,m=>asText(scope(m).qualification_category)||"Unscored",repliedIds),
      website:breakdown(outbound,segment,repliedIds),
      template:breakdown(outbound,template,repliedIds),
      campaign:breakdown(outbound,campaign,repliedIds),
      stage:breakdown(outbound,m=>asText(m.provider_payload?.directStage||m.provider_payload?.followUpStage)||"Intro/unspecified",repliedIds),
    },experiments:byExperiment,campaignCosts:Array.from(costByCampaign.values()).sort((a,b)=>b.spend-a.spend),
    caveats:["Delivery confirmation means provider-supplied receiving-server acceptance, not inbox placement.",
      "Legacy messages without provider evidence are excluded from delivery-confirmation percentages.",
      "Unmatched inbound replies are not attributed to an outbound message.",
      "Conversions and Stripe-verified payments are separate commercial milestones; currencies are never combined.",
      "Daily and weekly cohorts classify activity by event date, not guaranteed causal conversion cohorts.",
      "Acquisition spend comes from operator-supplied evidence; CAC and ROI are N/A until customer-level source attribution is verified."],
  };
}
export type TaskReview = {id:string; title:string; dueAt:string|null; category:string; reason:string; priority:number; prospectId:string|null; taskType:string};
export function reviewOutreachTasks(
  tasks:OutreachRow[],prospects:OutreachRow[],leads:OutreachRow[],
  suppressions:OutreachRow[]=[],messages:OutreachRow[]=[],now=new Date(),
) {
  const prospectsById=new Map(prospects.map(p=>[asText(p.id),p]));
  const leadsById=new Map(leads.map(l=>[asText(l.id),l]));
  const suppressed=new Set(suppressions.map(s=>lower(s.email)).filter(Boolean));
  const replied=new Set(messages.filter(m=>isHumanReply(m)).map(m=>asText(m.prospect_id||m.lead_id)));
  const seen=new Set<string>();
  const list:TaskReview[]=[];
  const nowMs=now.getTime();
  for(const task of tasks.filter(t=>lower(t.status)==="open").sort((a,b)=>isoTime(a.due_at)-isoTime(b.due_at))){
    const prospect=prospectsById.get(asText(task.prospect_id));
    const lead=leadsById.get(asText(task.lead_id));
    const target=prospect||lead;
    const identity=asText(task.prospect_id||task.lead_id||task.proposal_id);
    const fingerprint=[identity,asText(task.task_type),day(task.due_at),asText(task.title).toLowerCase()].join("|");
    let category="actionable",reason="Open sales action; operator review needed.",priority=4;
    if(["reply","reply_reconciliation","reply_review"].includes(lower(task.task_type))){category="reply_review";reason="Reply or reconciliation takes priority over cold follow-ups.";priority=0;}
    else if(!identity){category="orphaned";reason="Task has no prospect, lead or proposal link.";priority=5;}
    else if(target&&CLOSED.has(lower(target.status))||target&&CLOSED.has(lower(target.outreach_status))){
      category="closed_contact";reason="Related contact was closed or opted out.";priority=5;
    }else if(target&&suppressed.has(lower(target.contact_email||target.email))){
      category="suppressed_contact";reason="Recipient appears on the suppression list.";priority=5;
    }else if(target&&replied.has(asText(target.id))&&lower(task.task_type)==="follow_up"){
      category="superseded_by_reply";reason="A human reply exists; cold follow-up needs review.";priority=2;
    }else if(seen.has(fingerprint)){
      category="duplicate_candidate";reason="Same target, action, due day and title as another open task.";priority=5;
    }else if(!target&&task.proposal_id){category="proposal_review";reason="Proposal task: check its latest state before action.";priority=2;}
    else if(!target){category="missing_contact";reason="Linked record is not present in the loaded snapshot.";priority=5;}
    else if(task.due_at&&isoTime(task.due_at)>nowMs){category="scheduled";reason="Scheduled for a future date.";priority=3;}
    seen.add(fingerprint);
    list.push({id:asText(task.id),title:asText(task.title),dueAt:task.due_at||null,category,reason,
      priority,prospectId:task.prospect_id||null,taskType:asText(task.task_type)});
  }
  list.sort((a,b)=>a.priority-b.priority||(isoTime(a.dueAt)||0)-(isoTime(b.dueAt)||0));
  const byCategory:Record<string,number>={};
  for(const row of list)byCategory[row.category]=(byCategory[row.category]||0)+1;
  return {summary:{open:list.length,overdue:list.filter(r=>r.dueAt&&isoTime(r.dueAt)<=nowMs).length,byCategory},items:list};
}
export function deterministicVariant(experimentId:string,prospectId:string):"A"|"B"{
  const text=experimentId+":"+prospectId;
  let hash=2166136261;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0)%2===0?"A":"B";
}
