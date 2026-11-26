/** Runtime release switches for controls currently enforced in the app. */
export const OPERATING_SYSTEM_FLAGS = {
  launch_readiness: true,
} as const;

export type OperatingSystemFlag = keyof typeof OPERATING_SYSTEM_FLAGS;

export function isOperatingSystemFlagEnabled(flag: OperatingSystemFlag, overrides?: Partial<Record<OperatingSystemFlag, boolean>>) {
  return overrides?.[flag] ?? OPERATING_SYSTEM_FLAGS[flag];
}
