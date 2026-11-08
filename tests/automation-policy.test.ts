import test from "node:test";
import assert from "node:assert/strict";
import { calculateCustomerHealth, canAutomationExecute, isOnboardingStalled, renewalDaysRemaining } from "../src/lib/automationPolicy";

test("automation policy keeps risky actions approval-gated", () => {
  assert.equal(canAutomationExecute("internal_task", "full"), true);
  assert.equal(canAutomationExecute("outbound_email", "assisted"), false);
  assert.equal(canAutomationExecute("publish", "full"), false);
  assert.equal(canAutomationExecute("internal_task", "off"), false);
});

test("customer health is explainable", () => {
  const result = calculateCustomerHealth({ onboardingComplete: false, websiteLive: false, paymentHealthy: false, openIssues: 2, overdueApproval: true });
  assert.equal(result.status, "critical");
  assert.ok(result.reasons.length >= 3);
  assert.ok(result.recommendedAction.length > 0);
});

test("onboarding stall alerts require an active onboarding stage and seven elapsed days", () => {
  const now = new Date("2026-11-07T00:00:00.000Z");
  const createdAt = "2026-10-30T00:00:00.000Z";
  assert.equal(isOnboardingStalled({ lifecycleStage: "onboarding", createdAt, now }), true);
  assert.equal(isOnboardingStalled({ lifecycleStage: "content_collection", createdAt, now }), true);
  assert.equal(isOnboardingStalled({ lifecycleStage: "onboarding", createdAt, now, onboardingComplete: true }), false);
  assert.equal(isOnboardingStalled({ lifecycleStage: "live", createdAt, now }), false);
  assert.equal(isOnboardingStalled({ lifecycleStage: "onboarding", createdAt: "2026-11-01T00:00:00.000Z", now }), false);
});

test("renewal alerts use verified active contract dates and suppress scheduled cancellations", () => {
  const now = new Date("2026-11-07T00:00:00.000Z");
  assert.equal(renewalDaysRemaining({ status: "active", renewalState: "active", renewalDate: "2026-12-07T00:00:00.000Z" }, now), 30);
  assert.equal(renewalDaysRemaining({ status: "active", renewalState: "active", renewalDate: "2027-02-06T00:00:00.000Z" }, now), null);
  assert.equal(renewalDaysRemaining({ status: "active", renewalState: "active", cancelAtPeriodEnd: true, renewalDate: "2026-12-07T00:00:00.000Z" }, now), null);
  assert.equal(renewalDaysRemaining({ status: "canceled", renewalState: "active", renewalDate: "2026-12-07T00:00:00.000Z" }, now), null);
  assert.equal(renewalDaysRemaining({ status: "active", renewalState: "active", renewalDate: "invalid" }, now), null);
});
