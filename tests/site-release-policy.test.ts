import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {releaseReviewBlockers,releaseDomainBlockers} from "../src/lib/siteReleasePolicy";
test("both approvals must match the exact current revision",()=>{
 assert.equal(releaseReviewBlockers({revision:"r1",internalRevision:"r1",customerRevision:"r1"}).length,0);
 assert.equal(releaseReviewBlockers({revision:"r2",internalRevision:"r1",customerRevision:"r1"}).length,2);
 assert.equal(releaseReviewBlockers({revision:"r1",internalRevision:"r1",customerRevision:null}).length,1);
 assert.equal(releaseReviewBlockers({revision:"",internalRevision:"",customerRevision:""}).length,2);
});
test("domain prerequisites fail closed",()=>{
 const ready={custom_domain:"example.org",custom_domain_status:"connected",custom_domain_verified_at:"2026-11-27",custom_domain_permission_confirmed:true,custom_domain_suspended:false,ssl_status:"issued"};
 assert.equal(releaseDomainBlockers(ready).length,0);
 for(const patch of [{custom_domain:null},{custom_domain_status:"dns_pending"},{custom_domain_verified_at:null},{custom_domain_permission_confirmed:false},{custom_domain_suspended:true},{ssl_status:"pending"}])assert.equal(releaseDomainBlockers({...ready,...patch}).length,1);
});
test("release endpoints and UI are registered and mutations compare revisions",()=>{
 const routes=readFileSync("server/websiteReleaseRoutes.ts","utf8");
 const registry=readFileSync("server/websitePortfolioRoutes.ts","utf8");
 const customer=readFileSync("src/components/WebsitePortfolioEditor.tsx","utf8");
 const admin=readFileSync("src/components/SuperAdminDashboard.tsx","utf8");
 const sql=readFileSync("supabase/rollout/multi_site_lifecycle.sql","utf8");
 assert.match(registry,/registerWebsiteReleaseRoutes\(app,db,authenticate,getProfile\)/);
 assert.match(routes,/\.eq\("release_revision",revision\)\.eq\("updated_at",site.updated_at\)/);
 assert.match(routes,/staffAction!==staff/);
 assert.match(customer,/<WebsiteReleasePanel/);
 assert.match(admin,/<WebsiteReleaseQueue/);
 assert.match(sql,/new\.customer_approved_revision is distinct from new\.release_revision/);
 assert.match(sql,/UNPUBLISH_BEFORE_EDITING/);
});
