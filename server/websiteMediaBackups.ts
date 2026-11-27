const sourceBucket="website-assets",backupBucket="website-backups";
type Site={id:string;business_id:string};
export type MediaEntry={name:string;size:number};
const filename=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
export function validMediaManifest(value:unknown):value is MediaEntry[]{
 return Array.isArray(value)&&value.length<=100&&value.every(v=>v&&typeof v.name==="string"&&filename.test(v.name)&&Number.isSafeInteger(v.size)&&v.size>0&&v.size<=5*1024*1024)&&new Set(value.map(v=>v.name)).size===value.length;
}
function check(r:any){if(r.error)throw r.error;return r.data;}
const prefix=(site:Site)=>"sites/"+site.business_id+"/"+site.id+"/";
const backupPrefix=(site:Site,id:string)=>site.business_id+"/"+site.id+"/"+id+"/";
export const mediaEnabled=()=>process.env.MULTI_SITE_MEDIA_BACKUP==="true";
async function requirePrivateBucket(db:any){
 const bucket=check(await db.storage.getBucket(backupBucket));
 if(!bucket||bucket.public!==false)throw Error("Private website backup bucket is not configured.");
}
async function listMedia(db:any,site:Site):Promise<MediaEntry[]>{
 const rows=check(await db.storage.from(sourceBucket).list(prefix(site).slice(0,-1),{limit:101,sortBy:{column:"name",order:"asc"}}))||[];
 const entries=rows.map((row:any)=>({name:row.name,size:Number(row.metadata?.size)}));
 if(!validMediaManifest(entries))throw Error("Media snapshot exceeds supported bounds (100 immutable files, each up to 5 MB) or has unrecognized paths.");
 return entries;
}
export async function snapshotSiteMedia(db:any,site:Site,backupId:string){
 await requirePrivateBucket(db);
 const entries=await listMedia(db,site);
 const patch=async(media_status:string,media_manifest:MediaEntry[])=>check(await db.from("website_content_backups").update({media_status,media_manifest}).eq("id",backupId).eq("business_id",site.business_id).eq("website_id",site.id));
 await patch("pending",entries);
 try{
  for(let i=0;i<entries.length;i+=4){
   const results=await Promise.allSettled(entries.slice(i,i+4).map(async entry=>check(await db.storage.from(sourceBucket).copy(prefix(site)+entry.name,backupPrefix(site,backupId)+entry.name,{destinationBucket:backupBucket}))));
   if(results.some(r=>r.status==="rejected"))throw Error("One or more media objects could not be copied.");
  }
  await patch("complete",entries);return entries.length;
 }catch(e){await patch("failed",entries);throw e;}
}
export async function restoreSiteMedia(db:any,site:Site,backupId:string,manifest:unknown){
 if(!validMediaManifest(manifest))throw Error("Invalid backup media manifest");
 await requirePrivateBucket(db);
 const existing=new Map((await listMedia(db,site)).map(v=>[v.name,v.size]));
 for(const entry of manifest){
  if(existing.has(entry.name)){if(existing.get(entry.name)!==entry.size)throw Error("Existing media differs from backup; no object overwritten.");continue;}
  check(await db.storage.from(backupBucket).copy(backupPrefix(site,backupId)+entry.name,prefix(site)+entry.name,{destinationBucket:sourceBucket}));
 }
}
