import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync("src/components/SuperAdmin/ProspectExplorer.tsx", "utf8");
const api = readFileSync("api/index.ts", "utf8");
const sales = readFileSync("server/salesOperations.ts", "utf8");

test("prospect table exposes sorting and uses sorted rows", () => {
  assert.match(ui, /setSortMode/);
  assert.match(ui, /Highest score/);
  assert.match(ui, /sortedProspects\.map/);
});

test("email sends in-app while WhatsApp continues through wa.me", () => {
  assert.equal(/mailto:/.test(ui), false);
  assert.match(ui, /https:\/\/wa\.me\//);
  assert.match(ui, /Send email/);
  assert.doesNotMatch(ui, /Send WhatsApp/);
});

test("direct outreach endpoint sends email through the server and records delivery", () => {
  assert.match(api, /action: z\.enum\(\["prepare", "contacted", "send"\]\)/);
  assert.match(api, /sendDirectSalesEmail/);
  assert.doesNotMatch(api, /sendDirectSalesWhatsApp/);
  assert.match(api, /Direct WhatsApp is not enabled/);
  assert.match(sales, /sendDirectProspectOutreach/);
  assert.match(sales, /status: "sent"/);
});
