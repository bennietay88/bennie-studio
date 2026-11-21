/**
 * Completed/no-reply prospects are archived in place, not deleted. Their
 * outbound history remains available for deduplication and operator review.
 * A deliberate admin-only reactivation clears the archive flag but never
 * sends an email, resumes old queued messages, or changes consent evidence.
 */
type Db = any;
type Prospect = Record<string, any>;

function checked(result: { data?: any; error?: any }) {
  if (result.error) throw result.error;
  return result.data;
}

const STOP_ARCHIVE = new Set(["won", "replied", "call_booked", "converted", "paid", "unsubscribed", "closed", "appointment_booked"]);

export function eligibleForNoReplyArchive(prospect: Prospect | null | undefined): boolean {
  if (!prospect || prospect.outreach_exhausted_at || prospect.converted_business_id) return false;
  return ![prospect.status, prospect.outreach_status].some((status) =>
    STOP_ARCHIVE.has(String(status || "").toLowerCase()));
}

/**
 * Called only after the FINAL successfully sent message has completed an
 * outreach enrollment. Also used for the terminal manually-sent follow-up.
 * Never archives after failed, queued or uncertain email delivery.
 */
export async function archiveNoReplyProspect(db: Db, prospectId: string, now: string): Promise<boolean> {
  const prospect = checked(await db.from("prospects").select("*").eq("id", prospectId).maybeSingle());
  if (!eligibleForNoReplyArchive(prospect)) return false;
  const inbound = checked(await db.from("sales_messages").select("id")
    .eq("prospect_id", prospectId).eq("direction", "inbound").limit(1)) || [];
  if (inbound.length) return false;
  const sending = checked(await db.from("sales_messages").select("id")
    .eq("prospect_id", prospectId).eq("status", "sending").limit(1)) || [];
  if (sending.length) return false;

  const updated = checked(await db.from("prospects").update({
    outreach_exhausted_at: now,
    outreach_status: "lost",
    status: "lost",
    next_follow_up_at: null,
    updated_at: now,
  }).eq("id", prospectId).is("outreach_exhausted_at", null)
    .in("outreach_status", ["not_started", "queued", "contacted"])
    .select("id")) || [];
  if (!updated.length) return false;

  // Close ONLY cold-outreach work. Keep conversation history, sent rows,
  // replies and business-related tasks intact for audit/reconciliation.
  checked(await db.from("outreach_enrollments").update({
    status: "stopped", stop_reason: "Archived after completed outreach with no reply",
    next_run_at: null, updated_at: now,
  }).eq("prospect_id", prospectId).in("status", ["pending", "active", "paused"]));
  checked(await db.from("sales_messages").update({
    status: "cancelled", error: "Archived: completed outreach without reply", updated_at: now,
  }).eq("prospect_id", prospectId).eq("direction", "outbound")
    .in("status", ["draft", "approved", "queued"]));
  checked(await db.from("sales_tasks").update({
    status: "dismissed", updated_at: now,
  }).eq("prospect_id", prospectId).eq("status", "open").eq("task_type", "follow_up"));
  return true;
}

/** Reactivation is a permissioned CRM action, NOT an email or an enrollment. */
export async function reactivateArchivedProspect(db: Db, prospectId: string, now: string): Promise<Prospect> {
  const prospect = checked(await db.from("prospects").select("*").eq("id", prospectId).maybeSingle());
  if (!prospect) throw new Error("PROSPECT_NOT_FOUND");
  if (!prospect.outreach_exhausted_at) throw new Error("PROSPECT_NOT_ARCHIVED");
  if (prospect.converted_business_id || ["replied", "won", "converted", "paid", "unsubscribed", "closed"].includes(
    String(prospect.outreach_status || "").toLowerCase())) throw new Error("REACTIVATION_NOT_ALLOWED");
  const sending = checked(await db.from("sales_messages").select("id")
    .eq("prospect_id", prospectId).eq("status", "sending").limit(1)) || [];
  if (sending.length) throw new Error("OUTREACH_SEND_IN_PROGRESS");
  const inProgress = checked(await db.from("outreach_enrollments").select("id")
    .eq("prospect_id", prospectId).in("status", ["pending", "active", "paused"]).limit(1)) || [];
  if (inProgress.length) throw new Error("OUTREACH_SEQUENCE_ACTIVE");

  const email = String(prospect.contact_email || "").trim().toLowerCase();
  if (email) {
    const suppressed = checked(await db.from("sales_suppressions").select("id")
      .eq("email", email).limit(1)) || [];
    if (suppressed.length) throw new Error("CONTACT_SUPPRESSED");
  }
  // Keep historical messages and enrollments. A new sequence requires a
  // separate explicit enrollment with all existing permission safeguards.
  const updated = checked(await db.from("prospects").update({
    outreach_exhausted_at: null, outreach_status: "not_started",
    status: "qualified", next_follow_up_at: null, updated_at: now,
  }).eq("id", prospectId).not("outreach_exhausted_at", "is", null)
    .select("*").maybeSingle());
  if (!updated) throw new Error("PROSPECT_NOT_ARCHIVED");
  return updated;
}
