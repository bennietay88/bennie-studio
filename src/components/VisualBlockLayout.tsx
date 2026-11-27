import React,{useEffect,useRef,useState} from "react";
import { ArrowDown,ArrowUp,GripVertical,Trash2,Plus } from "lucide-react";
import { BLOCK_KINDS, DEFAULT_BLOCK_MOTION, MOTION_EFFECTS, MOTION_TRIGGERS, blockMotionFrames, motionScrollProgress, createVisualBlock, normalizeBlocks, normalizeBlockMotion, safeBlockUrl, findBlock, insertBlock, moveBlock, removeBlock, patchBlock, type VisualBlock,type BlockKind,type BlockTarget,type BlockMotion } from "../lib/visualBlocks";
import { generateId } from "../lib/utils";
import { ImageUpload } from "./ImageUpload";
import "../styles/visualBlockLayout.css";
export function BlockMotionFrame({motion,enabled,allowPin=false,children}:{motion?:unknown;enabled:boolean;allowPin?:boolean;children:React.ReactNode}){
 const ref=useRef<HTMLDivElement>(null),track=useRef<HTMLDivElement>(null);
 const config=normalizeBlockMotion(motion);const signature=JSON.stringify(config);
 useEffect(()=>{
  const el=ref.current,outer=track.current;if(!el||!outer||!enabled||config.effect==="none"||!el.animate)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop=window.matchMedia("(min-width: 1024px) and (hover:hover) and (pointer:fine)");
  let animation:Animation|undefined,observer:IntersectionObserver|undefined,resize:ResizeObserver|undefined,frame=0;
  let pinned=false;
  const clear=()=>{animation?.cancel();animation=undefined;outer.removeAttribute("data-motion-pinned");outer.style.removeProperty("min-height");pinned=false;};
  const fits=()=>allowPin&&config.pin&&desktop.matches&&el.scrollHeight<=window.innerHeight-120&&!el.querySelector("a,button,input,textarea,select,form,[tabindex],video,iframe,details");
  const play=()=>{if(reduced.matches)return;animation?.cancel();animation=el.animate(blockMotionFrames(config),{duration:config.duration,delay:config.delay,easing:config.easing||"ease-out"});};
  const update=()=>{frame=0;if(reduced.matches)return;
   if(config.trigger!=="scrub")return;
   const rect=outer.getBoundingClientRect();
   const progress=pinned?Math.max(0,Math.min(1,(80-rect.top)/Math.max(1,outer.offsetHeight-el.offsetHeight))):motionScrollProgress(rect.top,rect.height,window.innerHeight);
   if(animation)animation.currentTime=progress*config.duration;
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const reset=()=>{observer?.disconnect();clear();if(reduced.matches)return;
   if(config.trigger==="scrub"){
    pinned=Boolean(fits());if(pinned){outer.dataset.motionPinned="true";outer.style.minHeight=(el.offsetHeight+window.innerHeight*(config.pinDistance||35)/100)+"px";}
    animation=el.animate(blockMotionFrames(config),{duration:config.duration,easing:config.easing||"ease-out",fill:"both"});animation.pause();update();
   }else if(config.trigger==="load")play();
   else if(config.trigger==="scroll"){
    if(typeof IntersectionObserver==="undefined")play();else{observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer?.disconnect();play();}},{threshold:0.12});observer.observe(el);}
   }
  };
  const hover=()=>{if(config.trigger==="hover"&&desktop.matches)play();};
  const focus=()=>{if(config.trigger==="scrub"){animation?.cancel();animation=undefined;outer.removeAttribute("data-motion-pinned");outer.style.removeProperty("min-height");pinned=false;}else if(config.trigger==="hover")animation?.cancel();};
  const onResize=()=>{if(config.trigger==="scrub")reset();};
  el.addEventListener("pointerenter",hover);el.addEventListener("focusin",focus);
  window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",onResize,{passive:true});
  document.addEventListener("scroll",schedule,{passive:true,capture:true});
  reduced.addEventListener("change",reset);desktop.addEventListener("change",reset);
  if(config.trigger==="scrub"&&allowPin&&config.pin&&typeof ResizeObserver!=="undefined"){resize=new ResizeObserver(()=>{if(pinned&&(!fits()||Math.abs(outer.offsetHeight-el.offsetHeight-window.innerHeight*(config.pinDistance||35)/100)>2))reset();});resize.observe(el);}
  reset();
  return()=>{observer?.disconnect();resize?.disconnect();clear();if(frame)cancelAnimationFrame(frame);el.removeEventListener("pointerenter",hover);el.removeEventListener("focusin",focus);window.removeEventListener("scroll",schedule);window.removeEventListener("resize",onResize);document.removeEventListener("scroll",schedule,true);reduced.removeEventListener("change",reset);desktop.removeEventListener("change",reset);};
 },[enabled,allowPin,signature]);
 return <div ref={track} className="bt-motion-track"><div ref={ref} className="bt-block-motion">{children}</div></div>;
}
function BlockContent({block}:{block:VisualBlock}){
  const url=safeBlockUrl(block.url);
  switch(block.kind){
    case "heading":return <h3 className="bt-block-heading">{block.text}</h3>;
    case "text":return <p className="bt-block-text">{block.text}</p>;
    case "image":return url&&!url.startsWith("#")?<img src={url} alt={block.alt||""} loading="lazy" decoding="async" className="bt-block-image"/>:null;
    case "button":return url?<a className="bt-block-button" href={url}>{block.text||"Learn more"}</a>:null;
    case "spacer":return <div aria-hidden="true" style={{height:block.height||32}}/>;
    default:return null;
  }
}
export function VisualBlocks({value,animate}:{value:unknown;animate:boolean}){
  const blocks=normalizeBlocks(value);
  function render(items:VisualBlock[]):React.ReactNode{return items.map(block=><BlockMotionFrame key={block.id} motion={block.motion} enabled={animate}><div style={{textAlign:block.align||"left"}}>{block.kind==="columns"?<div className="bt-block-columns" data-stack-tablet={block.stackTablet?"true":"false"} style={{"--block-left":(block.ratio||50)+"fr","--block-right":(100-(block.ratio||50))+"fr",gap:block.gap||24} as React.CSSProperties}><div>{render(block.left||[])}</div><div>{render(block.right||[])}</div></div>:<BlockContent block={block}/>}</div></BlockMotionFrame>);}
  return <div className="bt-block-root">{render(blocks)}</div>;
}
export function MotionFields({value,onChange,allowPin=false}:{value:unknown;onChange:(value:BlockMotion)=>void;allowPin?:boolean}){
 const m=normalizeBlockMotion(value);const [preview,setPreview]=useState(0);
 const set=(patch:Partial<BlockMotion>)=>onChange(normalizeBlockMotion({...m,...patch}));
 return <div className="bt-motion-fields">
 <label>Animation<select value={m.effect} onChange={e=>set({effect:e.target.value as BlockMotion["effect"]})}>{MOTION_EFFECTS.map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Trigger<select value={m.trigger} onChange={e=>set({trigger:e.target.value as BlockMotion["trigger"]})}>{MOTION_TRIGGERS.map(x=><option key={x} value={x}>{x==="scrub"?"Scroll-linked":x}</option>)}</select></label>
 <label>Duration (ms)<input type="number" min={100} max={1600} step={50} value={m.duration} onChange={e=>set({duration:Number(e.target.value)})}/></label>
 <label>Delay (ms)<input type="number" min={0} max={800} step={50} disabled={m.trigger==="scrub"} value={m.delay} onChange={e=>set({delay:Number(e.target.value)})}/></label>
 <label>Easing<select value={m.easing||"ease-out"} onChange={e=>set({easing:e.target.value as BlockMotion["easing"]})}>{["ease-out","ease-in-out","linear"].map(x=><option key={x}>{x}</option>)}</select></label>
 {allowPin&&m.trigger==="scrub"&&m.effect!=="none"&&<div className="col-span-2"><label><input type="checkbox" checked={Boolean(m.pin)} onChange={e=>set({pin:e.target.checked})}/> Pin short, non-interactive section on desktop</label>{m.pin&&<label>Pin travel (% viewport)<input type="range" min={15} max={60} value={m.pinDistance||35} onChange={e=>set({pinDistance:Number(e.target.value)})}/>{m.pinDistance}%</label>}<p className="text-xs">Pinning automatically falls back to normal scrolling for mobile, reduced motion, interactive or oversized content.</p></div>}
 {m.effect==="sequence"&&m.keyframes&&<div className="col-span-2 space-y-2"><strong>Keyframe timeline</strong><div className="bt-motion-timeline" aria-label="Animation timeline"><span>0%</span><span>50%</span><span>100%</span></div>{m.keyframes.slice(0,2).map((stop,index)=><fieldset key={index} className="border rounded p-2"><legend>{index===0?"Start":"Midpoint"}</legend>{(["x","y","scale","rotate","rotateY","opacity"] as const).map(key=><label key={key}>{key}<input type="number" step={key==="scale"||key==="opacity"?0.05:1} value={stop[key]} onChange={event=>set({keyframes:m.keyframes!.map((frame,i)=>i===index?{...frame,[key]:Number(event.target.value)}:frame)})}/></label>)}</fieldset>)}<p className="text-xs">The final keyframe returns to the natural layout.</p></div>}
 <div className="col-span-2"><button type="button" className="border rounded px-2 py-1" onClick={()=>setPreview(n=>n+1)}>Preview animation</button><div className="overflow-hidden rounded bg-slate-100 p-4 mt-2"><BlockMotionFrame key={preview} motion={{...m,trigger:"load",pin:false}} enabled={preview>0}><div className="rounded bg-indigo-600 text-white p-3 text-center">Animation preview</div></BlockMotionFrame></div></div>
 </div>;
}
function ColumnResize({ratio,onChange}:{ratio:number;onChange:(value:number)=>void}){
  const [draft,setDraft]=useState(ratio);const track=useRef<HTMLDivElement>(null);const start=useRef<number|null>(null);
  useEffect(()=>{setDraft(ratio);},[ratio]);
  const get=(x:number)=>{const box=track.current?.getBoundingClientRect();return box&&box.width?Math.round(Math.max(20,Math.min(80,(x-box.left)/box.width*100))):ratio;};
  return <div ref={track} className="bt-column-resize-track" style={{"--column-split":draft+"%"} as React.CSSProperties}><span>{draft}%</span><button type="button" className="bt-touch-handle" role="slider" aria-label="Resize columns" aria-valuemin={20} aria-valuemax={80} aria-valuenow={draft} onPointerDown={e=>{start.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(start.current===e.pointerId)setDraft(get(e.clientX));}} onPointerUp={e=>{if(start.current===e.pointerId){start.current=null;const next=get(e.clientX);setDraft(next);onChange(next);}}} onPointerCancel={()=>{start.current=null;setDraft(ratio);}} onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();onChange(Math.max(20,Math.min(80,ratio+(e.key==="ArrowLeft"?-2:2))));}}}><GripVertical size={15}/></button><span>{100-draft}%</span></div>;
}
export function VisualBlockEditor({value,onChange}:{value:unknown;onChange:(blocks:VisualBlock[])=>void}){
  const blocks=normalizeBlocks(value);const [selected,setSelected]=useState<string|null>(null);const [kind,setKind]=useState<BlockKind>("text");const root=useRef<HTMLDivElement>(null);const drag=useRef<{id:string;pointer:number}|null>(null);const active=selected?findBlock(blocks,selected):undefined;
  const drop=(id:string,target:BlockTarget)=>onChange(moveBlock(blocks,id,target));
  const readTarget=(node:Element|null):BlockTarget|null=>{const el=node?.closest<HTMLElement>("[data-block-drop]");if(!el||!root.current?.contains(el))return null;return {parent:el.dataset.parent||null,side:el.dataset.side==="right"?"right":"left",index:Number(el.dataset.index)};};
  function zone(parent:string|null,side:"left"|"right",index:number,depth:number){const target={parent,side,index};return <div key={"drop-"+index} className="bt-block-drop" data-block-drop data-parent={parent||""} data-side={side} data-index={index} onDragOver={e=>{if(e.dataTransfer.types.includes("application/x-bennie-block"))e.preventDefault();}} onDrop={e=>{e.preventDefault();e.stopPropagation();const id=e.dataTransfer.getData("application/x-bennie-block");if(id)drop(id,target);}}><button type="button" onClick={()=>{const id=generateId();const next=insertBlock(blocks,target,createVisualBlock(kind,id));onChange(next);if(findBlock(next,id))setSelected(id);}} disabled={kind==="columns"&&depth>=3}><Plus size={12}/> Add {kind}</button></div>;}
  function render(items:VisualBlock[],parent:string|null,side:"left"|"right",depth:number):React.ReactNode{return <>{items.map((block,index)=><React.Fragment key={block.id}>{zone(parent,side,index,depth)}<div className="bt-block-edit" data-selected={selected===block.id?"true":"false"}><div className="bt-block-toolbar"><button type="button" className="bt-touch-handle" draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("application/x-bennie-block",block.id);e.dataTransfer.effectAllowed="move";}} onPointerDown={e=>{if(e.pointerType==="mouse")return;drag.current={id:block.id,pointer:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{if(drag.current?.pointer!==e.pointerId)return;const target=readTarget(document.elementFromPoint(e.clientX,e.clientY));const id=drag.current.id;drag.current=null;if(target)drop(id,target);}} onPointerCancel={()=>{drag.current=null;}} onClick={()=>setSelected(block.id)}><GripVertical size={14}/>{block.kind}</button><button type="button" aria-label="Move block up" disabled={index===0} onClick={()=>drop(block.id,{parent,side,index:index-1})}><ArrowUp size={14}/></button><button type="button" aria-label="Move block down" disabled={index===items.length-1} onClick={()=>drop(block.id,{parent,side,index:index+2})}><ArrowDown size={14}/></button><button type="button" aria-label="Remove block" onClick={()=>{if(window.confirm("Remove this block?"))onChange(removeBlock(blocks,block.id));}}><Trash2 size={14}/></button></div>{block.kind==="columns"?<><ColumnResize ratio={block.ratio||50} onChange={ratio=>onChange(patchBlock(blocks,block.id,{ratio}))}/><div className="bt-block-columns" style={{"--block-left":(block.ratio||50)+"fr","--block-right":(100-(block.ratio||50))+"fr",gap:block.gap||24} as React.CSSProperties}><div>{render(block.left||[],block.id,"left",depth+1)}</div><div>{render(block.right||[],block.id,"right",depth+1)}</div></div></>:<div className="bt-block-preview" onClick={()=>setSelected(block.id)}><BlockContent block={block}/>{block.kind==="image"&&!safeBlockUrl(block.url)&&<span>Choose an image</span>}{block.kind==="button"&&!safeBlockUrl(block.url)&&<span>Add a button destination</span>}</div>}</div></React.Fragment>)}{zone(parent,side,items.length,depth)}</>;}
  const patch=(change:Partial<VisualBlock>)=>{if(active)onChange(patchBlock(blocks,active.id,change));};
  return <div ref={root} className="bt-block-editor" data-builder-control><div className="bt-block-toolbar"><label>Add element <select value={kind} onChange={e=>setKind(e.target.value as BlockKind)}>{BLOCK_KINDS.map(k=><option key={k}>{k}</option>)}</select></label><span>Drag handles or use arrows. Select a block to edit.</span></div>{render(blocks,null,"left",0)}
  {active&&<div className="bt-block-properties" key={active.id}><strong>{active.kind} settings</strong>{["heading","text","button"].includes(active.kind)&&<label>Text<textarea defaultValue={active.text||""} key={active.id+(active.text||"")} onBlur={e=>patch({text:e.target.value})}/></label>}{active.kind==="image"&&<><ImageUpload label="Image" bucket="website-assets" value={active.url||""} onUpload={url=>patch({url})}/><label>Alternative text<input defaultValue={active.alt||""} onBlur={e=>patch({alt:e.target.value})}/></label></>}{active.kind==="button"&&<label>Destination URL<input defaultValue={active.url||""} onBlur={e=>patch({url:e.target.value})}/></label>}{active.kind==="spacer"&&<label>Height<input type="number" min={8} max={160} value={active.height||32} onChange={e=>patch({height:Number(e.target.value)})}/></label>}{active.kind==="columns"&&<><label>Gap<input type="range" min={8} max={64} value={active.gap||24} onChange={e=>patch({gap:Number(e.target.value)})}/></label><label><input type="checkbox" checked={active.stackTablet||false} onChange={e=>patch({stackTablet:e.target.checked})}/> Stack on tablet</label></>}<label>Alignment<select value={active.align||"left"} onChange={e=>patch({align:e.target.value as VisualBlock["align"]})}>{["left","center","right"].map(x=><option key={x}>{x}</option>)}</select></label><MotionFields value={active.motion||DEFAULT_BLOCK_MOTION} onChange={motion=>patch({motion})}/></div>}</div>;
}
