import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_FUNNEL_TIER_CONFIG,
  normalizeFunnelTierConfig,
  resolveFunnelTier,
  isFunnelTypeAllowed,
} from "../src/lib/funnelTiers";
import { buildTemplateGraph, summarizeFunnelVariants, type FunnelEvent } from "../src/lib/funnelEngine";

test("the free offer is one managed lead funnel with no setup or advanced checkout", () => {
  assert.equal(DEFAULT_FUNNEL_TIER_CONFIG.free.maxFunnels, 1);
  assert.equal(DEFAULT_FUNNEL_TIER_CONFIG.free.maxSteps, 2);
  assert.equal(DEFAULT_FUNNEL_TIER_CONFIG.free.checkout, false);
  assert.equal(DEFAULT_FUNNEL_TIER_CONFIG.free.workflows, false);
  assert.equal(DEFAULT_FUNNEL_TIER_CONFIG.paidMonthlyUsd, 19);
  const graph = buildTemplateGraph(
    "simple-lead-capture",
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  );
  assert.deepEqual(graph.steps.map((step) => step.step_type), ["lead_form","thank_you"]);
  assert.equal(graph.connections.length, 1);
  assert.equal(isFunnelTypeAllowed("checkout", "free"), false);
});
test("paid tier has advanced features, still with no OTC", () => {
  const paid = resolveFunnelTier(
    { tier: "paid", status: "active" }, DEFAULT_FUNNEL_TIER_CONFIG, false,
  );
  assert.equal(paid.tier,"paid");
  assert.equal(paid.active,true);
  assert.equal(paid.limits.maxFunnels,3);
  assert.equal(paid.limits.maxSteps,10);
  assert.equal(paid.limits.checkout,true);
  const server = readFileSync("server/unifiedFunnelTiers.ts","utf8");
  assert.match(server, /mode:"subscription"/);
  assert.match(server, /recurring:\{interval:"month"\}/);
  assert.doesNotMatch(server, /One-time Setup|setup_price|setup_fee/);
});
test("existing advanced customer access is never silently downgraded", () => {
  const legacy = resolveFunnelTier(null, DEFAULT_FUNNEL_TIER_CONFIG, true);
  assert.equal(legacy.tier,"legacy");
  assert.equal(legacy.active,true);
  assert.equal(legacy.limits.checkout,true);
  assert.equal(resolveFunnelTier(null,DEFAULT_FUNNEL_TIER_CONFIG,false).active,false);
});
test("overrides cannot override active billing state", () => {
  const blocked = resolveFunnelTier(
    {tier:"paid",status:"payment_failed",limit_overrides:{checkout:true,maxFunnels:99}},
    DEFAULT_FUNNEL_TIER_CONFIG,false,
  );
  assert.equal(blocked.active,false);
  assert.equal(blocked.limits.maxFunnels,99);
  const free = resolveFunnelTier(
    {tier:"free",status:"active",limit_overrides:{maxFunnels:2}},
    DEFAULT_FUNNEL_TIER_CONFIG,false,
  );
  assert.equal(free.active,true);
  assert.equal(free.limits.checkout,false);
});
test("incorrect values cannot produce unbounded quota or unsafe defaults",()=>{
  const config = normalizeFunnelTierConfig({
    enabled:true, paidMonthlyUsd:-5,
    free: {maxFunnels:-10,maxSteps:500,checkout:true},
    paid: {maxFunnels:Infinity},
  });
  assert.equal(config.paidMonthlyUsd,19);
  assert.equal(config.free.maxFunnels,1);
  assert.equal(config.free.maxSteps,2);
  assert.equal(config.free.checkout,true); // Super Admin can explicitly edit plan configuration.
  assert.equal(config.paid.maxFunnels,3);
});
test("variant analysis only counts observed sessions and respects verified revenue", () => {
  const stepId="00000000-0000-4000-8000-000000000002";
  const events: FunnelEvent[]=[
    {funnel_id:"f",step_id:stepId,session_id:"s1",variant_id:"variant",event_type:"step_view"},
    {funnel_id:"f",step_id:stepId,session_id:"s1",variant_id:"variant",event_type:"step_view"},
    {funnel_id:"f",step_id:stepId,session_id:"s1",variant_id:"variant",event_type:"form_submitted"},
    {funnel_id:"f",step_id:stepId,session_id:"s2",variant_id:null,event_type:"step_view"},
    {funnel_id:"f",step_id:stepId,session_id:"s2",variant_id:null,event_type:"purchase_completed",revenue_verified:false},
  ];
  const summary=summarizeFunnelVariants(events,[{id:"variant",step_id:stepId,name:"Variant A"}]);
  assert.equal(summary.find(v=>v.variantId==="variant")?.visitors,1);
  assert.equal(summary.find(v=>v.variantId==="variant")?.conversions,1);
  assert.equal(summary.find(v=>v.variantId===null)?.conversions,0);
});
test("release guards enforce database quota and server-side checkout",()=>{
  const migration=readFileSync("supabase/migrations/20261112200000_unified_funnel_entitlements.sql","utf8");
  const api=readFileSync("api/index.ts","utf8");
  assert.match(migration,/trg_unified_funnel_count/);
  assert.match(migration,/pg_advisory_xact_lock/);
  assert.match(migration,/publish_funnel_safely/);
  assert.match(api,/funnelMayServe/);
  assert.match(api,/checkout-status/);
  assert.match(api,/getUnifiedFunnelAccess/);
  assert.match(api,/processFunnelTriggerQueue/);
});
