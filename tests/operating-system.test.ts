import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskIdempotencyKey, calculateAccountEconomics, canTransitionLifecycle, evaluateLaunchReadiness, publishedReportMetrics } from "../src/lib/operatingSystem.ts";
import { isOperatingSystemFlagEnabled } from "../src/constants/operatingSystemFlags.ts";

test("lifecycle rejects nonsensical jumps unless explicitly overridden", () => {
  assert.equal(canTransitionLifecycle("prospect", "live"), false);
  assert.equal(canTransitionLifecycle("prospect", "live", true), true);
  assert.equal(canTransitionLifecycle("customer_review", "launch_ready"), true);
});

test("readiness blocks missing launch-critical checks but preserves warnings", () => {
  const result = evaluateLaunchReadiness({ domainConfigured: true, sslValid: undefined, hasContact: true, hasPrimaryCta: true, hasRequiredPages: true, hasPlaceholderText: false, hasUnverifiedClaims: false, responsiveQaPassed: true, designQaPassed: true, formsConfigured: true, seoComplete: true, analyticsConfigured: false, highSeverityErrors: 0, internalApproved: true, customerApproved: false });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockingIssues.includes("customer_approval"));
  assert.ok(result.warnings.includes("ssl_unverified"));
});

test("economics labels estimates", () => {
  const result = calculateAccountEconomics({ revenue: 999, costs: [{ amount: 100, source: "actual" }, { amount: 50, source: "estimated" }], hours: 2 });
  assert.equal(result.grossProfit, 849); assert.equal(result.confidence, "estimated"); assert.equal(result.effectiveHourlyMargin, 424.5);
});

test("task keys are stable and unavailable report metrics are explicit", () => {
  assert.equal(buildTaskIdempotencyKey("b1", "onboarding", "subscription", "2026-09"), buildTaskIdempotencyKey("b1", "onboarding", "subscription", "2026-09"));
  assert.equal(publishedReportMetrics({ enquiries: null, views: 0 }).enquiries, "Data unavailable");
});

test("new operating-system customer surfaces fail closed by default", () => {
  assert.equal(isOperatingSystemFlagEnabled("delivery_queue"), false);
  assert.equal(isOperatingSystemFlagEnabled("delivery_queue", { delivery_queue: true }), true);
});
