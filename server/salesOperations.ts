import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { z } from "zod";
import { classifyReply, getOutreachObservation, salesEmailPermissionBlockReason, saveOutreachObservation } from "../src/lib/salesAutomation.js";
import { PORTFOLIO_URL, renderProspectEmailTemplate } from "../src/lib/prospectOutreachTemplates.js";
import type { ProspectEmailOverrides, ProspectEmailTemplateKey } from "../src/lib/prospectOutreachTemplates.js";
import { chooseProspectFollowUp, FOLLOW_UP_TEMPLATE_STAGES } from "../src/lib/prospectFollowUpComposer.js";

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

function safeAuditReviewUrl(value: unknown): string {
  try {
    const url = new URL(String(value || ""));
    const appUrl = new URL(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || "https://app.bennietay.com");
    const legacy = url.pathname === "/website-audit" && Boolean(url.searchParams.get("report") && url.searchParams.get("key"));
    const shortReview = /^\/review\/[A-Za-z0-9_-]{22}$/.test(url.pathname);
    if (url.protocol !== "https:" || url.origin !== appUrl.origin || (!legacy && !shortReview)) return "";
    return url.toString();
  } catch { return ""; }
}

/** Prefer a persisted, prospect-specific design concept; fall back to an authenticated review.
 * Generic /preview/template links are deliberately excluded: they are not a checked redesign.
 */
export function resolveProspectFollowUpAsset(contact: Row | null | undefined): { kind: "design" | "audit"; url: string } | null {
  if (!contact) return null;
  let appOrigin: string;
  try { appOrigin = new URL(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || "https://app.bennietay.com").origin; }
  catch { return null; }
  const check = (raw: unknown, kind: "design" | "audit") => {
    try {
      const url = new URL(String(raw || ""));
      if (url.protocol !== "https:" || url.origin !== appOrigin || url.username || url.password || url.hash) return null;
      if (kind === "design" && !(/^\/preview\/prospect\/[a-zA-Z0-9_-]{8,160}$/.test(url.pathname)
        || /^\/p\/s_[a-zA-Z0-9_-]{20}$/.test(url.pathname))) return null;
      if (kind === "audit" && !((url.pathname === "/website-audit" && url.searchParams.get("report") && url.searchParams.get("key")) || /^\/review\/[A-Za-z0-9_-]{22}$/.test(url.pathname))) return null;
      return { kind, url: url.toString() };
    } catch { return null; }
  };
  return check(contact.design_preview_url, "design")
    || check(contact.audit_report_url, "audit")
    || check(contact.preview_url, "audit");
}

export const BENNIE_STUDIO_PORTFOLIO_URL = PORTFOLIO_URL;

function prospectEmailIdentity(contact: Row) {
  const company = String(contact.name || contact.business_name || "your business").trim();
  const firstName = String(contact.contact_first_name || contact.contact_name || "").trim().split(/\s+/)[0] || company + " team";
  const verifiedWebsite = Boolean(contact.website_evidence_source_url && contact.website_verified_at
    && contact.website_verification_method && contact.website_finding && contact.website_verified_by);
  const status = String(contact.website_status || "").toLowerCase().trim();
  const websiteStatus: boolean | "unknown" = !verifiedWebsite ? "unknown"
    : status === "no_website" ? false : ["weak", "average", "strong"].includes(status) ? true : "unknown";
  return { company, firstName, websiteStatus };
}

export type ProspectReviewAsset = { kind: "design" | "audit"; url: string };

/** One editable source of truth for admin previews, queued drafts and actual delivery. */
export function renderProspectFollowUpStage(
  contact: Row, stage: 1 | 2 | 3, asset: ProspectReviewAsset | null = null,
  overrides: ProspectEmailOverrides = {},
) {
  const { company, firstName, websiteStatus } = prospectEmailIdentity(contact);
  const specificObservation = getOutreachObservation(contact.notes).replace(/\s+/g, " ").trim().slice(0, 240);
  let id: ProspectEmailTemplateKey;
  if (stage === 1) id = asset?.kind === "design" ? "day3_design" : asset?.kind === "audit" && specificObservation ? "day3_audit"
    : websiteStatus === "unknown" ? "day3_neutral" : websiteStatus ? "day3_portfolio_existing" : "day3_portfolio_no_site";
  else if (stage === 2) id = websiteStatus === "unknown" ? "day8_neutral" : websiteStatus ? "day8_existing" : "day8_no_site";
  else id = websiteStatus === "unknown" ? "day15_neutral" : websiteStatus ? "day15_existing" : "day15_no_site";
  return renderProspectEmailTemplate(id, {
    first_name: firstName, business_name: company,
    asset_url: asset?.url, portfolio_url: PORTFOLIO_URL, specific_observation: specificObservation,
  }, overrides);
}

export function renderProspectInitialEmail(contact: Row, overrides: ProspectEmailOverrides = {}) {
  const { company, firstName } = prospectEmailIdentity(contact);
  const observation = getOutreachObservation(contact.notes).replace(/\s+/g, " ").trim().slice(0, 240);
  return renderProspectEmailTemplate("intro", {
    first_name: firstName, business_name: company,
    portfolio_url: PORTFOLIO_URL,
    specific_observation: observation
      ? `I looked at your website and noticed: ${observation}`
      : "I help service businesses make their websites clearer and easier for customers to enquire through.",
  }, overrides);
}

export function renderProspectFollowUpOne(contact: Row, asset: ProspectReviewAsset | null = null,
  overrides: ProspectEmailOverrides = {}) {
  return renderProspectFollowUpStage(contact, 1, asset, overrides);
}

/** Always read current templates before a due email; edits must affect real delivery. */
export async function loadProspectEmailOverrides(db: Db): Promise<ProspectEmailOverrides> {
  const { data } = checked(await db.from("outreach_sequences").select("settings")
    .eq("name", "Permissioned website review").limit(1).maybeSingle());
  return (data?.settings?.emailTemplateOverrides || {}) as ProspectEmailOverrides;
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
  send: (message: Row) => Promise<{ id: string; provider?: string; mailbox?: string; fromAddress?: string; replyToAddress?: string; templateVersion?: string; campaignId?: string }>;
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
    const { data: message } = checked(await db.from("sales_messages").update({ status: "sending", attempted_at: now, updated_at: now })
      .eq("id", candidate.id).in("status", ["approved", "queued"]).select("*").maybeSingle());
    if (!message) continue;
    const release = async (updates: Row) => checked(await db.from("sales_messages")
      .update({ ...updates, updated_at: now }).eq("id", message.id).eq("status", "sending"));
    let deliveryAttempted = false;
    try {
      // Direct prospect follow-ups are manual-only. Never let a legacy queued
      // message (or an approved draft) be dispatched by the scheduled worker.
      if (message.provider_payload?.directProspectFollowUp) {
        await release({ status: "draft", error: "Manual review and send required; automatic follow-ups are disabled." });
        result.deferred++;
        continue;
      }
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
          ["won", "lost", "closed", "converted", "paid", "unsubscribed", "replied", "call_booked"].includes(String(state || "").toLowerCase()))) {
          await release({ status: "cancelled", error: "Contact is closed or unavailable" });
          result.deferred++;
          continue;
        }
        if (message.channel === "email" && !message.reply_to_message_id
          && salesEmailPermissionBlockReason(contact, new Date(now))) {
          await release({ status: "draft", error: "Recipient permission evidence is incomplete; manual legal review is required before contact." });
          result.deliveryBlocked++;
          continue;
        }
        if ((message.provider_payload?.directProspectFollowUp || message.provider_payload?.directAuditFollowUp)
          && message.prospect_id) {
          const { data: activeEnrollment } = checked(await db.from("outreach_enrollments").select("id")
            .eq("prospect_id", message.prospect_id).in("status", ["pending", "active", "paused"])
            .limit(1).maybeSingle());
          if (activeEnrollment) {
            await release({ status: "cancelled", error: "Replaced by managed prospect follow-up sequence" });
            result.deferred++;
            continue;
          }
          const { data: reply } = checked(await db.from("sales_messages").select("id")
            .eq("prospect_id", message.prospect_id).eq("direction", "inbound")
            .limit(1).maybeSingle());
          if (reply) {
            await release({ status: "cancelled", error: "Prospect replied before the scheduled follow-up" });
            result.deferred++;
            continue;
          }
          const stage = Number(message.provider_payload?.directStage || 1);
          if (!Number.isInteger(stage) || stage < 1 || stage > 3) {
            await release({ status: "cancelled", error: "Invalid direct follow-up stage" });
            result.deferred++;
            continue;
          }
          if (stage > 1) {
            const { data: siblings } = checked(await db.from("sales_messages").select("*")
              .eq("prospect_id", message.prospect_id).eq("direction", "outbound"));
            const preceding = (siblings || []).find((row: Row) =>
              row.provider_payload?.directCampaignId === message.provider_payload?.directCampaignId
              && Number(row.provider_payload?.directStage) === stage - 1);
            if (!preceding || !SENT.includes(preceding.status) || !preceding.sent_at) {
              await release({ status: "draft", error: "The previous direct follow-up must be successfully sent first." });
              result.deliveryBlocked++;
              continue;
            }
            const nextAt = new Date(preceding.sent_at).getTime() + (stage === 2 ? 5 : 7) * 86_400_000;
            if (nextAt > new Date(now).getTime()) {
              await release({ status: candidate.status, scheduled_at: new Date(nextAt).toISOString() });
              result.deferred++;
              continue;
            }
          }
          // Prepare stage-specific copy at the moment of delivery: a later saved
          // concept/review replaces the portfolio fallback without inventing audit findings.
          const asset = resolveProspectFollowUpAsset(contact);
          const overrides = await loadProspectEmailOverrides(db);
          const prepared = renderProspectFollowUpStage(contact, stage as 1 | 2 | 3, asset, overrides);
          checked(await db.from("sales_messages").update({
            ...prepared,
            provider_payload: { ...message.provider_payload, reviewAssetKind: stage === 1 ? asset?.kind || "portfolio" : null,
              reviewAssetUrl: stage === 1 ? asset?.url || BENNIE_STUDIO_PORTFOLIO_URL : null }, updated_at: now,
          }).eq("id", message.id).eq("status", "sending"));
          Object.assign(message, prepared, { provider_payload: {
            ...message.provider_payload, reviewAssetKind: stage === 1 ? asset?.kind || "portfolio" : null,
            reviewAssetUrl: stage === 1 ? asset?.url || BENNIE_STUDIO_PORTFOLIO_URL : null,
          } });
        }
      }
      if (message.enrollment_id) {
        const { data: enrollment } = checked(await db.from("outreach_enrollments").select("*, outreach_sequences(status,audience_type,name,settings)")
          .eq("id", message.enrollment_id).maybeSingle());
        if (!enrollment || enrollment.status !== "active" || enrollment.outreach_sequences?.status !== "active") {
          await release({ status: candidate.status });
          result.deferred++;
          continue;
        }
        const table = enrollment.lead_id ? "leads" : "prospects";
        const { data: contact } = checked(await db.from(table).select("*")
          .eq("id", enrollment.lead_id || enrollment.prospect_id).maybeSingle());
        const { data: siblings } = checked(await db.from("sales_messages").select("*").eq("enrollment_id", enrollment.id));
        const sequence = enrollment.outreach_sequences || {};
        const isColdSales = sequence.audience_type === "cold" || sequence.name === "Permissioned website review";
        if (isColdSales && message.channel === "email" && !message.reply_to_message_id
          && contact && salesEmailPermissionBlockReason(contact, new Date(now))) {
          await release({ status: "draft", error: "Recipient permission evidence is incomplete; manual legal review is required before contact." });
          result.deliveryBlocked++;
          continue;
        }
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
        if (enrollment.outreach_sequences?.name === "Permissioned website review") {
          const step = Number(message.provider_payload?.stepOrder);
          if (step >= 2 && step <= 4) {
            // Keep managed cold-sequence follow-ups available for review only.
            // All prospect follow-up sends now require an explicit operator action.
            await release({ status: "draft", error: "Manual review and send required; automatic follow-ups are disabled." });
            result.deferred++;
            continue;
          }
          if (step < 1 || step > 4 || !Number.isInteger(step)) {
            await stopSalesEnrollment(db, enrollment.id, "Unexpected prospect follow-up stage", now);
            await release({ status: "cancelled", error: "Unexpected prospect follow-up stage" });
            result.deferred++;
            continue;
          }
          if (step >= 2) {
            const asset = resolveProspectFollowUpAsset(contact);
            const prepared = renderProspectFollowUpStage(contact, (step - 1) as 1 | 2 | 3, asset,
              (enrollment.outreach_sequences?.settings?.emailTemplateOverrides || {}) as ProspectEmailOverrides);
            checked(await db.from("sales_messages").update({
              ...prepared, provider_payload: { ...message.provider_payload,
                reviewAssetKind: step === 2 ? asset?.kind || "portfolio" : null,
                reviewAssetUrl: step === 2 ? asset?.url || BENNIE_STUDIO_PORTFOLIO_URL : null }, updated_at: now,
            }).eq("id", message.id).eq("status", "sending"));
            Object.assign(message, prepared, { provider_payload: {
              ...message.provider_payload, reviewAssetKind: step === 2 ? asset?.kind || "portfolio" : null,
              reviewAssetUrl: step === 2 ? asset?.url || BENNIE_STUDIO_PORTFOLIO_URL : null,
            } });
          }
        }
      }
      let receipt: { id: string; provider?: string; mailbox?: string; fromAddress?: string; replyToAddress?: string; templateVersion?: string; campaignId?: string };
      try {
        deliveryAttempted = true;
        receipt = await send({ ...message, recipient: email });
        if (!receipt.id) throw new Error("MISSING_DELIVERY_RECEIPT");
      } catch (error: any) {
        const blocked = error?.message === "RESEND_CONFIG_ERROR";
        await release({ status: blocked ? candidate.status : "failed", delivery_state: blocked ? "unknown" : "uncertain",
          delivery_uncertainty_reason: blocked ? null : "The provider outcome could not be confirmed. Check provider logs before any retry.",
          error: blocked ? "Email delivery is not configured yet" : "Delivery failed or is uncertain. Check provider delivery before retrying." });
        blocked ? result.deliveryBlocked++ : result.failed++;
        continue;
      }
      // A provider success followed by a database failure stays 'sending'. Never
      // automatically retry an uncertain send beyond the provider's 24h window.
      await release({ status: "sent", sent_at: now, provider_message_id: receipt.id,
        provider_name: receipt.provider || "resend", provider_mailbox: receipt.mailbox || null,
        from_address: receipt.fromAddress || null, reply_to_address: receipt.replyToAddress || null,
        provider_accepted_at: now, delivery_state: "delivery_unconfirmed",
        delivery_uncertainty_reason: "Provider accepted the message; no receiving-server confirmation has been recorded.",
        template_version: receipt.templateVersion || message.template_version || null,
        campaign_id: receipt.campaignId || message.campaign_id || null, error: null });
      result.sent++;
      if (message.prospect_id && message.provider_payload?.directProspectFollowUp) {
        const stage = Number(message.provider_payload.directStage);
        const campaign = String(message.provider_payload.directCampaignId || "");
        const { data: siblings } = checked(await db.from("sales_messages").select("*")
          .eq("prospect_id", message.prospect_id).eq("direction", "outbound"));
        if (stage < 3) {
          const following = (siblings || []).find((row: Row) => row.provider_payload?.directCampaignId === campaign
            && Number(row.provider_payload?.directStage) === stage + 1);
          if (following && following.status === "draft") {
            const gapDays = stage === 1 ? 5 : 7;
            checked(await db.from("sales_messages").update({
              status: "queued", scheduled_at: new Date(new Date(now).getTime() + gapDays * 86_400_000).toISOString(),
              error: null, updated_at: now,
            }).eq("id", following.id).eq("status", "draft"));
          }
          checked(await db.from("prospects").update({
            outreach_status: "contacted",
            next_follow_up_at: new Date(new Date(now).getTime() + (stage === 1 ? 5 : 7) * 86_400_000).toISOString(),
            updated_at: now,
          }).eq("id", message.prospect_id).in("outreach_status", ["not_started", "queued", "contacted"]));
        } else {
          const { data: reply } = checked(await db.from("sales_messages").select("id")
            .eq("prospect_id", message.prospect_id).eq("direction", "inbound").limit(1).maybeSingle());
          if (!reply) {
            checked(await db.from("prospects").update({
              outreach_status: "lost", status: "lost", next_follow_up_at: null,
              outreach_exhausted_at: now, updated_at: now,
            }).eq("id", message.prospect_id).in("outreach_status", ["not_started", "queued", "contacted"]));
            checked(await db.from("sales_tasks").update({ status: "dismissed", updated_at: now })
              .eq("prospect_id", message.prospect_id).eq("status", "open").eq("task_type", "follow_up"));
          }
        }
      }
      if (message.enrollment_id) {
        const { data: remaining } = checked(await db.from("sales_messages").select("id,scheduled_at")
          .eq("enrollment_id", message.enrollment_id).eq("direction", "outbound")
          .in("status", [...PENDING, "sending", "failed"]).order("scheduled_at").limit(1));
        const completed = !remaining?.length;
        checked(await db.from("outreach_enrollments").update({
          current_step: Number(message.provider_payload?.stepOrder || 0),
          next_run_at: remaining?.[0]?.scheduled_at || null,
          ...(completed ? { status: "completed" } : {}), updated_at: now,
        }).eq("id", message.enrollment_id).eq("status", "active"));
        if (message.prospect_id && String(message.provider_payload?.sequenceId || "")) {
          const isFinalFollowUp = completed && Number(message.provider_payload?.stepOrder) === 4
            && message.provider_payload?.followUpStage === "FOLLOW_UP_3_OF_3";
          if (isFinalFollowUp) {
            const { data: reply } = checked(await db.from("sales_messages").select("id")
              .eq("prospect_id", message.prospect_id).eq("direction", "inbound").limit(1).maybeSingle());
            if (!reply) {
              // Archive rather than delete, retaining history for dedupe and no-contact.
              checked(await db.from("prospects").update({
                outreach_status: "lost", status: "lost", next_follow_up_at: null,
                outreach_exhausted_at: now, updated_at: now,
              }).eq("id", message.prospect_id).in("outreach_status", ["not_started", "queued", "contacted"]));
              checked(await db.from("sales_tasks").update({ status: "dismissed", updated_at: now })
                .eq("prospect_id", message.prospect_id).eq("status", "open").eq("task_type", "follow_up"));
              checked(await db.from("sales_messages").update({ status: "cancelled", updated_at: now,
                error: "Prospect sequence exhausted without reply" })
                .eq("prospect_id", message.prospect_id).is("enrollment_id", null)
                .in("status", PENDING));
            }
          } else if (!completed) {
            checked(await db.from("prospects").update({
              outreach_status: "contacted", next_follow_up_at: remaining?.[0]?.scheduled_at || null, updated_at: now,
            }).eq("id", message.prospect_id).in("outreach_status", ["not_started", "queued", "contacted"]));
          }
        }
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
  const states: Record<string, string> = { "email.sent": "provider_accepted", "email.delivered": "delivery_confirmed", "email.opened": "delivery_confirmed", "email.clicked": "delivery_confirmed", "email.bounced": "bounced", "email.complained": "complained", "email.suppressed": "rejected", "email.failed": "failed" };
  const state = states[event.type];
  if (!state || !event.data?.email_id) return;
  const { data: message } = checked(await db.from("sales_messages").select("*")
    .eq("provider_message_id", event.data.email_id).eq("direction", "outbound").maybeSingle());
  const provider = String(event.type || "").startsWith("email.") ? "resend" : "unknown";
  const providerEventId = String(event.id || event.event_id || "");
  const eventKey = providerEventId || `${event.type}:${event.data.email_id}:${event.created_at || now}:${JSON.stringify(event.data).slice(0, 500)}`;
  checked(await db.from("sales_email_provider_events").upsert({
    provider, event_key: eventKey, provider_event_id: providerEventId || null,
    event_type: event.type, provider_message_id: event.data.email_id,
    message_id: message?.id || null, prospect_id: message?.prospect_id || null,
    lead_id: message?.lead_id || null, occurred_at: event.created_at || now,
    match_method: message ? "provider_message_id" : "unmatched",
    event_payload: event.data || {},
  }, { onConflict: "provider,event_key", ignoreDuplicates: true }));
  if (!message) return;
  // Keep engagement status separate from provider delivery evidence.
  const rank: Record<string, number> = { unknown: 0, provider_accepted: 1, delivery_unconfirmed: 1, delivery_confirmed: 2, bounced: 3, complained: 4, rejected: 3, failed: 3, uncertain: 1 };
  const current = String(message.delivery_state || "unknown");
  const terminal = ["bounced", "complained", "rejected", "failed"];
  const nextState = terminal.includes(current) ? current
    : terminal.includes(state) ? state : (rank[state] || 0) >= (rank[current] || 0) ? state : current;
  const eventAt = event.created_at || now;
  const fields: Row = { delivery_state: nextState, last_provider_event: event.type, updated_at: now };
  if (state === "provider_accepted") fields.provider_accepted_at = message.provider_accepted_at || eventAt;
  if (state === "delivery_confirmed") fields.delivery_confirmed_at = message.delivery_confirmed_at || eventAt;
  if (state === "bounced") fields.bounced_at = eventAt;
  if (state === "complained") fields.complained_at = eventAt;
  if (state === "delivery_confirmed") fields.delivery_uncertainty_reason = null;
  else if (state === "provider_accepted") fields.delivery_uncertainty_reason = "Provider accepted the message; downstream delivery is not confirmed.";
  checked(await db.from("sales_messages").update(fields).eq("id", message.id));
  if (["bounced", "complained", "rejected"].includes(state)) {
    // Preserve the provider outcome for support diagnostics without exposing it in an email.
    const reason = String(event.data?.bounce?.message || event.data?.bounce?.reason || event.data?.reason || "").slice(0, 500);
    if (reason) checked(await db.from("sales_messages").update({ error: reason, updated_at: now }).eq("id", message.id));
    await suppressSalesRecipient(db, message.recipient, state === "complained" ? "complained" : "bounced", "resend_webhook", now);
  }
}

export async function recordSalesReply(db: Db, event: Row, getBody: () => Promise<string>, now: string) {
  const sender = normalizeSalesEmail(event.data?.from);
  if (!sender || !event.data?.email_id) throw new Error("INVALID_REPLY_EVENT");
  // Match only with provider thread identifiers. Sender recency is not identity evidence.
  const rawReferences = [event.data?.in_reply_to, event.data?.inReplyTo, event.data?.headers?.["in-reply-to"],
    ...(Array.isArray(event.data?.references) ? event.data.references : [event.data?.references])];
  const references = [...new Set(rawReferences.flatMap((value: unknown) => String(value || "").match(/[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+|[^\s<>]+/g) || [])
    .map((value: string) => value.replace(/[<>]/g, "").trim()).filter(Boolean))];
  let prior: Row | null = null;
  for (const referenceId of references) {
    const { data } = checked(await db.from("sales_messages").select("*")
      .eq("provider_message_id", referenceId).eq("direction", "outbound").maybeSingle());
    if (data && normalizeSalesEmail(data.recipient) === sender) { prior = data; break; }
  }
  const key = `${String(event.provider || "resend")}:inbound:${event.data.email_id}`;
  const { data: existing } = checked(await db.from("sales_messages").select("id,classification,body_text")
    .eq("idempotency_key", key).maybeSingle());
  let text = existing?.body_text || "";
  if (!text) {
    try { text = (await getBody()).slice(0, 50_000); }
    catch { text = "[Reply received but body retrieval failed. Review this message in the provider inbox before responding.]"; }
  }
  const classification = existing?.classification || classifyReply(`${event.data.subject || ""}\n${text}`);
  const automatic = ["automatic_reply", "delivery_notification"].includes(classification);
  const attribution = prior ? (references.includes(String(prior.provider_message_id)) ? "provider_thread_reference" : "unmatched") : "unmatched";
  checked(await db.from("sales_messages").upsert({
    id: salesRecordId(key), idempotency_key: key, enrollment_id: prior?.enrollment_id || null,
    prospect_id: prior?.prospect_id || null, lead_id: prior?.lead_id || null,
    direction: "inbound", channel: "email", recipient: sender,
    subject: String(event.data.subject || "Inbound email").slice(0, 500), body_text: text,
    status: "replied", sent_at: event.created_at || now, provider_message_id: event.data.email_id,
    reply_to_message_id: prior?.id || null, classification,
    provider_payload: { attribution, references, provider: event.provider || "resend" },
  }, { onConflict: "idempotency_key", ignoreDuplicates: true }));

  // A clear opt-out is actionable even without thread correlation. Never wait
  // for an operator to identify which campaign the sender originally received.
  if (classification === "unsubscribe") {
    await suppressSalesRecipient(db, sender, "opt_out", "reply_classification", now);
  }

  if (!prior) {
    const { data: senderMessages } = checked(await db.from("sales_messages").select("enrollment_id")
      .ilike("recipient", exactEmailPattern(sender)).not("enrollment_id", "is", null));
    for (const id of new Set((senderMessages || []).map((row) => row.enrollment_id))) {
      await stopSalesEnrollment(db, id, automatic ? "Unmatched automated reply requires review" : "Unmatched human reply requires reconciliation", now);
    }
    // The inbound address is known even though its thread is not. Cancel pending
    // sends to that exact address to avoid sending over an unresolved response.
    checked(await db.from("sales_messages").update({ status: "cancelled", error: "Inbound message requires manual thread reconciliation.", updated_at: now })
      .ilike("recipient", exactEmailPattern(sender)).eq("direction", "outbound").in("status", PENDING));
    checked(await db.from("sales_tasks").upsert({
      id: salesRecordId(`reply-reconcile:${event.data.email_id}`),
      title: "Reconcile unmatched inbound email", task_type: "reply_reconciliation", priority: "high", due_at: now,
      metadata: { messageId: event.data.email_id, sender, classification, provider: event.provider || "resend" },
    }, { onConflict: "id", ignoreDuplicates: true }));
    return { matched: false, classification };
  }

  // Any linked inbound message pauses that contact's pending outreach. Automated
  // provider notifications are retained for review but never count as positive replies.
  if (prior.enrollment_id) await stopSalesEnrollment(db, prior.enrollment_id, automatic ? "Automated response received" : "Reply received", now);
  if (!automatic) {
    const { data: related } = checked(await db.from("sales_messages").select("enrollment_id")
      .ilike("recipient", exactEmailPattern(sender)).not("enrollment_id", "is", null));
    for (const id of new Set((related || []).map((row) => row.enrollment_id))) await stopSalesEnrollment(db, id, "Reply received", now);
  }
  if (prior.prospect_id) {
    checked(await db.from("sales_messages").update({ status: "cancelled", updated_at: now })
      .eq("prospect_id", prior.prospect_id).contains("provider_payload", { followUpForMessageId: prior.id }).in("status", PENDING));
    checked(await db.from("sales_messages").update({ status: "cancelled", updated_at: now })
      .eq("prospect_id", prior.prospect_id).contains("provider_payload", { directProspectFollowUp: true }).in("status", PENDING));
    checked(await db.from("sales_tasks").update({ status: "dismissed", updated_at: now })
      .eq("prospect_id", prior.prospect_id).eq("status", "open").eq("task_type", "follow_up"));
    if (!automatic) {
      const { data: prospect } = checked(await db.from("prospects").select("id,outreach_exhausted_at").eq("id", prior.prospect_id).maybeSingle());
      checked(await db.from("prospects").update({ outreach_status: "replied", updated_at: now,
        ...(prospect?.outreach_exhausted_at ? { status: "qualified", outreach_exhausted_at: null } : {}) })
        .eq("id", prior.prospect_id).in("outreach_status", ["not_started", "queued", "contacted", ...(prospect?.outreach_exhausted_at ? ["lost"] : [])]));
    }
  }
  if (classification === "unsubscribe") {
    return { matched: true, classification };
  }
  checked(await db.from("sales_tasks").upsert({
    id: salesRecordId(`reply-task:${event.data.email_id}`), lead_id: prior.lead_id, prospect_id: prior.prospect_id,
    title: automatic ? "Review automated reply" : classification === "not_now" ? "Record the prospect's preferred follow-up timing" : "Respond personally to the prospect's reply",
    task_type: automatic ? "reply_review" : "reply", priority: automatic ? "medium" : classification === "not_now" ? "medium" : "high", due_at: now,
    metadata: { classification, messageId: event.data.email_id },
  }, { onConflict: "id", ignoreDuplicates: true }));
  return { matched: true, classification };
}

export async function saveManualOutreach(db: Db, input: {
  prospectId: string; action: "prepare" | "contacted"; channel: "email" | "whatsapp";
  observation: string; bodyText: string; requestId: string; actorId: string;
}, now: string) {
  const { data: prospect } = checked(await db.from("prospects").select("*").eq("id", input.prospectId).maybeSingle());
  if (!prospect) throw new Error("CONTACT_NOT_FOUND");
  if (prospect.outreach_exhausted_at || [prospect.status, prospect.outreach_status].some((status) => ["won", "lost", "closed", "converted", "paid"].includes(String(status).toLowerCase()))) throw new Error("CONTACT_CLOSED");
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
    reviewUrl?: string | null;
    replyToMessageId?: string | null;
    recipientPermissionConfirmed?: boolean;
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

  const reviewUrl = safeAuditReviewUrl(input.reviewUrl);
  const followUpStage = FOLLOW_UP_TEMPLATE_STAGES[String(input.templateId || "")] || null;
  const bulkIntro = input.templateId === "bulk-introduction";
  if (!input.replyToMessageId && input.templateId !== "general-introduction" && !bulkIntro && !followUpStage && String(input.observation || "").trim().length < 10 && !reviewUrl) {
    throw new Error("OUTREACH_OBSERVATION_REQUIRED");
  }
  if (/\[[^\]\n]{3,}\]|\{\{[^}]+\}\}/.test(`${input.subject || ""}\n${input.bodyText}`)) {
    throw new Error("OUTREACH_PLACEHOLDER_UNRESOLVED");
  }

  if (
    prospect.outreach_exhausted_at ||
    [prospect.status, prospect.outreach_status].some((status) =>
      ["won", "lost", "closed", "converted", "paid", "unsubscribed"].includes(
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
    if (!input.replyToMessageId && salesEmailPermissionBlockReason(prospect, new Date(now))) {
      throw new Error("CONTACT_PERMISSION_NOT_VERIFIED");
    }
    if (!input.replyToMessageId && input.recipientPermissionConfirmed !== true) {
      throw new Error("CONTACT_PERMISSION_CONFIRMATION_REQUIRED");
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

  // Operator authorization never overrides a prospect's marketing-consent status.
  // A manual follow-up is allowed only after confirmed prior sends and its
  // 3/5/7-day interval; never accept a guessed CRM status as send authority.
  if (followUpStage) {
    if (input.channel !== "email" || input.replyToMessageId) throw new Error("OUTREACH_FOLLOW_UP_INVALID");
    const { data: history } = checked(await db.from("sales_messages")
      .select("id,direction,channel,status,sent_at,created_at,reply_to_message_id,provider_payload")
      .eq("prospect_id", prospect.id).order("created_at", { ascending: true }).limit(100));
    const next = chooseProspectFollowUp(prospect, history || [], new Date(now));
    if (next.kind !== "follow_up" || next.stage !== followUpStage) throw new Error("OUTREACH_FOLLOW_UP_STAGE_NOT_DUE");
    const { data: enrollment } = checked(await db.from("outreach_enrollments").select("id")
      .eq("prospect_id", prospect.id).in("status", ["pending", "active", "paused"])
      .limit(1).maybeSingle());
    if (enrollment) throw new Error("OUTREACH_ACTIVE_SEQUENCE");
  }

  const recipient = input.channel === "email" ? email : phone;
  const key = `direct-outreach:${input.channel}:${input.requestId}`;
  // Direct prospect emails use the same three-stage policy as automated enrolments.
  // Follow-up 2/3 stay dormant until the preceding stage is confirmed sent.
  const scheduleAuditFollowUp = async (firstMessage: Row, contact: Row) => {
    if (followUpStage || input.channel !== "email" || input.replyToMessageId ||
      ["replied", "call_booked", "won", "lost"].includes(String(contact.outreach_status || ""))) return null;
    const { data: enrolled } = checked(await db.from("outreach_enrollments").select("id")
      .eq("prospect_id", contact.id).in("status", ["pending", "active", "paused"]).limit(1).maybeSingle());
    if (enrolled) return null;
    const startMs = new Date(firstMessage.sent_at || now).getTime();
    const asset = resolveProspectFollowUpAsset(contact);
    const overrides = await loadProspectEmailOverrides(db);
    const stages = ([3, 8, 15] as const).map((day, i) => ({
      day,
      delayHours: [72, 120, 168][i],
      ...renderProspectFollowUpStage(contact, (i + 1) as 1 | 2 | 3, asset, overrides),
    }));
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const followUpKey = "direct-prospect-follow-up:" + input.requestId + ":" + (i + 1);
      const { error } = await db.from("sales_messages").upsert({
        id: salesRecordId(followUpKey), idempotency_key: followUpKey,
        prospect_id: contact.id, direction: "outbound", channel: "email",
        recipient: normalizeSalesEmail(contact.contact_email),
        subject: stage.subject.slice(0, 500), body_text: stage.body_text,
        status: "draft",
        scheduled_at: new Date(startMs + stage.day * 86_400_000).toISOString(),
        provider_payload: {
          directProspectFollowUp: true,
          directAuditFollowUp: i === 0 && Boolean(asset?.kind === "audit"),
          followUpForMessageId: firstMessage.id, directCampaignId: input.requestId,
          directStage: i + 1, followUpStage: "FOLLOW_UP_" + (i + 1) + "_OF_3",
          delayHours: stage.delayHours, reviewUrl: reviewUrl || null,
          reviewAssetKind: i === 0 ? asset?.kind || "portfolio" : null,
          autoSendEligible: false, awaitingPriorStage: i > 0,
        }, updated_at: now,
      }, { onConflict: "idempotency_key", ignoreDuplicates: true });
      if (error) throw error;
    }
    return { scheduledAt: new Date(startMs + 3 * 86_400_000).toISOString(),
      status: "draft", stages: 3 };
  };
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
  // Manual bulk introductions are first-contact only. The preview is advisory;
  // history, replies and ongoing campaigns must be checked again at send time.
  // An already-sent request ID remains idempotent so uncertain client retries
  // cannot result in a second provider delivery.
  if (bulkIntro && !prior) {
    if (input.channel !== "email" || input.replyToMessageId) throw new Error("OUTREACH_INTRO_INVALID");
    if (String(prospect.outreach_status || "") !== "not_started") throw new Error("OUTREACH_INTRO_NOT_NEW");
    const { data: previous } = checked(await db.from("sales_messages").select("id")
      .eq("direction", "outbound").eq("channel", "email")
      .ilike("recipient", exactEmailPattern(email)).limit(1).maybeSingle());
    if (previous) throw new Error("OUTREACH_INTRO_ALREADY_ATTEMPTED");
    const { data: inbound } = checked(await db.from("sales_messages").select("id")
      .eq("prospect_id", prospect.id).eq("direction", "inbound").limit(1).maybeSingle());
    if (inbound) throw new Error("OUTREACH_INTRO_ALREADY_REPLIED");
    const { data: enrolled } = checked(await db.from("outreach_enrollments").select("id")
      .eq("prospect_id", prospect.id).in("status", ["pending", "active", "paused"])
      .limit(1).maybeSingle());
    if (enrolled) throw new Error("OUTREACH_ACTIVE_SEQUENCE");
  }
  if (prior && SENT.includes(prior.status)) {
    const followUp = await scheduleAuditFollowUp(prior, prospect);
    return {
      prospect,
      recipient,
      message: prior,
      providerMessageId: prior.provider_message_id || null,
      alreadySent: true,
      followUp,
    };
  }
  if (!prior && !input.replyToMessageId && input.channel === "email" && !followUpStage) {
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

  // Explicit operator confirmation supplements independently stored recipient
  // permission evidence; it cannot replace it.

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
    attempted_at: now,
    scheduled_at: now,
    error: null,
    updated_at: now,
    provider_payload: {
      directSend: true,
      actorId: input.actorId,
      // Operator confirmation is not a fabricated opt-in record.
      recipientPermissionConfirmed: input.recipientPermissionConfirmed === true,
      permissionConfirmedAt: input.recipientPermissionConfirmed === true ? now : null,
      observation: input.observation || null,
      templateId: input.templateId || null,
      ...(followUpStage ? { directStage: followUpStage, followUpStage: "FOLLOW_UP_" + followUpStage + "_OF_3" } : {}),
      reviewUrl: reviewUrl || null,
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

  let receipt: { id: string; provider?: string; mailbox?: string; fromAddress?: string; replyToAddress?: string; templateVersion?: string; campaignId?: string };
  try {
    receipt = await input.deliver(message);
    if (!receipt?.id) throw new Error("MISSING_DELIVERY_RECEIPT");
  } catch (error: any) {
    checked(
      await db
        .from("sales_messages")
        .update({
          status: "failed",
          delivery_state: "uncertain",
          delivery_uncertainty_reason: "The provider outcome could not be confirmed. Check provider logs before any retry.",
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
        provider_name: receipt.provider || "resend",
        provider_mailbox: receipt.mailbox || null,
        from_address: receipt.fromAddress || null,
        reply_to_address: receipt.replyToAddress || null,
        attempted_at: now,
        provider_accepted_at: now,
        delivery_state: "delivery_unconfirmed",
        delivery_uncertainty_reason: "Provider accepted the message; no receiving-server confirmation has been recorded.",
        template_version: receipt.templateVersion || createHash("sha256").update(`${message.subject || ""}\n${message.body_text || ""}`).digest("hex"),
        campaign_id: receipt.campaignId || null,
        error: null,
        updated_at: now,
      })
      .eq("id", message.id)
      .eq("status", "sending")
      .select("*")
      .single(),
  );

  const followUpAt = followUpStage === 3 ? null : new Date(new Date(now).getTime() + (followUpStage === 1 ? 5 : followUpStage === 2 ? 7 : 3) * 86400000).toISOString();
  const existingFollowUp =
    !followUpStage && prospect.next_follow_up_at &&
    new Date(prospect.next_follow_up_at).getTime() > new Date(now).getTime()
      ? prospect.next_follow_up_at
      : null;
  const observation = input.observation?.trim() || "";
  const notes = observation ? saveOutreachObservation(prospect.notes, observation) : String(prospect.notes || "");
  const updates: Row = {
    notes,
    updated_at: now,
  };

  if (!["replied", "call_booked"].includes(String(prospect.outreach_status || ""))) {
    if (followUpStage === 3) {
      updates.status = "lost";
      updates.outreach_status = "lost";
      updates.outreach_exhausted_at = now;
      updates.next_follow_up_at = null;
    } else {
      updates.outreach_status = "contacted";
      updates.next_follow_up_at = existingFollowUp || followUpAt;
    }
  }

  const { data: updatedProspect } = checked(
    await db
      .from("prospects")
      .update(updates)
      .eq("id", prospect.id)
      .select("*")
      .single(),
  );

  if (followUpStage) {
    // A manually sent stage closes the due reminder and pending duplicate
    // drafts. The next stage remains manual without documented opt-in.
    checked(await db.from("sales_messages").update({
      status: "cancelled", updated_at: now, error: "Superseded by manually sent follow-up",
    }).eq("prospect_id", prospect.id).eq("direction", "outbound")
      .contains("provider_payload", { directStage: followUpStage })
      .neq("id", sentMessage.id).in("status", ["draft", "approved", "queued"]));
    checked(await db.from("sales_tasks").update({ status: "completed", updated_at: now })
      .eq("prospect_id", prospect.id).eq("task_type", "follow_up")
      .eq("status", "open").lte("due_at", now));
    if (followUpAt) {
      checked(await db.from("sales_tasks").upsert({
        id: salesRecordId("manual-prospect-follow-up:" + prospect.id + ":" + (followUpStage + 1)),
        prospect_id: prospect.id, title: "Follow up with " + prospect.name + " (" + (followUpStage + 1) + "/3)",
        task_type: "follow_up", status: "open", priority: "medium",
        due_at: followUpAt,
        metadata: { source: "manual_follow_up", stage: followUpStage + 1 }, updated_at: now,
      }, { onConflict: "id", ignoreDuplicates: true }));
    }
  } else if (!["replied", "call_booked"].includes(String(prospect.outreach_status || ""))) {
    checked(
      await db.from("sales_tasks").upsert(
        {
          id: salesRecordId(`direct-follow-up:${input.requestId}`),
          prospect_id: prospect.id,
          title: `Follow up with ${prospect.name}`,
          task_type: "follow_up",
          priority: "medium",
          due_at: existingFollowUp || followUpAt,
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

  const auditFollowUp = await scheduleAuditFollowUp(sentMessage, updatedProspect || prospect);

  return {
    prospect: updatedProspect,
    recipient,
    message: sentMessage,
    providerMessageId: receipt.id,
    alreadySent: false,
    followUp: auditFollowUp,
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
