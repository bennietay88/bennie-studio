import test from "node:test";import assert from "node:assert/strict";import {resolveSiteBusiness} from "../server/websiteAdminScope";import {readFileSync} from "node:fs";
test("admin scope derives actual site owner and rejects inactive or unauthorized users",async()=>{
 let queried=false;const db={from:()=>{queried=true;return {select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{business_id:"owner"}})})})})}}};
 assert.equal(await resolveSiteBusiness(db,{status:"active",role:"business_admin",business_id:"own"},"site"),"own");assert.equal(queried,false);
 assert.equal(await resolveSiteBusiness(db,{status:"active",role:"platform_staff"},"site"),null);assert.equal(await resolveSiteBusiness(db,{status:"suspended",role:"super_admin"},"site"),null);assert.equal(queried,false);
 assert.equal(await resolveSiteBusiness(db,{status:"active",role:"super_admin"},"site"),"owner");assert.equal(queried,true);
});
test("unified workspace connects management controls and does not impersonate customer approval",()=>{
 const ui=readFileSync("src/components/WebsiteOperationsAdmin.tsx","utf8");
 for(const component of ["WebsiteEditor","WebsiteDomainPanel","WebsiteReleasePanel","WebsiteRedirectPanel","WebsiteBackupPanel","WebsiteContentExport","WebsiteSiteOverview","WebsiteAllowanceAdmin","CommercialPanel","WebsiteAuditPanel"])assert.match(ui,new RegExp("<"+component));
 assert.match(readFileSync("server/websiteReleaseRoutes.ts","utf8"),/staffAction!==staff/);
});
