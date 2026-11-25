import type { ManualRecipientEvidence } from "../../lib/manualRecipientEvidence";

/** Optional, transient evidence input. Never writes consent fields to the prospect. */
export function ManualRecipientEvidenceFields({ email, value, onChange, disabled }: {
  email: string; value?: ManualRecipientEvidence; onChange: (value: ManualRecipientEvidence | undefined) => void; disabled: boolean;
}) {
  const draft: ManualRecipientEvidence = value || { email, timestamp: "", reference: "", jurisdiction: "", recipientType: "business" };
  const update = (patch: Partial<ManualRecipientEvidence>) => onChange({ ...draft, ...patch, email });
  return <details className="mt-3 rounded-lg border border-slate-200 p-3">
    <summary className="cursor-pointer text-xs font-semibold text-indigo-700">Use an external opt-in record (optional)</summary>
    <p className="mt-2 text-xs leading-5 text-slate-600">If the recipient has opted in outside Bennie Studio, enter the original record details for {email}. No CSV upload or CRM import is required. Only use actual recipient consent; Send confirms your authorization. Leave this section unused to use existing CRM evidence.</p>
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <label className="text-xs">Original opt-in timestamp (with timezone)
        <input className="mt-1 block w-full rounded border p-2 text-xs" placeholder="YYYY-MM-DDTHH:mm:ss+08:00" value={draft.timestamp} disabled={disabled} onChange={e => update({ timestamp: e.target.value })} />
      </label>
      <label className="text-xs">External record reference
        <input className="mt-1 block w-full rounded border p-2 text-xs" maxLength={1000} value={draft.reference} disabled={disabled} onChange={e => update({ reference: e.target.value })} />
      </label>
      <label className="text-xs">Recipient jurisdiction
        <select className="mt-1 block w-full rounded border p-2 text-xs" value={draft.jurisdiction} disabled={disabled} onChange={e => update({ jurisdiction: e.target.value })}>
          <option value="">Select country</option>{["MY","SG","US","GB","CA","AU"].map(country => <option key={country} value={country}>{country}</option>)}
        </select>
      </label>
      <label className="text-xs">Recipient type
        <select className="mt-1 block w-full rounded border p-2 text-xs" value={draft.recipientType} disabled={disabled} onChange={e => update({ recipientType: e.target.value === "individual" ? "individual" : "business" })}>
          <option value="business">Business</option><option value="individual">Individual</option>
        </select>
      </label>
    </div>
    {value && <button type="button" disabled={disabled} className="mt-2 text-xs underline text-slate-600" onClick={() => onChange(undefined)}>Clear external record</button>}
  </details>;
}
