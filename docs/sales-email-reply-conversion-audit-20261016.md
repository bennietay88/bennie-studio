# Bennie Studio sales email review — 16 October 2026

## Objective

Optimise prospect and sales-sequence emails for **relevant replies**, **booked scoping conversations**, and **customers won**. Open and click activity is not a conversion goal. No copy can guarantee replies, and the results must be checked against deliverability and inbound synchronization.

## Baseline (connected Supabase, 2026-10-16)

- 121 outbound sales email records have a non-null sent timestamp.
- 0 inbound email records; 0 prospects with `outreach_status = replied`; 0 prospects with `outreach_status = won`.
- 95 sent messages have no template ID, 25 have `intro`, and 1 has `follow-up`.
- Template-level uplift cannot be measured from these historical records. Zero inbound records may indicate no replies *or* a Reply-To / receiving-webhook tracking gap. Do not equate this number with proven recipient silence.
- Check the actual sending identity, Reply-To destination, receiving domain, Resend `email.received` subscription and signature, `RESEND_RECEIVING_API_KEY` permissions, and the exact production webhook URL by replying to one **controlled test message**.

## Inventory reviewed

**Prospect draft library (16):** quotation, portfolio, services, mobile, no-site, managed care, booking, local coverage, trust, pricing clarity, contact/location, Day 3 follow-up, Day 7 close-the-loop, interested reply, booked-call preparation, proposal follow-up.

**Database-driven sequence steps (7):** Cold website review (first touch, Day 3), inbound review, preview follow-up, proposal follow-up, past-prospect reactivation, customer referral request.

## Revisions

1. Open with one **verified** page/listing observation; never claim lost revenue, guaranteed conversion or audit results not actually observed.
2. Tie the observation to one concrete prospect action: quote, WhatsApp/contact, booking, service choice, or site upkeep.
3. Use **one low-effort reply question** per email. A short, direct answer is easier than an unsolicited meeting invitation.
4. First-contact messages qualify priority; the interested-reply stage offers a short scoping call; the proposal stage invites a decision or one precise adjustment.
5. Day 3 is a useful second touch; Day 7 is a final check, not an indefinite chase. Send only when allowed and stop on opt-out, negative response or genuine reply.
6. Do not invent a ready-made preview, an existing call, prior email exchange, or proposal. Operators must choose the stage that matches recorded history.
7. The `EmailTemplateHub` now blocks missing observations instead of silently inserting an invented generic problem. Singapore first-touch `<ADV>` treatment and suppression rules remain unchanged.
8. The existing sequence content was updated in Supabase for future enrollments. Messages already generated/queued are unchanged.

## Evaluation plan

- **Before any outreach test:** send a controlled email and reply; confirm inbound `sales_messages`, classification, a follow-up task, and sequence stop-on-reply. If this fails, fix tracking before judging copy.
- Compare only similar, permissioned prospects, keeping segments and follow-up timing stable. Use accurate `provider_payload.templateId` on new sends.
- Main indicators: human replies / delivered emails; qualified positive replies / delivered emails; scoping calls booked / qualified replies; paid customers / calls or proposals.
- Operational guardrails: bounce/complaint/opt-out rates; never bypass required consent or other sending restrictions.
- Treat comparisons based on small samples as exploratory. Do not claim measured improvements without a tested baseline.

## Publication

The draft-template code and copy tests are committed to GitHub. Production publishing remains separate from database sequence text updates and may be delayed by the Vercel deployment quota.
