export const SECONDARY_SITE_ROUTE_FIELDS="id,business_id,custom_domain,status,is_primary,archived_at,is_internal_pilot,custom_domain_status,custom_domain_verified_at,custom_domain_permission_confirmed,custom_domain_suspended,ssl_status";
export type SecondaryRouteRow={id:string;business_id:string;custom_domain:string;status:string;is_primary:boolean;archived_at?:string|null;is_internal_pilot:boolean;custom_domain_status:string;custom_domain_verified_at?:string|null;custom_domain_permission_confirmed:boolean;custom_domain_suspended:boolean;ssl_status:string};
export function secondaryDomainFailure(site:SecondaryRouteRow,host:string):{status:number;code:string;message:string}|null {
  const failure=(status:number,code:string)=>({status,code,message:"This website is not available."});
  if(site.custom_domain!==host||site.is_primary||site.is_internal_pilot||site.archived_at)return failure(404,"DOMAIN_NOT_FOUND");
  if(site.custom_domain_suspended||!site.custom_domain_permission_confirmed)return failure(403,"DOMAIN_UNAVAILABLE");
  if(site.status!=="published")return failure(404,"WEBSITE_NOT_PUBLISHED");
  if(site.custom_domain_status!=="connected"||!site.custom_domain_verified_at)return failure(409,"DOMAIN_NOT_VERIFIED");
  if(site.ssl_status!=="issued")return failure(409,"SSL_PENDING");
  return null;
}
