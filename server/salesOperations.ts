import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { z } from "zod";
import { classifyReply, hasDocumentedMarketingConsent, saveOutreachObservation } from "../src/lib/salesAutomation.js";

type Db = Pick<SupabaseClient, "from">;
type Row = Record<string, any>;
const PENDING = ["draft", "approved", "queued"];
const SENT = ["sent", "delivered", "opened", "clicked"];
const STOPPED_CONTACT = ["won", "lost", "closed", "converted", "paid", "meeting", "call_booked", "appointment_booked", "replied"];

export const canManageSalesOperations = (profile: Row | null | undefined) =>
  profile?.role === "super_admin" || (profile?.role === "platform_staff"
    && Array.isArray(profile.staff_permissions) && profile.staff_permissions.includes("sales"));

function checked<T extends { error: unknown }>(result: T): T {
  if (result.error) throw result.error;
  return result;
}

export function normalizeSalesEmail(value: unknown): string {
  const text = String(value || "").trim();
  const email = (text.match(/^[^<>]*<([^<>]+)>$/)?.[1] || text).trim().toLowerCase();
  return z.string().email().max(254).safeParse(email).success ? email : "";
}

// PostgREST's ilike treats '_' and '%' as wildcards, even in a valid email.
export const exactEmailPattern = (email: string) => email.replace(/[\\%_]/g, "\\$&");

export function salesRecordId(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function isSalesSuppressed(db: Db, email: string): Promise<boolean> {
  const { data } = checked(await db.from("sales_suppressions").select("id")
    .ilike("email", exactEmailPattern(email)).limit(1).maybeSingle());
  return Boolean(data);
}

export async function stopSalesEnrollment(db: Db, id: string, reason: string, now: string) {
  checked(await db.from("outreach_enrollments").update({ status: "stopped", stop_reason: reason, next_run_at: null, updated_at: now })
    .eq("id", id).in("status", ["pending", "active", "paused"]));
  checked(await db.from("sales_messages").update({ status: "cancelled", updated_at: now })
    .eq("enrollment_id", id).in("status", PENDING));
}

export async function suppressSalesRecipient(db: Db, recipient: string, reason: string, source: string, now: string) {
  const email = normalizeSalesEmail(recipient);
  if (!email) throw new Error("INVALID_SALES_RECIPIENT");
  // Do not use onConflict: email: the existing email index is partial.
  // A deterministic primary key makes repeated unsubscribe callbacks idempotent.
  if (!await isSalesSuppressed(db, email)) {
    checked(await db.from("sales_suppressions").upsert({ id: salesRecordId(`suppression:${email}`), email, reason, source }, { onConflict: "id", ignoreDuplicates: true }));
  }
  checked(await db.from("sales_messages").update({ status: "suppressed", updated_at: now })
    .ilike("recipient", exactEmailPattern(email)).eq("direction", "outbound").in("status", PENDING));
  // A suppressed prospect must never remain in the contact-due queue.
  checked(await db.from("prospects").update({ next_follow_up_at: null, updated_at: now })
    .ilike("contact_email", exactEmailPattern(email)));
  const { data } = checked(await db.from("sales_messages").select("enrollment_id,lead_id,prospect_id")
    .ilike("recipient", exactEmailPattern(email)));
  for (const id of new Set((data || []).map((row) => row.enrollment_id).filter(Boolean))) {
    await stopSalesEnrollment(db, id, "Recipient suppressed", now);
  }
  // Do not leave a manual sales reminder asking the operator to contact an opt-out.
  for (const field of ["lead_id", "prospect_id"]) {
    const ids = [...new Set((data || []).map((row) => row[field]).filter(Boolean))];
    if (ids.length) checked(await db.from("sales_tasks").update({ status: "dismissed", updated_at: now })
      .in(field, ids).eq("status", "open").in("task_type", ["follow_up", "reply", "new_lead_response", "call_follow_up"]));
  }
}

/** Late approval must shift later messages relative to the previous actual send. */
export function nextSalesStepAt(message: Row, siblings: Row[], steps: Row[]): number | null {
  const stepFor = (row: Row) => steps.find((step) => step.id === row.provider_payload?.stepId)
    || steps.find((step) => step.step_order === row.provider_payload?.stepOrder);
  const current = stepFor(message);
  if (!current) return null; // Old overwritten metadata needs human review, never guess.
  const earlierSteps = steps.filter((step) => step.step_order < current.step_order);
  if (!earlierSteps.length) return new Date(message.scheduled_at).getTime();
  const earlier = earlierSteps.map((step) => siblings.find((row) => stepFor(row)?.id === step.id));
  if (earlier.some((row) => !row || !SENT.includes(row.status) || !row.sent_at)) return null;
  const latestSend = Math.max(...earlier.map((row) => new Date(row!.sent_at).getTime()));
  const delay = Number(message.provider_payload?.delayHours ?? current.delay_hours);
  if (!Number.isFinite(latestSend) || !Number.isFinite(delay) || delay < 0) return null;
  return Math.max(new Date(message.scheduled_at).getTime(), latestSend + Math.max(1, delay) * 3_600_000);
}

export async function runSalesDelivery(input: {
  db: Db;
  send: (message: Row) => Promise<{ id: string }>;
  limit?: number;
  now?: Date;
}) {
  const { db, send } = input;
  const now = (input.now || new Date()).toISOString();
  const limit = Math.min(100, Math.max(1, input.limit || 40));
  // Inner filters exclude paused sequences before LIMIT, so they cannot starve bookings.
  const due = (query: any) => query.in("status", ["approved", "queued"]).eq("direction", "outbound")
    .eq("channel", "email").lte("scheduled_at", now).order("scheduled_at").limit(limit);
  const [sequenceResult, standaloneResult] = await Promise.all([
    due(db.from("sales_messages").select("*, outreach_enrollments!inner(status, outreach_sequences!inner(status))")
      .eq("outreach_enrollments.status", "active").eq("outreach_enrollments.outreach_sequences.status", "active")),
    due(db.from("sales_messages").select("*").is("enrollment_id", null)),
  ]);
  const candidates: Row[] = [...(checked(sequenceResult).data || []), ...(checked(standaloneResult).data || [])]
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).slice(0, limit);
  const result = { processed: candidates.length, sent: 0, suppressed: 0, failed: 0, deliveryBlocked: 0, deferred: 0 };
  for (const candidate of candidates) {
    // UPDATE + returned row is the claim. An unsuccessful claim must never send.
    const { data: message } = checked(await db.from("sales_messages").update({ status: "sending", updated_at: now })
      .eq("id", candidate.id).in("status", ["approved", "queued"]).select("*").maybeSingle());
    if (!message) continue;
    const release = async (updates: Row) => checked(await db.from("sales_messages")
      .update({ ...updates, updated_at: now }).eq("id", message.id).eq("status", "sending"));
    let deliveryAttempted = false;
    try {
      const email = normalizeSalesEmail(message.recipient);
      if (!email) throw new Error("INVALID_SALES_RECIPIENT");
      if (await isSalesSuppressed(db, email)) {
        await release({ status: "suppressed", error: "Recipient is on the suppression list" });
        result.suppressed++;
        continue;
      }
      if (!message.enrollment_id && (message.prospect_id || message.lead_id)) {
        const table = message.prospect_id ? "prospects" : "leads";
        const id = message.prospect_id || message.lead_id;
        const { data: contact } = checked(await db.from(table).select("*").eq("id", id).maybeSingle());
        if (!contact || [contact.status, contact.outreach_status].some((state) =>
          ["won", "lost", "closed", "converted", "paid", "unsubscribed"].includes(String(state || "").toLowerCase()))) {
          await release({ status: "cancelled", error: "Contact is closed or unavailable" });
          result.deferred++;
          continue;
        }
        // Standalone prospect messages are marketing unless they reply to a verified inbound conversation.
        if (message.prospect_id && !message.reply_to_message_id && !hasDocumentedMarketingConsent(contact)) {
          await release({ status: "draft", error: "Documented recipient opt-in required for prospect email." });
          result.deliveryBlocked++;
          continue;
        }
      }
      if (message.enrollment_id) {
        const { data: enrollment } = checked(await db.from("outreach_enrollments").select("*, outreach_sequences(status,audience_type)")
          .eq("id", message.enrollment_id).maybeSingle());
        if (!enrollment || enrollment.status !== "active" || enrollment.outreach_sequences?.status !== "active") {
          await release({ status: candidate.status });
          result.deferred++;
          continue;
        }
        const table = enrollment.lead_id ? "leads" : "prospects";
        const { data: contact } = checked(await db.from(table).select("*")
          .eq("id", enrollment.lead_id || enrollment.prospect_id).maybeSingle());
        // Queued marketing must require evidence of recipient opt-in, not merely approval.
        const audience = String(enrollment.outreach_sequences?.audience_type || "cold");
        if (!["inbound", "proposal"].includes(audience) && !hasDocumentedMarketingConsent(contact)) {
          await release({ status: "draft", error: "Documented recipient opt-in is required before marketing email." });
          result.deliveryBlocked++;
          continue;
        }
        const { data: siblings } = checked(await db.from("sales_messages").select("*").eq("enrollment_id", enrollment.id));
        const replied = (siblings || []).some((row) => row.direction === "inbound" || row.status === "replied");
        if (!contact || replied || [contact.status, contact.outreach_status].some((status) => STOPPED_CONTACT.includes(String(status).toLowerCase()))) {
          await stopSalesEnrollment(db, enrollment.id, replied ? "Reply received" : "Contact no longer needs automated outreach", now);
          await release({ status: "cancelled" });
          result.deferred++;
          continue;
        }
        const { data: steps } = checked(await db.from("outreach_sequence_steps").select("*").eq("sequence_id", enrollment.sequence_id));
        const next = nextSalesStepAt(message, (siblings || []).filter((row) => row.direction === "outbound"), steps || []);
        if (next === null || next > new Date(now).getTime()) {
          await release({ status: candidate.status, ...(next !== null ? { scheduled_at: new Date(next).toISOString() } : {}) });
          result.deferred++;
          continue;
        }
      }
      let receipt: { id: string };
      try {
        deliveryAttempted = true;
        receipt = await send({ ...message, recipient: email });
        if (!receipt.id) throw new Error("MISSING_DELIVERY_RECEIPT");
      } catch (error: any) {
        const blocked = error?.message === "RESEND_CONFIG_ERROR";
        await release({ status: blocked ? candidate.status : "failed", error: blocked ? "Email delivery is not configured yet" : "Delivery failed or is uncertain. Check provider delivery before retrying." });
        blocked ? result.deliveryBlocked++ : result.failed++;
        continue;
      }
      // A provider success followed by a database failure stays 'sending'. Never
      // automatically retry an uncertain send beyond the provider's 24h window.
      await release({ status: "sent", sent_at: now, provider_message_id: receipt.id, error: null });
      result.sent++;
      if (message.enrollment_id) {
        const { data: remaining } = checked(await db.from("sales_messages").select("id,scheduled_at")
          .eq("enrollment_id", message.enrollment_id).eq("direction", "outbound")
          .in("status", [...PENDING, "sending", "failed"]).order("scheduled_at").limit(1));
        checked(await db.from("outreach_enrollments").update({
          current_step: Number(message.provider_payload?.stepOrder || 0),
          next_run_at: remaining?.[0]?.scheduled_at || null,
          ...(!remaining?.length ? { status: "completed" } : {}), updated_at: now,
        }).eq("id", message.enrollment_id).eq("status", "active"));
      }
    } catch {
      // Read errors fail closed but may safely retry before any provider acceptance.
      if (!deliveryAttempted) {
        await release({ status: candidate.status, error: "Safety checks unavailable; no email was sent." }).catch(() => undefined);
      }
      // Leave an accepted/uncertain send for operational review.
      result.deliveryBlocked++;
    }
  }
  return result;
}

export function deliveryStatus(current: string, incoming: string): string {
  const terminal = ["cancelled", "suppressed", "complained", "bounced", "failed", "replied"];
  if (terminal.includes(current)) return current;
  if (terminal.includes(incoming)) return incoming;
  const ranks = ["draft", "approved", "queued", "sending", "sent", "delivered", "opened", "clicked"];
  return ranks.indexOf(incoming) > ranks.indexOf(current) ? incoming : current;
}

export async function recordSalesDeliveryEvent(db: Db, event: Row, now: string) {
  const statuses: Record<string, string> = { "email.sent": "sent", "email.delivered": "delivered", "email.opened": "opened", "email.clicked": "clicked", "email.bounced": "bounced", "email.complained": "complained", "email.suppressed": "suppressed", "email.failed": "failed" };
  const status = statuses[event.type];
  if (!status || !event.data?.email_id) return;
  const { data: message } = checked(await db.from("sales_messages").select("*")
    .eq("provider_message_id", event.data.email_id).eq("direction", "outbound").maybeSingle());
  if (!message) return;
  // Do not overwrite provider_payload: step, delay, approval and booking metadata live there.
  const next = deliveryStatus(message.status, status);
  if (next !== message.status) {
    const { data: updated } = checked(await db.from("sales_messages").update({ status: next, updated_at: now })
      .eq("id", message.id).eq("status", message.status).select("id").maybeSingle());
    if (!updated) throw new Error("DELIVERY_EVENT_CONFLICT"); // provider can retry
  }
  if (["bounced", "complained", "suppressed"].includes(status)) {
    // Preserve the provider outcome for support diagnostics without exposing it in an email.
    const reason = String(event.data?.bounce?.message || event.data?.bounce?.reason || event.data?.reason || "").slice(0, 500);
    if (reason) checked(await db.from("sales_messages").update({ error: reason, updated_at: now }).eq("id", message.id));
    await suppressSalesRecipient(db, message.recipient, status === "suppressed" ? "bounced" : status, "resend_webhook", now);
  }
}

export async function recordSalesReply(db: Db, event: Row, getBody: () => Promise<string>, now: string) {
  const sender = normalizeSalesEmail(event.data?.from);
  if (!sender || !event.data?.email_id) throw new Error("INVALID_REPLY_EVENT");
  // Prefer the explicit outbound provider Message-ID when available.
  // Mailbox heuristics are a fallback, never a substitute for threading evidence.
  const referenceId = String(event.data?.in_reply_to || event.data?.inReplyTo || event.data?.headers?.["in-reply-to"] || "").replace(/[<>]/g, "").trim();
  let prior: Row | null = null;
  if (referenceId) {
    const { data } = checked(await db.from("sales_messages").select("*")
      .eq("provider_message_id", referenceId).eq("direction", "outbound").maybeSingle());
    prior = data;
  }
  if (prior && normalizeSalesEmail(prior.recipient) !== sender) prior = null;
  if (!prior) {
    const { data } = checked(await db.from("sales_messages").select("*")
      .ilike("recipient", exactEmailPattern(sender)).eq("direction", "outbound").not("sent_at", "is", null)
      .order("sent_at", { ascending: false }).limit(1).maybeSingle());
    prior = data;
  }
  if (!prior) return; // Unrelated inbound email is not a sales lead.
  const { data: related } = checked(await db.from("sales_messages").select("enrollment_id")
    .ilike("recipient", exactEmailPattern(sender)).not("enrollment_id", "is", null));
  for (const id of new Set((related || []).map((row) => row.enrollment_id))) {
    await stopSalesEnrollment(db, id, "Reply received", now);
  }
  // Stop first even if the restricted sending key cannot retrieve reply content.
  const key = `resend:inbound:${event.data.email_id}`;
  const { data: existing } = checked(await db.from("sales_messages").select("id,classification,body_text")
    .eq("idempotency_key", key).maybeSingle());
  // Preserve the inbound reply and create a human-review task even when
  // Resend receiving content is temporarily unavailable. Otherwise repeated
  // 503 callbacks can disable the provider webhook and hide all new replies.
  let text = existing?.body_text || "";
  if (!text) {
    try {
      text = (await getBody()).slice(0, 50_000);
    } catch {
      text = "[Reply received but body retrieval failed. Review this message in the Resend inbox before responding.]";
    }
  }
  const classification = existing?.classification || classifyReply(text);
  checked(await db.from("sales_messages").upsert({
    id: salesRecordId(key), idempotency_key: key, enrollment_id: prior.enrollment_id,
    prospect_id: prior.prospect_id, lead_id: prior.lead_id, direction: "inbound", channel: "email", recipient: sender,
    subject: String(event.data.subject || "Reply").slice(0, 500), body_text: text, status: "replied",
    sent_at: event.created_at || now, provider_message_id: event.data.email_id, reply_to_message_id: prior.id, classification,
    provider_payload: { attribution: referenceId && prior.provider_message_id === referenceId ? "message_id" : "sender_latest_fallback" },
  }, { onConflict: "idempotency_key", ignoreDuplicates: true }));
  if (prior.prospect_id) {
    checked(await db.from("prospects").update({ outreach_status: "replied", updated_at: now })
      .eq("id", prior.prospect_id).in("outreach_status", ["not_started", "queued", "contacted"]));
  }
  if (["unsubscribe", "not_interested"].includes(classification)) {
    await suppressSalesRecipient(db, sender, "opt_out", "reply_classification", now);
    return; // Do not ask the operator to sell again after a refusal.
  }
  checked(await db.from("sales_tasks").upsert({
    id: salesRecordId(`reply-task:${event.data.email_id}`), lead_id: prior.lead_id, prospect_id: prior.prospect_id,
    title: classification === "not_now" ? "Record the prospect's preferred follow-up timing" : "Respond personally to the prospect's reply",
    task_type: "reply", priority: classification === "not_now" ? "medium" : "high", due_at: now,
    metadata: { classification, messageId: event.data.email_id },
  }, { onConflict: "id", ignoreDuplicates: true }));
}

export async function saveManualOutreach(db: Db, input: {
  prospectId: string; action: "prepare" | "contacted"; channel: "email" | "whatsapp";
  observation: string; bodyText: string; requestId: string; actorId: string;
}, now: string) {
  const { data: prospect } = checked(await db.from("prospects").select("*").eq("id", input.prospectId).maybeSingle());
  if (!prospect) throw new Error("CONTACT_NOT_FOUND");
  if ([prospect.status, prospect.outreach_status].some((status) => ["won", "lost", "closed", "converted", "paid"].includes(String(status).toLowerCase()))) throw new Error("CONTACT_CLOSED");
  const email = normalizeSalesEmail(prospect.contact_email);
  const phone = String(prospect.contact_whatsapp || prospect.contact_phone || "").replace(/\D/g, "");
  if (email && await isSalesSuppressed(db, email)) throw new Error("CONTACT_SUPPRESSED");
  if (phone) {
    const { data } = checked(await db.from("sales_suppressions").select("id").eq("phone", phone).limit(1).maybeSingle());
    if (data) throw new Error("CONTACT_SUPPRESSED");
  }
  if (input.channel === "email" ? !email : !/^\d{7,15}$/.test(phone)) throw new Error("CONTACT_CHANNEL_MISSING");
  const notes = saveOutreachObservation(prospect.notes, input.observation);
  const updates: Row = { notes, updated_at: now };
  if (input.action === "contacted") {
    const key = `manual-outreach:${input.requestId}`;
    const { data: prior } = checked(await db.from("sales_messages").select("id,prospect_id").eq("idempotency_key", key).maybeSingle());
    if (prior && prior.prospect_id !== prospect.id) throw new Error("OUTREACH_REQUEST_CONFLICT");
    // This event means the operator confirmed an external send, not that a composer opened.
    checked(await db.from("sales_messages").upsert({
      id: salesRecordId(key), idempotency_key: key, prospect_id: prospect.id, direction: "outbound",
      channel: input.channel, recipient: input.channel === "email" ? email : phone,
      subject: "Manual outreach confirmed", body_text: input.bodyText, status: "sent", sent_at: now,
      provider_payload: { manuallyConfirmed: true, actorId: input.actorId },
    }, { onConflict: "idempotency_key", ignoreDuplicates: true }));
    const followUp = new Date(new Date(now).getTime() + 3 * 86400000).toISOString();
    const existingFollowUp = prospect.next_follow_up_at && new Date(prospect.next_follow_up_at).getTime() > new Date(now).getTime()
      ? prospect.next_follow_up_at : null;
    // A future commitment already promised to the prospect must not be overwritten.
    if (!prior && !["replied", "call_booked"].includes(prospect.outreach_status)) {
      updates.outreach_status = "contacted";
      updates.next_follow_up_at = existingFollowUp || followUp;
    }
    if (!["replied", "call_booked"].includes(prospect.outreach_status)) {
      checked(await db.from("sales_tasks").upsert({
        id: salesRecordId(`manual-follow-up:${input.requestId}`), prospect_id: prospect.id,
        title: `Follow up with ${prospect.name}`, task_type: "follow_up", priority: "medium",
        due_at: existingFollowUp || followUp, metadata: { manualOutreachId: input.requestId, actorId: input.actorId },
      }, { onConflict: "id", ignoreDuplicates: true }));
    }
  }
  const { data } = checked(await db.from("prospects").update(updates).eq("id", prospect.id).select("*").single());
  return { prospect: data, recipient: input.channel === "email" ? email : phone };
}

export async function sendDirectProspectOutreach(
  db: Db,
  input: {
    prospectId: string;
    channel: "email" | "whatsapp";
    subject?: string;
    bodyText: string;
    observation?: string;
    templateId?: string;
    replyToMessageId?: string | null;
    requestId: string;
    actorId: string;
    deliver: (message: Row) => Promise<{ id: string }>;
  },
  now: string,
) {
  const { data: prospect } = checked(
    await db.from("prospects").select("*").eq("id", input.prospectId).maybeSingle(),
  );
  if (!prospect) throw new Error("CONTACT_NOT_FOUND");

  if (!input.replyToMessageId && String(input.observation || "").trim().length < 10) {
    throw new Error("OUTREACH_OBSERVATION_REQUIRED");
  }
  if (/\[[^\]\n]{3,}\]|\{\{[^}]+\}\}/.test(`${input.subject || ""}\n${input.bodyText}`)) {
    throw new Error("OUTREACH_PLACEHOLDER_UNRESOLVED");
  }

  if (
    [prospect.status, prospect.outreach_status].some((status) =>
      ["won", "lost", "closed", "converted", "paid"].includes(
        String(status || "").toLowerCase(),
      ),
    )
  ) {
    throw new Error("CONTACT_CLOSED");
  }

  const email = normalizeSalesEmail(prospect.contact_email);
  const phone = String(
    prospect.contact_whatsapp || prospect.contact_phone || "",
  ).replace(/\D/g, "");

  if (input.channel === "email") {
    if (!email) throw new Error("CONTACT_CHANNEL_MISSING");
    if (await isSalesSuppressed(db, email)) {
      throw new Error("CONTACT_SUPPRESSED");
    }
  } else {
    if (!/^\d{7,15}$/.test(phone)) throw new Error("CONTACT_CHANNEL_MISSING");
    const { data: suppression } = checked(
      await db
        .from("sales_suppressions")
        .select("id")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle(),
    );
    if (suppression) throw new Error("CONTACT_SUPPRESSED");
  }

  if (input.channel === "email" && !input.replyToMessageId && !hasDocumentedMarketingConsent(prospect)) {
    throw new Error("OUTREACH_CONSENT_REQUIRED");
  }

  const recipient = input.channel === "email" ? email : phone;
  const key = `direct-outreach:${input.channel}:${input.requestId}`;
  const { data: prior } = checked(
    await db
      .from("sales_messages")
      .select("*")
      .eq("idempotency_key", key)
      .maybeSingle(),
  );

  if (prior && prior.prospect_id !== prospect.id) {
    throw new Error("OUTREACH_REQUEST_CONFLICT");
  }
  if (prior && SENT.includes(prior.status)) {
    return {
      prospect,
      recipient,
      message: prior,
      providerMessageId: prior.provider_message_id || null,
      alreadySent: true,
    };
  }
  if (!prior && !input.replyToMessageId && input.channel === "email") {
    const earliest = new Date(new Date(now).getTime() - 72 * 3_600_000).toISOString();
    const { data: recent } = checked(await db.from("sales_messages").select("id")
      .eq("direction", "outbound").eq("channel", "email")
      .ilike("recipient", exactEmailPattern(email)).gte("sent_at", earliest).limit(1).maybeSingle());
    if (recent) throw new Error("OUTREACH_TOO_SOON");
  }
  if (prior?.status === "sending") throw new Error("OUTREACH_SEND_IN_PROGRESS");
  if (prior?.status === "failed") throw new Error("OUTREACH_SEND_UNCERTAIN");

  let replyToMessageId: string | null = null;
  if (input.replyToMessageId) {
    const { data: parent } = checked(
      await db
        .from("sales_messages")
        .select("id,prospect_id,direction")
        .eq("id", input.replyToMessageId)
        .maybeSingle(),
    );
    // A reply exemption only applies to a genuine inbound message from this prospect.
    if (!parent || parent.prospect_id !== prospect.id || parent.direction !== "inbound") {
      throw new Error("OUTREACH_REPLY_CONFLICT");
    }
    replyToMessageId = parent.id;
  }

  const messageId = prior?.id || salesRecordId(key);
  const messagePayload = {
    prospect_id: prospect.id,
    direction: "outbound",
    channel: input.channel,
    recipient,
    subject:
      input.channel === "email"
        ? String(input.subject || `A quick website idea for ${prospect.name}`).slice(0, 500)
        : null,
    body_text: input.bodyText,
    reply_to_message_id: replyToMessageId,
    status: "sending",
    scheduled_at: now,
    error: null,
    updated_at: now,
    provider_payload: {
      directSend: true,
      actorId: input.actorId,
      observation: input.observation || null,
      templateId: input.templateId || null,
      replyToMessageId,
    },
  };

  let message: Row;
  if (prior) {
    const { data } = checked(
      await db
        .from("sales_messages")
        .update(messagePayload)
        .eq("id", prior.id)
        .select("*")
        .single(),
    );
    message = data;
  } else {
    const { data } = checked(
      await db
        .from("sales_messages")
        .insert({
          id: messageId,
          idempotency_key: key,
          ...messagePayload,
        })
        .select("*")
        .single(),
    );
    message = data;
  }

  let receipt: { id: string };
  try {
    receipt = await input.deliver(message);
    if (!receipt?.id) throw new Error("MISSING_DELIVERY_RECEIPT");
  } catch (error: any) {
    checked(
      await db
        .from("sales_messages")
        .update({
          status: "failed",
          error: String(error?.message || "Delivery failed").slice(0, 500),
          updated_at: now,
        })
        .eq("id", message.id)
        .eq("status", "sending"),
    );
    throw error;
  }

  const { data: sentMessage } = checked(
    await db
      .from("sales_messages")
      .update({
        status: "sent",
        sent_at: now,
        provider_message_id: receipt.id,
        error: null,
        updated_at: now,
      })
      .eq("id", message.id)
      .eq("status", "sending")
      .select("*")
      .single(),
  );

  const followUp = new Date(new Date(now).getTime() + 3 * 86400000).toISOString();
  const existingFollowUp =
    prospect.next_follow_up_at &&
    new Date(prospect.next_follow_up_at).getTime() > new Date(now).getTime()
      ? prospect.next_follow_up_at
      : null;
  const observation =
    input.observation?.trim() ||
    `Direct ${input.channel} outreach sent from Prospect Explorer.`;
  const notes = saveOutreachObservation(prospect.notes, observation);
  const updates: Row = {
    notes,
    updated_at: now,
  };

  if (!["replied", "call_booked"].includes(String(prospect.outreach_status || ""))) {
    updates.outreach_status = "contacted";
    updates.next_follow_up_at = existingFollowUp || followUp;
  }

  const { data: updatedProspect } = checked(
    await db
      .from("prospects")
      .update(updates)
      .eq("id", prospect.id)
      .select("*")
      .single(),
  );

  if (!["replied", "call_booked"].includes(String(prospect.outreach_status || ""))) {
    checked(
      await db.from("sales_tasks").upsert(
        {
          id: salesRecordId(`direct-follow-up:${input.requestId}`),
          prospect_id: prospect.id,
          title: `Follow up with ${prospect.name}`,
          task_type: "follow_up",
          priority: "medium",
          due_at: existingFollowUp || followUp,
          metadata: {
            directOutreachId: input.requestId,
            channel: input.channel,
            actorId: input.actorId,
          },
        },
        { onConflict: "id", ignoreDuplicates: true },
      ),
    );
  }

  if (replyToMessageId) {
    checked(
      await db
        .from("sales_tasks")
        .update({ status: "completed", updated_at: now })
        .eq("prospect_id", prospect.id)
        .eq("task_type", "reply")
        .eq("status", "open"),
    );
  }

  return {
    prospect: updatedProspect,
    recipient,
    message: sentMessage,
    providerMessageId: receipt.id,
    alreadySent: false,
  };
}

export async function saveSalesCallOutcome(db: Db, id: string, input: {
  status?: string; outcome?: string; nextAction?: string;
}, now: string) {
  const { data: existing } = checked(await db.from("sales_call_bookings").select("*").eq("id", id).maybeSingle());
  if (!existing) throw new Error("BOOKING_NOT_FOUND");
  const updates: Row = { updated_at: now };
  if (input.status !== undefined) updates.status = input.status;
  if (input.outcome !== undefined) updates.outcome = input.outcome || null;
  if (input.nextAction !== undefined) updates.next_action = input.nextAction || null;
  const { data: booking } = checked(await db.from("sales_call_bookings").update(updates).eq("id", id).select("*").single());
  if (["completed", "cancelled", "no_show"].includes(booking.status)) {
    checked(await db.from("sales_messages").update({ status: "cancelled", updated_at: now })
      .contains("provider_payload", { bookingId: id }).in("status", PENDING));
  }
  if (input.nextAction !== undefined) {
    const taskId = salesRecordId(`call-follow-up:${id}`);
    const { data: task } = checked(await db.from("sales_tasks").select("*").eq("id", taskId).maybeSingle());
    if (!input.nextAction) {
      checked(await db.from("sales_tasks").update({ status: "dismissed", updated_at: now }).eq("id", taskId).eq("status", "open"));
    } else {
      checked(await db.from("sales_tasks").upsert({
        id: taskId, lead_id: booking.lead_id, prospect_id: booking.prospect_id,
        title: input.nextAction, task_type: "call_follow_up", priority: "high",
        due_at: task?.due_at || new Date(new Date(now).getTime() + 86400000).toISOString(),
        status: task?.title === input.nextAction ? task.status : "open",
        updated_at: now, metadata: { bookingId: id },
      }, { onConflict: "id" }));
    }
  }
  return booking;
}
