import {useEffect,useRef,useState} from "react";
import type {PortfolioSite} from "../lib/websitePortfolio";
export default function WebsiteLiveThumbnail({site,businessId}:{site:PortfolioSite;businessId:string}){
 const ref=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false),[width,setWidth]=useState(0);
 useEffect(()=>{const el=ref.current;if(!el)return;const size=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));size.observe(el);const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect();}},{rootMargin:"120px"});observer.observe(el);return()=>{size.disconnect();observer.disconnect();};},[]);
 const allowed=site.business_id===businessId&&!site.archived_at;
 return <div ref={ref} className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-50 dark:bg-slate-800" role="img" aria-label={(site.name||site.seo?.title||"Website")+" live layout thumbnail"}>
 {allowed&&visible&&width>0?<iframe key={site.id+":"+site.updated_at} title={(site.name||"Website")+" rendered preview"} src={"/w/"+encodeURIComponent(businessId)+"?draft=1&thumbnail=1&website="+encodeURIComponent(site.id)} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" loading="lazy" tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 border-0 bg-white" style={{width:1200,height:675,transform:"scale("+width/1200+")",transformOrigin:"top left"}}/>:<span className="absolute inset-0 grid place-items-center text-xs text-slate-500">{allowed?"Loading layout preview…":"Archived website"}</span>}
 <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-700">Layout preview</span>
 </div>;
}
