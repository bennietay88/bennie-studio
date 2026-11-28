import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Mail, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { MAX_MANUAL_BULK_INTRO, prepareManualBulkIntro } from "../../lib/manualBulkProspectIntros";
import type { ManualBulkIntroPreview } from "../../lib/manualBulkProspectIntros";
import type { ProspectEmailOverrides } from "../../lib/prospectOutreachTemplates";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

type PreviewRow = ManualBulkIntroPreview & {
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

export function ManualBulkProspectIntros({ open, selectedIds, onOpenChange, onCompleted }: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [finished, setFinished] = useState(false);
  const dispatchLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setRows([]);
    setLoadError("");
    setFinished(false);
    if (!selectedIds.length || selectedIds.length > MAX_MANUAL_BULK_INTRO) {
      setLoadError("Select between 1 and " + MAX_MANUAL_BULK_INTRO + " prospects to review at a time.");
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
        const payload = await templates.json();
        const overrides: ProspectEmailOverrides = payload.overrides || {};
        const checked: PreviewRow[] = [];
        const emails = new Set<string>();
        // Use the same limited, authenticated engagement endpoint as follow-ups.
        for (let offset = 0; offset < selectedIds.length; offset += 5) {
          const batch = await Promise.all(selectedIds.slice(offset, offset + 5).map(async (id): Promise<PreviewRow> => {
            const requestId = crypto.randomUUID();
            try {
              const response = await fetch("/api/admin/prospects/" + encodeURIComponent(id) + "/engagement", { headers, cache: "no-store" });
              if (!response.ok) throw new Error("Current prospect history could not be verified.");
              const history = await response.json();
              if (!history.prospect || !Array.isArray(history.messages)) throw new Error("Current prospect history is incomplete.");
              const preview = prepareManualBulkIntro(history.prospect, history.messages, overrides, { draftOnly: false });
              // Defensive fallback for an eligibility-mode result; draft-only previews do not check recipient consent.
              if (preview.kind === "permission_review") return { ...preview, kind: "skip", requestId, delivery: "skipped", reason: preview.reason || "Recipient permission evidence is incomplete. No email attempted." };
              return { ...preview, requestId, delivery: preview.kind === "ready" ? "ready" : "skipped" };
            } catch (error: any) {
              return { prospectId: id, name: "Selected prospect", email: "", kind: "skip",
                reason: error?.message || "Could not verify current prospect history.", requestId, delivery: "skipped" };
            }
          }));
          for (const row of batch) {
            const key = row.email.trim().toLowerCase();
            if (row.kind !== "skip" && key && emails.has(key)) {
              checked.push({ ...row, kind: "skip", delivery: "skipped", reason: "Duplicate recipient email in this selection." });
            } else {
              checked.push(row);
              if (row.kind !== "skip" && key) emails.add(key);
            }
          }
          if (!active) return;
        }
        if (active) setRows(checked);
      } catch (error: any) {
        if (active) setLoadError(error?.message || "Could not prepare bulk introduction previews.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
    // Freeze the selection for this manual review operation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ready = rows.filter((row) => row.delivery === "ready");
  const skipped = rows.filter((row) => row.delivery === "skipped");
  const submitted = rows.filter((row) => row.delivery === "submitted");
  const failed = rows.filter((row) => row.delivery === "failed");

  const sendSelected = async () => {
    if (sending || finished || loading || !ready.length || loadError) return;
    if (dispatchLock.current) return;
    dispatchLock.current = true;
    setSending(true);
    const sentIds: string[] = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Admin session expired. Sign in and try again.");
      // Sequential requests use the existing single-send endpoint. No bulk cron,
      // automatic schedule, or automatic retry on an uncertain provider response.
      for (const row of ready) {
        if (!row.subject || !row.bodyText) continue;
        setRows((current) => current.map((item) => item.prospectId === row.prospectId
          ? { ...item, delivery: "sending" } : item));
        try {
          const response = await fetch("/api/admin/prospects/" + encodeURIComponent(row.prospectId) + "/outreach", {
            method: "POST",
            headers: { Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "send",
              channel: "email",
              subject: row.subject,
              bodyText: row.bodyText,
              templateId: "bulk-introduction",
              observation: "",
              reviewUrl: null,
              replyToMessageId: null,
              requestId: row.requestId,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            const failure = new Error(payload.error || "Provider did not confirm the send.") as Error & { code?: string; status?: number };
            failure.code = payload.code;
            failure.status = response.status;
            throw failure;
          }
          sentIds.push(row.prospectId);
          setRows((current) => current.map((item) => item.prospectId === row.prospectId
            ? { ...item, delivery: "submitted" } : item));
        } catch (error: any) {
          const message = String(error?.message || "Delivery uncertain. Check provider records before retrying.");
          const blockedByPermission = ["CONTACT_PERMISSION_NOT_VERIFIED", "CONTACT_PERMISSION_CONFIRMATION_REQUIRED", "CONTACT_SUPPRESSED", "CONTACT_CLOSED", "OUTREACH_TOO_SOON"].includes(error?.code)
            || message.includes("Email contact is blocked until")
            || message.includes("Confirm the independently recorded permission details");
          setRows((current) => current.map((item) => item.prospectId === row.prospectId
            ? blockedByPermission
              ? { ...item, kind: "skip", delivery: "skipped",
                  reason: message + " No delivery attempted.", error: undefined }
              : { ...item, delivery: "failed", error: message }
            : item));
          if (error?.status === 429 || error?.status === 503 || error?.status === 401 || error?.status === 403) {
            setRows(current => current.map(item => item.delivery === "ready" ? { ...item, kind: "skip", delivery: "skipped", reason: "Not attempted: batch stopped after a shared service, authorization, or rate-limit error." } : item));
            setLoadError("Sending stopped: " + (error?.message || "Shared service error.") + " Remaining messages were not attempted.");
            break;
          }
        }
      }
      setFinished(true);
      if (sentIds.length) onCompleted(sentIds);
      if (sentIds.length) toast.info(`${sentIds.length} email(s) submitted. Check individual delivery status.`);
      else toast.warning("No emails submitted. Review the individual results.");
    } catch (error: any) {
      setLoadError(error?.message || "Sending stopped. Verify delivery before retrying.");
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
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-950">
            <Mail className="h-5 w-5 text-indigo-600" /> Send introductions to new prospects
          </DialogTitle>
          <DialogDescription className="leading-6">
            Review up to 25 selected prospects. Draft preparation does not authorize delivery. Only new, uncontacted prospects can qualify. The server rechecks contact history, suppression and duplicate protection before sending.
            Existing outbound email history, replies, closed records or duplicate recipients are skipped.
            Opening this screen never sends an email.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          {loading && <div className="flex items-center gap-3 rounded-xl bg-indigo-50 p-4 text-sm font-medium text-indigo-900"><Loader2 className="h-5 w-5 animate-spin" /> Checking outreach history and preparing individual previews…</div>}
          {loadError && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertTriangle className="h-5 w-5 shrink-0" />{loadError}</div>}
          {!!rows.length && (
            <>
              <div className="flex flex-wrap gap-3 text-sm font-medium">
                <span className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-800">{ready.length} drafts prepared</span>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{skipped.length} skipped</span>
                {!!submitted.length && <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{submitted.length} submitted</span>}
                {!!failed.length && <span className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">{failed.length} failed / needs review</span>}
              </div>
              <div className="space-y-3">
                {[...rows.filter(row => row.delivery !== "skipped"), ...rows.filter(row => row.delivery === "skipped")].map((row, index) => (
                  <div key={row.prospectId} className={"rounded-xl border p-4 " +
                    (row.delivery === "skipped" ? "border-slate-200 bg-slate-50" :
                      row.delivery === "failed" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{row.name}</p>
                        <p className="break-all text-xs text-slate-500">{row.email || row.prospectId}</p>
                      </div>
                      <span className={"rounded-full px-2.5 py-1 text-xs font-semibold " +
                        (row.delivery === "ready" ? "bg-indigo-100 text-indigo-800" :
                          row.delivery === "submitted" ? "bg-emerald-100 text-emerald-800" :
                            row.delivery === "failed" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-600")}>
                        {row.delivery === "ready" ? "Introduction · Draft prepared" :
                          row.delivery === "sending" ? "Sending…" :
                            row.delivery === "submitted" ? "Submitted" :
                              row.delivery === "failed" ? "Delivery needs review" : "Skipped"}
                      </span>
                    </div>
                    {row.kind === "ready" && row.subject && row.bodyText ? (
                      <details className="mt-3" open={index === 0 ? true : undefined}>
                        <summary className="cursor-pointer text-sm font-semibold text-indigo-700">Review subject and full email</summary>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-sm font-semibold text-slate-900">{row.subject}</p>
                          <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-6 text-slate-700">{row.bodyText}</pre>
                        </div>
                      </details>
                    ) : row.kind === "skip" ? <p className="mt-2 text-xs leading-5 text-slate-600">{row.reason}</p> : null}
                    {row.error && <p className="mt-2 text-xs font-medium text-rose-800">{row.error} Do not resend until provider delivery is checked.</p>}
                  </div>
                ))}
              </div>
            </>
          )}
          {finished && <div role="status" className="flex gap-2 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">
            <ShieldCheck className="h-5 w-5 shrink-0" /> Processing finished. Submitted means the provider accepted the request, not confirmed inbox delivery.
            Verify failed or uncertain sends before any retry.
          </div>}
        </div>
        <DialogFooter className="!mx-0 !mb-0 shrink-0 gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>{finished ? "Close" : "Cancel"}</Button>
          {!finished && !loading && !loadError && !ready.length && !!rows.length && (
            <p className="text-sm text-slate-600">No drafts available. See skipped reasons above.</p>
          )}
          {!finished && <Button onClick={() => void sendSelected()} disabled={loading || sending || !ready.length || !!loadError} className="bg-indigo-600 text-white hover:bg-indigo-700">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {sending ? "Sending individually…" : "Send " + ready.length + " introduction" + (ready.length === 1 ? "" : "s")}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
