/** Feature flags for the operating-system foundation. New customer-facing
 * surfaces default off until their API, RLS and E2E coverage is enabled. */
export const OPERATING_SYSTEM_FLAGS = {
  customer_lifecycle_v2: false,
  entitlements_v2: false,
  delivery_queue: false,
  launch_readiness: false,
  monthly_reports: false,
  profitability_dashboard: false,
  website_health: false,
  structured_update_requests: false,
  sales_delivery_handoff: false,
  content_provenance: false,
  template_versioning: false,
} as const;

export type OperatingSystemFlag = keyof typeof OPERATING_SYSTEM_FLAGS;

export function isOperatingSystemFlagEnabled(flag: OperatingSystemFlag, overrides?: Partial<Record<OperatingSystemFlag, boolean>>) {
  return overrides?.[flag] ?? OPERATING_SYSTEM_FLAGS[flag];
}
