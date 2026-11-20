import { segmentIntroEvidenceError } from "./outreachSegmentation.js";

export type ExperimentDraft = {id:string;name:string;status:string;segment:string;
  variant_a:{subject:string;body:string};variant_b:{subject:string;body:string}};
type Prospect = Record<string, any>;
const segmentMap:Record<string,string> = {
  no_website:"verified_no_site_intro",
  existing_site:"verified_existing_site_intro",
  social_first:"social_first_intro",
  recently_launched:"recent_launch_intro",
  booking_friction:"booking_friction_intro",
};
const sourceEvidence=(value:any)=>{
  const time=Date.parse(String(value?.verifiedAt||""));
  return value?.verified===true && value?.value===true && /^https?:\/\//.test(String(value?.sourceUrl||""))
    && Number.isFinite(time) && time<=Date.now() && String(value?.method||"").length>=5;
};
function observationFor(experiment:ExperimentDraft,p:Prospect):string {
  const kind=String(experiment.segment||"all");
  if(kind==="no_website"||kind==="existing_site")return String(p.website_finding||"").trim();
  const field=kind==="social_first"?"social_first":kind==="recently_launched"?"recent_launch":
    kind==="booking_friction"?"booking_friction":null;
  if(field){
    const evidence=p.qualification_evidence?.[field];
    if(!sourceEvidence(evidence))return "";
    return String(evidence.observation||evidence.description||"").trim();
  }
  // Generic campaigns can use a dated website finding, never a raw unverified CRM note.
  const time=Date.parse(String(p.website_verified_at||""));
  return p.website_evidence_source_url && Number.isFinite(time) && time<=Date.now()
    ? String(p.website_finding||"").trim():"";
}
const placeholders=new Set(["first_name","business_name","specific_observation"]);
function substitute(text:string,values:Record<string,string>):string{
  const invalid=Array.from(text.matchAll(/\{\{\s*([^{}]+)\s*\}\}/g)).some(match=>!placeholders.has(match[1].trim()));
  if(invalid)throw new Error("OUTREACH_EXPERIMENT_UNKNOWN_VARIABLE");
  const result=text.replace(/\{\{\s*(first_name|business_name|specific_observation)\s*\}\}/g,
    (_,name:string)=>values[name]||"").trim();
  if(/\{\{|\}\}/.test(result))throw new Error("OUTREACH_EXPERIMENT_UNRESOLVED_VARIABLE");
  return result;
}
export function prepareExperimentCopy(experiment:ExperimentDraft,variant:"A"|"B",p:Prospect){
  if(experiment.status!=="active")throw new Error("OUTREACH_EXPERIMENT_INACTIVE");
  const template=variant==="A"?experiment.variant_a:experiment.variant_b;
  if(!template?.subject||!template.body)throw new Error("OUTREACH_EXPERIMENT_INCOMPLETE");
  const observation=observationFor(experiment,p);
  const values={first_name:String(p.contact_name||p.name||"there").split(/\s+/)[0],
    business_name:String(p.name||""),specific_observation:observation};
  const subject=substitute(template.subject,values);
  const body=substitute(template.body,values);
  if(!subject||subject.length>160||body.length<20||body.length>10000)
    throw new Error("OUTREACH_EXPERIMENT_COPY_INVALID");
  if((template.subject+template.body).includes("{{specific_observation}}")&&observation.length<15)
    throw new Error("OUTREACH_EXPERIMENT_OBSERVATION_MISSING");
  const gate=segmentMap[String(experiment.segment||"").toLowerCase()];
  if(gate){
    const block=segmentIntroEvidenceError(gate,p,observation,body);
    if(block)throw new Error(block);
  }
  return {subject,body,observation,variant,experimentId:experiment.id,
    note:"This only prepares the exact assigned text. Sending still requires eligibility checks and explicit operator approval."};
}
