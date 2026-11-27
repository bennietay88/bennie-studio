import type { WebsiteSection } from "../types";
import { normalizeBlocks, createVisualBlock, safeBlockUrl, normalizeBlockMotion, type VisualBlock } from "./visualBlocks";
export type DesignPreset = { version:1; kind:"section"|"page"|"motion"; sections:WebsiteSection[]; motion?:ReturnType<typeof normalizeBlockMotion> };
const SAFE_SETTINGS=["variant","designProfile","motionProfile","imageTreatment","backgroundColor","bgColor","textColor","verticalPadding","horizontalPadding","useCustomPadding","paddingTop","paddingBottom","paddingLeft","paddingRight","isContained","textAlign"];
const PLACEHOLDERS:Partial<Record<WebsiteSection["type"],Record<string,unknown>>> = {
 hero:{headline:"Your headline",subheadline:"Introduce your business",ctaText:"",imageUrl:""},about:{title:"About us",text:"Add your story",imageUrl:""},
 services:{title:"Our services",description:"",items:[]},features:{title:"Our features",items:[]},benefits:{title:"Benefits",items:[]},
 pricing:{title:"Pricing",plans:[]},testimonials:{title:"Testimonials",items:[]},proof:{title:"Proof",stats:[],logos:[]},faq:{title:"Frequently asked questions",items:[]},
 contact:{title:"Contact us",description:""},team:{title:"Our team",members:[]},cta:{title:"Get in touch",description:"",buttonText:""},
 problem:{title:"The challenge",description:"",painPoints:[]},solution:{title:"Our solution",description:"",features:[]},text_content:{title:"Content",text:"Add your content"},
 appointment:{title:"Book an appointment"},industry_content:{title:"Our work",items:[]},product_list:{title:"Products",items:[]},blog_list:{title:"Articles"},blog_post:{title:"Article"}
};
export function cleanDesignBlocks(value:unknown,id:()=>string):VisualBlock[]{
 return normalizeBlocks(value).map(block=>({...block,id:id(),text:block.kind==="heading"?"Your heading":block.kind==="text"?"Add your text":block.kind==="button"?"Learn more":"",url:"",alt:"",left:block.kind==="columns"?cleanDesignBlocks(block.left,id):undefined,right:block.kind==="columns"?cleanDesignBlocks(block.right,id):undefined}));
}
export function makeDesignSection(section:WebsiteSection,id:()=>string):WebsiteSection|null{
 const base=PLACEHOLDERS[section.type];if(!base)return null;
 const content:Record<string,unknown>={...base};const interaction=section.content?.interaction;
 if(section.type==="features"&&interaction==="visual_layout"){content.interaction=interaction;content.title="";content.blocks=cleanDesignBlocks(section.content.blocks,id);}
 if(section.type==="features"&&interaction==="before_after")Object.assign(content,{interaction,title:"Before and after",beforeImageUrl:"",afterImageUrl:"",beforeLabel:"Before",afterLabel:"After"});
 if(section.type==="features"&&interaction==="process_timeline")Object.assign(content,{interaction,title:"Our process",items:["Step one","Step two","Step three"]});
 if(section.content?.builderMotion)content.builderMotion=normalizeBlockMotion(section.content.builderMotion);
 const settings=Object.fromEntries(Object.entries(section.settings||{}).filter(([key,value])=>SAFE_SETTINGS.includes(key)&&(typeof value==="string"||typeof value==="number"||typeof value==="boolean")));
 return {id:id(),type:section.type,content,settings,isVisible:section.isVisible!==false};
}
export function createDesignPreset(sections:WebsiteSection[],kind:"section"|"page",id:()=>string):DesignPreset{
 return {version:1,kind,sections:sections.slice(0,60).map(section=>makeDesignSection(section,id)).filter((section):section is WebsiteSection=>Boolean(section))};
}
export function instantiateDesignPreset(value:unknown,id:()=>string):WebsiteSection[]{
 const p=value as DesignPreset;if(!p||p.version!==1||(p.kind!=="section"&&p.kind!=="page")||!Array.isArray(p.sections))return [];
 return createDesignPreset(p.sections,p.kind,id).sections;
}
export function canConvertSection(section:WebsiteSection):boolean{
 return ["hero","about","text_content","services","features","benefits","cta","problem","solution"].includes(section.type)&&!section.content?.interaction;
}
export function convertSectionToLayout(section:WebsiteSection,id:()=>string):WebsiteSection|null{
 if(!canConvertSection(section))return null;const content=section.content||{};const blocks:VisualBlock[]=[];
 const add=(kind:VisualBlock["kind"],text:unknown,url?:unknown,alt?:unknown)=>{
  if(kind==="image"||kind==="button"){if(typeof url!=="string"||!safeBlockUrl(url))return;}else if(typeof text!=="string"||!text.trim())return;
  blocks.push({...createVisualBlock(kind,id()),text:typeof text==="string"?text:"",url:typeof url==="string"?safeBlockUrl(url):"",alt:typeof alt==="string"?alt:""});
 };
 add("heading",content.headline||content.title);add("text",content.subheadline||content.description||content.text);add("image","",content.imageUrl,content.imageAlt);
 for(const item of (Array.isArray(content.items)?content.items:[]).slice(0,12)){if(typeof item==="string")add("text",item);else if(item&&typeof item==="object"){add("heading",item.title||item.name);add("text",item.description||item.text);add("image","",item.imageUrl,item.imageAlt);}}
 for(const item of [...(Array.isArray(content.painPoints)?content.painPoints:[]),...(Array.isArray(content.features)?content.features:[])].slice(0,12))add("text",item);
 add("button",content.ctaText||content.buttonText,content.buttonAction?.target||content.ctaUrl||content.buttonUrl);
 return blocks.length?{id:id(),type:"features",content:{interaction:"visual_layout",title:"",items:[],blocks:normalizeBlocks(blocks),builderMotion:normalizeBlockMotion(content.builderMotion)},isVisible:true}:null;
}
