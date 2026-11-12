import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_SIMPLE_FUNNEL_ADDON_CONFIG, normalizeSimpleFunnelAddonConfig,
  simpleFunnelPriceForPlan, isSimpleFunnelSubscriptionEvent,
} from "../src/lib/simpleFunnelAddon.js";

test("simple funnel pricing: first included for Growth Partner and discounted for Growth", () => {
  const config = { ...DEFAULT_SIMPLE_FUNNEL_ADDON_CONFIG, enabled: true };
  assert.deepEqual(simpleFunnelPriceForPlan("profile", config), {
    currency: "USD", included: false, setupUsd: 149, monthlyUsd: 19,
  });
  assert.equal(simpleFunnelPriceForPlan("business", config).setupUsd, 149);
  assert.equal(simpleFunnelPriceForPlan("growth", config).setupUsd, 79);
  assert.deepEqual(simpleFunnelPriceForPlan("website_growth_partner", config), {
    currency: "USD", included: true, setupUsd: 0, monthlyUsd: 0,
  });
  assert.equal(simpleFunnelPriceForPlan("website_growth_partner", { ...config, includeGrowthPartner: false }).included, false);
});

test("unknown or manipulated prices cannot grant included entitlements", () => {
  const fallback = normalizeSimpleFunnelAddonConfig({ standardSetupUsd: -500, growthSetupUsd: NaN, monthlyUsd: 999999, enabled: "true" });
  assert.equal(fallback.enabled, false);
  assert.equal(fallback.standardSetupUsd, 149);
  assert.equal(fallback.growthSetupUsd, 79);
  assert.equal(fallback.monthlyUsd, 19);
  assert.equal(simpleFunnelPriceForPlan("__proto__", fallback).included, false);
  assert.equal(simpleFunnelPriceForPlan("growth", fallback).monthlyUsd, 19);
});

test("billing events are isolated from base website subscriptions", () => {
  assert.equal(isSimpleFunnelSubscriptionEvent("checkout.session.completed"), true);
  assert.equal(isSimpleFunnelSubscriptionEvent("customer.subscription.deleted"), true);
  assert.equal(isSimpleFunnelSubscriptionEvent("invoice.payment_failed"), true);
  assert.equal(isSimpleFunnelSubscriptionEvent("payment_intent.created"), false);
  const api = readFileSync("api/index.ts", "utf8");
  const route = readFileSync("server/simpleFunnelAddon.ts", "utf8");
  assert.match(api, /handleSimpleFunnelAddonWebhook\(supabaseAdmin, getStripe, event\)/);
  assert.match(route, /obj\.metadata\?\.type === "simple_funnel_addon"/);
});

test("managed funnel addon is paid-gated, two-page-only and customer scoped", () => {
  const migration = readFileSync("supabase/migrations/20261112062000_simple_funnel_addon.sql", "utf8");
  const route = readFileSync("server/simpleFunnelAddon.ts", "utf8");
  const app = readFileSync("src/App.tsx", "utf8");
  assert.match(migration, /business_id uuid not null unique/);
  assert.match(migration, /alter table public\.simple_funnel_addons enable row level security/);
  assert.match(migration, /revoke all on public\.simple_funnel_addons from public, anon, authenticated/);
  assert.match(route, /await authorize\(req\.user\.id, profile\.business_id\)/);
  assert.match(route, /payment_status !== "paid"/);
  assert.match(route, /status: "draft", access_mode: "managed"/);
  assert.match(route, /step_type: "lead_form"/);
  assert.match(route, /step_type: "thank_you"/);
  assert.match(route, /if \(steps\?\.length !== 2/);
  assert.match(route, /Simple funnel add-on access is isolated from the advanced sales_funnels/);
  assert.doesNotMatch(route, /custom_enabled_features:.*sales_funnels/);
  // Legacy billing data and webhook compatibility remain, but new Simple Funnel orders
  // and the duplicate portal have been retired in favour of the unified engine.
  assert.equal(app.includes("<SimpleFunnelAddonPortal />"), false);
  assert.match(route, /SIMPLE_FUNNEL_NEW_SALES_RETIRED = true/);
  assert.match(app, /FunnelPlansPortal/);
});
