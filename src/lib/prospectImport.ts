import { z } from "zod";

const COLUMNS = ["name", "domain", "industry", "location", "contact_email", "contact_phone", "contact_whatsapp", "social_url", "notes"] as const;
const ALIASES: Record<string, string> = { business: "name", business_name: "name", company: "name", website: "domain", website_url: "domain", email: "contact_email", phone: "contact_phone", whatsapp: "contact_whatsapp", social: "social_url" };
const canonicalHeader = (value: string) => {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIASES[key] || key;
};

export function parseProspectCsv(csv: string): { prospects: Record<string, any>[]; duplicates: number } {
  if (csv.length > 500_000) throw new Error("Import is too large. Use at most 500 rows per file.");
  const records: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false; let closed = false;
  const finishCell = () => { row.push(cell.trim()); cell = ""; closed = false; };
  const finishRow = () => { finishCell(); if (row.some(Boolean)) records.push(row); row = []; };
  const input = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === '"' && !cell.trim() && !closed) { cell = ""; quoted = true; }
    else if (char === ",") finishCell();
    else if (char === "\n" || char === "\r") { if (char === "\r" && input[i + 1] === "\n") i++; finishRow(); }
    else if (closed && !/\s/.test(char)) throw new Error("Unexpected text after a quoted CSV field.");
    else if (char === '"') throw new Error("Quote CSV fields that contain quotation marks.");
    else if (!closed) cell += char;
  }
  if (quoted) throw new Error("A quoted CSV field is not closed.");
  finishRow();
  if (!records.length) throw new Error("No prospect rows found.");
  const first = records[0].map(canonicalHeader);
  const hasHeader = first.includes("name") && first.every((value) => COLUMNS.includes(value as any));
  const headers: readonly string[] = hasHeader ? first : COLUMNS;
  if (hasHeader && new Set(headers).size !== headers.length) throw new Error("CSV headers must not be repeated.");
  const rows = hasHeader ? records.slice(1) : records;
  if (!rows.length || rows.length > 500) throw new Error("Import between 1 and 500 prospects at a time.");
  const names = new Set<string>(); const domains = new Set<string>(); const emails = new Set<string>();
  let duplicates = 0;
  const prospects: Record<string, any>[] = [];
  for (const [index, values] of rows.entries()) {
    const rowNumber = index + (hasHeader ? 2 : 1);
    const fail = (message: string): never => { throw new Error(`Row ${rowNumber}: ${message}`); };
    if (values.length > headers.length) fail("too many fields; quote fields containing commas.");
    const record = Object.fromEntries(headers.map((key, i) => [key, values[i]?.normalize("NFC").trim() || null]));
    if (!record.name || record.name.length < 2 || record.name.length > 160) fail("business name must be 2–160 characters.");
    for (const field of ["industry", "location"]) if ((record[field]?.length || 0) > 160) fail(`${field} is too long.`);
    if ((record.notes?.length || 0) > 5000) fail("notes must be at most 5,000 characters.");
    if (record.contact_email) {
      record.contact_email = record.contact_email.toLowerCase();
      if (!z.string().email().max(254).safeParse(record.contact_email).success) fail("email is invalid.");
    }
    for (const field of ["contact_phone", "contact_whatsapp"]) {
      if (record[field]) {
        record[field] = record[field].replace(/[\s()+.-]/g, "");
        if (!/^\d{7,15}$/.test(record[field])) fail(`${field} must contain 7–15 digits, including country code.`);
      }
    }
    for (const field of ["domain", "social_url"]) {
      if (!record[field]) continue;
      try {
        const url = new URL(/^[a-z]+:\/\//i.test(record[field]) ? record[field] : `https://${record[field]}`);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) fail(`${field} must be a public HTTP(S) address.`);
        record[field] = field === "domain" ? url.hostname.toLowerCase().replace(/^www\./, "") : url.href;
      } catch { fail(`${field} is invalid.`); }
    }
    const nameKey = `${record.name.toLowerCase()}|${(record.location || "").toLowerCase()}`;
    if ((record.domain && domains.has(record.domain)) || (record.contact_email && emails.has(record.contact_email)) || names.has(nameKey)) { duplicates++; continue; }
    if (record.domain) domains.add(record.domain);
    if (record.contact_email) emails.add(record.contact_email);
    names.add(nameKey);
    prospects.push({ ...record, source: "csv_import", website_status: "unknown", outreach_status: "not_started", opportunity_level: "medium" });
  }
  return { prospects, duplicates };
}
