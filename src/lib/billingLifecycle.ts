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

export type WebhookClaimState = "processing" | "completed" | "failed";

/** Small deterministic model used by tests to prove one-owner webhook claims. */
export function claimWebhookInMemory(
  record: { status: WebhookClaimState; processing_started_at?: string | null; attempt_count?: number } | null,
  now = Date.now(),
  staleAfterMs = 10 * 60 * 1000,
) {
  if (!record) return { claimed: true, status: "processing" as const, attempt_count: 1, reason: "claimed" };
  if (record.status === "completed") return { claimed: false, status: record.status, attempt_count: record.attempt_count || 0, reason: "completed" };
  if (record.status === "processing" && record.processing_started_at && now - Date.parse(record.processing_started_at) <= staleAfterMs) {
    return { claimed: false, status: record.status, attempt_count: record.attempt_count || 0, reason: "active_processing" };
  }
  return { claimed: true, status: "processing" as const, attempt_count: (record.attempt_count || 0) + 1, reason: "claimed" };
}
