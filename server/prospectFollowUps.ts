import { salesRecordId } from "./salesOperations.js";

type Db = any;

function requireResult(result: { data?: any; error?: any }) {
  if (result.error) throw result.error;
  return result.data;
}

/** Sorted, unique day offsets after the chosen starting date. */
export function normalizeFollowUpDays(days: number[]): number[] {
  if (!Array.isArray(days) || days.length < 1 || days.length > 12
    || days.some((day) => !Number.isInteger(day) || day < 1 || day > 365)) {
    throw new Error("Choose between 1 and 12 follow-ups, 1 to 365 days after the start date.");
  }
  return [...new Set(days)].sort((a, b) => a - b);
}

export function buildProspectFollowUpPlan(startAt: string, days: number[], now = new Date()) {
  const start = new Date(startAt);
  if (!Number.isFinite(start.getTime())) throw new Error("Invalid start date");
  const offsets = normalizeFollowUpDays(days);
  const entries = offsets.map((day) => ({
    day,
    dueAt: new Date(start.getTime() + day * 86_400_000).toISOString(),
  }));
  if (entries.some((entry) => new Date(entry.dueAt).getTime() <= now.getTime())) {
    throw new Error("Every follow-up date must be in the future.");
  }
  return entries;
}

/** Store reminders in the existing sales-tasks queue. No email is sent by this function. */
export async function scheduleProspectFollowUpPlan(
  db: Db,
  prospect: { id: string; name: string },
  actorId: string,
  startAt: string,
  days: number[],
) {
  const schedule = buildProspectFollowUpPlan(startAt, days);
  const now = new Date().toISOString();
  const previous = requireResult(await db.from("sales_tasks")
    .select("id").eq("prospect_id", prospect.id).eq("task_type", "follow_up").eq("status", "open")) || [];
  const entries = schedule.map((entry, index) => ({
    id: salesRecordId(`prospect-follow-up-plan:${prospect.id}:${entry.dueAt}`),
    prospect_id: prospect.id,
    title: `Follow up with ${prospect.name} (${index + 1}/${schedule.length})`,
    task_type: "follow_up",
    status: "open",
    priority: "medium",
    due_at: entry.dueAt,
    notes: `Scheduled day ${entry.day} follow-up. Review the conversation and recipient's preferences before contacting.`,
    metadata: { source: "prospect_follow_up_plan", dayOffset: entry.day, startAt, actorId },
    updated_at: now,
  }));
  requireResult(await db.from("sales_tasks").upsert(entries, { onConflict: "id" }));
  const newIds = new Set(entries.map((entry) => entry.id));
  const replaceIds = previous.map((item: any) => item.id).filter((id: string) => !newIds.has(id));
  if (replaceIds.length) {
    requireResult(await db.from("sales_tasks").update({ status: "dismissed", updated_at: now }).in("id", replaceIds).eq("status", "open"));
  }
  const prospectResult = requireResult(await db.from("prospects").update({
    next_follow_up_at: entries[0].due_at, updated_at: now,
  }).eq("id", prospect.id).select("*").single());
  return { prospect: prospectResult, schedule };
}

export async function syncProspectNextFollowUp(db: Db, prospectId: string) {
  const now = new Date().toISOString();
  const tasks = requireResult(await db.from("sales_tasks").select("due_at")
    .eq("prospect_id", prospectId).eq("task_type", "follow_up").eq("status", "open")
    .not("due_at", "is", null).order("due_at", { ascending: true }).limit(1)) || [];
  const nextAt = tasks[0]?.due_at || null;
  requireResult(await db.from("prospects").update({ next_follow_up_at: nextAt, updated_at: now }).eq("id", prospectId));
  return nextAt;
}

/**
 * Stop follow-ups or remove records. Never permit a bulk action to strand
 * a message currently being handed to the email provider.
 */
export async function bulkManageProspectFollowUps(db: Db, ids: string[], action: "stop_follow_up" | "delete") {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length || uniqueIds.length > 100) throw new Error("Select 1 to 100 prospects per batch.");
  const records = requireResult(await db.from("prospects")
    .select("id,converted_business_id").in("id", uniqueIds)) || [];
  if (records.length !== uniqueIds.length) throw new Error("Some selected prospects no longer exist. Refresh the list.");
  if (action === "delete" && records.some((prospect: any) => prospect.converted_business_id)) {
    throw new Error("Converted customer records cannot be bulk deleted.");
  }
  const inFlight = requireResult(await db.from("sales_messages")
    .select("id").in("prospect_id", uniqueIds).eq("status", "sending").limit(1)) || [];
  if (inFlight.length) throw new Error("A selected prospect has an email currently sending. Retry after delivery settles.");

  const now = new Date().toISOString();
  requireResult(await db.from("outreach_enrollments").update({
    status: "stopped", stop_reason: "Prospect follow-up stopped from pipeline", next_run_at: null, updated_at: now,
  }).in("prospect_id", uniqueIds).in("status", ["pending", "active", "paused"]));
  requireResult(await db.from("sales_messages").update({
    status: "cancelled", updated_at: now, error: "Cancelled by prospect bulk action",
  }).in("prospect_id", uniqueIds).in("status", ["draft", "approved", "queued"]));
  requireResult(await db.from("sales_tasks").update({ status: "dismissed", updated_at: now })
    .in("prospect_id", uniqueIds).eq("status", "open"));

  if (action === "delete") {
    const deleted = requireResult(await db.from("prospects").delete().in("id", uniqueIds).select("id")) || [];
    if (deleted.length !== uniqueIds.length) throw new Error("Some prospects were not deleted. Refresh the list.");
  } else {
    const updated = requireResult(await db.from("prospects").update({
      next_follow_up_at: null, outreach_status: "lost", status: "lost", updated_at: now,
    }).in("id", uniqueIds).select("id")) || [];
    if (updated.length !== uniqueIds.length) throw new Error("Some prospects were not stopped. Refresh the list.");
  }
  return { processed: uniqueIds.length, action };
}
