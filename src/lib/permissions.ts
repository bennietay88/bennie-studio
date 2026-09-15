import type { Business, UserProfile, UserRole } from "../types";

export type CustomerRole = Extract<UserRole, "business_admin" | "staff" | "client">;

export const CUSTOMER_ROLE_CAPABILITIES = {
  business_admin: ["view_business", "manage_team", "manage_billing", "manage_website", "manage_leads", "manage_appointments", "manage_requests"],
  staff: ["view_business", "manage_website", "manage_leads", "manage_appointments", "manage_requests"],
  client: ["view_business", "view_website", "manage_leads", "manage_appointments", "manage_requests"],
} as const satisfies Record<CustomerRole, readonly string[]>;

export type CustomerCapability = (typeof CUSTOMER_ROLE_CAPABILITIES)[CustomerRole][number];

export type Capability = CustomerCapability | "dashboard.view" | "website.view" | "website.edit" | "website.publish" | "website.delete" | "website.approve" | "billing.view" | "billing.manage" | "team.view" | "team.manage" | "leads.view" | "leads.manage" | "appointments.view" | "appointments.manage" | "updates.create" | "updates.manage" | "support.create" | "support.manage" | "analytics.view" | "ai.internal_use" | "ai.customer_use" | "ai.credit_purchase" | "business.settings" | "business.manage" | "templates.manage" | "commercial.manage";

export type CapabilityContext = {
  profile?: Pick<UserProfile, "role" | "staffPermissions" | "businessId"> | null;
  business?: Pick<Business, "id" | "status" | "subscriptionStatus" | "trialEndsAt"> | null;
  businessId?: string | null;
  featureEnabled?: boolean;
  customerOverride?: boolean;
};

export function hasCustomerCapability(role: UserRole | undefined, capability: CustomerCapability): boolean {
  return !!role && (CUSTOMER_ROLE_CAPABILITIES[role as CustomerRole] || []).includes(capability as never);
}

type SubscriptionBusiness = {
  subscriptionStatus?: string | null;
  trialEndsAt?: number | string | null;
  subscription_status?: string | null;
  trial_ends_at?: number | string | null;
};

function normalizeTrialEndsAt(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value) {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function hasSubscriptionAccess(
  profile: Pick<UserProfile, "role"> | null | undefined,
  business: SubscriptionBusiness | null | undefined,
  now = Date.now(),
): boolean {
  if (!profile) return false;
  if (profile.role === "super_admin" || profile.role === "platform_staff") return true;
  if (!business) return false;

  // AuthContext receives business rows directly from Supabase, which use
  // snake_case, while internal TypeScript models use camelCase. Normalize both
  // shapes here so route authorization cannot accidentally pause valid accounts.
  const status = String(
    business.subscriptionStatus ?? business.subscription_status ?? "",
  ).toLowerCase();
  const trialEndsAt = normalizeTrialEndsAt(
    business.trialEndsAt ?? business.trial_ends_at,
  );

  if (status === "active") return true;
  return status === "trialing" && trialEndsAt > now;
}

export function can(capability: Capability, context: CapabilityContext, now = Date.now()): boolean {
  const profile = context.profile;
  if (!profile) return false;
  if (profile.role === "super_admin") return true;
  if (profile.role === "platform_staff") {
    if (capability === "commercial.manage" || capability === "templates.manage" || capability === "business.manage") return false;
    return ["dashboard.view", "website.view", "leads.view", "leads.manage", "appointments.view", "appointments.manage", "updates.manage", "support.manage", "analytics.view", "ai.internal_use"].includes(capability) && (profile.staffPermissions || []).some((permission) => permission === "delivery" || permission === "customer_health" || permission === "sales");
  }
  if (context.businessId && profile.businessId && context.businessId !== profile.businessId) return false;
  if (!hasSubscriptionAccess(profile, context.business, now)) return false;
  if (context.featureEnabled === false) return false;
  if (context.customerOverride === true) return true;
  const roleCaps: Record<CustomerRole, Capability[]> = {
    business_admin: ["dashboard.view", "website.view", "website.edit", "website.publish", "website.delete", "website.approve", "billing.view", "billing.manage", "team.view", "team.manage", "leads.view", "leads.manage", "appointments.view", "appointments.manage", "updates.create", "updates.manage", "support.create", "analytics.view", "ai.customer_use", "ai.credit_purchase", "business.settings"],
    staff: ["dashboard.view", "website.view", "website.edit", "website.approve", "leads.view", "leads.manage", "appointments.view", "appointments.manage", "updates.create", "support.create", "analytics.view"],
    client: ["dashboard.view", "website.view", "website.approve", "billing.view", "leads.view", "appointments.view", "updates.create", "support.create", "analytics.view"],
  };
  return roleCaps[profile.role as CustomerRole]?.includes(capability) || false;
}
