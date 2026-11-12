// One set of commercial rules for the existing Sales Funnel Engine.
// Never infer a paid entitlement from client state or from a return URL.
export type FunnelTier = "free" | "paid" | "legacy";
export type FunnelTierStatus = "active" | "pending_payment" | "payment_failed" | "cancelled";

export type FunnelLimits = {
  maxFunnels: number;
  maxSteps: number;
  workflows: boolean;
  checkout: boolean;
  variants: boolean;
  ai: boolean;
};
export type FunnelTierConfig = {
  enabled: boolean;
  paidMonthlyUsd: number;
  free: FunnelLimits;
  paid: FunnelLimits;
};
export type FunnelEntitlementRecord = {
  tier: "free" | "paid";
  status: FunnelTierStatus;
  limit_overrides?: Partial<FunnelLimits> | null;
  stripe_subscription_id?: string | null;
};
export const DEFAULT_FUNNEL_TIER_CONFIG: FunnelTierConfig = {
  enabled: false, // No new public sales until payments, migration and tests pass.
  paidMonthlyUsd: 19,
  free: { maxFunnels: 1, maxSteps: 2, workflows: false, checkout: false, variants: false, ai: false },
  paid: { maxFunnels: 3, maxSteps: 10, workflows: true, checkout: true, variants: true, ai: true },
};
export const LEGACY_FUNNEL_LIMITS: FunnelLimits = {
  maxFunnels: 10000, maxSteps: 10000, workflows: true, checkout: true, variants: true, ai: true,
};
const count = (value: unknown, fallback: number, max: number) =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= max ? Number(value) : fallback;
const price = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 999
    ? Math.round(value * 100) / 100 : fallback;

export function normalizeFunnelTierConfig(input: unknown): FunnelTierConfig {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const normalizeLimits = (value: unknown, defaults: FunnelLimits): FunnelLimits => {
    const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      maxFunnels: count(source.maxFunnels, defaults.maxFunnels, 100),
      maxSteps: count(source.maxSteps, defaults.maxSteps, 100),
      workflows: source.workflows === true || (source.workflows == null && defaults.workflows),
      checkout: source.checkout === true || (source.checkout == null && defaults.checkout),
      variants: source.variants === true || (source.variants == null && defaults.variants),
      ai: source.ai === true || (source.ai == null && defaults.ai),
    };
  };
  return {
    enabled: raw.enabled === true,
    paidMonthlyUsd: price(raw.paidMonthlyUsd, 19),
    free: normalizeLimits(raw.free, DEFAULT_FUNNEL_TIER_CONFIG.free),
    paid: normalizeLimits(raw.paid, DEFAULT_FUNNEL_TIER_CONFIG.paid),
  };
}
export function resolveFunnelTier(
  record: FunnelEntitlementRecord | null | undefined,
  config: FunnelTierConfig,
  hasLegacyCapability: boolean,
): { tier: FunnelTier | "none"; active: boolean; limits: FunnelLimits } {
  if (!record) return hasLegacyCapability
    ? { tier: "legacy", active: true, limits: LEGACY_FUNNEL_LIMITS }
    : { tier: "none", active: false, limits: config.free };
  const source = record.tier === "paid" ? config.paid : config.free;
  const overrides = record.limit_overrides || {};
  return {
    tier: record.tier,
    active: record.status === "active",
    limits: {
      maxFunnels: count(overrides.maxFunnels, source.maxFunnels, 100),
      maxSteps: count(overrides.maxSteps, source.maxSteps, 100),
      workflows: typeof overrides.workflows === "boolean" ? overrides.workflows : source.workflows,
      checkout: typeof overrides.checkout === "boolean" ? overrides.checkout : source.checkout,
      variants: typeof overrides.variants === "boolean" ? overrides.variants : source.variants,
      ai: typeof overrides.ai === "boolean" ? overrides.ai : source.ai,
    },
  };
}
export const FREE_FUNNEL_TEMPLATE = "simple-lead-capture";
export const isFunnelTypeAllowed = (stepType: string, tier: FunnelTier | "none") =>
  tier !== "free" || ["lead_form", "thank_you"].includes(stepType);
