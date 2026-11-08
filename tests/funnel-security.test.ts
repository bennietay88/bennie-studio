import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260923080000_sales_funnel_engine_v1_v4.sql", "utf8");
const api = readFileSync("api/index.ts", "utf8");
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));

test("managed funnel access is enforced in database helpers rather than only UI", () => {
  assert.match(migration, /sales_funnels_access_mode text not null default 'managed'/);
  assert.match(migration, /private\.business_can_manage_funnels/);
  assert.match(migration, /sales_funnels_access_mode <> 'managed'/);
  assert.match(migration, /private\.business_has_custom_feature\(business_id,'sales_funnels'\)/);
});

test("visitor facts remain server-owned while tenant members can read reporting data", () => {
  for (const table of ["funnel_sessions","funnel_events","funnel_submissions","funnel_workflow_runs","funnel_workflow_events"]) {
    assert.match(migration, new RegExp(table));
  }
  assert.match(migration, /Visitor\/session facts are server-owned/);
  assert.match(api, /\/api\/public\/funnels\/:funnelId\/events/);
  assert.match(api, /\/api\/public\/funnels\/:funnelId\/submit/);
});

test("public funnel data is limited to published funnels and checkout remains Stripe-backed", () => {
  assert.match(api, /\.eq\("status", "published"\)/);
  assert.match(api, /type: "funnel_sale"/);
  assert.match(api, /getStripe\(funnel\.business_id\)/);
  assert.match(api, /purchase_completed/);
  const publicEventRoute = api.slice(api.indexOf('"/api/public/funnels/:funnelId/events"'), api.indexOf('"/api/public/funnels/:funnelId/submit"'));
  assert.match(publicEventRoute, /z\.enum\(\["funnel_view"/);
  assert.doesNotMatch(publicEventRoute, /revenue:\s*z\./);
  assert.match(api, /revenue_verified:\s*true/);
});

test("funnel delays reuse the existing automation cron instead of adding another Vercel cron", () => {
  const salesCrons = vercel.crons.filter((item: any) => item.path === "/api/cron/sales-automation");
  assert.equal(salesCrons.length, 1);
  assert.equal(vercel.crons.some((item: any) => /funnel/i.test(item.path)), false);
  assert.match(api, /processDueFunnelWorkflowRuns/);
});
