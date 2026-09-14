import test from "node:test";
import assert from "node:assert/strict";
import { hasCustomerCapability, hasSubscriptionAccess } from "../src/lib/permissions.ts";

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
