import assert from "node:assert/strict";
import test from "node:test";
import { buildOutreachReport, deterministicVariant, deliveryEvidence, eligibleProspectForContact,
  reviewOutreachTasks, isHumanReply, startOfWeek, type OutreachDataset } from "../src/lib/outreachCompletion.ts";
const when = "2026-11-20T08:00:00.000Z";
const p=(id:string, overrides:Record<string,any>={})=>({id,name:id,created_at:"2026-11-01T10:00:00Z",website_status:"unknown",
  status:"new",qualification_category:"tier_c",marketing_consent:false,...overrides});
const m=(id:string,overrides:Record<string,any>={})=>({id,prospect_id:"p1",direction:"outbound",channel:"email",
  created_at:"2026-11-03T10:00:00Z",sent_at:"2026-11-03T10:00:00Z",status:"sent",
  provider_name:"resend",delivery_state:"delivery_unconfirmed",provider_accepted_at:"2026-11-03T10:00:00Z",...overrides});
const data=(changes:Partial<OutreachDataset>={}):OutreachDataset=>({
  prospects:[p("p1"),p("p2")],messages:[],tasks:[],leads:[],bookings:[],proposals:[],
  businesses:[],attribution:[],experiments:[],assignments:[],...changes,
});
test("accepted does not imply confirmed delivery or inbox placement",()=>{
  assert.deepEqual(deliveryEvidence(m("one")),{accepted:true,confirmed:false,bounced:false,
    complained:false,unconfirmed:true,failed:false,uncertain:false});
  assert.equal(deliveryEvidence(m("two",{delivery_state:"delivery_confirmed"})).confirmed,true);
  assert.equal(deliveryEvidence(m("three",{delivery_state:"bounced"})).bounced,true);
  assert.equal(deliveryEvidence(m("four",{status:"sent",delivery_state:"unknown",provider_accepted_at:null})).accepted,false);
});
test("reply and auto-reply denominators remain separate and preserve unique contact count",()=>{
 const report=buildOutreachReport(data({messages:[
  m("s1"),m("s2",{delivery_state:"delivery_confirmed",delivery_confirmed_at:when}),
  m("auto",{direction:"inbound",classification:"automatic_reply",reply_to_message_id:"s1",sent_at:when}),
  m("answer",{direction:"inbound",classification:"interested",reply_to_message_id:"s2",sent_at:when}),
 ]}));
 assert.equal(report.metrics.sent,2);
 assert.equal(report.metrics.accepted,2);
 assert.equal(report.metrics.confirmedDelivery,1);
 assert.equal(report.metrics.unconfirmed,1);
 assert.equal(report.metrics.uniqueContacted,1);
 assert.equal(report.metrics.automaticReplies,1);
 assert.equal(report.metrics.humanReplies,1);
 assert.equal(report.metrics.linkedHumanReplyMessages,1);
 assert.equal(report.metrics.linkedHumanReplyRate,50);
 assert.equal(report.metrics.confirmedDeliveryRate,50);
 assert.ok(report.caveats.some(x=>x.includes("inbox placement")));
});
test("no unverifiable recipient qualifies for contact",()=>{
 assert.equal(eligibleProspectForContact(p("p1",{contact_email:"a@example.com"})),false);
 assert.equal(eligibleProspectForContact(p("p1",{marketing_consent:true,
  contact_email:"a@example.com",consent_email:"a@example.com",
  consent_timestamp:when,consent_source:"double optin by recipient",
  contact_jurisdiction:"MY",contact_recipient_type:"business",contact_lawful_basis:"consent"})),true);
});
test("task review is read-only, recognizes duplicate and suppressed records",()=>{
 const tasks=[
  {id:"t1",status:"open",task_type:"follow_up",prospect_id:"p1",title:"Follow up",due_at:"2026-11-01T10:00:00Z"},
  {id:"t2",status:"open",task_type:"follow_up",prospect_id:"p1",title:"Follow up",due_at:"2026-11-01T10:00:00Z"},
  {id:"t3",status:"open",task_type:"reply_reconciliation",prospect_id:"p2",title:"Review reply",due_at:when},
 ];
 const before=JSON.stringify(tasks);
 const report=reviewOutreachTasks(tasks,[p("p1"),p("p2")],[],[],[],new Date(when));
 assert.equal(report.summary.open,3);
 assert.equal(report.summary.byCategory.duplicate_candidate,1);
 assert.equal(report.summary.byCategory.reply_review,1);
 assert.equal(report.summary.overdue,3);
 assert.equal(JSON.stringify(tasks),before);
 assert.equal(report.items[0].id,"t3");
});
test("suppressed prospects take precedence over task duplicate status",()=>{
 const report=reviewOutreachTasks([{id:"t",status:"open",task_type:"follow_up",prospect_id:"p1",title:"Follow up"}],
 [p("p1",{contact_email:"x@example.com"})],[],[{email:"X@example.com"}],[],new Date(when));
 assert.equal(report.items[0].category,"suppressed_contact");
});
test("experiments use stable, isolated deterministic assignments and do not send",()=>{
 const ids=Array.from({length:50},(_,i)=>"prospect-"+i);
 const variants=ids.map(id=>deterministicVariant("experiment-one",id));
 assert.ok(variants.includes("A")&&variants.includes("B"));
 assert.deepEqual(variants,ids.map(id=>deterministicVariant("experiment-one",id)));
});
test("financial totals are verified-only and kept separate by currency",()=>{
 const report=buildOutreachReport(data({attribution:[
  {id:"manual",prospect_id:"p1",event_type:"customer_won",amount:9000,currency:"USD",provider_verified:false,occurred_at:when},
  {id:"one",prospect_id:"p1",event_type:"payment_verified",amount:199,currency:"USD",provider_verified:true,occurred_at:when},
  {id:"two",prospect_id:"p2",event_type:"payment_verified",amount:499,currency:"MYR",provider_verified:true,occurred_at:when},
 ]}));
 assert.equal(report.metrics.paymentVerified,2);
 assert.deepEqual(report.metrics.verifiedRevenueByCurrency,{USD:199,MYR:499});
});
test("week start is UTC Monday and human replies exclude auto notices",()=>{
 assert.equal(startOfWeek("2026-11-20T09:00:00Z"),"2026-11-16");
 assert.equal(isHumanReply({direction:"inbound",classification:"automatic_reply"}),false);
 assert.equal(isHumanReply({direction:"inbound",classification:"interested"}),true);
});
test("experiment reports do not invent statistically significant winners",()=>{
 const report=buildOutreachReport(data({experiments:[{id:"e1",name:"Subject A/B",status:"draft"}],
  assignments:[{experiment_id:"e1",prospect_id:"p1",variant:"A"}]}));
 assert.equal(report.experiments.length,1);
 assert.equal(report.experiments[0].variants[0].assigned,1);
 assert.match(report.experiments[0].note,/no statistically significant winner/i);
});


test("template breakdown includes legacy follow-up stage, failed, uncertain and linked positive replies",()=>{
 const report=buildOutreachReport(data({messages:[
  m("s1",{provider_payload:{followUpStage:"FOLLOW_UP_1_OF_3"}}),
  m("f1",{provider_payload:{followUpStage:"FOLLOW_UP_1_OF_3"},status:"failed",delivery_state:"uncertain",sent_at:null,provider_accepted_at:null}),
  m("answer",{direction:"inbound",classification:"interested",reply_to_message_id:"s1",sent_at:when}),
 ]}),{template:"FOLLOW_UP_1_OF_3"});
 const row=report.breakdowns.template[0];
 assert.equal(row.key,"FOLLOW_UP_1_OF_3");
 assert.equal(row.sent,1); assert.equal(row.failed,1); assert.equal(row.uncertain,1); assert.equal(row.positive,1);
});
