import assert from "node:assert/strict";
import test from "node:test";
import { canSubmitMonthlyUpdateRequest, countMonthlyUpdateAllowance } from "../src/lib/monthlyUpdateAllowance.ts";

test("monthly request allowance excludes declined and cancelled requests", () => {
  const used = countMonthlyUpdateAllowance([
    { allowance_period: "2026-11", status: "submitted" },
    { allowance_period: "2026-11", status: "waiting_for_customer" },
    { allowance_period: "2026-11", status: "declined" },
    { allowance_period: "2026-10", status: "submitted" },
    { allowance_period: "2026-11", status: "cancelled" },
  ], "2026-11");
  assert.equal(used, 2);
});

test("monthly request allowance does not count unsent drafts", () => {
  const used = countMonthlyUpdateAllowance([
    { allowance_period: "2026-11", status: "draft" },
    { allowance_period: "2026-11", status: "submitted" },
  ], "2026-11");
  assert.equal(used, 1);
});

test("approval revision requests do not consume monthly managed-update allowance", () => {
  const used = countMonthlyUpdateAllowance([
    { allowance_period: "2026-11", status: "submitted", consumes_allowance: false },
    { allowance_period: "2026-11", status: "submitted", consumes_allowance: true },
  ], "2026-11");
  assert.equal(used, 1);
});

test("monthly update form remains closed while allowance loads or is exhausted", () => {
  assert.equal(canSubmitMonthlyUpdateRequest({ loading: true, allowance: 1, used: 0 }), false);
  assert.equal(canSubmitMonthlyUpdateRequest({ loading: false, allowance: 1, used: 1 }), false);
  assert.equal(canSubmitMonthlyUpdateRequest({ loading: false, allowance: 0, used: 0 }), false);
  assert.equal(canSubmitMonthlyUpdateRequest({ loading: false, allowance: 2, used: 1 }), true);
});
