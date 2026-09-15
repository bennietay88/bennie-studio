/**
 * Deterministic, non-production personas for local/CI tests only.
 * These IDs and emails are intentionally synthetic and must never be seeded
 * into the production database.
 */
export const testPersonas = {
  superAdmin: { id: "00000000-0000-4000-8000-000000000011", email: "superadmin@example.test", role: "super_admin" },
  platformStaff: { id: "00000000-0000-4000-8000-000000000012", email: "platform@example.test", role: "platform_staff" },
  businessAdmin: { id: "00000000-0000-4000-8000-000000000013", email: "owner@example.test", role: "business_admin" },
  staff: { id: "00000000-0000-4000-8000-000000000014", email: "staff@example.test", role: "staff" },
  client: { id: "00000000-0000-4000-8000-000000000015", email: "client@example.test", role: "client" },
} as const;

export const testStripe = {
  secretKey: "sk_test_e2e",
  webhookSecret: "whsec_e2e",
  paymentMethod: "pm_card_visa",
  cardNumber: "4242 4242 4242 4242",
} as const;

if (process.env.NODE_ENV === "production" && process.env.E2E_TEST !== "true") {
  throw new Error("Test personas must not be imported by production code.");
}
