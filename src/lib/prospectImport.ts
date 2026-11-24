import { z } from "zod";

const POSITIONAL_COLUMNS = [
  "name",
  "domain",
  "industry",
  "location",
  "contact_email",
  "contact_phone",
  "contact_whatsapp",
  "social_url",
  "notes",
] as const;

const ALIASES: Record<string, string> = {
  business: "name",
  business_name: "name",
  company: "name",
  company_name: "name",
  organisation: "name",
  organization: "name",
  prospect: "name",
  prospect_name: "name",

  website: "domain",
  website_url: "domain",
  web: "domain",
  url: "domain",
  domain_name: "domain",
  existing_website: "domain",

  niche: "industry",
  category: "industry",
  sector: "industry",
  business_type: "industry",

  city_area: "city",
  city_town: "city",
  town: "city",
  region: "state",

  email: "contact_email",
  email_address: "contact_email",
  e_mail: "contact_email",

  phone: "contact_phone",
  phone_number: "contact_phone",
  telephone: "contact_phone",
  tel: "contact_phone",
  mobile: "contact_phone",

  whatsapp: "contact_whatsapp",
  whatsapp_number: "contact_whatsapp",
  whatsapp_phone: "contact_whatsapp",
  wa: "contact_whatsapp",

  social: "social_url",
  social_media: "social_url",
  social_link: "social_url",
  instagram: "instagram_url",
  facebook: "facebook_url",
  linkedin: "linkedin_url",

  remark: "notes",
  remarks: "notes",
  comment: "notes",
  comments: "notes",

  contact_page_or_listing: "contact_source_url",
  contact_page: "contact_source_url",
  listing_url: "contact_source_url",
  website_evidence_url: "website_evidence_source_url",
  website_source_url: "website_evidence_source_url",
  website_checked_at: "website_verified_at",
  website_check_method: "website_verification_method",
  website_evidence: "website_finding",
};

const canonicalHeader = (value: string) => {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ALIASES[key] || key;
};

const MISSING_VALUE = /^(?:n\/?a|na|none|null|unknown|not\s+found(?:\s+publicly)?|no\s+website|-+)$/i;
const WEBSITE_STATUSES = new Set(["unknown", "no_website", "weak", "average", "strong"]);
const OPPORTUNITY_LEVELS = new Set(["low", "medium", "high"]);

const isMissing = (value: unknown) => !String(value || "").trim() || MISSING_VALUE.test(String(value).trim());

const uniqueLocation = (values: unknown[]) => {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
};

const normalizePublicUrl = (value: string, field: string, fail: (message: string) => never) => {
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
    if (
      !["http:", "https:"].includes(url.protocol)
      || url.username
      || url.password
      || !url.hostname.includes(".")
    ) {
      fail(`${field} must be a public HTTP(S) address.`);
    }
    return url;
  } catch {
    fail(`${field} is invalid.`);
  }
};

export function parseCsvRecords(csv: string): string[][] {
  if (csv.length > 500_000) throw new Error("Import is too large. Use at most 500 rows per file.");

  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;

  const finishCell = () => {
    row.push(cell.trim());
    cell = "";
    closed = false;
  };
  const finishRow = () => {
    finishCell();
    if (row.some(Boolean)) records.push(row);
    row = [];
  };

  const input = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else {
        cell += char;
      }
    } else if (char === '"' && !cell.trim() && !closed) {
      cell = "";
      quoted = true;
    } else if (char === ",") {
      finishCell();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      finishRow();
    } else if (closed && !/\s/.test(char)) {
      throw new Error("Unexpected text after a quoted CSV field.");
    } else if (char === '"') {
      throw new Error("Quote CSV fields that contain quotation marks.");
    } else if (!closed) {
      cell += char;
    }
  }

  if (quoted) throw new Error("A quoted CSV field is not closed.");
  finishRow();
  if (!records.length) throw new Error("No CSV rows found.");
  return records;
}

export function parseProspectCsv(csv: string): { prospects: Record<string, any>[]; duplicates: number } {
  const records = parseCsvRecords(csv);
  const first = records[0].map(canonicalHeader);
  const hasHeader = first.includes("name");
  const headers: readonly string[] = hasHeader ? first : POSITIONAL_COLUMNS;
  if (hasHeader && new Set(headers).size !== headers.length) {
    throw new Error("CSV headers map to the same field more than once.");
  }

  const rows = hasHeader ? records.slice(1) : records;
  if (!rows.length || rows.length > 500) {
    throw new Error("Import between 1 and 500 prospects at a time.");
  }

  const names = new Set<string>();
  const domains = new Set<string>();
  const emails = new Set<string>();
  let duplicates = 0;
  const prospects: Record<string, any>[] = [];

  for (const [index, values] of rows.entries()) {
    const rowNumber = index + (hasHeader ? 2 : 1);
    const fail = (message: string): never => {
      throw new Error(`Row ${rowNumber}: ${message}`);
    };

    if (values.length > headers.length) {
      fail("too many fields; quote fields containing commas.");
    }

    const record = Object.fromEntries(
      headers.map((key, i) => [key, values[i]?.normalize("NFC").trim() || null]),
    );

    if (!record.name || record.name.length < 2 || record.name.length > 160) {
      fail("business name must be 2–160 characters.");
    }

    if ((record.industry?.length || 0) > 160) fail("industry is too long.");

    const explicitLocation = String(record.location || "").trim();
    const location = explicitLocation || uniqueLocation([
      record.city,
      record.state,
      record.market,
      record.country,
    ]);
    if (location.length > 240) fail("location is too long.");

    if (record.contact_email && !isMissing(record.contact_email)) {
      record.contact_email = String(record.contact_email).toLowerCase();
      if (!z.string().email().max(254).safeParse(record.contact_email).success) {
        fail("email is invalid.");
      }
    } else {
      record.contact_email = null;
    }

    if (record.contact_phone && !isMissing(record.contact_phone)) {
      record.contact_phone = String(record.contact_phone).replace(/\D/g, "");
      if (!/^\d{7,15}$/.test(record.contact_phone)) {
        fail("contact_phone must contain 7–15 digits, including country code.");
      }
    } else {
      record.contact_phone = null;
    }

    if (record.contact_whatsapp && !isMissing(record.contact_whatsapp)) {
      record.contact_whatsapp = String(record.contact_whatsapp).replace(/\D/g, "");
      if (!/^\d{7,15}$/.test(record.contact_whatsapp)) {
        fail("contact_whatsapp must contain 7–15 digits, including country code.");
      }
    } else {
      record.contact_whatsapp = null;
    }

    const noWebsiteSignal = record.domain && isMissing(record.domain);
    if (record.domain && !noWebsiteSignal) {
      const url = normalizePublicUrl(String(record.domain), "domain", fail);
      record.domain = url.hostname.toLowerCase().replace(/^www\./, "");
    } else {
      record.domain = null;
    }

    const socialCandidate = [
      record.social_url,
      record.instagram_url,
      record.facebook_url,
      record.linkedin_url,
    ].find((value) => value && !isMissing(value));
    if (socialCandidate) {
      record.social_url = normalizePublicUrl(String(socialCandidate), "social_url", fail).href;
    } else {
      record.social_url = null;
    }

    const notes = [
      record.notes ? String(record.notes).trim() : "",
      record.priority ? `Priority: ${record.priority}` : "",
      record.contact_confidence ? `Contact confidence: ${record.contact_confidence}` : "",
      record.source_note ? `Source: ${record.source_note}` : "",
      record.pitch_angle ? `Pitch angle: ${record.pitch_angle}` : "",
      record.contact_source_url ? `Contact/listing: ${record.contact_source_url}` : "",
    ].filter(Boolean).join("\n");
    if (notes.length > 5000) fail("notes and import metadata must be at most 5,000 characters.");

    const requestedWebsiteStatus = String(record.website_status || "").trim().toLowerCase();
    const requestedOpportunity = String(record.opportunity_level || "").trim().toLowerCase();
    let websiteEvidenceSourceUrl: string | null = null;
    let websiteEvidenceComplete = false;
    if (record.website_evidence_source_url && !isMissing(record.website_evidence_source_url)) {
      const evidenceUrl = normalizePublicUrl(String(record.website_evidence_source_url), "website_evidence_source_url", fail);
      websiteEvidenceSourceUrl = evidenceUrl.toString();
      const verifiedAt = new Date(String(record.website_verified_at || ""));
      websiteEvidenceComplete = Number.isFinite(verifiedAt.getTime()) && verifiedAt.getTime() <= Date.now()
        && Boolean(String(record.website_verification_method || "").trim())
        && String(record.website_verification_method).trim().length <= 80
        && String(record.website_finding || "").trim().length >= 10
        && String(record.website_finding).trim().length <= 1000;
      if ((requestedWebsiteStatus === "no_website" || noWebsiteSignal) && !websiteEvidenceComplete) {
        fail("a no-website finding requires a source URL, verification date, method, and finding.");
      }
    }

    const prospect = {
      name: String(record.name).trim(),
      domain: record.domain,
      industry: record.industry ? String(record.industry).trim() : null,
      location: location || null,
      contact_email: record.contact_email,
      contact_phone: record.contact_phone,
      contact_whatsapp: record.contact_whatsapp,
      social_url: record.social_url,
      notes: notes || null,
      source: String(record.source || "csv_import").trim().slice(0, 160) || "csv_import",
      website_status: websiteEvidenceComplete && (noWebsiteSignal || WEBSITE_STATUSES.has(requestedWebsiteStatus))
        ? (noWebsiteSignal ? "no_website" : requestedWebsiteStatus)
        : "unknown",
      website_evidence_source_url: websiteEvidenceComplete ? websiteEvidenceSourceUrl : null,
      website_verified_at: websiteEvidenceComplete ? new Date(String(record.website_verified_at)).toISOString() : null,
      website_verification_method: websiteEvidenceComplete ? String(record.website_verification_method).trim() : null,
      website_finding: websiteEvidenceComplete ? String(record.website_finding).trim() : null,
      website_evidence_confidence: websiteEvidenceComplete && ["low", "medium", "high"].includes(String(record.website_evidence_confidence || "").toLowerCase())
        ? String(record.website_evidence_confidence).toLowerCase() : null,
      outreach_status: "not_started",
      opportunity_level: OPPORTUNITY_LEVELS.has(requestedOpportunity)
        ? requestedOpportunity
        : "medium",
    };

    const nameKey = `${prospect.name.toLowerCase()}|${(prospect.location || "").toLowerCase()}`;
    if (
      (prospect.domain && domains.has(prospect.domain))
      || (prospect.contact_email && emails.has(prospect.contact_email))
      || names.has(nameKey)
    ) {
      duplicates++;
      continue;
    }

    if (prospect.domain) domains.add(prospect.domain);
    if (prospect.contact_email) emails.add(prospect.contact_email);
    names.add(nameKey);
    prospects.push(prospect);
  }

  return { prospects, duplicates };
}

/**
 * Record the importer's declared authorization for manual sales outreach.
 * This is not evidence that the recipient expressly opted into marketing.
 * Never populate marketing_consent, consent_timestamp or consent_source here.
 */
export const attachUploaderOutreachDeclaration = (
  prospect: Record<string, any>,
  declaredAt: string,
): Record<string, any> => {
  if (!prospect.contact_email) return { ...prospect };
  const declaration = `Manual outreach authorization declared by CSV uploader at ${declaredAt}. This is an uploader declaration, not verified recipient opt-in.`;
  return {
    ...prospect,
    notes: [String(prospect.notes || "").trim(), declaration].filter(Boolean).join("\n"),
  };
};
