import { z } from "zod";
import { salesEmailPermissionBlockReason } from "./salesAutomation.js";

/** Transport-independent recipient evidence supplied from an independently maintained record. */
export const manualRecipientEvidenceSchema = z.object({
  email: z.string().trim().email().max(254),
  timestamp: z.string().trim().max(50),
  reference: z.string().trim().min(10).max(1000),
  jurisdiction: z.string().trim().min(2).max(2),
  recipientType: z.enum(["business", "individual"]),
}).strict();
export type ManualRecipientEvidence = z.infer<typeof manualRecipientEvidenceSchema>;

export function resolveManualRecipientEvidence(value: unknown, contact: {
  contact_email?: string | null; consent_timestamp?: string | null; marketing_consent?: boolean | null;
}, now: Date) {
  const parsed = manualRecipientEvidenceSchema.safeParse(value);
  if (!parsed.success) return null;
  const evidence = parsed.data;
  const email = evidence.email.toLowerCase();
  if (email !== String(contact.contact_email || "").trim().toLowerCase()) return null;
  const timestamp = Date.parse(evidence.timestamp);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(evidence.timestamp)
      || !Number.isFinite(timestamp) || timestamp > now.getTime()) return null;
  if (contact.consent_timestamp) {
    const existing = Date.parse(contact.consent_timestamp);
    if (!Number.isFinite(existing) || existing > timestamp
      || (contact.marketing_consent !== true && existing >= timestamp)) return null;
  }
  const record = {
    marketing_consent: true, consent_email: email, consent_timestamp: new Date(timestamp).toISOString(),
    consent_source: evidence.reference, contact_jurisdiction: evidence.jurisdiction.toUpperCase(),
    contact_recipient_type: evidence.recipientType, contact_lawful_basis: "consent",
  };
  return salesEmailPermissionBlockReason({ ...record, contact_email: email }, now) ? null : record;
}
