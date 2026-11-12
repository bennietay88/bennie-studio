export type SimpleFunnelAddonConfig = {
  enabled: boolean;
  standardSetupUsd: number;
  growthSetupUsd: number;
  monthlyUsd: number;
  includeGrowthPartner: boolean;
};

export const DEFAULT_SIMPLE_FUNNEL_ADDON_CONFIG: SimpleFunnelAddonConfig = {
  enabled: false, // Safe release gate: Super Admin must deliberately activate sales.
  standardSetupUsd: 149,
  growthSetupUsd: 79,
  monthlyUsd: 19,
  includeGrowthPartner: true,
};

export type SimpleFunnelAddonPrice = {
  included: boolean;
  setupUsd: number;
  monthlyUsd: number;
  currency: "USD";
};

export function normalizeSimpleFunnelAddonConfig(input: unknown): SimpleFunnelAddonConfig {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const money = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 9999
      ? Math.round(value * 100) / 100 : fallback;
  return {
    enabled: source.enabled === true,
    standardSetupUsd: money(source.standardSetupUsd, DEFAULT_SIMPLE_FUNNEL_ADDON_CONFIG.standardSetupUsd),
    growthSetupUsd: money(source.growthSetupUsd, DEFAULT_SIMPLE_FUNNEL_ADDON_CONFIG.growthSetupUsd),
    monthlyUsd: money(source.monthlyUsd, DEFAULT_SIMPLE_FUNNEL_ADDON_CONFIG.monthlyUsd),
    includeGrowthPartner: source.includeGrowthPartner !== false,
  };
}

export function simpleFunnelPriceForPlan(plan: unknown, config: SimpleFunnelAddonConfig): SimpleFunnelAddonPrice {
  const slug = String(plan || "").toLowerCase();
  const included = slug === "website_growth_partner" && config.includeGrowthPartner;
  return {
    included,
    setupUsd: included ? 0 : slug === "growth" ? config.growthSetupUsd : config.standardSetupUsd,
    monthlyUsd: included ? 0 : config.monthlyUsd,
    currency: "USD",
  };
}

export const SIMPLE_FUNNEL_ADDON_ACTIVE_STATES = [
  "queued", "in_production", "approval_required", "revision_requested", "approved", "active", "paused", "payment_failed",
] as const;

export function isSimpleFunnelSubscriptionEvent(type: string) {
  return ["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
    "invoice.paid", "invoice.payment_failed", "checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(type);
}

export const SIMPLE_FUNNEL_MAX_REVISIONS = 1;
