export type WebhookRecord = {
  status: "processing" | "completed" | "failed";
  processing_started_at?: string | null;
};

export function isMinimumTermMature(minimumTermEndDate: string | null | undefined, now = new Date()) {
  if (!minimumTermEndDate) return false;
  return new Date(`${minimumTermEndDate}T00:00:00Z`).getTime() <= now.getTime();
}

export function shouldReclaimWebhook(record: WebhookRecord | null | undefined, now = Date.now(), staleAfterMs = 10 * 60 * 1000) {
  if (!record) return true;
  if (record.status === "completed") return false;
  if (record.status === "failed") return true;
  if (!record.processing_started_at) return true;
  return now - new Date(record.processing_started_at).getTime() > staleAfterMs;
}

export function webhookFailurePatch(error: unknown, now = new Date().toISOString()) {
  return {
    status: "failed" as const,
    failed_at: now,
    error_message: String((error as any)?.message || "WEBHOOK_PROCESSING_FAILED").slice(0, 500),
  };
}
