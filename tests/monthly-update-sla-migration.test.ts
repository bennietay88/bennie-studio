import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const allowance = readFileSync("supabase/migrations/20261107042454_enforce_monthly_update_allowance.sql", "utf8");
const workflow = readFileSync("supabase/migrations/20261107050240_update_request_sla_scope_escalations.sql", "utf8");
const customerUi = readFileSync("src/components/MonthlyUpdateRequests.tsx", "utf8");
const adminUi = readFileSync("src/components/SuperAdmin/MonthlyUpdateQueue.tsx", "utf8");

test("monthly update submissions enforce allowance under a business row lock and stable idempotency key", () => {
  assert.match(allowance, /FOR UPDATE/);
  assert.match(allowance, /client_request_id = v_request_id/);
  assert.match(allowance, /COALESCE\(r\.consumes_allowance, true\)/);
  assert.match(allowance, /monthly_update_allowance_overrides/);
  assert.match(customerUi, /submit_monthly_update_request/);
  assert.match(customerUi, /get_monthly_update_allowance/);
});

test("customer wait pauses and resumes the SLA with a customer response and an audit event", () => {
  assert.match(workflow, /clock_timestamp\(\) - COALESCE\(OLD\.sla_paused_at/);
  assert.match(workflow, /customer_respond_monthly_update_request/);
  assert.match(workflow, /customer_response/);
  assert.match(workflow, /UNIQUE \(request_id, idempotency_key\)/);
  assert.match(customerUi, /SLA has resumed/);
});

test("scope classification, internal escalation and allowance exceptions record reasons", () => {
  for (const rpc of ["admin_update_monthly_update_request", "escalate_monthly_update_request", "grant_monthly_update_allowance_override", "revoke_monthly_update_allowance_override", "list_monthly_update_allowance_overrides"]) {
    assert.match(workflow, new RegExp(`FUNCTION public\\.${rpc}`));
  }
  assert.match(workflow, /scope_classified/);
  assert.match(workflow, /sla_escalated/);
  assert.match(workflow, /allowance_override_granted/);
  assert.match(workflow, /allowance_override_revoked/);
  assert.match(adminUi, /Save scope classification/);
  assert.match(adminUi, /Escalate internally/);
  assert.match(adminUi, /Grant one extra slot/);
  assert.match(adminUi, /Review allowance exception history/);
  assert.match(adminUi, /Revoke override/);
});
