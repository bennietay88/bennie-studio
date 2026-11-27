import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
test("site AI identity is propagated and checked before credit deductions",()=>{
 const api=read("api/index.ts");
 assert.match(read("src/lib/gemini.ts"),/website_id: options.websiteId/);
 assert.match(api,/\.eq\("id",website_id\)\.eq\("business_id",project_id\)\.eq\("status","draft"\)/);
 assert.match(api,/\.\.\.\(website_id\?\{website_id\}:\{\}\)/);
});
test("site asset uploads use authenticated signed paths and actual storage metadata",()=>{
 assert.match(read("src/components/ImageUpload.tsx"),/uploadToSignedUrl/);
 assert.match(read("server/websitePortfolioRoutes.ts"),/path="sites\/"\+profile.business_id\+"\/"\+siteId.data/);
 const sql=read("supabase/rollout/multi_site_lifecycle.sql");
 assert.match(sql,/from storage.objects where bucket_id='website-assets'/);
 assert.match(sql,/project_id=p_business and website_id=p_website/);
});
test("publication and both custom host resolvers enforce paid site capacity",()=>{
 for(const p of ["middleware.ts","api/index.ts","server/websiteReleaseRoutes.ts"])assert.match(read(p),/website_slot_available/);
});
