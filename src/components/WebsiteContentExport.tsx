import {useState} from "react";
import {Button} from "./ui/button";
import {portfolioRequest} from "../lib/websitePortfolioApi";

type ContentExport={format:string;businessId:string;exportedAt:string;website:{id:string;name:string|null;[key:string]:unknown}};
export default function WebsiteContentExport({siteId,businessId}:{siteId:string;businessId:string}){
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function download(){
  if(busy)return;
  setBusy(true);setError("");
  let url:string|undefined;
  try{
   const result=await portfolioRequest<ContentExport>("/api/account/websites/"+encodeURIComponent(siteId)+"/export");
   if(result.format!=="bennie-website-content-v1"||result.businessId!==businessId||result.website?.id!==siteId)throw new Error("Export scope changed. No file downloaded.");
   // The tenant ID is transport validation metadata, not part of the portable document.
   const {businessId:_,...documentData}=result;
   url=URL.createObjectURL(new Blob([JSON.stringify(documentData,null,2)],{type:"application/json"}));
   const a=document.createElement("a");a.href=url;a.download="bennie-website-"+siteId+".json";document.body.appendChild(a);try{a.click();}finally{a.remove();}
  }catch(e){setError(e instanceof Error?e.message:"Unable to export website.");}
  finally{if(url){const objectUrl=url;window.setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);}setBusy(false);}
 }
 return <section className="rounded-xl border p-4 space-y-2"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Website content export</h2><p className="text-sm text-slate-500">Download this site's saved pages, theme and supported SEO fields as JSON. This is not a complete hosting or account backup.</p></div><Button variant="outline" disabled={busy} onClick={()=>void download()}>{busy?"Preparing export…":"Download website JSON"}</Button></div>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}</section>;
}
