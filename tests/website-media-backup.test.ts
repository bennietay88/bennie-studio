import test from "node:test";
import assert from "node:assert/strict";
import {validMediaManifest,restoreSiteMedia} from "../server/websiteMediaBackups";
const name="00000000-0000-4000-8000-000000000001.png";
test("media manifests reject traversal, arbitrary shared names, duplicates and excess size",()=>{
 assert.equal(validMediaManifest([{name,size:100}]),true);
 for(const bad of [[{name:"../other.png",size:100}],[{name:"uploads/foo.png",size:100}],[{name,size:0}],[{name,size:6000000}],[{name,size:100},{name,size:100}]])assert.equal(validMediaManifest(bad),false);
});
test("restore copies only missing site files and never overwrites a changed object",async()=>{
 const calls:any[]=[];const site={business_id:"tenant",id:"site"};
 const db={storage:{getBucket:async()=>({data:{public:false}}),from:(bucket:string)=>({list:async()=>({data:[]}),copy:async(from:string,to:string,options:any)=>{calls.push({bucket,from,to,options});return {data:{}};}})}};
 await restoreSiteMedia(db,site,"backup",[{name,size:100}]);
 assert.deepEqual(calls,[{bucket:"website-backups",from:"tenant/site/backup/"+name,to:"sites/tenant/site/"+name,options:{destinationBucket:"website-assets"}}]);
 const conflict={storage:{...db.storage,from:()=>({list:async()=>({data:[{name,metadata:{size:101}}]})})}};
 await assert.rejects(restoreSiteMedia(conflict,site,"backup",[{name,size:100}]),/no object overwritten/);
});
