import { PLANS, normalizePlan, type Plan } from "../constants/plans";

/**
 * Personal Profile is sold from the commercial catalogue, but older plan-table
 * migrations may not contain its `profile` entitlement row. Keep the sold plan
 * usable with its explicit static fallback until the row is provisioned.
 */
export function ensurePersonalProfilePlan(plans: Plan[]): Plan[] {
  if (plans.some((plan) => plan.id === "profile")) return plans;
  const fallback = PLANS.find((plan) => plan.id === "profile");
  return fallback ? [...plans, normalizePlan(fallback)] : plans;
}
