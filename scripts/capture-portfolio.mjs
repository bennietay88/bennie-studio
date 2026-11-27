import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { DEFAULT_PORTFOLIO_ITEMS } from "../src/lib/portfolioCatalog.ts";

const origin = process.env.PORTFOLIO_CAPTURE_URL || "http://127.0.0.1:4173";
const dir = "public/images/case-studies/captures";
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
const hashes=new Set();
const items=DEFAULT_PORTFOLIO_ITEMS.filter(item=>item.published);

async function capture(item,mobile) {
 const viewport=mobile?{width:390,height:844}:{width:1440,height:900};
 const page=await browser.newPage({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:"reduce",colorScheme:"light"});
 try {
  await page.route("**/api/public/site-config",route=>route.fulfill({json:{platform:{maintenanceMode:false,salesCookieBannerEnabled:false},landingPage:null,policies:[],posts:[]}}));
  await page.route("**/api/public/studio-showcases",route=>route.fulfill({json:{showcases:{}}}));
  await page.route("**/api/public/platform-site-cms",route=>route.fulfill({json:{content:null}}));
  await page.route("**/api/platform-events",route=>route.fulfill({json:{success:true}}));
  await page.route("**/auth/v1/**",route=>route.fulfill({status:200,headers:{"access-control-allow-origin":"*"},json:{user:null,session:null}}));
  await page.route("**/rest/v1/**",route=>route.fulfill({status:200,headers:{"access-control-allow-origin":"*"},json:[]}));
  const response=await page.goto(origin+"/case-studies/showcase/"+item.slug+"/preview",{waitUntil:"domcontentloaded",timeout:45000});
  if(!response?.ok()) throw Error(item.slug+" HTTP "+response?.status());
  const heading=page.locator("main h1").first();
  await heading.waitFor({state:"visible",timeout:30000});
  const title=(await heading.innerText()).trim();
  if(!title||/unavailable|not found|loading/i.test(title)) throw Error(item.slug+" rendered "+title);
  await page.evaluate(async()=>{
   await document.fonts.ready;
   const images=[...document.images];
   for(const image of images) image.loading="eager";
   await Promise.race([Promise.allSettled(images.map(image=>image.decode())),new Promise(resolve=>setTimeout(resolve,8000))]);
   window.scrollTo(0,0);
  });
  const kind=mobile?"mobile":"desktop";
  const full=await page.screenshot({fullPage:true,type:"jpeg",quality:84,animations:"disabled"});
  if(full.length<1024||full.length>4000000) throw Error(item.slug+" "+kind+" invalid size "+full.length);
  await writeFile(dir+"/"+item.slug+"-"+kind+".jpg",full);
  if(!mobile){
   const shot=await page.screenshot({type:"png",animations:"disabled"});
   const webp=await page.evaluate(async data=>{
    const image=new Image();image.src=data;await image.decode();
    const canvas=document.createElement("canvas");canvas.width=960;canvas.height=600;
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
    ctx.drawImage(image,0,0,960,600);
    return canvas.toDataURL("image/webp",0.86);
   },"data:image/png;base64,"+shot.toString("base64"));
   if(!webp.startsWith("data:image/webp;base64,"))throw Error("WebP encoding failed");
   const bytes=Buffer.from(webp.split(",")[1],"base64");
   const hash=createHash("sha256").update(bytes).digest("hex");
   if(hashes.has(hash)||bytes.length<1024||bytes.length>500000)throw Error("Invalid cover: "+item.slug);
   hashes.add(hash);await writeFile(dir+"/"+item.slug+"-cover.webp",bytes);
  }
  console.log(item.slug+" "+kind+": "+title+" ("+full.length+" bytes)");
 }finally{await page.close();}
}
try{
 for(const item of items){await capture(item,false);await capture(item,true);}
 if(hashes.size!==18||items.length!==18)throw Error("Incomplete capture set");
 console.log("Captured all 18 demo websites across both devices.");
}finally{await browser.close();}
