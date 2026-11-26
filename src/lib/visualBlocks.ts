export type BlockKind = "heading"|"text"|"image"|"button"|"spacer"|"columns";
export type MotionStop = { offset:number; x:number; y:number; scale:number; rotate:number; rotateY:number; opacity:number };
export type BlockMotion = { effect:"none"|"fade"|"slide"|"scale"|"tilt"|"sequence"; trigger:"load"|"scroll"|"hover"|"scrub"; duration:number; delay:number; easing?:"ease-out"|"ease-in-out"|"linear"; keyframes?:MotionStop[]; pin?:boolean; pinDistance?:number };
export const MOTION_EFFECTS:BlockMotion["effect"][]=["none","fade","slide","scale","tilt","sequence"];
export const MOTION_TRIGGERS:BlockMotion["trigger"][]=["load","scroll","hover","scrub"];
export const DEFAULT_MOTION_STOPS:MotionStop[]=[{offset:0,x:0,y:16,scale:.96,rotate:0,rotateY:-5,opacity:.65},{offset:.5,x:0,y:-4,scale:1.02,rotate:0,rotateY:3,opacity:1},{offset:1,x:0,y:0,scale:1,rotate:0,rotateY:0,opacity:1}];
export type VisualBlock = { id:string; kind:BlockKind; text?:string; url?:string; alt?:string; height?:number; ratio?:number; gap?:number; stackTablet?:boolean; align?:"left"|"center"|"right"; motion?:BlockMotion; left?:VisualBlock[]; right?:VisualBlock[] };
export const BLOCK_KINDS:BlockKind[]=["heading","text","image","button","spacer","columns"];
export const DEFAULT_BLOCK_MOTION:BlockMotion={effect:"none",trigger:"scroll",duration:500,delay:0};
const clamp=(v:unknown,min:number,max:number,fallback:number)=>typeof v==="number"&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function normalizeBlockMotion(value:unknown):BlockMotion {
  const m=(value||{}) as Partial<BlockMotion>;
  const effect=MOTION_EFFECTS.includes(m.effect!)?m.effect!:"none";
  const trigger=MOTION_TRIGGERS.includes(m.trigger!)?m.trigger!:"scroll";
  const keyframes=effect==="sequence"?DEFAULT_MOTION_STOPS.map((fallback,index)=>{
    if(index===2)return {...fallback};
    const stop=Array.isArray(m.keyframes)?m.keyframes[index]:undefined;
    return {offset:index/2,x:clamp(stop?.x,-32,32,fallback.x),y:clamp(stop?.y,-32,32,fallback.y),scale:clamp(stop?.scale,.85,1.1,fallback.scale),rotate:clamp(stop?.rotate,-15,15,fallback.rotate),rotateY:clamp(stop?.rotateY,-18,18,fallback.rotateY),opacity:clamp(stop?.opacity,.5,1,fallback.opacity)};
  }):undefined;
  return {effect,trigger,duration:clamp(m.duration,100,1600,500),delay:clamp(m.delay,0,800,0),easing:["ease-out","ease-in-out","linear"].includes(m.easing||"")?m.easing:"ease-out",keyframes,pin:effect!=="none"&&trigger==="scrub"&&m.pin===true,pinDistance:clamp(m.pinDistance,15,60,35)};
}
export function normalizeBlocks(value:unknown,depth=0,seen=new Set<string>()):VisualBlock[] {
  if(!Array.isArray(value)||depth>3)return [];
  return value.slice(0,40).flatMap(raw=>{
    if(!raw||typeof raw.id!=="string"||seen.has(raw.id)||!BLOCK_KINDS.includes(raw.kind))return [];
    if(raw.kind==="columns"&&depth>=3)return [];
    seen.add(raw.id);
    const b:VisualBlock={id:raw.id,kind:raw.kind,text:typeof raw.text==="string"?raw.text:"",url:typeof raw.url==="string"?raw.url:"",alt:typeof raw.alt==="string"?raw.alt:"",height:clamp(raw.height,8,160,32),ratio:clamp(raw.ratio,20,80,50),gap:clamp(raw.gap,8,64,24),stackTablet:raw.stackTablet===true,align:["left","center","right"].includes(raw.align)?raw.align:"left",motion:normalizeBlockMotion(raw.motion)};
    if(b.kind==="columns"){b.left=normalizeBlocks(raw.left,depth+1,seen);b.right=normalizeBlocks(raw.right,depth+1,seen);}
    return [b];
  });
}
export function createVisualBlock(kind:BlockKind,id:string):VisualBlock {
  return {id,kind,text:kind==="heading"?"New heading":kind==="text"?"Add your text":kind==="button"?"Learn more":"",url:"",alt:"",ratio:50,gap:24,height:32,align:"left",motion:{...DEFAULT_BLOCK_MOTION},...(kind==="columns"?{left:[],right:[]}: {})};
}
export type BlockTarget={parent:string|null;side:"left"|"right";index:number};
function mapTree(blocks:VisualBlock[],id:string,fn:(b:VisualBlock)=>VisualBlock):VisualBlock[]{return blocks.map(b=>b.id===id?fn(b):b.kind==="columns"?{...b,left:mapTree(b.left||[],id,fn),right:mapTree(b.right||[],id,fn)}:b);}
export function findBlock(blocks:VisualBlock[],id:string):VisualBlock|undefined {for(const b of blocks){if(b.id===id)return b;const found=findBlock(b.left||[],id)||findBlock(b.right||[],id);if(found)return found;}return undefined;}
export function patchBlock(blocks:VisualBlock[],id:string,patch:Partial<VisualBlock>){return normalizeBlocks(mapTree(blocks,id,b=>({...b,...patch,id:b.id,kind:b.kind})));}
export function removeBlock(blocks:VisualBlock[],id:string):VisualBlock[]{return blocks.filter(b=>b.id!==id).map(b=>b.kind==="columns"?{...b,left:removeBlock(b.left||[],id),right:removeBlock(b.right||[],id)}:b);}
export function insertBlock(blocks:VisualBlock[],target:BlockTarget,block:VisualBlock):VisualBlock[] {
  if(findBlock(blocks,block.id))return blocks;
  const insert=(items:VisualBlock[])=>{const next=[...items];next.splice(Math.max(0,Math.min(next.length,target.index)),0,block);return next;};
  if(target.parent && findBlock(blocks,target.parent)?.kind!=="columns")return blocks;
  const result=normalizeBlocks(target.parent?mapTree(blocks,target.parent,b=>({...b,[target.side]:insert(b[target.side]||[])})):insert(blocks));
  const count=(items:VisualBlock[]):number=>items.reduce((n,item)=>n+1+count(item.left||[])+count(item.right||[]),0);
  return findBlock(result,block.id)&&count(result)===count(blocks)+count([block])?result:blocks;
}
export function moveBlock(blocks:VisualBlock[],id:string,target:BlockTarget):VisualBlock[]{
  const block=findBlock(blocks,id);if(!block||target.parent===id||(target.parent&&findBlock([block],target.parent)))return blocks;
  const parent=target.parent?findBlock(blocks,target.parent):undefined;
  if(target.parent&&parent?.kind!=="columns")return blocks;
  const siblings=parent?.[target.side]||(!target.parent?blocks:[]);
  const old=siblings.findIndex(b=>b.id===id);
  const next=insertBlock(removeBlock(blocks,id),{...target,index:old>=0&&old<target.index?target.index-1:target.index},block);
  return findBlock(next,id)?next:blocks;
}
/** Allow only ordinary web URLs and safe site-relative paths. */
export function safeBlockUrl(value?:string):string {
  const url=(value||"").trim();if(!url||/[\\\u0000-\u001f\u007f]/.test(url))return "";
  if(url.startsWith("/")&&!url.startsWith("//"))return url;
  if(/^#[a-zA-Z0-9_-]+$/.test(url))return url;
  try{const parsed=new URL(url);return ["https:","http:"].includes(parsed.protocol)?url:"";}catch{return "";}
}

/** Returns only bounded numeric transforms. Final pose is always the natural layout. */
export function blockMotionFrames(value:unknown):Keyframe[]{
 const m=normalizeBlockMotion(value);
 if(m.effect==="sequence"&&m.keyframes)return m.keyframes.map(stop=>({offset:stop.offset,transform:"perspective(800px) translate("+stop.x+"px,"+stop.y+"px) rotate("+stop.rotate+"deg) rotateY("+stop.rotateY+"deg) scale("+stop.scale+")",opacity:stop.opacity}));
 if(m.effect==="tilt")return [{transform:"perspective(800px) rotateY(-10deg) rotateX(4deg)",opacity:.8},{transform:"none",opacity:1}];
 if(m.effect==="slide")return [{transform:"translateY(18px)",opacity:.75},{transform:"none",opacity:1}];
 if(m.effect==="scale")return [{transform:"scale(.96)",opacity:.8},{transform:"none",opacity:1}];
 if(m.effect==="fade")return [{opacity:.55},{opacity:1}];
 return [{opacity:1},{opacity:1}];
}
export function motionScrollProgress(top:number,height:number,viewport:number,pinned=false):number{
 if(!Number.isFinite(top)||!Number.isFinite(height)||!Number.isFinite(viewport)||viewport<=0)return 1;
 const start=pinned?80:viewport*.85;
 const distance=pinned?Math.max(1,height-viewport+80):Math.max(1,Math.min(height,viewport*.75)+viewport*.35);
 return Math.min(1,Math.max(0,(start-top)/distance));
}
