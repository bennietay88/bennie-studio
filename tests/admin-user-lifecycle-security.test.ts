import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("api/index.ts", "utf8");
const admin = readFileSync("src/components/SuperAdminDashboard.tsx", "utf8");
const protectedRoute = readFileSync("src/components/ProtectedRoute.tsx", "utf8");

test("super admin user lifecycle mutations are server-owned", () => {
  for (const route of [
    "/api/admin/users/:userId/status",
    "/api/admin/users/bulk-suspend",
    "/api/admin/users/:userId/role",
    "/api/admin/users/:userId/terminate",
    "/api/admin/users/:userId",
  ]) {
    assert.match(api, new RegExp(route.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")));
  }

  const directProfileMutation = /\.from\("profiles"\)[\s\S]{0,250}?\.(?:update|delete)\(/g;
  assert.equal(directProfileMutation.test(admin), false);
});

test("permanent admin deletion removes auth user without cascading owned businesses", () => {
  assert.match(api, /Terminate this user before permanently deleting the account/);
  assert.match(api, /\.from\("businesses"\)[\s\S]{0,300}?\.update\(\{ owner_id: null \}\)/);
  assert.match(api, /\.from\("api_keys"\)[\s\S]{0,300}?\.update\(\{ created_by: null \}\)/);
  assert.match(api, /supabaseAdmin\.auth\.admin\.deleteUser\(userId\)/);
});

test("disabled accounts cannot use protected admin surfaces", () => {
  assert.match(api, /\["suspended", "terminated"\]\.includes/);
  assert.match(protectedRoute, /profile\?\.status === "suspended" \|\| profile\?\.status === "terminated"/);
});

test("terminated users expose permanent deletion while suspended users can be restored", () => {
  assert.match(admin, /Permanently Delete User/);
  assert.match(admin, /Restore Access/);
  assert.match(admin, /\/api\/admin\/users\/\$\{encodeURIComponent\(userId\)\}\/status/);
});
