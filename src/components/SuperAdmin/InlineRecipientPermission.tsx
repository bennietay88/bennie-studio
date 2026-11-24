import { useState } from "react";
import { Button } from "../ui/button";
import { supabase } from "../../lib/supabase";
import { CONSENT_COLUMNS, parseRecipientConsentCsv } from "../../lib/recipientConsentImport";

const csvCell = (value: string) => '"' + value.replaceAll('"', '""') + '"';

/** Record an existing recipient-specific opt-in, without a separate CSV upload. */
export function InlineRecipientPermission({ email, onSaved, disabled }: {
  email: string; onSaved: () => void; disabled?: boolean;
}) {
  const [timestamp, setTimestamp] = useState("");
  const [source, setSource] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (busy || disabled) return;
    setBusy(true); setError("");
    try {
      if (!timestamp || !source.trim() || !jurisdiction || !recipientType) throw new Error("Complete the original permission details.");
      const date = new Date(timestamp);
      if (!Number.isFinite(date.getTime())) throw new Error("Enter the actual consent date and time.");
      const csv = CONSENT_COLUMNS.join(",") + "\n" + [email, date.toISOString(), source.trim(), jurisdiction, recipientType].map(csvCell).join(",");
      parseRecipientConsentCsv(csv);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in again.");
      const response = await fetch("/api/admin/prospects/consent-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ csv, dryRun: false }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Permission could not be saved.");
      if (payload.results?.[0]?.status !== "imported") throw new Error("Not saved: " + String(payload.results?.[0]?.status || "unknown result").replaceAll("_", " "));
      onSaved();
    } catch (e: any) { setError(e.message || "Permission could not be saved."); }
    finally { setBusy(false); }
  };

  return <details className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
    <summary className="cursor-pointer font-semibold text-amber-950">Record existing recipient permission</summary>
    <p className="my-2 text-xs text-amber-950">Use the actual opt-in details you already hold for {email}. This does not send an email or remove suppressions. Do not enter a guessed date or source.</p>
    <fieldset disabled={busy || disabled} className="grid gap-2">
      <label className="grid gap-1">Original consent date and time (local time)
        <input type="datetime-local" value={timestamp} onChange={e => setTimestamp(e.target.value)} className="rounded border bg-white p-2" />
      </label>
      <label className="grid gap-1">Source or recipient-specific evidence reference
        <textarea value={source} maxLength={1000} onChange={e => setSource(e.target.value)} className="rounded border bg-white p-2" />
      </label>
      <label className="grid gap-1">Recipient jurisdiction
        <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} className="rounded border bg-white p-2">
          <option value="">Choose jurisdiction</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="SG">Singapore</option><option value="MY">Malaysia</option>
        </select>
      </label>
      <label className="grid gap-1">Recipient type
        <select value={recipientType} onChange={e => setRecipientType(e.target.value)} className="rounded border bg-white p-2">
          <option value="">Choose recipient type</option><option value="business">Business</option><option value="individual">Individual</option>
        </select>
      </label>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <Button type="button" variant="outline" disabled={busy || disabled || !timestamp || source.trim().length < 10 || !jurisdiction || !recipientType} onClick={() => void save()}>{busy ? "Saving…" : "Save permission and refresh review"}</Button>
    </fieldset>
  </details>;
}
