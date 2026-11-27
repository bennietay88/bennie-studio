import test from "node:test";
import assert from "node:assert/strict";
import {createPublicContentResource} from "../src/lib/publicContentResource";
import {publicRouteKind,needsPortfolioContent} from "../src/lib/publicRouteLoading";
test("public resource deduplicates concurrent reads and keeps the resolved snapshot",async()=>{
 let calls=0;
 const resource=createPublicContentResource("default",async()=>{calls++;return "published";});
 const first=resource.ensure();
 assert.equal(first,resource.ensure());
 assert.equal(await first,"published");
 assert.equal(resource.getSnapshot(),"published");
 assert.equal(await resource.ensure(),"published");
 assert.equal(calls,1);
});
test("timeout settles once and ignores late content",async()=>{
 let resolve!: (value:string)=>void;
 const resource=createPublicContentResource("default",()=>new Promise(r=>{resolve=r;}),20);
 assert.equal(await resource.ensure(),"default");
 resolve("late");
 await new Promise(r=>setTimeout(r,10));
 assert.equal(resource.getSnapshot(),"default");
 assert.equal(resource.isSettled(),true);
});
test("force refresh publishes new data to subscribed components",async()=>{
 let calls=0,notifications=0;
 const resource=createPublicContentResource(0,async()=>++calls);
 const unsubscribe=resource.subscribe(()=>notifications++);
 await resource.ensure();
 await resource.ensure(true);
 assert.equal(resource.getSnapshot(),2);
 assert.equal(notifications,2);
 unsubscribe();
});
test("public prefetch never includes private routes",()=>{
 for(const path of ["/dashboard","/admin","/checkout/success","/login","/preview/prospect/123","/w/123","/proposal/token","/review/private","/preview-order"])assert.equal(publicRouteKind(path),null,path);
 assert.equal(publicRouteKind("/case-studies/showcase/auto-detailing/preview/services"),"showcase-preview");
 assert.equal(publicRouteKind("/case-studies"),"portfolio");
 assert.equal(publicRouteKind("/pricing"),"marketing");
 assert.equal(needsPortfolioContent(publicRouteKind("/case-studies/showcase/auto-detailing")),true);
});
