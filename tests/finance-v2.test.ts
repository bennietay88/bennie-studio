import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260922100000_finance_v2_safe_aggregation.sql", "utf8");
const api = readFileSync("api/index.ts", "utf8");
const dashboard = readFileSync("src/components/SuperAdmin/FinanceDashboard.tsx", "utf8");

test("Finance V2 excludes unresolved FX from consolidated totals", () => {
  assert.match(migration, /safe_amount is null and currency <> configured_base_currency/);
  assert.match(migration, /finance_period_summary/);
  assert.doesNotMatch(dashboard, /base_currency_amount \?\? tx\.amount/);
});

test("bank imports remain neutral until reconciled", () => {
  assert.match(api, /source_type: "BANK_TRANSACTION"[^]*transaction_type: "other"/);
  assert.match(api, /classificationRequired: true/);
  assert.match(migration, /BANK_UNCLASSIFIED/);
});

test("Stripe refunds use refund identifiers", () => {
  assert.match(api, /source_id: String\(refund\.id\)/);
  assert.match(migration, /stripe_refund_key/);
});

test("dashboard reads authoritative server summary", () => {
  assert.match(api, /app\.get\("\/api\/admin\/finance\/summary"/);
  assert.match(dashboard, /api\/admin\/finance\/summary/);
  assert.match(dashboard, /Authoritative period summary/);
});
