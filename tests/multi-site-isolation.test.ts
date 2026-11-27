import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {choosePrimaryWebsite} from "../src/lib/primaryWebsite";
import {websiteCapacity} from "../src/lib/websiteEntitlements";
test("primary is stable even when a secondary appears first",()=>{
 const primary={id:"a",is_primary:true}, secondary={id:"b",is_primary:false};
 assert.equal(choosePrimaryWebsite([secondary,primary]),primary);
 assert.equal(choosePrimaryWebsite([secondary]),secondary);
 assert.equal(choosePrimaryWebsite([]),null);
 assert.throws(()=>choosePrimaryWebsite([secondary,{id:"c",is_primary:false}]),/AMBIGUOUS_PRIMARY_WEBSITE/);
 assert.throws(()=>choosePrimaryWebsite([primary,{id:"c",is_primary:true}]),/AMBIGUOUS_PRIMARY_WEBSITE/);
});
test("website capacity is independent of projects and pages",()=>{
 const result=websiteCapacity({websiteLimit:2,websitesUsed:3,projectLimit:10,pagesPerWebsite:5,locationPagesPerWebsite:2});
 assert.deepEqual(result,{websiteLimit:2,websitesUsed:3,websitesRemaining:0,projectLimit:10,pagesPerWebsite:5,locationPagesPerWebsite:2});
});
test("overview, quota and archive guards remain connected",()=>{
 const routes=readFileSync("server/websitePortfolioRoutes.ts","utf8");
 const workspace=readFileSync("src/components/WebsitePortfolioEditor.tsx","utf8");
 const sql=readFileSync("supabase/rollout/multi_site_lifecycle.sql","utf8");
 assert.match(routes,/countQuery=countQuery\.is\("archived_at",null\)/);
 assert.match(routes,/\.eq\("business_id",businessId\)\.eq\("website_id",siteId\)/);
 assert.match(workspace,/site&&!site\.archived_at\?site:null/);
 assert.match(workspace,/<WebsiteSiteOverview/);
 assert.match(sql,/if old\.archived_at is not null then\s+raise exception 'WEBSITE_ARCHIVED'/);
});
