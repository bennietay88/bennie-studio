import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {registerWebsiteOperationsRoutes} from "../server/websiteOperationsRoutes";

test("website operations navigation and customer export are connected",()=>{
 const read=(p:string)=>readFileSync(p,"utf8");
 assert.match(read("src/components/Sidebar.tsx"),/\/admin\/website_operations/);
 assert.match(read("src/components/SuperAdminDashboard.tsx"),/activeTab === "website_operations" && <WebsiteOperationsAdmin/);
 assert.match(read("src/constants/staffPermissions.ts"),/website_operations: "delivery"/);
 assert.match(read("src/components/WebsitePortfolioEditor.tsx"),/<WebsiteContentExport/);
 assert.match(read("src/components/WebsiteContentExport.tsx"),/result\.businessId!==businessId\|\|result\.website\?\.id!==siteId/);
});
test("export rejects non-admins before touching database",async()=>{
 const routes=new Map<string,any>();
 const app={get:(path:string,_auth:any,handler:any)=>routes.set(path,handler),post:()=>{}};
 const db={from:()=>{throw new Error("Unauthorized database access");}};
 registerWebsiteOperationsRoutes(app,db,()=>{},async()=>({role:"client",status:"active",business_id:"tenant"}));
 let status=200;let body:any;
 const res={setHeader:()=>{},status:(n:number)=>{status=n;return res;},json:(x:any)=>{body=x;return res;}};
 await routes.get("/api/account/websites/:siteId/export")({params:{siteId:"82cf5017-12bc-45cc-8220-f604704b18a0"},user:{id:"actor"}},res);
 assert.equal(status,403);assert.match(body.error,/administrator/);
});
