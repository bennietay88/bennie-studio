import React, { useState } from "react";
import type { WebsitePage, WebsiteSection } from "../types";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, Undo2, Redo2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { SECTION_TEMPLATES } from "../constants/sectionTemplates";
import "../styles/visualBuilder.css";
export type BuilderDrag = { kind:"template"; key:string } | { kind:"section"; id:string };
const DRAG_TYPE = "application/x-bennie-section";
export function writeBuilderDrag(event:React.DragEvent, value:BuilderDrag) {
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(value));
  event.dataTransfer.effectAllowed = value.kind === "template" ? "copy" : "move";
}
function readBuilderDrag(event:React.DragEvent):BuilderDrag | null {
  try {
    const value = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
    if (value?.kind === "template" && typeof value.key === "string") return {kind:"template",key:value.key};
    if (value?.kind === "section" && typeof value.id === "string") return {kind:"section",id:value.id};
  } catch { /* Ignore unrelated drags. */ }
  return null;
}
export interface VisualCanvasOptions {
  selectedId:string|null;
  onSelect:(id:string)=>void;
  onDrop:(value:BuilderDrag,index:number)=>void;
  onInsert:(index:number)=>void;
  onMove:(id:string,index:number)=>void;
  onDuplicate:(id:string)=>void;
  onVisibility:(id:string)=>void;
  onRemove:(id:string)=>void;
  onEdit:(id:string)=>void;
}
export function BuilderDropZone({index,canvas}:{index:number;canvas:VisualCanvasOptions}) {
  const [over,setOver]=useState(false);
  return <div className="bt-builder-drop" data-builder-control data-over={over ? "true":"false"}
    onDragOver={event=>{if(event.dataTransfer.types.includes(DRAG_TYPE)){event.preventDefault();setOver(true);}}}
    onDragLeave={()=>setOver(false)}
    onDrop={event=>{event.preventDefault();event.stopPropagation();setOver(false);const value=readBuilderDrag(event);if(value)canvas.onDrop(value,index);}}>
    <button type="button" onClick={()=>canvas.onInsert(index)}><Plus size={14}/> Insert section here</button>
  </div>;
}
export function BuilderCanvasSection({section,index,total,canvas,children}:{section:WebsiteSection;index:number;total:number;canvas:VisualCanvasOptions;children:React.ReactNode}) {
  return <div className="bt-builder-wrapper" key={section.id}>
    <BuilderDropZone index={index} canvas={canvas}/>
    <div className="bt-builder-section" data-selected={canvas.selectedId===section.id ? "true":"false"} data-section-id={section.id}>
      <div className="bt-builder-tools" data-builder-control>
        <button type="button" draggable onDragStart={event=>writeBuilderDrag(event,{kind:"section",id:section.id})} onClick={()=>canvas.onSelect(section.id)} aria-label={"Select or drag "+section.type}><GripVertical size={16}/><span>{section.content?.interaction?.replace(/_/g," ") || section.type}</span></button>
        <div>
          <button type="button" aria-label="Edit section" onClick={()=>canvas.onSelect(section.id)}><Pencil size={15}/></button>
          <button type="button" aria-label="Move section up" disabled={index===0} onClick={()=>canvas.onMove(section.id,index-1)}><ArrowUp size={15}/></button>
          <button type="button" aria-label="Move section down" disabled={index===total-1} onClick={()=>canvas.onMove(section.id,index+2)}><ArrowDown size={15}/></button>
          <button type="button" aria-label="Duplicate section" onClick={()=>canvas.onDuplicate(section.id)}><Copy size={15}/></button>
          <button type="button" aria-label={section.isVisible===false?"Show section":"Hide section"} onClick={()=>canvas.onVisibility(section.id)}>{section.isVisible===false?<EyeOff size={15}/>:<Eye size={15}/>}</button>
          <button type="button" aria-label="Remove section" onClick={()=>{if(window.confirm("Remove this section from the draft?"))canvas.onRemove(section.id);}}><Trash2 size={15}/></button>
        </div>
      </div>
      <div className="bt-builder-content" onClick={()=>canvas.onSelect(section.id)} data-builder-control>
        {section.isVisible===false ? <div className="bt-builder-placeholder">Hidden section · Show to preview</div> : children || <div className="bt-builder-placeholder">Section has no visible content yet</div>}
      </div>
    </div>
  </div>;
}
export function VisualBuilderLibrary({allowed,selected,onChoose}:{allowed:(key:string)=>boolean;selected:string;onChoose:(key:string)=>void}) {
  const [query,setQuery]=useState("");
  return <aside className="bt-builder-library">
    <h3>Section library</h3><p>Drag to an insertion line, or select a section and tap Insert.</p>
    <Input aria-label="Search sections" placeholder="Search sections" value={query} onChange={event=>setQuery(event.target.value)}/>
    <div className="bt-builder-library-list">
      {Object.entries(SECTION_TEMPLATES).filter(([key])=>allowed(key)&&key.replace(/_/g," ").includes(query.toLowerCase())).map(([key])=>
        <button key={key} type="button" draggable onDragStart={event=>writeBuilderDrag(event,{kind:"template",key})}
          aria-pressed={selected===key} onClick={()=>onChoose(key)}><GripVertical size={14}/><span>{key.replace(/_/g," ")}</span></button>)}
    </div>
  </aside>;
}
export function VisualBuilderInspector({page,selectedId,onSelect,onPatch,onEdit,onUndo,onRedo,canUndo,canRedo}:{page:WebsitePage;selectedId:string|null;onSelect:(id:string)=>void;onPatch:(id:string,patch:Record<string,unknown>)=>void;onEdit:(id:string)=>void;onUndo:()=>void;onRedo:()=>void;canUndo:boolean;canRedo:boolean}) {
  const section=page.sections.find(item=>item.id===selectedId);
  const fields=section ? ["headline","title","subheadline","description","text","ctaText","buttonText"].filter(key=>typeof section.content?.[key]==="string") : [];
  return <aside className="bt-builder-inspector">
    <h3>Inspector</h3>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={onUndo} disabled={!canUndo}><Undo2 size={14}/> Undo</Button><Button type="button" variant="outline" size="sm" onClick={onRedo} disabled={!canRedo}><Redo2 size={14}/> Redo</Button></div>
    <label className="text-xs font-semibold" htmlFor="bt-builder-layer">Page sections</label>
    <select id="bt-builder-layer" value={selectedId||""} onChange={event=>onSelect(event.target.value)} className="w-full rounded border border-slate-200 p-2 text-sm">
      <option value="">Select a section</option>{page.sections.map((item,index)=><option key={item.id} value={item.id}>{index+1}. {item.content?.interaction?.replace(/_/g," ") || item.type}</option>)}
    </select>
    {section ? <><h4 className="text-sm font-bold capitalize">{section.type}</h4>
      {fields.map(key=><div key={section.id+key}><label className="text-xs font-semibold capitalize" htmlFor={"bt-builder-field-"+key}>{key}</label>
      <Textarea id={"bt-builder-field-"+key} key={section.id+key+section.content[key]} defaultValue={section.content[key]} onBlur={event=>{if(event.target.value!==section.content[key])onPatch(section.id,{[key]:event.target.value});}} rows={key==="text"?4:2}/></div>)}
      <Button type="button" variant="outline" onClick={()=>onEdit(section.id)}>Full section settings</Button></>:<p>Select a section on the canvas to edit its content.</p>}
    <p className="text-xs text-slate-500">Text edits apply when you leave a field. Changes are unsaved until you use the existing save workflow.</p>
  </aside>;
}
