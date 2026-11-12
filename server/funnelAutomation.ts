import { getUnifiedFunnelAccess } from "./unifiedFunnelTiers.js";

type FunnelAutomationDependencies = {
  db: any;
  sendEmail?: (payload: { to: string; subject: string; html: string }) => Promise<void>;
};

type StartAutomationArgs = FunnelAutomationDependencies & {
  businessId: string;
  funnelId: string;
  triggerEvent: string;
  leadId?: string | null;
  sessionId?: string | null;
  context?: Record<string, any>;
  triggerJobId?: string | null;
};

const escapeEmailHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const logRunEvent = async (db: any, businessId: string, runId: string, nodeId: string | null, eventType: string, status: string, message: string, metadata: Record<string, any> = {}) => {
  await db.from("funnel_workflow_events").insert({
    workflow_run_id: runId,
    business_id: businessId,
    node_id: nodeId,
    event_type: eventType,
    status,
    message,
    metadata,
  });
};

async function loadWorkflowGraph(db: any, workflowId: string) {
  const [{ data: nodes, error: nodeError }, { data: edges, error: edgeError }] = await Promise.all([
    db.from("funnel_workflow_nodes").select("*").eq("workflow_id", workflowId),
    db.from("funnel_workflow_connections").select("*").eq("workflow_id", workflowId),
  ]);
  if (nodeError) throw nodeError;
  if (edgeError) throw edgeError;
  return { nodes: nodes || [], edges: edges || [] };
}

const nextNodeIds = (edges: any[], nodeId: string, branchKey = "next") => {
  const exact = edges.filter((edge) => edge.source_node_id === nodeId && edge.branch_key === branchKey).map((edge) => edge.target_node_id);
  if (exact.length) return exact;
  if (branchKey !== "next") return edges.filter((edge) => edge.source_node_id === nodeId && edge.branch_key === "next").map((edge) => edge.target_node_id);
  return [];
};

async function executeRun({
  db,
  sendEmail,
  run,
  nodes,
  edges,
  startingNodeIds,
}: FunnelAutomationDependencies & { run: any; nodes: any[]; edges: any[]; startingNodeIds: string[] }) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const queue = [...startingNodeIds];
  const visited = new Set<string>();
  let operations = 0;

  while (queue.length && operations < 50) {
    operations += 1;
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node: any = nodeMap.get(nodeId);
    if (!node) continue;

    try {
      // Resuming an interrupted run must not repeat already logged actions.
      const { data: finishedActions, error: finishedError } = await db.from("funnel_workflow_events")
        .select("event_type").eq("workflow_run_id", run.id).eq("node_id", node.id)
        .in("event_type", ["node_completed","email_sent"]).limit(1);
      if (finishedError) throw finishedError;
      if (finishedActions?.length && node.node_kind === "action") {
        queue.push(...nextNodeIds(edges, node.id, "next"));
        continue;
      }
      await db.from("funnel_workflow_runs").update({ current_node_id: node.id, updated_at: new Date().toISOString() }).eq("id", run.id);
      await logRunEvent(db, run.business_id, run.id, node.id, "node_started", "running", node.name || node.action_type, { actionType: node.action_type });

      if (node.node_kind === "delay") {
        const hours = Math.max(1, Math.min(24 * 30, safeNumber(node.config?.hours, 24)));
        const nextRunAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        await db.from("funnel_workflow_runs").update({ status: "waiting", current_node_id: node.id, next_run_at: nextRunAt, updated_at: new Date().toISOString() }).eq("id", run.id);
        await logRunEvent(db, run.business_id, run.id, node.id, "delay_scheduled", "waiting", `Waiting ${hours} hour(s)`, { nextRunAt });
        return { status: "waiting", nextRunAt };
      }

      if (node.node_kind === "condition") {
        let branch = "no";
        if (node.action_type === "lead_score" && run.lead_id) {
          const { data: lead } = await db.from("leads").select("automation_score").eq("id", run.lead_id).maybeSingle();
          const score = safeNumber(lead?.automation_score, 0);
          const threshold = safeNumber(node.config?.value, 60);
          const operator = String(node.config?.operator || "gte");
          branch = operator === "lte" ? (score <= threshold ? "yes" : "no") : (score >= threshold ? "yes" : "no");
          await logRunEvent(db, run.business_id, run.id, node.id, "condition_evaluated", "completed", `Lead score ${score} → ${branch}`, { score, threshold, operator, branch });
        } else {
          const field = String(node.config?.field || "");
          const actual = run.context?.[field];
          const expected = node.config?.value;
          branch = String(actual) === String(expected) ? "yes" : "no";
          await logRunEvent(db, run.business_id, run.id, node.id, "condition_evaluated", "completed", `${field || "condition"} → ${branch}`, { actual, expected, branch });
        }
        queue.push(...nextNodeIds(edges, node.id, branch));
        continue;
      }

      if (node.node_kind === "action") {
        if (node.action_type === "update_lead_status" && run.lead_id) {
          const status = String(node.config?.status || "contacted");
          await db.from("leads").update({ status, automation_next_action: node.config?.nextAction || null }).eq("id", run.lead_id);
          await logRunEvent(db, run.business_id, run.id, node.id, "lead_status_updated", "completed", `Lead moved to ${status}`);
        } else if (node.action_type === "add_score" && run.lead_id) {
          const { data: lead } = await db.from("leads").select("automation_score").eq("id", run.lead_id).maybeSingle();
          const score = Math.max(0, Math.min(100, safeNumber(lead?.automation_score, 0) + safeNumber(node.config?.amount, 10)));
          const temperature = score >= 60 ? "hot" : score >= 30 ? "warm" : "cold";
          await db.from("leads").update({ automation_score: score, automation_temperature: temperature }).eq("id", run.lead_id);
          await logRunEvent(db, run.business_id, run.id, node.id, "lead_score_updated", "completed", `Lead score is now ${score}`, { score, temperature });
        } else if (node.action_type === "add_tag" && run.lead_id) {
          const { data: lead } = await db.from("leads").select("raw_fields").eq("id", run.lead_id).maybeSingle();
          const tag = String(node.config?.tag || "funnel");
          const tags = Array.from(new Set([...(Array.isArray(lead?.raw_fields?.tags) ? lead.raw_fields.tags : []), tag]));
          await db.from("leads").update({ raw_fields: { ...(lead?.raw_fields || {}), tags } }).eq("id", run.lead_id);
          await logRunEvent(db, run.business_id, run.id, node.id, "lead_tag_added", "completed", `Added tag ${tag}`, { tag });
        } else if (node.action_type === "send_email") {
          const email = String(run.context?.email || "");
          if (!email || !sendEmail) {
            await logRunEvent(db, run.business_id, run.id, node.id, "email_skipped", "skipped", "Email action has no deliverable recipient or provider.");
          } else {
            const subject = String(node.config?.subject || "Thanks for your enquiry");
            const body = String(node.config?.body || "Thanks for getting in touch.");
            await sendEmail({ to: email, subject, html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${escapeEmailHtml(body).replace(/\n/g, "<br/>")}</div>` });
            await logRunEvent(db, run.business_id, run.id, node.id, "email_sent", "completed", `Email sent to ${email}`, { subject });
          }
        } else if (node.action_type === "notify_team") {
          const { data: recipients, error: recipientError } = await db.from("profiles")
            .select("email").eq("business_id", run.business_id).eq("role", "business_admin").limit(3);
          if (recipientError) throw recipientError;
          const message = String(node.config?.message || "A funnel lead needs attention.");
          if (sendEmail && recipients?.length) {
            for (const recipient of recipients) {
              if (!recipient.email) continue;
              await sendEmail({
                to: recipient.email,
                subject: "New funnel enquiry needs attention",
                html: "<p>" + escapeEmailHtml(message) + "</p><p>Open your Bennie Studio Leads dashboard to follow up.</p>",
              });
            }
            await logRunEvent(db, run.business_id, run.id, node.id, "team_notification_sent", "completed", "Team notified by email.");
          } else {
            await logRunEvent(db, run.business_id, run.id, node.id, "team_notification_skipped", "skipped", "No team email recipient configured.");
          }
        }
      }

      await logRunEvent(db, run.business_id, run.id, node.id, "node_completed", "completed", node.name || node.action_type);
      queue.push(...nextNodeIds(edges, node.id, "next"));
    } catch (error: any) {
      await logRunEvent(db, run.business_id, run.id, node.id, "node_failed", "failed", String(error?.message || "Workflow node failed"));
      await db.from("funnel_workflow_runs").update({ status: "failed", error_message: String(error?.message || "Workflow node failed"), updated_at: new Date().toISOString() }).eq("id", run.id);
      return { status: "failed" };
    }
  }

  await db.from("funnel_workflow_runs").update({ status: "completed", current_node_id: null, next_run_at: null, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", run.id);
  await logRunEvent(db, run.business_id, run.id, null, "workflow_completed", "completed", "Workflow completed");
  return { status: "completed" };
}

export async function runFunnelAutomations({
  db,
  sendEmail,
  businessId,
  funnelId,
  triggerEvent,
  leadId = null,
  sessionId = null,
  context = {},
  triggerJobId = null,
}: StartAutomationArgs) {
  if (process.env.UNIFIED_FUNNEL_TIERS_ENABLED === "true") {
    const access = await getUnifiedFunnelAccess(db, businessId);
    if (!access.active || !access.limits.workflows) return [];
  }
  const { data: workflows, error } = await db
    .from("funnel_workflows")
    .select("*")
    .eq("business_id", businessId)
    .eq("funnel_id", funnelId)
    .eq("status", "active");
  if (error) throw error;

  const results: any[] = [];
  for (const workflow of workflows || []) {
    const { nodes, edges } = await loadWorkflowGraph(db, workflow.id);
    const triggers = nodes.filter((node: any) => node.node_kind === "trigger" && node.action_type === triggerEvent);
    for (const trigger of triggers) {
      // Never replay a partially executed workflow after an interrupted function.
      // This sacrifices automatic recovery of a mid-action failure rather than
      // risk duplicate customer communications; operators can review stuck runs.
      if (triggerJobId) {
        const { data: existing, error: lookupError } = await db.from("funnel_workflow_runs")
          .select("id,status").eq("source_trigger_job_id", triggerJobId)
          .eq("workflow_id", workflow.id).eq("source_trigger_node_id", trigger.id).maybeSingle();
        if (lookupError) throw lookupError;
        if (existing) {
          results.push({status: ["completed","waiting"].includes(existing.status) ? "already_started" : "needs_review"});
          continue;
        }
      }
      const { data: run, error: runError } = await db.from("funnel_workflow_runs").insert({
        workflow_id: workflow.id,
        business_id: businessId,
        funnel_id: funnelId,
        lead_id: leadId,
        session_id: sessionId,
        source_trigger_job_id: triggerJobId,
        source_trigger_node_id: triggerJobId ? trigger.id : null,
        status: "running",
        trigger_event: triggerEvent,
        context,
      }).select("*").single();
      if (runError?.code === "23505" && triggerJobId) {
        results.push({status:"needs_review"});
        continue;
      }
      if (runError) throw runError;
      await logRunEvent(db, businessId, run.id, trigger.id, "workflow_triggered", "completed", trigger.name || triggerEvent, { triggerEvent });
      const starting = nextNodeIds(edges, trigger.id, "next");
      results.push(await executeRun({ db, sendEmail, run, nodes, edges, startingNodeIds: starting }));
    }
  }
  return results;
}

export async function processDueFunnelWorkflowRuns({ db, sendEmail, limit = 50 }: FunnelAutomationDependencies & { limit?: number }) {
  const now = new Date().toISOString();
  const { data: runs, error } = await db
    .from("funnel_workflow_runs")
    .select("*")
    .eq("status", "waiting")
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const results: any[] = [];
  for (const run of runs || []) {
    const { nodes, edges } = await loadWorkflowGraph(db, run.workflow_id);
    const starting = run.current_node_id ? nextNodeIds(edges, run.current_node_id, "next") : [];
    if (process.env.UNIFIED_FUNNEL_TIERS_ENABLED === "true") {
      const access = await getUnifiedFunnelAccess(db, run.business_id);
      if (!access.active || !access.limits.workflows) continue;
    }
    // Atomic status predicate prevents concurrent cron calls from resuming twice.
    const { data: claimed, error: claimError } = await db.from("funnel_workflow_runs")
      .update({ status: "running", next_run_at: null, updated_at: now })
      .eq("id", run.id).eq("status","waiting").lte("next_run_at",now).select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;
    results.push(await executeRun({ db, sendEmail, run: { ...run, status: "running" }, nodes, edges, startingNodeIds: starting }));
  }
  return results;
}
