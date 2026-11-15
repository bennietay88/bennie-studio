import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const root = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const api = root("api/index.ts");
const sales = root("src/components/SuperAdmin/SalesHome.tsx");
const queue = root("src/components/SuperAdmin/OverdueSalesTasks.tsx");
const inbox = root("src/components/SuperAdmin/AdminLeadInbox.tsx");
const admin = root("src/components/SuperAdminDashboard.tsx");
const contact = root("src/components/PublicStudioPagesV3.tsx");
const preview = root("src/components/PublicMarketingPages.tsx");
const order = root("src/components/PreviewOrderPage.tsx");

test("overdue overview count and queue share the exact open-task/date predicate", () => {
  const start = api.indexOf('"/api/admin/revenue-health/overdue-tasks"');
  const end = api.indexOf("// Commercial data integrity is read-only", start);
  assert.ok(start >= 0 && end > start);
  const taskEndpoint = api.slice(start, end);
  assert.match(taskEndpoint, /canManageSalesOperations\(profile\)/);
  assert.match(taskEndpoint, /count: "exact"/);
  assert.match(taskEndpoint, /\.eq\("status", "open"\)\.lte\("due_at", new Date\(\)\.toISOString\(\)\)/);
  assert.match(taskEndpoint, /\.range\(offset, offset \+ pageSize - 1\)/);
  assert.match(api, /overdueOpenTasks: Number\(\(overdueTaskCount\.data as any\)\?\.overdueOpenTasks \|\| 0\)/);
  assert.match(sales, /navigate\("\/admin\/overdue_followups"\)/);
  assert.match(queue, /\/admin\/inbound_leads\?lead=/);
  assert.match(queue, /\/admin\/prospect_explorer\?prospect=/);
  assert.match(admin, /activeTab === "overdue_followups" && <OverdueSalesTasks/);
});

test("inbox prioritizes and visibly marks aged open leads without modifying statuses", () => {
  assert.match(inbox, /Unanswered /);
  assert.match(inbox, /Overdue /);
  assert.match(inbox, /Follow-up due:/);
  assert.match(inbox, /Next:/);
  assert.match(inbox, /focusedLeadId/);
});

test("contact-to-preview handoff uses browser session and never includes personal details in query string", () => {
  assert.match(contact, /sessionStorage\.setItem\("bt_contact_brief"/);
  assert.match(contact, /navigate\("\/generate-preview\?mode=business&source=contact"\)/);
  assert.doesNotMatch(contact, /localStorage\.setItem\("bt_contact_brief"/);
  assert.match(preview, /sessionStorage\.setItem\("bt_preview_intent"/);
  assert.match(preview, /sessionStorage\.getItem\("bt_preview_intent"/);
  assert.match(order, /sessionStorage\.getItem\("bt_preview_intent"/);
  assert.doesNotMatch(preview, /localStorage\.setItem\("bt_preview_intent"/);
});
