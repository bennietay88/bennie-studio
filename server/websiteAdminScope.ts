// Super administrators may operate an explicitly selected site. Never infer
// an administrator's tenant from their own profile or client-provided role.
export async function resolveSiteBusiness(db:any,profile:any,siteId:string):Promise<string|null>{
 if(profile?.status!=="active")return null;
 if(profile.role==="business_admin")return profile.business_id||null;
 if(profile.role!=="super_admin")return null;
 const {data,error}=await db.from("websites").select("business_id").eq("id",siteId).eq("is_internal_pilot",false).maybeSingle();
 if(error)throw error;return data?.business_id||null;
}
