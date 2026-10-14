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


test("prospect table headers expose clickable directional sort controls", () => {
  assert.match(ui, /SortableHeader label="Company"/);
  assert.match(ui, /SortableHeader label="Contact"/);
  assert.match(ui, /SortableHeader label="Website"/);
  assert.match(ui, /SortableHeader label="Opportunity"/);
  assert.match(ui, /SortableHeader label="Score \/ next action"/);
  assert.match(ui, /SortableHeader label="Outreach"/);
  assert.match(ui, /SortableHeader label="Next Step"/);
  assert.match(ui, /ArrowUpDown/);
  assert.match(ui, /aria-sort=/);
});

test("prospect composer is responsive, has bounded scrolling, and fails closed without opt-in", () => {
  assert.match(ui, /min-h-0 min-w-0 flex-1 overflow-y-auto/);
  assert.match(ui, /shrink-0 gap-3 border-t/);
  assert.match(ui, /hasDocumentedMarketingConsent\(outreachProspect\)/);
  assert.match(ui, /Record verified opt-in/);
  assert.match(sales, /OUTREACH_CONSENT_REQUIRED/);
  assert.match(api, /OUTREACH_CONSENT_REQUIRED/);
});
