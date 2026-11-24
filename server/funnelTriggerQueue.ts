import { getUnifiedFunnelAccess } from "./unifiedFunnelTiers.js";
import { runFunnelAutomations } from "./funnelAutomation.js";

type JobArgs = {
  db: any; businessId: string; funnelId: string; eventKey: string; triggerEvent: string;
  leadId?: string | null; sessionId?: string | null; context?: Record<string, unknown>;
};
type Delivery = { db: any; sendEmail?: (payload: { to: string; subject: string; html: string }) => Promise<void> };
const check = async (query: PromiseLike<{ data: any; error: any }>) => {
  const result = await query;
  if (result.error) throw result.error;
  return result.data;
};
export async function queueFunnelTrigger(args: JobArgs): Promise<string | null> {
  const access = await getUnifiedFunnelAccess(args.db, args.businessId);
  if (!access.active || !access.limits.workflows) return null;
  const payload = {
    event_key: args.eventKey, business_id: args.businessId, funnel_id: args.funnelId,
    trigger_event: args.triggerEvent, lead_id: args.leadId || null,
    session_id: args.sessionId || null, context: args.context || {},
  };
  const { data, error } = await args.db.from("funnel_trigger_jobs").insert(payload).select("id").single();
  if (error?.code === "23505") {
    const old = await check(args.db.from("funnel_trigger_jobs")
      .select("id").eq("event_key", args.eventKey).maybeSingle());
    return old?.id || null;
  }
  if (error) throw error;
  return data.id;
}
async function claimJob(db: any, job: any) {
  const stale = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  let claim = db.from("funnel_trigger_jobs")
    .update({ status: "running", locked_at: new Date().toISOString(),
      attempts: Number(job.attempts || 0) + 1, updated_at: new Date().toISOString() })
    .eq("id", job.id);
  claim = job.status === "running" ? claim.eq("status", "running").lt("locked_at", stale)
    : claim.in("status", ["queued","retry"]).lte("next_attempt_at",new Date().toISOString());
  return check(claim.select("*").maybeSingle());
}
async function executeJob(job: any, {db,sendEmail}: Delivery) {
  const claimed = await claimJob(db, job);
  if (!claimed) return "claimed_elsewhere";
  try {
    const access = await getUnifiedFunnelAccess(db, claimed.business_id);
    if (!access.active || !access.limits.workflows) {
      await check(db.from("funnel_trigger_jobs").update({
        status: "blocked", locked_at: null, updated_at: new Date().toISOString(),
        last_error: "Customer funnel automation entitlement is inactive.",
      }).eq("id", claimed.id));
      return "blocked";
    }
    const result = await runFunnelAutomations({
      db, sendEmail, businessId: claimed.business_id, funnelId: claimed.funnel_id,
      triggerEvent: claimed.trigger_event, leadId: claimed.lead_id,
      sessionId: claimed.session_id, context: claimed.context || {},
      triggerJobId: claimed.id,
    });
    // A partially executed workflow must be reviewed; replaying it could send
    // duplicate emails or perform actions twice. Do not auto-replay such runs.
    const failed = result.some((r:any) => ["failed","needs_review"].includes(r?.status));
    await check(db.from("funnel_trigger_jobs").update({
      status: failed ? "dead" : "completed", locked_at: null,
      last_error: failed ? "One or more workflow runs failed. Review run logs." : null,
      updated_at: new Date().toISOString(),
    }).eq("id", claimed.id));
    return failed ? "dead" : "completed";
  } catch (error: any) {
    const attempts = Number(claimed.attempts || 1);
    const terminal = attempts >= 3;
    const retryMs = Math.min(30 * 60 * 1000, 60000 * Math.pow(2, attempts - 1));
    await check(db.from("funnel_trigger_jobs").update({
      status: terminal ? "dead" : "retry", locked_at: null,
      next_attempt_at: new Date(Date.now() + retryMs).toISOString(),
      last_error: String(error?.message || "Funnel trigger failed").slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq("id", claimed.id));
    return terminal ? "dead" : "retry";
  }
}
export async function processFunnelTriggerQueue(deps: Delivery & { limit?: number; jobId?: string }) {
  const limit = Math.max(1, Math.min(50, deps.limit || 50));
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  let queued = deps.db.from("funnel_trigger_jobs").select("*")
    .in("status",["queued","retry"]).lte("next_attempt_at",now)
    .order("created_at",{ascending:true}).limit(limit);
  if (deps.jobId) queued = queued.eq("id",deps.jobId);
  const fresh = await check(queued);
  const old = deps.jobId || (fresh || []).length >= limit ? [] : await check(deps.db.from("funnel_trigger_jobs")
    .select("*").eq("status","running").lt("locked_at",stale)
    .order("locked_at",{ascending:true}).limit(Math.max(0,limit - (fresh || []).length)));
  const jobs = [...(fresh || []),...(old || [])].slice(0,limit);
  const counts = { completed: 0, blocked: 0, dead: 0, retry: 0, claimed_elsewhere: 0 };
  for (const job of jobs) {
    const status = await executeJob(job,deps);
    counts[status as keyof typeof counts] += 1;
  }
  return { processed: jobs.length, ...counts };
}