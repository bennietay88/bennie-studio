import type { Business, UserProfile, UserRole } from "../types";

export type CustomerRole = Extract<UserRole, "business_admin" | "staff" | "client">;

export const CUSTOMER_ROLE_CAPABILITIES = {
  business_admin: ["view_business", "manage_team", "manage_billing", "manage_website", "manage_leads", "manage_appointments", "manage_requests"],
  staff: ["view_business", "manage_website", "manage_leads", "manage_appointments", "manage_requests"],
  client: ["view_business", "view_website", "manage_leads", "manage_appointments", "manage_requests"],
} as const satisfies Record<CustomerRole, readonly string[]>;

export type CustomerCapability = (typeof CUSTOMER_ROLE_CAPABILITIES)[CustomerRole][number];

export function hasCustomerCapability(role: UserRole | undefined, capability: CustomerCapability): boolean {
  return !!role && (CUSTOMER_ROLE_CAPABILITIES[role as CustomerRole] || []).includes(capability as never);
}

export function hasSubscriptionAccess(profile: Pick<UserProfile, "role"> | null | undefined, business: Pick<Business, "subscriptionStatus" | "trialEndsAt"> | null | undefined, now = Date.now()): boolean {
  if (!profile) return false;
  if (profile.role === "super_admin" || profile.role === "platform_staff") return true;
  if (!business) return false;
  if (business.subscriptionStatus === "active") return true;
  return business.subscriptionStatus === "trialing" && business.trialEndsAt > now;
}
