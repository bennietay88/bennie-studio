import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path:string) => readFileSync(path,"utf8");
test("workspace styling is scoped away from customer renders",()=>{
 const css=read("src/styles/workspaceUi.css");
 assert.ok(css.includes(".bt-workspace-main"));
 assert.ok(css.includes(":not(.bt-website-renderer *, .bt-builder-canvas *)"));
 assert.ok(css.includes("prefers-reduced-motion:reduce"));
 const dashboard=read("src/components/DashboardLayout.tsx");
 assert.ok(dashboard.includes('id="workspace-main"'));
 assert.ok(dashboard.includes('aria-controls="workspace-sidebar"'));
});
test("website switcher excludes other tenants and archived websites",()=>{
 const editor=read("src/components/WebsitePortfolioEditor.tsx");
 assert.ok(editor.includes('item.business_id===businessId&&!item.archived_at'));
 assert.ok(editor.includes('selectPortfolioSite(portfolio.sites,businessId,siteId)'));
 assert.ok(editor.includes('key={scope} websiteIdOverride={siteId}'));
 assert.ok(editor.includes('aria-label="Switch website"'));
});
test("visual builder preview selection is keyboard accessible without activating rendered CTAs",()=>{
 const builder=read("src/components/VisualBuilderControls.tsx");
 assert.ok(builder.includes('role="button" tabIndex={0}'));
 assert.ok(builder.includes('event.key==="Enter"||event.key===" "'));
 assert.ok(builder.includes('<div inert>'));
 assert.ok(builder.includes('No matching sections'));
});
test("workspace feedback distinguishes loading, empty, error and success",()=>{
 const status=read("src/components/ui/WorkspaceState.tsx");
 for(const kind of ["loading","empty","error","success"]) assert.ok(status.includes(kind));
 assert.ok(status.includes('role={kind === "error" ? "alert" : "status"}'));
 assert.ok(status.includes('aria-busy={kind === "loading" || undefined}'));
 const portfolio=read("src/components/WebsitePortfolio.tsx");
 assert.ok(portfolio.includes('actionLabel="Clear filters"'));
 assert.ok(portfolio.includes('actionLabel="Retry"'));
});
