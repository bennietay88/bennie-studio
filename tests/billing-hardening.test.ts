import assert from "node:assert/strict";
import test from "node:test";
import { isMinimumTermMature, shouldReclaimWebhook, webhookFailurePatch } from "../src/lib/billingLifecycle.ts";

test("minimum-term cancellation only matures on or after the contract date", () => {
  const now = new Date("2026-09-14T12:00:00Z");
  assert.equal(isMinimumTermMature("2026-09-15", now), false);
  assert.equal(isMinimumTermMature("2026-09-14", now), true);
  assert.equal(isMinimumTermMature("2026-09-01", now), true);
  assert.equal(isMinimumTermMature(null, now), false);
});

test("webhook claims are retryable after failure or stale processing", () => {
  const now = Date.parse("2026-09-14T12:00:00Z");
  assert.equal(shouldReclaimWebhook(undefined, now), true);
  assert.equal(shouldReclaimWebhook({ status: "completed" }, now), false);
  assert.equal(shouldReclaimWebhook({ status: "failed" }, now), true);
  assert.equal(shouldReclaimWebhook({ status: "processing", processing_started_at: "2026-09-14T11:40:00Z" }, now), true);
  assert.equal(shouldReclaimWebhook({ status: "processing", processing_started_at: "2026-09-14T11:55:00Z" }, now), false);
});

test("webhook failure patch is safe and bounded", () => {
  const patch = webhookFailurePatch(new Error("provider timeout"), "2026-09-14T12:00:00Z");
  assert.deepEqual(patch, { status: "failed", failed_at: "2026-09-14T12:00:00Z", error_message: "provider timeout" });
});
