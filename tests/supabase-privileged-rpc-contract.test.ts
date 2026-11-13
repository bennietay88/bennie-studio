import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20261113034253_harden_authenticated_rpc_definer_exposure_20261113.sql", import.meta.url), "utf8");
const functionNames = [
  "account_service_contract",
  "admin_update_monthly_update_request",
  "customer_respond_monthly_update_request",
  "escalate_monthly_update_request",
  "get_monthly_update_allowance",
  "grant_monthly_update_allowance_override",
  "list_monthly_update_allowance_overrides",
  "revoke_monthly_update_allowance_override",
  "submit_monthly_update_request",
];

test("privileged customer-service RPCs retain public signatures but not privileged public implementations", () => {
  assert.equal(functionNames.length, 9);
  for (const name of functionNames) assert.ok(migration.includes("'" + name + "'"), name);
  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS app_rpc_impl/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION app_rpc_impl\./);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.%I/);
  assert.match(migration, /SECURITY INVOKER/);
  assert.match(migration, /v_count <> 9/);
});

test("RPC access remains authenticated-only and private implementations stay outside exposed schema", () => {
  assert.match(migration, /REVOKE ALL ON SCHEMA app_rpc_impl FROM PUBLIC, anon/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.%I\(%s\) FROM PUBLIC, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.%I\(%s\) TO authenticated, service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION app_rpc_impl\.%I\(%s\) TO authenticated, service_role/);
  assert.doesNotMatch(migration, /leaked_password_protection\s*=\s*/i);
});
