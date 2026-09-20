export const PRODUCTION_QUALITY_STANDARD_VERSION = "2026.09.20";

export const CORE_WEB_VITAL_BUDGETS = {
  lcpMs: 2500,
  inpMs: 200,
  cls: 0.1,
} as const;

export const RUNTIME_QUALITY_BUDGETS = {
  maxConsoleErrors: 0,
  maxFailedCriticalRequests: 0,
  maxBrokenImages: 0,
  maxHorizontalOverflowPx: 0,
  requireDocumentTitle: true,
  requireMetaDescription: true,
  requireMainLandmark: true,
  requireAccessibleInteractiveControls: true,
} as const;

export type ProductionQualitySnapshot = {
  lcpMs?: number | null;
  inpMs?: number | null;
  cls?: number | null;
  consoleErrors?: number;
  failedCriticalRequests?: number;
  brokenImages?: number;
  horizontalOverflowPx?: number;
  hasDocumentTitle?: boolean;
  hasMetaDescription?: boolean;
  hasMainLandmark?: boolean;
  inaccessibleInteractiveControls?: number;
};

export function evaluateProductionQuality(snapshot: ProductionQualitySnapshot) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if ((snapshot.consoleErrors ?? 0) > RUNTIME_QUALITY_BUDGETS.maxConsoleErrors) {
    blockers.push("Browser console errors must be resolved before launch.");
  }
  if ((snapshot.failedCriticalRequests ?? 0) > RUNTIME_QUALITY_BUDGETS.maxFailedCriticalRequests) {
    blockers.push("Critical network requests are failing.");
  }
  if ((snapshot.brokenImages ?? 0) > RUNTIME_QUALITY_BUDGETS.maxBrokenImages) {
    blockers.push("Broken images are present.");
  }
  if ((snapshot.horizontalOverflowPx ?? 0) > RUNTIME_QUALITY_BUDGETS.maxHorizontalOverflowPx) {
    blockers.push("Horizontal viewport overflow is present.");
  }
  if (snapshot.hasDocumentTitle === false) blockers.push("Document title is missing.");
  if (snapshot.hasMetaDescription === false) blockers.push("Meta description is missing.");
  if (snapshot.hasMainLandmark === false) blockers.push("Main page landmark is missing.");
  if ((snapshot.inaccessibleInteractiveControls ?? 0) > 0) {
    blockers.push("Interactive controls without accessible names are present.");
  }

  if (snapshot.lcpMs != null && snapshot.lcpMs > CORE_WEB_VITAL_BUDGETS.lcpMs) {
    warnings.push(`LCP exceeds the ${CORE_WEB_VITAL_BUDGETS.lcpMs}ms quality budget.`);
  }
  if (snapshot.inpMs != null && snapshot.inpMs > CORE_WEB_VITAL_BUDGETS.inpMs) {
    warnings.push(`INP exceeds the ${CORE_WEB_VITAL_BUDGETS.inpMs}ms quality budget.`);
  }
  if (snapshot.cls != null && snapshot.cls > CORE_WEB_VITAL_BUDGETS.cls) {
    warnings.push(`CLS exceeds the ${CORE_WEB_VITAL_BUDGETS.cls} quality budget.`);
  }

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
    standardVersion: PRODUCTION_QUALITY_STANDARD_VERSION,
  };
}
