import test from "node:test";
import assert from "node:assert/strict";
import {verifiedProposalTerms,checkoutFailureCategory,proposalIsPaid,COMMERCIAL_PILOTS} from "../src/lib/commercialExecution";
import {proposalCharge,proposalCanShare,quoteSignature,approvedPilot,proposalPaymentMatches,nextPilotStage} from "../server/commercialProposal";
const secret="fixture-secret";
const base={id:"quote-1",lead_id:"lead",business_id:null,title:"Sprint",package_name:"Conversion Sprint",value:0,amount:0,setup_fee:199,expires_at:"2099-12-31",scope:["agreed"],outcome:"review",status:"Sent",config:{currency:"USD",commitmentMonths:0,pilotId:"conversion-sprint",billing:"one_time",scopeNotes:"Reviewed access and scope"}};
test("pilot approval binds the exact commercial quote",()=>{
 const approved={...base,config:{...base.config,approvalState:"approved",approvalSignature:quoteSignature(base,secret)}};
 assert.equal(approvedPilot(approved,secret),true);
 assert.equal(proposalCanShare(approved,secret),true);
 assert.equal(proposalCanShare({...approved,setup_fee:200},secret),false);
 assert.equal(proposalCanShare({...approved,status:"Draft"},secret),false);
 assert.equal(proposalCanShare(base,secret),false);
});
test("one-time and recurring pilot charges never overlap",()=>{
 assert.deepEqual(proposalCharge(base),{currency:"usd",monthlyMinor:0,setupMinor:19900,term:0});
 assert.equal(proposalCharge({...base,value:49}),null);
 const care={...base,value:49,amount:49,setup_fee:0,config:{...base.config,pilotId:"website-care",billing:"monthly"}};
 assert.equal(proposalCharge(care)?.monthlyMinor,4900);
 assert.equal(proposalCharge({...care,setup_fee:20}),null);
});
test("payment requires matching amount, currency, mode and paid status",()=>{
 const session={payment_status:"paid",status:"complete",currency:"usd",amount_total:19900,mode:"payment",metadata:{proposalId:base.id}};
 assert.equal(proposalPaymentMatches(base,session),true);
 for(const patch of [{payment_status:"unpaid"},{amount_total:19800},{currency:"gbp"},{mode:"subscription"},{metadata:{proposalId:"other"}}])assert.equal(proposalPaymentMatches(base,{...session,...patch}),false);
});
test("service fulfilment cannot skip QA or proceed without recorded payment",()=>{
 assert.equal(nextPilotStage(base,"access_confirmed"),false);
 const paid={...base,config:{...base.config,payment:{paidAt:"now",stripeSessionId:"cs_test"}}};
 assert.equal(nextPilotStage(paid,"access_confirmed"),true);
 assert.equal(nextPilotStage(paid,"delivered"),false);
 assert.equal(nextPilotStage({...paid,config:{...paid.config,fulfilment:{stage:"delivered"}}},"maintenance"),false);
 assert.equal(proposalIsPaid(paid.config),true);
});
test("verified catalogue price and bounded diagnostics",()=>{
 const price={market:"INTL",currency:"USD",monthlyPrice:59,setupFee:99,annualPrice:null,monthlyConfigured:true,recurringConfigStatus:"live",minimumTermMonths:0} as const;
 assert.equal(verifiedProposalTerms(price)?.dueToday,158);
 assert.equal(verifiedProposalTerms({...price,recurringConfigStatus:"draft"}),null);
 assert.equal(checkoutFailureCategory(429),"rate_limited");
 assert.equal(COMMERCIAL_PILOTS.length,3);
});
