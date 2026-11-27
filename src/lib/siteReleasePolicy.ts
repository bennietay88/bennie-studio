export interface SiteReviewState {
  revision: string;
  internalRevision: string | null;
  customerRevision: string | null;
}
export function releaseReviewBlockers(review: SiteReviewState): string[] {
  const blockers:string[]=[];
  if(!review.revision || review.internalRevision!==review.revision) blockers.push("Internal creative and responsive QA approval is required for the current revision.");
  if(!review.revision || review.customerRevision!==review.revision) blockers.push("Customer approval is required for the current revision.");
  return blockers;
}
export function releaseDomainBlockers(site:{custom_domain?:string|null;custom_domain_status?:string|null;custom_domain_verified_at?:string|null;custom_domain_permission_confirmed?:boolean;custom_domain_suspended?:boolean;ssl_status?:string|null}):string[]{
  return site.custom_domain && site.custom_domain_status==="connected" && site.custom_domain_verified_at && site.custom_domain_permission_confirmed===true && site.custom_domain_suspended===false && site.ssl_status==="issued" ? [] : ["A verified custom domain and issued SSL certificate are required."];
}
