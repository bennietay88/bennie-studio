// Feature visibility is not an authorization substitute. The owner bypass
// is available only for the actual active owner, never a staff/client persona.
export function hasInternalOwnerAccess(profile:any,business:any):boolean{
 return Boolean(profile?.uid&&profile.role==="business_admin"&&profile.status==="active"&&business?.id===profile.businessId&&business.owner_id===profile.uid&&business.internal_access_mode==="owner"&&business.status==="active");
}
