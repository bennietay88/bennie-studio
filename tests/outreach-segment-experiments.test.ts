import assert from "node:assert/strict";
import test from "node:test";
import { segmentIntroEvidenceError } from "../src/lib/outreachSegmentation.ts";
import { prepareExperimentCopy } from "../src/lib/outreachExperiments.ts";
import { buildOutreachReport, type OutreachDataset } from "../src/lib/outreachCompletion.ts";

const AT="2026-11-19T09:00:00Z";
const base={id:"p1",name:"Example Clinic",contact_email:"contact@example.com",
  website_status:"unknown",qualification_evidence:{}};
const verified={website_status:"no_website",website_evidence_source_url:"https://directory.example/clinic",
  website_verified_at:AT,website_verification_method:"manual site directory check",
  website_finding:"Checked the clinic's official directory and verified no standalone site",
  website_verified_by:"reviewer",website_evidence_confidence:"high"};
const evidence={verified:true,value:true,sourceUrl:"https://example.com/launch",
  verifiedAt:AT,method:"public launch announcement",observation:"The company officially launched this month"};
test("a missing domain alone never permits a no-site introductory email",()=>{
 const body="The business does not have a website. Would you like a quick overview?";
 assert.equal(segmentIntroEvidenceError("verified_no_site_intro",base,base.name,body),"OUTREACH_SEGMENT_OBSERVATION_REQUIRED");
 assert.equal(segmentIntroEvidenceError("verified_no_site_intro",{...base,website_status:"no_website"},
  "Confirmed no website", "Confirmed no website. We can help."),"OUTREACH_NO_SITE_EVIDENCE_REQUIRED");
});
test("verified website fact must exactly match the researched observation and appear in the email",()=>{
 const p={...base,...verified};
 const exact=verified.website_finding;
 assert.equal(segmentIntroEvidenceError("verified_no_site_intro",p,exact,exact+" — a concise suggestion."),null);
 assert.equal(segmentIntroEvidenceError("verified_no_site_intro",p,"An invented observation",
  "An invented observation, get a quote"),"OUTREACH_SEGMENT_FINDING_MISMATCH");
});
test("social, booking and recently launched segments require source-backed evidence",()=>{
 const note=evidence.observation;
 const body=note+" A useful website suggestion.";
 assert.equal(segmentIntroEvidenceError("recent_launch_intro",base,note,body),"OUTREACH_SEGMENT_EVIDENCE_REQUIRED");
 assert.equal(segmentIntroEvidenceError("recent_launch_intro",{...base,qualification_evidence:{recent_launch:evidence}},note,body),null);
});
test("experiment preview only renders active, preassigned exact variant",()=>{
 const exp={id:"e1",name:"New launch",status:"active",segment:"recently_launched",
   variant_a:{subject:"Hi {{business_name}}",body:"Hi {{first_name}}, {{specific_observation}}. This is our suggestion for you."},
   variant_b:{subject:"Hello {{business_name}}",body:"Hi there. {{specific_observation}}. Would you like to hear more?"}};
 const result=prepareExperimentCopy(exp,"A",{...base,qualification_evidence:{recent_launch:evidence}});
 assert.equal(result.variant,"A");
 assert.ok(result.body.includes(evidence.observation));
 assert.equal(result.subject,"Hi Example Clinic");
 assert.throws(()=>prepareExperimentCopy({...exp,status:"draft"},"A",base),/OUTREACH_EXPERIMENT_INACTIVE/);
 assert.throws(()=>prepareExperimentCopy({...exp,segment:"social_first"},"A",base),/OUTREACH_EXPERIMENT_OBSERVATION_MISSING|OUTREACH_SEGMENT_EVIDENCE_REQUIRED/);
});
test("acquisition costs are only actual ledger entries by currency and campaign",()=>{
 const d:OutreachDataset={prospects:[],messages:[],tasks:[],leads:[],bookings:[],proposals:[],businesses:[],
  attribution:[],experiments:[],assignments:[],costs:[
   {period_start:"2026-11-01",period_end:"2026-11-30",market:"MY",campaign_id:"A",
    source_type:"lead_research",amount:120,currency:"MYR",evidence_url:"https://example.com/receipt"},
   {period_start:"2026-11-01",period_end:"2026-11-30",market:"MY",campaign_id:"B",
    source_type:"email_provider",amount:15,currency:"USD",evidence_url:"https://example.com/receipt2"},
  ]};
 const report=buildOutreachReport(d);
 assert.deepEqual(report.metrics.acquisitionSpendByCurrency,{MYR:120,USD:15});
 assert.equal(report.metrics.acquisitionCostEntries,2);
 const filtered=buildOutreachReport(d,{campaign:"A",country:"MY"});
 assert.deepEqual(filtered.metrics.acquisitionSpendByCurrency,{MYR:120});
 const unsupported=buildOutreachReport(d,{industry:"dental"});
 assert.equal(unsupported.metrics.acquisitionCostEntries,0);
});
