import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { MAX_MANUAL_BULK_FOLLOW_UP, prepareManualBulkFollowUp } from "../../lib/manualBulkProspectFollowUps";
import type { ManualBulkFollowUpPreview } from "../../lib/manualBulkProspectFollowUps";
import type { ProspectEmailOverrides } from "../../lib/prospectOutreachTemplates";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

type PreviewRow = ManualBulkFollowUpPreview & {
  requestId: string;
  delivery: "ready" | "skipped" | "sending" | "submitted" | "failed";
  error?: string;
};

type Props = {
  open: boolean;
  selectedIds: string[];
  onOpenChange: (open: boolean) => void;
  onCompleted: (sentIds: string[]) => void;
};

export function ManualBulkProspectFollowUps({ open, selectedIds, onOpenChange, onCompleted }: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [finished, setFinished] = useState(false);
  const dispatchLock = useRef(false);
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setRows([]);
    setLoadError("");
    setFinished(false);
    setPermissionConfirmed(false);
    if (!selectedIds.length || selectedIds.length > MAX_MANUAL_BULK_FOLLOW_UP) {
      setLoadError("Select between 1 and " + MAX_MANUAL_BULK_FOLLOW_UP + " prospects to review at a time.");
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Admin session expired. Sign in and try again.");
        const headers = { Authorization: "Bearer " + session.access_token };
        const templates = await fetch("/api/admin/sales-automation/templates", { headers, cache: "no-store" });
        if (!templates.ok) throw new Error("Could not verify current email templates. No messages will be sent.");
        const templatePayload = await templates.json();
        const overrides: ProspectEmailOverrides = templatePayload.overrides || {};
        const checked: PreviewRow[] = [];
        const emails = new Set<string>();
        // Small batches avoid overwhelming the engagement endpoint.
        for (let offset = 0; offset < selectedIds.length; offset += 5) {
          const slice = selectedIds.slice(offset, offset + 5);
          const result = await Promise.all(slice.map(async (id) => {
            const requestId = crypto.randomUUID();
            try {
              const response = await fetch("/api/admin/prospects/" + encodeURIComponent(id) + "/engagement", { headers, cache: "no-store" });
              if (!response.ok) throw new Error("Current prospect history could not be verified.");
              const payload = await response.json();
              if (!payload.prospect || !Array.isArray(payload.messages)) throw new Error("Current prospect history is incomplete.");
              const preview = prepareManualBulkFollowUp(payload.prospect, payload.messages, overrides);
              return { ...preview, requestId, delivery: preview.kind === "ready" ? "ready" : "skipped" } as PreviewRow;
            } catch (error: any) {
              return { prospectId: id, name: "Selected prospect", email: "", kind: "skip", reason: error?.message || "Could not verify current prospect history.", requestId, delivery: "skipped" } as PreviewRow;
            }
          }));
          for (const row of result) {
            const email = row.email.trim().toLowerCase();
            if (row.kind === "ready" && emails.has(email)) {
              checked.push({ ...row, kind: "skip", delivery: "skipped", reason: "Duplicate recipient email in this selection." });
            } else {
              checked.push(row);
              if (row.kind === "ready" && email) emails.add(email);
            }
          }
          if (!active) return;
        }
        if (active) setRows(checked);
      } catch (error: any) {
        if (active) setLoadError(error?.message || "Could not prepare bulk follow-up previews.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
    // Capture the selection when the dialog opens. The parent does not change the
    // selection until the operation has fully finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ready = rows.filter((row) => row.delivery === "ready");
  const skipped = rows.filter((row) => row.delivery === "skipped");
  const submitted = rows.filter((row) => row.delivery === "submitted");
  const failed = rows.filter((row) => row.delivery === "failed");

  const sendSelected = async () => {
    if (sending || finished || loading || !ready.length || loadError || !permissionConfirmed) return;
    if (dispatchLock.current) return;
    dispatchLock.current = true;
    setSending(true);
    const sentIds: string[] = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Admin session expired. Sign in and try again.");
      // Explicit manual delivery: each request uses the existing authenticated,
      // stage-verified single-prospect send endpoint. No timer or bulk cron.
      for (const row of ready) {
        if (!row.templateId || !row.subject || !row.bodyText) continue;
        setRows((current) => current.map((item) => item.prospectId === row.prospectId ? { ...item, delivery: "sending" } : item));
        try {
          const response = await fetch("/api/admin/prospects/" + encodeURIComponent(row.prospectId) + "/outreach", {
            method: "POST",
            headers: { Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "send",
              channel: "email",
              subject: row.subject,
              bodyText: row.bodyText,
              templateId: row.templateId,
              observation: "",
              reviewUrl: null,
              replyToMessageId: null,
              requestId: row.requestId,
              recipientPermissionConfirmed: permissionConfirmed,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            const failure = new Error(payload.error || "Provider did not confirm the send.") as Error & { status?: number; code?: string };
            failure.code = payload.code;
            failure.status = response.status;
            throw failure;
          }
          sentIds.push(row.prospectId);
          setRows((current) => current.map((item) => item.prospectId === row.prospectId ? { ...item, delivery: "submitted" } : item));
        } catch (error: any) {
          const blocked = ["CONTACT_PERMISSION_NOT_VERIFIED", "CONTACT_PERMISSION_CONFIRMATION_REQUIRED", "CONTACT_SUPPRESSED", "CONTACT_CLOSED", "OUTREACH_FOLLOW_UP_STAGE_NOT_DUE"].includes(error?.code);
          setRows((current) => current.map((item) => item.prospectId === row.prospectId
            ? blocked ? { ...item, kind: "skip", delivery: "skipped", reason: (error?.message || "Recipient is not eligible.") + " No email attempted.", error: undefined }
              : { ...item, delivery: "failed", error: error?.message || "Delivery failed. Verify with the email provider before trying again." } : item));
          if (error?.status === 429 || error?.status === 503) {
            setRows(current => current.map(item => item.delivery === "ready" ? { ...item, kind: "skip", delivery: "skipped", reason: "Not attempted: batch stopped after a provider or quota restriction." } : item));
            setLoadError("Sending stopped after a shared provider failure or quota restriction. Remaining messages were not attempted.");
            break;
          }
        }
      }
      setFinished(true);
      if (sentIds.length) onCompleted(sentIds);
      toast.info("Bulk send completed. Check the provider delivery status for each message.");
    } catch (error: any) {
      setLoadError(error?.message || "Sending stopped. Verify delivery before retrying.");
      // Do not re-attempt messages with uncertain provider acceptance.
      setFinished(true);
      if (sentIds.length) onCompleted(sentIds);
    } finally {
      dispatchLock.current = false;
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!sending) onOpenChange(next); }}>
      <DialogContent className="!flex h-[min(92dvh,920px)] w-[calc(100vw-2rem)] !max-w-4xl min-w-0 flex-col gap-0 overflow-hidden rounded-3xl p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-5 pr-14 sm:px-7">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-950"><Mail className="h-5 w-5 text-indigo-600" /> Send selected follow-ups</DialogTitle>
          <DialogDescription className="leading-6">
            Review the eligible batch, tick the confirmation and send. Individual previews are available below. Opening this screen never sends emails.
            Prospects without a confirmed earlier email, not yet due, already replied, or closed are skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {loading && <div className="flex items-center gap-3 rounded-xl bg-indigo-50 p-4 text-sm font-medium text-indigo-900"><Loader2 className="h-5 w-5 animate-spin" /> Verifying sent history and preparing individual previews…</div>}
          {loadError && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertTriangle className="h-5 w-5 shrink-0" /> {loadError}</div>}
          {!!rows.length && (
            <>
              <div className="flex flex-wrap gap-3 text-sm font-medium">
                <span className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-800">{ready.length} ready</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{skipped.length} skipped</span>
                {!!submitted.length && <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{submitted.length} submitted</span>}
                {!!failed.length && <span className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">{failed.length} failed / needs review</span>}
              </div>
              {skipped.some(row => /consent|permission evidence/i.test(row.reason || "")) && !finished && (
                <p className="text-sm text-slate-600">Recipients without saved authorization are excluded. Existing permission records can be imported together using Recipient Consent Import in Prospect Explorer; no individual forms are required in this batch.</p>
              )}
              <div className="space-y-3">
                {[...rows.filter(row => row.delivery !== "skipped"), ...rows.filter(row => row.delivery === "skipped")].map((row, index) => (
                  <div key={row.prospectId} className={"rounded-xl border p-4 " + (row.delivery === "skipped" ? "border-slate-200 bg-slate-50" : row.delivery === "failed" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{row.name}</p>
                        <p className="break-all text-xs text-slate-500">{row.email || row.prospectId}</p>
                      </div>
                      <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " + (row.delivery === "ready" ? "bg-indigo-100 text-indigo-800" : row.delivery === "submitted" ? "bg-emerald-100 text-emerald-800" : row.delivery === "failed" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-600")}>
                        {row.delivery === "ready" ? "Day " + ([3, 8, 15][(row.stage || 1) - 1]) + " · Ready" : row.delivery === "sending" ? "Sending…" : row.delivery === "submitted" ? "Submitted" : row.delivery === "failed" ? "Needs review" : "Skipped"}
                      </span>
                    </div>
                    {row.kind === "ready" ? (
                      <details className="mt-3" open={index === 0 ? true : undefined}>
                        <summary className="cursor-pointer text-sm font-semibold text-indigo-700">Review subject and full email</summary>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-sm font-semibold text-slate-900">{row.subject}</p>
                          <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-6 text-slate-700">{row.bodyText}</pre>
                        </div>
                      </details>
                    ) : <p className="mt-2 text-xs leading-5 text-slate-600">{row.reason}</p>}
                    {row.error && <p className="mt-2 text-xs font-medium text-rose-800">{row.error} Do not resend until the provider delivery is checked.</p>}
                  </div>
                ))}
              </div>
            </>
          )}
          {finished && <div role="status" className="flex gap-2 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900"><ShieldCheck className="h-5 w-5 shrink-0" /> Processing finished. Submitted means the provider accepted the request, not that inbox delivery is confirmed. Review failed or uncertain deliveries before any retry.</div>}
        </div>
        {!loading && !loadError && ready.length > 0 && !finished && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-5 pt-3 sm:px-7">
            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"><input type="checkbox" checked={permissionConfirmed} disabled={sending} onChange={(event) => setPermissionConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>I have reviewed these emails and confirm that I have permission to contact the eligible recipients. This confirmation does not create or alter marketing-consent records.</span></label>
          </div>
        )}
        <DialogFooter className="!mx-0 !mb-0 shrink-0 gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>{finished ? "Close" : "Cancel"}</Button>
          {!finished && <Button onClick={() => void sendSelected()} disabled={loading || sending || !ready.length || !!loadError || !permissionConfirmed} className="bg-indigo-600 text-white hover:bg-indigo-700">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {sending ? "Sending individually…" : "Send " + ready.length + " reviewed follow-up" + (ready.length === 1 ? "" : "s")}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
