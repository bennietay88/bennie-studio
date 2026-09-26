import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = readFileSync("api/index.ts", "utf8");
const sales = readFileSync("server/salesOperations.ts", "utf8");
const prospects = readFileSync("src/components/SuperAdmin/ProspectExplorer.tsx", "utf8");
const onboarding = readFileSync("src/components/SuperAdmin/ClientOnboarding.tsx", "utf8");
const approvals = readFileSync("src/components/CustomerApprovals.tsx", "utf8");

test("prospect engagement API exposes messages and tasks", () => {
  assert.match(api, /\/api\/admin\/prospects\/:prospectId\/engagement/);
  assert.match(api, /sales_messages/);
  assert.match(api, /sales_tasks/);
  assert.match(prospects, /Sales Inbox/);
  assert.match(prospects, /Client reply/);
});

test("direct outreach can reply to a stored inbound message", () => {
  assert.match(sales, /replyToMessageId\?: string \| null/);
  assert.match(sales, /reply_to_message_id: replyToMessageId/);
  assert.match(api, /replyToMessageId: UUID_SCHEMA\.optional\(\)\.nullable\(\)/);
  assert.match(prospects, /Personal reply sent from Prospect Explorer/);
});

test("prospect conversion creates the connected customer handoff", () => {
  assert.match(api, /\/api\/admin\/prospects\/:prospectId\/convert/);
  assert.match(api, /prospect-business:/);
  assert.match(api, /Awaiting customer onboarding/);
  assert.match(api, /awaiting_onboarding/);
  assert.match(prospects, /Convert to Customer/);
  assert.match(prospects, /Create Customer Workspace/);
});

test("preview-to-outreach workflow is visible in the prospect table", () => {
  assert.match(prospects, /Prepare & Email/);
  assert.match(prospects, /preview_generated_at/);
  assert.match(prospects, /\/api\/admin\/website-audit/);
});

test("approval requests and customer responses update lifecycle", () => {
  assert.match(api, /\/api\/admin\/businesses\/:businessId\/approval-request/);
  assert.match(api, /\/api\/customer\/approvals\/:approvalId\/respond/);
  assert.match(api, /lifecycle_stage: "launch_ready"/);
  assert.match(api, /lifecycle_stage: "design_build"/);
  assert.match(approvals, /\/api\/customer\/approvals\//);
  assert.match(onboarding, /Request Approval/);
});

test("launch readiness combines delivery, approval, domain and live health checks", () => {
  assert.match(api, /\/api\/admin\/businesses\/:businessId\/launch-readiness/);
  assert.match(api, /Customer onboarding complete/);
  assert.match(api, /No known critical broken buttons/);
  assert.match(api, /Customer approved current version/);
  assert.match(api, /Public website responds/);
  assert.match(onboarding, /Launch QA/);
});
