/** Source-backed guard for segment-specific sales statements. Not a substitute for consent. */
export type ProspectSegmentInput = Record<string, any>;
export const SEGMENT_INTRO_IDS = [
  "verified_no_site_intro","verified_existing_site_intro","social_first_intro",
  "recent_launch_intro","booking_friction_intro",
] as const;
const isValidEvidence = (e:any,now=new Date()) => {
  const t=Date.parse(String(e?.verifiedAt||""));
  return e?.verified===true && e?.value===true && typeof e.sourceUrl==="string"
    && /^https?:\/\//i.test(e.sourceUrl) && String(e.method||"").trim().length>=5
    && Number.isFinite(t) && t<=now.getTime();
};
const hasWebsiteProof = (p:ProspectSegmentInput,now=new Date())=>{
  const t=Date.parse(String(p.website_verified_at||""));
  return Boolean(p.website_evidence_source_url && /^https?:\/\//i.test(p.website_evidence_source_url)
    && String(p.website_verification_method||"").trim().length>=5
    && String(p.website_finding||"").trim().length>=15
    && p.website_verified_by && p.website_evidence_confidence
    && Number.isFinite(t) && t<=now.getTime());
};
export function segmentIntroEvidenceError(
  templateId:string|undefined,
  prospect:ProspectSegmentInput,
  observation:string|undefined,
  body:string,
  now=new Date(),
):string|null {
  if(!SEGMENT_INTRO_IDS.includes(templateId as any)) return null;
  const text=String(observation||"").trim();
  if(text.length<15 || !body.includes(text))return "OUTREACH_SEGMENT_OBSERVATION_REQUIRED";
  const status=String(prospect.website_status||"").toLowerCase();
  if(templateId==="verified_no_site_intro") {
    if(status!=="no_website"||!hasWebsiteProof(prospect,now)
      ||prospect.website_evidence_confidence!=="high")return "OUTREACH_NO_SITE_EVIDENCE_REQUIRED";
    if(text!==String(prospect.website_finding||"").trim())return "OUTREACH_SEGMENT_FINDING_MISMATCH";
  }
  if(templateId==="verified_existing_site_intro") {
    if(!["weak","average","strong"].includes(status)||!hasWebsiteProof(prospect,now))
      return "OUTREACH_EXISTING_SITE_EVIDENCE_REQUIRED";
    if(text!==String(prospect.website_finding||"").trim())return "OUTREACH_SEGMENT_FINDING_MISMATCH";
  }
  const field=templateId==="social_first_intro"?"social_first"
    :templateId==="recent_launch_intro"?"recent_launch"
      :templateId==="booking_friction_intro"?"booking_friction":null;
  if(field && !isValidEvidence(prospect.qualification_evidence?.[field],now))
    return "OUTREACH_SEGMENT_EVIDENCE_REQUIRED";
  return null;
}
