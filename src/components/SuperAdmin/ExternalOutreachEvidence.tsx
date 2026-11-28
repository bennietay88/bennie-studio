import { useState } from "react";
import { CONSENT_COLUMNS, parseRecipientConsentCsv } from "../../lib/recipientConsentImport";
import type { ManualRecipientEvidence } from "../../lib/manualRecipientEvidence";

export type ExternalEvidenceMap = Record<string, ManualRecipientEvidence>;

export function ExternalOutreachEvidence({ disabled, onChange, emails }: {
  disabled?: boolean;
  onChange: (records: ExternalEvidenceMap) => void;
  emails: string[];
}) {
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const load = async (file?: File) => {
    onChange({}); setSummary(""); setError("");
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error("File exceeds 100 KB.");
      const records = parseRecipientConsentCsv(await file.text());
      const targets = new Set(emails.map(email => email.trim().toLowerCase()));
      const matched: ExternalEvidenceMap = Object.create(null);
      for (const row of records) {
        if (!targets.has(row.consent_email)) continue;
        matched[row.consent_email] = {
          email: row.consent_email,
          timestamp: row.consent_timestamp,
          reference: row.consent_source,
          jurisdiction: row.contact_jurisdiction,
          recipientType: row.contact_recipient_type as "business" | "individual",
        };
      }
      onChange(matched);
      setSummary(Object.keys(matched).length + " recipient record(s) matched in this selection. CRM consent fields remain unchanged.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read evidence file."); }
  };
  const downloadHeaders = () => {
    const url = URL.createObjectURL(new Blob([CONSENT_COLUMNS.join(",") + "\n"], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "external-recipient-records.csv"; link.click(); URL.revokeObjectURL(url);
  };
  return <details className="rounded-xl border border-slate-200 p-4 text-sm">
    <summary className="cursor-pointer font-semibold">Use independently maintained recipient records (optional)</summary>
    <p className="mt-2 text-xs leading-5 text-slate-600">If permission is managed outside the CRM, attach actual recipient-specific records for the selected addresses. The server validates the original evidence. This does not update prospect consent fields or override opt-outs.</p>
    <button type="button" disabled={disabled} onClick={downloadHeaders} className="mt-2 text-indigo-700 underline">Download CSV headers</button>
    <input aria-label="External recipient records CSV" type="file" accept=".csv,text/csv" disabled={disabled} className="mt-3 block w-full text-xs" onChange={e => void load(e.target.files?.[0])}/>
    {summary && <p role="status" className="mt-2 text-xs text-slate-700">{summary}</p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </details>;
}
