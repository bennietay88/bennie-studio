import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261107042454_enforce_monthly_update_allowance.sql", import.meta.url), "utf8");
const reportingMigration = await readFile(new URL("../supabase/migrations/20261107120000_monthly_growth_reporting_workflow.sql", import.meta.url), "utf8");

test("monthly update submission is authenticated, tenant-scoped and plan-limited in the database", () => {
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /p\.business_id = v_business_id/);
  assert.match(migration, /WHERE b\.id = v_business_id\s+FOR UPDATE/);
  assert.match(migration, /p\.monthly_update_limit/);
  assert.match(migration, /monthly_update_allowance_exceeded/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.submit_monthly_update_request\(jsonb\) TO authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.submit_monthly_update_request\(jsonb\) FROM PUBLIC, anon/);
});

test("allowance retries are idempotent and rejected or unsent requests do not consume quota", () => {
  assert.match(migration, /r\.client_request_id = v_request_id/);
  assert.match(migration, /RETURN v_existing/);
  assert.match(migration, /r\.status NOT IN \('draft', 'declined', 'cancelled'\)/);
});

test("monthly report customer RLS exposes published tenant reports and manual drafts only", () => {
  assert.match(reportingMigration, /DROP POLICY IF EXISTS "Business users manage own monthly growth reports"/);
  assert.match(reportingMigration, /CREATE POLICY "Customers read published monthly growth reports"[\s\S]+status = 'published'[\s\S]+SELECT p\.business_id FROM public\.profiles p WHERE p\.id = auth\.uid\(\)/);
  assert.match(reportingMigration, /CREATE POLICY "Customers create manual monthly growth report drafts"[\s\S]+status = 'draft'[\s\S]+source_kind = 'manual'/);
  assert.match(reportingMigration, /CREATE POLICY "Super admins manage monthly growth reports"[\s\S]+private\.is_super_admin\(\)/);
});
