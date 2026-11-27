import { mkdir, copyFile, readFile, writeFile, stat } from "node:fs/promises";
import { DEMO_PHOTOGRAPHY } from "../src/lib/demoPhotography.ts";
const dest="public/images/case-studies/photography";
await mkdir(dest,{recursive:true});
for(const [slug,photo] of Object.entries(DEMO_PHOTOGRAPHY)){
 const path=dest+"/"+slug+".jpg";
 try{if((await stat(path)).size>1024){console.log(slug+" existing asset");continue;}}catch{}
 if(photo.source.startsWith("/template-assets/"))await copyFile("public"+photo.source,path);
 else{
  const id=photo.source.match(/\/photo\/(\d+)\/$/)?.[1];
  if(!id)throw Error("Invalid photo source "+slug);
  const url="https://images.pexels.com/photos/"+id+"/pexels-photo-"+id+".jpeg?auto=compress&cs=tinysrgb&w=1200";
  let bytes;
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw Error("HTTP "+response.status);
    bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length<1024||bytes.length>4000000||bytes[0]!==0xff||bytes[1]!==0xd8)throw Error("Invalid JPEG");
    break;
   }catch(error){if(attempt===2)throw Error(slug+": "+error.message);await new Promise(r=>setTimeout(r,1500));}
  }
  await writeFile(path,bytes);
 }
 const bytes=await readFile(path);
 if(bytes.length<1024||bytes[0]!==0xff||bytes[1]!==0xd8)throw Error("Invalid asset "+path);
 console.log(slug+" "+bytes.length+" bytes");
}
