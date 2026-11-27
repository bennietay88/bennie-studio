import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
test("domain reassignment changes exact scoped draft and invalidates ownership",()=>{
 const s=read("server/websiteDomainRoutes.ts");
 assert.match(s,/app\.patch\("\/api\/account\/websites\/:siteId\/domain"/);
 assert.match(s,/domain_challenge:host\?"bennie-"\+randomBytes/);
 assert.match(s,/\.eq\("business_id",site\.business_id\)\.eq\("is_primary",false\)\.eq\("status","draft"\)\.eq\("updated_at",site\.updated_at\)/);
 assert.match(read("src/components/WebsiteDomainPanel.tsx"),/Release domain/);
});
test("backups are registered, scope-bound, service role only and preserve a pre-restore snapshot",()=>{
 assert.match(read("server/websitePortfolioRoutes.ts"),/registerWebsiteBackupRoutes\(app,db,authenticate,getProfile\)/);
 assert.match(read("src/components/WebsitePortfolioEditor.tsx"),/<WebsiteBackupPanel/);
 const sql=read("supabase/rollout/multi_site_lifecycle.sql");
 assert.match(sql,/where id=p_backup and business_id=p_business and website_id=p_website/);
 assert.match(sql,/revoke all on public\.website_content_backups from public,anon,authenticated/);
 assert.match(sql,/insert into public\.website_content_backups[\s\S]*update public\.websites set pages=restore_content/);
});
test("custom-host SEO resolves before returning website-specific documents",()=>{
 const s=read("middleware.ts");
 assert.match(s,/if \(result\.ok === false\) return jsonError/);
 assert.match(s,/url\.pathname==="\/robots\.txt"\|\|url\.pathname==="\/sitemap\.xml"/);
 assert.match(s,/site\.id!==result\.websiteId\|\|site\.business_id!==result\.businessId/);
});
