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

test("permanent admin deletion preserves businesses, cleans internal states, and protects live billing", () => {
  assert.match(api, /Terminate this user before permanently deleting the account/);
  assert.match(api, /stripe_subscription_id/);
  assert.match(api, /requiresBillingCancellation: true/);
  assert.match(api, /internalProtectedBusinessIds/);
  assert.match(api, /subscription_status: "canceled"/);
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


test("admin lifecycle JSON bodies are parsed before privileged routes without consuming Stripe webhook bytes", () => {
  const parserRegistration = api.indexOf("const jsonBodyParser = express.json");
  const parserUse = api.indexOf("return jsonBodyParser(req, res, next)");
  const adminStatusRoute = api.indexOf('"/api/admin/users/:userId/status"');
  const webhookRoute = api.indexOf('"/api/webhook"');

  assert.ok(parserRegistration >= 0, "expected reusable JSON body parser");
  assert.ok(parserUse >= 0 && parserUse < adminStatusRoute, "JSON parser must run before admin user routes");
  assert.ok(webhookRoute >= 0, "Stripe webhook route must remain registered");
  // Both signed providers must see the raw request bytes; admin JSON must still be parsed.
  assert.match(api, /if \(req\.path === "\/api\/webhook" \|\| req\.path === "\/api\/webhooks\/resend"\) return next\(\);/);
  assert.match(api, /app\.post\("\/api\/webhooks\/resend", express\.raw/);
  assert.match(api, /express\.raw\(\{ type: "application\/json" \}\)/);
});
