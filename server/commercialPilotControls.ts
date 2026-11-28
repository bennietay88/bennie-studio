import {createHmac,timingSafeEqual} from "node:crypto";
import {COMMERCIAL_PILOTS} from "../src/lib/commercialExecution.js";
export const PILOT_SETTINGS_ID="commercial_pilot_release";
export type PilotRelease={enabled:boolean;terms:string;approvedAt:string;approvedBy:string};
export function signPilotRelease(id:string,release:PilotRelease,secret:string){
 if(!secret)throw Error("Signing unavailable");
 return createHmac("sha256",secret).update(JSON.stringify(["pilot-release-v1",id,release.enabled,release.terms,release.approvedAt,release.approvedBy])).digest("hex");
}
export function readPilotRelease(id:string,row:any,secret:string):PilotRelease|null{
 if(!secret||!COMMERCIAL_PILOTS.some(p=>p.id===id)||!row||typeof row.enabled!=="boolean"||typeof row.terms!=="string"||row.terms.trim().length<20||!row.approvedAt||!row.approvedBy)return null;
 const {enabled,terms,approvedAt,approvedBy}=row;const release={enabled,terms,approvedAt,approvedBy};
 const actual=Buffer.from(String(row.signature||"")),expected=Buffer.from(signPilotRelease(id,release,secret));
 return actual.length===expected.length&&timingSafeEqual(actual,expected)?release:null;
}
export async function readPilotControls(db:any,secret:string){
 const {data,error}=await db.from("settings").select("content,updated_at").eq("id",PILOT_SETTINGS_ID).maybeSingle();
 if(error)throw error;
 const releases=Object.fromEntries(COMMERCIAL_PILOTS.map(p=>[p.id,readPilotRelease(p.id,data?.content?.[p.id],secret)]));
 return {releases,updatedAt:data?.updated_at||null,raw:data?.content||{}};
}
