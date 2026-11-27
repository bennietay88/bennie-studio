export type WebsiteRedirect={from:string;to:string;status:301|302};
export function validSitePath(path:unknown):path is string{
 return typeof path==="string"&&path.length<=200&&/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/.test(path)&&!/^\/(api|assets|admin|dashboard|w|login|signup)(\/|$)/i.test(path);
}
export function validateWebsiteRedirects(value:unknown):value is WebsiteRedirect[]{
 if(!Array.isArray(value)||value.length>50)return false;
 const sources=new Set<string>();
 for(const rule of value){
  if(!rule||!validSitePath(rule.from)||!validSitePath(rule.to)||rule.from===rule.to||![301,302].includes(rule.status)||sources.has(rule.from))return false;
  sources.add(rule.from);
 }
 return value.every(r=>!sources.has(r.to));
}
export function matchWebsiteRedirect(value:unknown,path:string):WebsiteRedirect|undefined{
 return validateWebsiteRedirects(value)?value.find(r=>r.from===path):undefined;
}
