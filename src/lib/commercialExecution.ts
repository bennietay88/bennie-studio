import type { CommercialPrice } from "./commercialPricing.js";
export const SALES_PRODUCT_SLUGS=["personal-profile","managed-website","website-growth","growth-partner"] as const;
export type SalesProductSlug=typeof SALES_PRODUCT_SLUGS[number];
export const COMMERCIAL_PILOTS=[
 {id:"conversion-sprint",name:"Conversion Sprint",billing:"one_time",suggestedUsd:199,scope:["One existing website, up to three priority pages","Mobile enquiry path, calls to action and trust review","One agreed implementation pass and QA"],exclusions:"No full redesign, paid ads, guaranteed conversions or unsupported platform changes.",gate:"Approve scope, one-time checkout, verified payment and manual fulfilment."},
 {id:"website-care",name:"Existing Website Care",billing:"monthly",suggestedUsd:49,scope:["Compatibility and access assessment","Backups, uptime and security checks for supported sites","One small scoped update per month"],exclusions:"No emergency restoration, third-party licence charges or unlimited support.",gate:"Approve platform compatibility, support SLA, recurring billing and cancellation handling."},
 {id:"agency-partner",name:"Agency delivery partnership",billing:"quote",suggestedUsd:null,scope:["Review partner's client requirements","Confirm multi-site and white-label delivery scope","Agree ownership, support and commercial terms"],exclusions:"No automatic commissions, payouts or white-label commitments.",gate:"Approve partner agreement, margins and account access."}
] as const;
export const INDUSTRY_SOLUTIONS=[
 {id:"contractor",name:"Contractor Growth System",description:"Project proof, service areas, quotation and enquiry paths.",href:"/renovation-contractor-website-design",product:"website-growth"},
 {id:"clinic",name:"Clinic Appointment System",description:"Treatment information, practitioner profiles and appointment enquiries; no diagnosis or promised patient volume.",href:"/clinic-website-design",product:"website-growth"},
 {id:"professional",name:"Professional Services Growth System",description:"Expertise, trust, consultation and qualified enquiries.",href:"/professional-services-website-design",product:"website-growth"},
 {id:"automotive",name:"Automotive Enquiry System",description:"Service menus, vehicle details and detailing enquiries.",href:"/case-studies/showcase/auto-detailing",product:"managed-website"},
 {id:"multi-location",name:"Multi-location Business System",description:"Scope location pages, enquiry routing and multi-site management before quotation.",href:"/book-demo?product=growth-partner",product:"growth-partner"}
] as const;
export function isSalesProduct(value:unknown):value is SalesProductSlug{return SALES_PRODUCT_SLUGS.includes(value as SalesProductSlug);}
export function verifiedProposalTerms(price:CommercialPrice|null|undefined){
 if(!price||price.market!=="INTL"||price.currency!=="USD"||price.recurringConfigStatus!=="live"||price.monthlyConfigured!==true||price.monthlyPrice===null||!Number.isFinite(price.monthlyPrice)||price.monthlyPrice<=0||!Number.isFinite(price.setupFee)||price.setupFee<0) return null;
 const term=Number(price.minimumTermMonths??0);
 if(!Number.isInteger(term)||term<0)return null;
 return {monthly:price.monthlyPrice,setup:price.setupFee,term,currency:"USD" as const,dueToday:price.monthlyPrice+price.setupFee};
}
export function checkoutFailureCategory(status:number,code?:string){
 if(code==="STRIPE_CATALOG_MISMATCH")return "catalogue_mismatch";
 if(code==="PREVIEW_CHECKOUT_NOT_LIVE")return "plan_unavailable";
 if(status===403)return "preview_verification";
 if(status===409)return "terms_or_availability";
 if(status===429)return "rate_limited";
 if(status===400)return "validation";
 if(status===0)return "network";
 if(status>=500)return "server";
 return "other";
}
export function proposalIsPaid(config:any){return Boolean(config?.payment?.paidAt&&config?.payment?.stripeSessionId);}
export function proposalMoney(value:unknown,currency:unknown){const code=String(currency||"").toUpperCase();const amount=Number(value);return ["USD","GBP","SGD","MYR"].includes(code)&&Number.isFinite(amount)?new Intl.NumberFormat("en",{style:"currency",currency:code,maximumFractionDigits:2}).format(amount):"Unverified amount";}
