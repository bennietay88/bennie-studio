import React,{useEffect,useState} from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { createDesignPreset,instantiateDesignPreset,type DesignPreset } from "../lib/designLibrary";
import { normalizeBlockMotion } from "../lib/visualBlocks";
import { generateId } from "../lib/utils";
import type { WebsiteSection } from "../types";
type Entry={id:string;name:string;kind:"section"|"page"|"motion";payload:DesignPreset};
export function BuilderDesignLibrary({userId,sections,selected,onInsert,onMotion}:{userId:string;sections:WebsiteSection[];selected?:WebsiteSection;onInsert:(sections:WebsiteSection[])=>void;onMotion:(motion:ReturnType<typeof normalizeBlockMotion>)=>void}){
 const [entries,setEntries]=useState<Entry[]>([]);const [name,setName]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const load=async()=>{setBusy(true);const {data,error}=await supabase.from("builder_design_presets").select("id,name,kind,payload").eq("owner_id",userId).order("created_at",{ascending:false}).limit(200);setBusy(false);if(error){setError("Design library unavailable. Check migration and permissions.");return;}setEntries((data||[]) as Entry[]);setError("");};
 useEffect(()=>{setEntries([]);void load();},[userId]);
 const save=async(kind:Entry["kind"])=>{
  if(!name.trim()||busy)return;
  const payload:DesignPreset=kind==="motion"?{version:1,kind,sections:[],motion:normalizeBlockMotion(selected?.content?.builderMotion)}:createDesignPreset(kind==="section"&&selected?[selected]:kind==="page"?sections:[],kind,generateId);
  if(kind!=="motion"&&!payload.sections.length){toast.error("Select a supported section or page.");return;}
  setBusy(true);const {error}=await supabase.from("builder_design_presets").insert({owner_id:userId,name:name.trim().slice(0,100),kind,payload});setBusy(false);
  if(error){toast.error("Design could not be saved.");return;}setName("");toast.success("Design saved to your private library.");void load();
 };
 const remove=async(id:string)=>{if(!window.confirm("Delete this design preset?"))return;const {error}=await supabase.from("builder_design_presets").delete().eq("id",id).eq("owner_id",userId);if(error)toast.error("Could not delete preset.");else void load();};
 return <div className="space-y-2 border-t border-slate-200 pt-3"><h3>My cloud design library</h3><p>Layouts and motion presets. Customer copy, images, destinations and proof are removed before saving.</p>{error&&<p role="alert">{error}</p>}
 <Input aria-label="Design preset name" maxLength={100} value={name} onChange={event=>setName(event.target.value)} placeholder="Name your design"/>
 <Button type="button" size="sm" variant="outline" disabled={busy||!name.trim()||!selected} onClick={()=>void save("section")}>Save selected section</Button>
 <Button type="button" size="sm" variant="outline" disabled={busy||!name.trim()||!sections.length} onClick={()=>void save("page")}>Save page layout</Button>
 <Button type="button" size="sm" variant="outline" disabled={busy||!name.trim()||!selected} onClick={()=>void save("motion")}>Save section motion</Button>
 <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={()=>void load()}>Refresh library</Button>
 {entries.map(entry=><div key={entry.id} className="rounded border border-slate-200 p-2 space-y-1"><strong className="text-xs break-words">{entry.name}</strong><p className="capitalize">{entry.kind}</p><div className="flex gap-1 flex-wrap"><Button type="button" size="sm" variant="outline" disabled={entry.kind==="motion"&&!selected} onClick={()=>{if(entry.kind==="motion")onMotion(normalizeBlockMotion(entry.payload?.motion));else{const items=instantiateDesignPreset(entry.payload,generateId);if(items.length)onInsert(items);else toast.error("No supported sections.");}}}>{entry.kind==="motion"?"Apply":"Insert"}</Button><Button type="button" variant="ghost" size="sm" onClick={()=>void remove(entry.id)}>Delete</Button></div></div>)}</div>;
}
