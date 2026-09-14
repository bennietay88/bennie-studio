import test from "node:test";
import assert from "node:assert/strict";
import { durationMinutes, fulfilmentSlaStatus, largestDelayCategory } from "../src/lib/fulfilmentTiming.ts";

test("timing does not infer missing labour from elapsed time", () => {
  assert.equal(durationMinutes("2026-01-01T00:00:00Z", undefined), null);
  assert.equal(durationMinutes("2026-01-01T00:00:00Z", "2026-01-01T01:30:00Z"), 90);
});
test("SLA distinguishes customer and external blocks", () => {
  assert.equal(fulfilmentSlaStatus({ targetMinutes: 120, elapsedMinutes: 300, customerBlocked: true }), "customer_blocked");
  assert.equal(fulfilmentSlaStatus({ targetMinutes: 120, elapsedMinutes: 300, externalBlocked: true }), "external_blocked");
  assert.equal(fulfilmentSlaStatus({ targetMinutes: 120, elapsedMinutes: 100 }), "at_risk");
});
test("bottleneck analysis returns the largest measured delay", () => {
  const [category, minutes] = largestDelayCategory({ internal: 10, customer: 40, domain: 5, ai: 0, qa: 3, asset: 2, revision: 8, billing: 0, technical: 1 });
  assert.equal(category, "customer"); assert.equal(minutes, 40);
});
