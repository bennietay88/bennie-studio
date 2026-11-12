import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("api/index.ts", "utf8");
const hooks = readFileSync("src/hooks/useFunnelTier.ts", "utf8");
const workspace = readFileSync("src/components/funnels/FunnelWorkspace.tsx", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const sidebar = readFileSync("src/components/Sidebar.tsx", "utf8");
const admin = readFileSync("src/components/SuperAdmin/AdminFunnels.tsx", "utf8");
const automation = readFileSync("server/funnelAutomation.ts", "utf8");
const migration = readFileSync("supabase/migrations/20261112200000_unified_funnel_entitlements.sql", "utf8");

test("new funnel billing is dark-launched and does not require new tables in legacy production", () => {
  assert.match(api, /UNIFIED_FUNNEL_TIERS_ENABLED = process\.env\.UNIFIED_FUNNEL_TIERS_ENABLED === "true"/);
  assert.match(api, /if \(UNIFIED_FUNNEL_TIERS_ENABLED\) registerUnifiedFunnelTierRoutes/);
  assert.match(api, /UNIFIED_FUNNEL_TIERS_ENABLED \? unifiedFunnelMayServe\(supabaseAdmin, funnel\)/);
  assert.match(api, /Promise\.resolve\(true\); \/\/ preserve existing published advanced funnel traffic/);
  assert.match(api, /UNIFIED_FUNNEL_TIERS_ENABLED\s*\?\s*await processFunnelTriggerQueue/);
  assert.match(api, /UNIFIED_FUNNEL_TIERS_ENABLED \? await getUnifiedFunnelAccess/);
  assert.match(api, /if \(UNIFIED_FUNNEL_TIERS_ENABLED\) await cancelUnifiedFunnelWithParent/);
  assert.match(api, /await runFunnelAutomations\(\{/);
  assert.match(automation, /process\.env\.UNIFIED_FUNNEL_TIERS_ENABLED === "true"/);
});

test("customer builder continues to work before the SQL publish RPC exists", () => {
  assert.match(hooks, /UNIFIED_FUNNEL_TIERS_UI_ENABLED = import\.meta\.env\.VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true"/);
  assert.match(hooks, /LEGACY_ACCESS/);
  assert.match(workspace, /import\.meta\.env\.VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true"/);
  assert.match(workspace, /supabase\.rpc\("publish_funnel_safely"/);
  assert.match(workspace, /supabase\.from\("funnels"\)/);
  assert.match(workspace, /supabase\.from\("funnel_steps"\)/);
  assert.match(sidebar, /VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true"/);
  assert.match(admin, /VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true"/);
  assert.match(app, /VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true"/);
});

test("migration remains disabled by default and has valid SQL block delimiters", () => {
  assert.match(migration, /"enabled": false/);
  assert.match(migration, /create or replace function public\.publish_funnel_safely/);
  assert.match(migration, /returns void language plpgsql security invoker set search_path = ''\s+as \$funnel_publish\$\s+declare/);
  assert.match(migration, /end\s+\$funnel_publish\$;\s+revoke all on function public\.publish_funnel_safely/);
  assert.doesNotMatch(migration, /\bas \$\s+declare/);
});
