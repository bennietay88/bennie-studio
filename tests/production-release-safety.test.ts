import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/supabase-migrations.yml", "utf8");
const reports = readFileSync("supabase/migrations/20261107120000_monthly_growth_reporting_workflow.sql", "utf8");

test("production migrations can only be explicitly dispatched, never triggered by a main push", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s{2}push:/m);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /APPLY_PRODUCTION_MIGRATIONS/);
  assert.match(workflow, /environment: production/);
});

test("monthly growth RLS uses existing production private admin predicate", () => {
  assert.match(reports, /private\.is_super_admin\(\)/);
  assert.doesNotMatch(reports, /public\.is_super_admin\(\)/);
  assert.match(reports, /CREATE POLICY "Customers read published monthly growth reports"/);
  assert.match(reports, /CREATE POLICY "Super admins manage monthly growth reports"/);
});
