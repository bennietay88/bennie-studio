import React from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import { trackPublicEvent } from "../lib/publicTracking";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import { useStudioShowcaseCatalog } from "../lib/studioShowcaseCms";

export const STUDIO_SHOWCASES = [
{slug:"dental-clinic",id:"dental-clinic-v1",category:"Healthcare",title:"Dental clinic",headline:"A calmer path from treatment search to appointment",goal:"Appointment enquiry",challenge:"Patients need treatment clarity, practitioner information and easy-to-find booking options.",approach:"Make treatments easy to scan, introduce the care team, answer common questions and emphasise the appointment path.",sections:["Treatments","Practitioners","Patient FAQs","Opening hours","Appointment CTA"],industry:"clinic",colour:"#17645e"},
{slug:"renovation-contractor",id:"renovation-contractor-v1",category:"Home services",title:"Renovation contractor",headline:"From project interest to a better quote request",goal:"Quotation request",challenge:"Prospects need to understand services and working areas before sharing project details.",approach:"Lead with renovation capabilities, project imagery areas, a clear process and a structured quote path.",sections:["Services","Project gallery","Process","Service areas","Quote CTA"],industry:"contractor",colour:"#594333"},
{slug:"professional-advisory",id:"law-firm-v1",category:"Professional services",title:"Professional advisory",headline:"Positioning expertise for a confident first consultation",goal:"Consultation request",challenge:"Prospects need confidence in the firm's relevant experience and a clear view of the service scope.",approach:"Use an editorial, expertise-led introduction supported by qualifications, service structure and one consultation path.",sections:["Expertise","Services","People","Approach","Consultation CTA"],industry:"consultant",colour:"#172534"},
{slug:"tuition-centre",id:"tuition-centre-v1",category:"Education",title:"Tuition centre",headline:"Helping parents find the right programme",goal:"Trial class enquiry",challenge:"Parents compare classes, levels, teachers and schedules before asking about a trial.",approach:"Organise offerings by programme and level with clear teacher context and a trial enquiry.",sections:["Programmes","Levels","Teachers","Parent FAQs","Trial class CTA"],industry:"education",colour:"#c07929"},
{slug:"beauty-wellness",id:"salon-spa-v1",category:"Beauty & wellness",title:"Beauty & wellness",headline:"A more inviting route from treatment discovery to booking",goal:"Treatment booking",challenge:"Visitors need to compare services, see the treatment style and find a booking route on mobile.",approach:"Combine atmospheric presentation with concise treatment menus and prominent booking steps.",sections:["Treatment menu","Gallery","Packages","Visit details","Booking CTA"],industry:"beauty",colour:"#875b68"},
{slug:"accounting-firm",id:"accounting-firm-v1",category:"Finance",title:"Accounting firm",headline:"Making professional services easier to evaluate",goal:"Consultation enquiry",challenge:"Business owners want to confirm the firm's capabilities and client fit before making contact.",approach:"Explain accounting and tax services, qualifications and next steps clearly and succinctly.",sections:["Client fit","Services","Credentials","FAQs","Consultation CTA"],industry:"consultant",colour:"#354f62"}
] as const;
export type StudioShowcase={slug:string;id:string;category:string;title:string;headline:string;goal:string;challenge:string;approach:string;sections:readonly string[];industry:string;colour:string};
export function StudioShowcaseVisual({study,compact=false}:{study:StudioShowcase,compact?:boolean}){
 return <div className="c27-visual" style={{background:study.colour}}><div className="c27-rendered"><TemplatePreviewThumbnail templateId={study.id} templateName={study.title} className={compact?"h-[218px]":"h-[340px] sm:h-[440px]"}/></div></div>
}
export default function StudioCaseStudyDetail(){
 const {slug}=useParams();const studies=useStudioShowcaseCatalog(STUDIO_SHOWCASES);const study=studies.find(s=>s.slug===slug);
 return <div className="brand-public c27-public min-h-screen bg-[#f8f8f5]">
 <PublicSiteHeader/>
 {study?<><Helmet><title>{study.title} Website | Studio Showcase | Bennie Studio</title><meta name="description" content={study.challenge+" Explore a website built by Bennie Studio."}/><link rel="canonical" href={"https://app.bennietay.com/case-studies/showcase/"+study.slug}/></Helmet>
 <main>
 <section className="c27-editorial"><div className="brand-shell py-12 sm:py-20">
 <Link to="/case-studies" className="c27-quiet"><ArrowLeft size={16}/> All case studies</Link>
 <div className="mt-9 grid gap-10 lg:grid-cols-12 lg:items-center"><div className="lg:col-span-5"><h1 className="c27-major">{study.headline}</h1><p className="mt-6 text-base leading-8 text-[#525b66]">{study.challenge}</p><p className="mt-3 text-sm font-medium text-[#566273]">Illustrative concept, not paid client work.</p><div className="mt-8 flex flex-wrap gap-3"><Link to={"/case-studies/showcase/"+study.slug+"/preview"} className="c27-button" onClick={()=>trackPublicEvent({eventType:"showcase_live_preview_clicked",label:study.title,target:"/case-studies/showcase/"+study.slug+"/preview",metadata:{showcase:study.slug}})}>Open live preview <ArrowUpRight size={18}/></Link><Link to={"/generate-preview?industry="+study.industry} className="c27-quiet" onClick={()=>trackPublicEvent({eventType:"showcase_preview_cta",label:study.title,target:"/generate-preview",metadata:{showcase:study.slug}})}>Get a free preview for my business <ArrowRight size={16}/></Link></div></div><div className="lg:col-span-7"><StudioShowcaseVisual study={study}/></div></div>
 </div></section>
 <section className="brand-shell py-20"><div className="grid gap-12 lg:grid-cols-12"><div className="lg:col-span-4"><h2 className="c27-section-title">Designed for the next customer decision.</h2></div><div className="lg:col-span-8">
 {[["01","The business brief",study.challenge],["02","Our design approach",study.approach],["03","Primary website goal",study.goal]].map(([num,title,body])=><div key={num} className="c27-decision"><span>{num}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}
 <div className="c27-decision"><span>04</span><div><h3>Website sections represented</h3><div className="mt-4 flex flex-wrap gap-2">{study.sections.map(section=><span className="c27-chip" key={section}>{section}</span>)}</div></div></div>
 </div></div></section>
 <section className="c27-bottom"><div className="brand-shell grid gap-7 py-16 lg:grid-cols-[1fr_auto] lg:items-center"><div><h2>See what we can design for you.</h2><p className="mt-3 !text-white/80">Start with a free website preview, then review the managed plans when ready.</p></div><Link to={"/generate-preview?industry="+study.industry} className="c27-button !bg-white !text-[#172033]">Get my free preview <ArrowRight size={18}/></Link></div></section>
 </main></>:<main className="brand-shell py-24"><h1>Case study not found.</h1><Link to="/case-studies">Browse case studies →</Link></main>}
 <PublicSiteFooter/></div>
}
