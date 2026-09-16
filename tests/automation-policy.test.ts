import test from "node:test";
import assert from "node:assert/strict";
import { calculateCustomerHealth, canAutomationExecute } from "../src/lib/automationPolicy";

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
