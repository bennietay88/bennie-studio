import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { supabase } from "../../lib/supabase";
import { CONSENT_COLUMNS, parseRecipientConsentCsv } from "../../lib/recipientConsentImport";

export function RecipientConsentImport() {
  const [open,setOpen] = useState(false);
  const [csv,setCsv] = useState("");
  const [busy,setBusy] = useState(false);
  const [reviewed,setReviewed] = useState(false);
  const [error,setError] = useState("");
  const [results,setResults] = useState<Array<{row:number;status:string}>>([]);
  const reset = () => { setCsv(""); setReviewed(false); setResults([]); setError(""); };
  const submit = async (dryRun:boolean) => {
    setBusy(true); setError("");
    try {
      parseRecipientConsentCsv(csv);
      const {data:{session}} = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in again.");
      const response = await fetch("/api/admin/prospects/consent-import", {method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({csv,dryRun})});
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Import unavailable.");
      setResults(payload.results || []); setReviewed(dryRun);
    } catch(e:any) {setError(e.message || "Import unavailable."); setReviewed(false);}
    finally {setBusy(false);}
  };
  const template = () => {
    const url = URL.createObjectURL(new Blob([CONSENT_COLUMNS.join(",")+"\n"],{type:"text/csv"}));
    const a=document.createElement("a"); a.href=url; a.download="recipient-consent-template.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return <><Button variant="outline" onClick={()=>{reset();setOpen(true);}}>Import consent records</Button>
    <Dialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);if(!value)reset();}}}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Import existing recipient consent</DialogTitle><DialogDescription>Upload actual recipient-specific opt-in records. Match existing prospects by exact email. No emails are sent, no suppression is removed, and no consent is inferred from a prospect list.</DialogDescription></DialogHeader>
        <Button variant="outline" onClick={template}>Download CSV headers</Button>
        <input type="file" accept=".csv,text/csv" disabled={busy} onChange={async e=>{reset();const file=e.target.files?.[0];if(file){if(file.size>100000){setError("File too large.");return;}try{setCsv(await file.text());}catch{setError("File could not be read.");}}}} />
        <p className="text-xs text-slate-500">Maximum 50 records per file. Each row requires the original timestamp, source/evidence reference, jurisdiction (US, GB, SG, MY, CA or AU) and recipient type.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {!!results.length && <div className="max-h-60 overflow-y-auto rounded-lg border p-3 text-sm">{results.map(r=><div key={r.row}>CSV row {r.row}: {r.status.replaceAll("_"," ")}</div>)}</div>}
        <DialogFooter><Button variant="outline" disabled={busy||!csv} onClick={()=>void submit(true)}>Preview matches</Button><Button disabled={busy||!reviewed||!results.some(r=>r.status==="ready")} onClick={()=>void submit(false)}>Import verified records</Button></DialogFooter>
      </DialogContent>
    </Dialog></>;
}
