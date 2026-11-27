import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("portfolio and site editor are protected routes with a tenant-scoped lookup",()=>{
 const app=readFileSync("src/App.tsx","utf8");
 const portfolio=readFileSync("src/components/WebsitePortfolio.tsx","utf8");
 const workspace=readFileSync("src/components/WebsitePortfolioEditor.tsx","utf8");
 assert.match(app,/path="websites" element=\{<ProtectedRoute/);
 assert.match(app,/path="websites\/:siteId" element=\{<ProtectedRoute/);
 assert.match(portfolio,/\.eq\("business_id", businessId\)/);
 assert.match(workspace,/\.eq\("business_id",businessId\)\.eq\("id",siteId\)/);
 assert.match(workspace,/key=\{scope\} websiteIdOverride=\{siteId\}/);
});
test("exact-site editor never falls through to the newest website and guards unsupported shared operations",()=>{
 const editor=readFileSync("src/components/WebsiteEditor.tsx","utf8");
 assert.match(editor,/if \(!isTemplateMode && websiteIdOverride\) \{\s*return supabase\.from\("websites"\)\.select\("\*"\)\.eq\("business_id", id\)\.eq\("id", websiteIdOverride\)\.maybeSingle\(\)/);
 assert.match(editor,/filter: websiteIdOverride \? `id=eq\.\$\{websiteIdOverride\}`/);
 assert.match(editor,/if \(showGenerator && !websiteIdOverride\)/);
 assert.match(editor,/if \(websiteIdOverride && activeTab === "tracking"\)/);
 assert.match(editor,/\.update\(updatedWebsiteConfig\)\s*\.eq\("id", website.id\)\s*\.eq\("business_id", website.businessId\)/);
 assert.match(editor,/if \(websiteIdOverride\) \{ toast.info\("Independent publication requires/);
});
