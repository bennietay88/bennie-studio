import React from "react";
import { DEMO_PHOTOGRAPHY, demoPhotoPath } from "../lib/demoPhotography";
export function DemoIndustryPhoto({slug,children,tone="#e2e8f0",compact=false}:{slug:string;children?:React.ReactNode;tone?:string;compact?:boolean}) {
 const photo=DEMO_PHOTOGRAPHY[slug];
 const [failed,setFailed]=React.useState(false);
 React.useEffect(()=>setFailed(false),[slug]);
 if(!photo||failed)return <>{children}</>;
 return <figure className="min-w-0 overflow-hidden rounded-xl border border-current/10" style={{background:tone}}>
  <img data-testid="demo-industry-photo" src={demoPhotoPath(slug)} alt={photo.alt} width={1200} height={800} fetchPriority={compact?"auto":"high"} loading={compact?"lazy":"eager"} decoding="async" onError={()=>setFailed(true)} className={"block w-full object-cover "+(compact?"aspect-[16/8]":"aspect-[4/3] sm:aspect-[5/4]")} />
  <figcaption className="bg-white px-4 py-3 text-xs font-medium leading-5 text-slate-600">Illustrative imagery · Not actual staff, clients or commissioned work.</figcaption>
 </figure>;
}
