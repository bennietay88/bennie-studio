import { supabase } from "./supabase";
import type { PortfolioSite } from "./websitePortfolio";
import type { WebsiteCapacity } from "./websiteEntitlements";

export interface PortfolioResponse {
  businessId: string;
  sites: PortfolioSite[];
  capacity: WebsiteCapacity;
  lifecycleEnabled: boolean;
}
export type SiteAction = "create" | "duplicate" | "rename" | "archive" | "restore";
export interface WebsiteAllowance {
  slug: string;
  name: string;
  project_limit: number | null;
  website_limit: number;
  is_active: boolean;
}
export async function portfolioRequest<T>(path:string, init:RequestInit = {}):Promise<T> {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error("Please sign in again.");
  const res=await fetch(path,{...init,cache:"no-store",headers:{
    "Content-Type":"application/json",Authorization:"Bearer "+session.access_token,
  }});
  const payload=await res.json().catch(()=>null);
  if(!res.ok||!payload)throw new Error(typeof payload?.error==="string"?payload.error:"Website management is unavailable.");
  return payload as T;
}
export const getWebsitePortfolio=()=>portfolioRequest<PortfolioResponse>("/api/account/websites");
export const changeWebsite=(action:SiteAction,siteId?:string,name?:string)=>
  portfolioRequest<{siteId:string}>("/api/account/websites",{method:"POST",body:JSON.stringify({action,siteId,name})});
export const getWebsiteAllowances=()=>portfolioRequest<{plans:WebsiteAllowance[]}>("/api/admin/website-allowances");
export const saveWebsiteAllowance=(slug:string,websiteLimit:number)=>
  portfolioRequest<{plan:Pick<WebsiteAllowance,"slug"|"website_limit"|"project_limit">}>("/api/admin/website-allowances/"+encodeURIComponent(slug),{method:"PATCH",body:JSON.stringify({websiteLimit})});
