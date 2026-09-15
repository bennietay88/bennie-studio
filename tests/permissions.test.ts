import test from "node:test";
import assert from "node:assert/strict";
import { can, hasCustomerCapability, hasSubscriptionAccess } from "../src/lib/permissions.ts";

test("customer capability matrix keeps staff away from billing/team administration", () => {
  assert.equal(hasCustomerCapability("business_admin", "manage_billing"), true);
  assert.equal(hasCustomerCapability("staff", "manage_billing"), false);
  assert.equal(hasCustomerCapability("staff", "manage_website"), true);
  assert.equal(hasCustomerCapability("client", "manage_team"), false);
});

test("subscription access is evaluated at the business level for every customer role", () => {
  const active = { subscriptionStatus: "active" as const, trialEndsAt: Date.now() - 1 };
  const trial = { subscriptionStatus: "trialing" as const, trialEndsAt: Date.now() + 60_000 };
  assert.equal(hasSubscriptionAccess({ role: "staff" }, active), true);
  assert.equal(hasSubscriptionAccess({ role: "client" }, trial), true);
  assert.equal(hasSubscriptionAccess({ role: "staff" }, { ...trial, trialEndsAt: Date.now() - 1 }), false);
  assert.equal(hasSubscriptionAccess({ role: "super_admin" }, null), true);
});

test("subscription access accepts raw Supabase snake_case rows", () => {
  assert.equal(
    hasSubscriptionAccess(
      { role: "business_admin" },
      { subscription_status: "active", trial_ends_at: null },
    ),
    true,
  );
  assert.equal(
    hasSubscriptionAccess(
      { role: "staff" },
      { subscription_status: "trialing", trial_ends_at: new Date(Date.now() + 60_000).toISOString() },
    ),
    true,
  );
  assert.equal(
    hasSubscriptionAccess(
      { role: "staff" },
      { subscription_status: "trialing", trial_ends_at: new Date(Date.now() - 60_000).toISOString() },
    ),
    false,
  );
});

test("central can helper enforces role, tenant and feature gates", () => {
  const business = { id: "b1", status: "active" as const, subscriptionStatus: "active" as const, trialEndsAt: 0 };
  assert.equal(can("billing.manage", { profile: { role: "business_admin", businessId: "b1" }, business, businessId: "b1" }), true);
  assert.equal(can("billing.manage", { profile: { role: "staff", businessId: "b1" }, business, businessId: "b1" }), false);
  assert.equal(can("website.view", { profile: { role: "staff", businessId: "b2" }, business, businessId: "b1" }), false);
  assert.equal(can("website.view", { profile: { role: "client", businessId: "b1" }, business, businessId: "b1", featureEnabled: false }), false);
  assert.equal(can("commercial.manage", { profile: { role: "super_admin" }, business: null }), true);
});
