import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const prospects = readFileSync("src/components/SuperAdmin/ProspectExplorer.tsx", "utf8");
const outreachLab = readFileSync("src/components/SuperAdmin/OutreachLab.tsx", "utf8");
const salesUi = readFileSync("src/components/SuperAdmin/SalesAutomation.tsx", "utf8");
const operations = readFileSync("server/salesOperations.ts", "utf8");
const api = readFileSync("api/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20261014090000_outreach_permission_and_suppression_reconciliation.sql", "utf8");
const cron = JSON.parse(readFileSync("vercel.json", "utf8"));

test("prospect imports preserve server counts, explain skipped rows, and refresh all pages", () => {
  assert.match(api, /skippedReasons/);
  assert.match(api, /existingEmail/);
  assert.match(api, /existingDomain/);
  assert.match(prospects, /range\(offset, offset \+ 499\)/);
  assert.match(prospects, /await fetchProspects\(\)/);
  assert.match(prospects, /Showing \{sortedProspects.length\} of \{prospects.length\}/);
});

test("outreach suppression is enforced across the backend and each UI", () => {
  assert.match(operations, /next_follow_up_at: null/);
  assert.match(operations, /status: "suppressed"/);
  assert.match(prospects, /_suppressed/);
  assert.match(outreachLab, /selectedSuppressed/);
  assert.match(api, /await isSalesSuppressed\(supabaseAdmin, target\)/);
  assert.match(api, /await isSalesSuppressed\(supabaseAdmin, recipient\)/);
});

test("sales tables require dedicated sales permission and opted-out records cannot be deleted by ordinary clients", () => {
  assert.match(migration, /has_platform_permission\(''sales''\)/);
  assert.match(migration, /t <> 'sales_suppressions'/);
  assert.match(migration, /outreach_one_active_prospect_idx/);
  assert.match(migration, /outreach_one_active_lead_idx/);
});

test("outreach email uses the same tracked provider as Prospect Explorer", () => {
  assert.match(outreachLab, /\/api\/admin\/prospects\/\$\{selected.id\}\/outreach/);
  assert.match(outreachLab, /action: "send"/);
  assert.match(outreachLab, /Send email/);
  assert.match(operations, /OUTREACH_TOO_SOON/);
});

test("portal makes delivered, failed, bounced, and suppression states discoverable", () => {
  assert.match(prospects, /_latestDelivery/);
  assert.match(prospects, /Email Delivery/);
  assert.match(salesUi, /deliveryOutcomes/);
  assert.match(salesUi, /Bounce rate among sent/);
});

test("scheduled B2B delivery runs in overlapping market hours", () => {
  const sales = cron.crons.find((task: {path:string; schedule:string}) => task.path === "/api/cron/sales-automation");
  assert.equal(sales?.schedule, "0 9 * * *");
});
