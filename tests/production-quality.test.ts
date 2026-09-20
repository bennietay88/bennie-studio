import test from "node:test";
import assert from "node:assert/strict";
import {
  CORE_WEB_VITAL_BUDGETS,
  evaluateProductionQuality,
} from "../src/constants/productionQuality.ts";

test("production quality blocks broken runtime and accessibility basics", () => {
  const result = evaluateProductionQuality({
    consoleErrors: 1,
    failedCriticalRequests: 1,
    brokenImages: 2,
    horizontalOverflowPx: 14,
    hasDocumentTitle: false,
    hasMetaDescription: false,
    hasMainLandmark: false,
    inaccessibleInteractiveControls: 2,
  });

  assert.equal(result.passed, false);
  assert.ok(result.blockers.length >= 8);
});

test("production quality passes clean runtime basics", () => {
  const result = evaluateProductionQuality({
    consoleErrors: 0,
    failedCriticalRequests: 0,
    brokenImages: 0,
    horizontalOverflowPx: 0,
    hasDocumentTitle: true,
    hasMetaDescription: true,
    hasMainLandmark: true,
    inaccessibleInteractiveControls: 0,
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.blockers, []);
});

test("core web vital budgets surface regressions without confusing lab data with launch blockers", () => {
  const result = evaluateProductionQuality({
    lcpMs: CORE_WEB_VITAL_BUDGETS.lcpMs + 1,
    inpMs: CORE_WEB_VITAL_BUDGETS.inpMs + 1,
    cls: CORE_WEB_VITAL_BUDGETS.cls + 0.01,
  });

  assert.equal(result.passed, true);
  assert.equal(result.warnings.length, 3);
});
