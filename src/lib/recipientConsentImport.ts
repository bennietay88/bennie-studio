import { parseCsvRecords } from "./prospectImport.js";
import { isSupportedSalesEmailJurisdiction } from "./salesAutomation.js";

export const CONSENT_COLUMNS = ["consent_email", "consent_timestamp", "consent_source", "contact_jurisdiction", "contact_recipient_type"] as const;

/** Import independently obtained recipient evidence, never a list-level declaration. */
export function parseRecipientConsentCsv(csv: string, now = new Date()) {
  const records = parseCsvRecords(csv);
  const headers = records[0].map(h => h.toLowerCase().trim());
  if (headers.length !== CONSENT_COLUMNS.length || new Set(headers).size !== headers.length || !CONSENT_COLUMNS.every(h => headers.includes(h))) {
    throw new Error("Use exactly these CSV headers: " + CONSENT_COLUMNS.join(", "));
  }
  if (records.length < 2 || records.length > 51) throw new Error("Import 1–50 consent records per file.");
  const seen = new Set<string>();
  return records.slice(1).map((values,i) => {
    const fail = (message: string): never => { throw new Error("Row " + (i + 2) + ": " + message); };
    if (values.length !== headers.length) fail("Incorrect column count.");
    const r = Object.fromEntries(headers.map((key,j) => [key,values[j].trim()]));
    const email = r.consent_email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail("Invalid email.");
    if (seen.has(email)) fail("Duplicate recipient.");
    seen.add(email);
    const time = Date.parse(r.consent_timestamp);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(r.consent_timestamp) || !Number.isFinite(time) || time > now.getTime()) fail("Provide the actual past consent timestamp in ISO 8601 with timezone.");
    if (r.consent_source.length < 10 || r.consent_source.length > 1000) fail("Provide the recipient-specific source and evidence reference.");
    const country = r.contact_jurisdiction.toUpperCase();
    const type = r.contact_recipient_type.toLowerCase();
    if (!isSupportedSalesEmailJurisdiction(country)) fail("Unsupported or missing jurisdiction.");
    if (!["business","individual"].includes(type)) fail("Recipient type must be business or individual.");
    return { marketing_consent: true, consent_email: email, consent_timestamp: new Date(time).toISOString(), consent_source: r.consent_source, contact_jurisdiction: country, contact_recipient_type: type, contact_lawful_basis: "consent" };
  });
}

export type RecipientConsentEvidence = ReturnType<typeof parseRecipientConsentCsv>[number];

/** Keep the original CSV external and submit only the relevant recipient row. */
export function recipientConsentCsvRow(evidence: RecipientConsentEvidence): string {
  return CONSENT_COLUMNS.join(",") + "\n" + CONSENT_COLUMNS.map(key =>
    '"' + evidence[key].replaceAll('"', '""') + '"').join(",");
}

export function resolveExternalRecipientConsent(csv: string, contact: {
  contact_email?: string | null; consent_timestamp?: string | null; marketing_consent?: boolean | null;
}, now: Date): RecipientConsentEvidence | null {
  try {
    const rows = parseRecipientConsentCsv(csv, now);
    if (rows.length !== 1) return null;
    const evidence = rows[0];
    if (evidence.consent_email !== String(contact.contact_email || "").trim().toLowerCase()) return null;
    if (contact.consent_timestamp) {
      const existing = Date.parse(contact.consent_timestamp);
      const supplied = Date.parse(evidence.consent_timestamp);
      if (!Number.isFinite(existing) || existing > supplied
        || (contact.marketing_consent !== true && existing >= supplied)) return null;
    }
    return evidence;
  } catch { return null; }
}
