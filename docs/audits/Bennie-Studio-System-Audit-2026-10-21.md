# Bennie Tay Studio — System Audit, Repair & Revenue Plan

**Audit date:** 21 October 2026  
**Production inspected:** `app.bennietay.com` / Vercel project `studio-real`  
**Code baseline:** `1beadd9b3cd973fc63ecfb0cf3e94ad5ceda0c13`  
**Working branch:** `audit/bennie-studio-system-2026-10-21`  
**Disposition:** **Not ready for a new paid launch until checkout-to-delivery and customer email paths pass controlled end-to-end verification.** Public pricing responds and the deployment is healthy, but there are entitlement mismatches and key lifecycle steps have not been verified.

## Executive summary

The current production build serves the four USD offers and has no observed Vercel runtime errors in the inspected 24-hour window. Pricing returned by the public API matches the active commercial catalogue in Supabase. The code deployed to production matches the repository baseline.

This audit found two material delivery gaps in code/data: Managed Website is sold with up to five core pages but maps to an entitlement capped at three pages in the live plan row; and the live plan table has no `profile` plan even though Personal Profile is sold. Follow-up code review found the related `businesses_plan_check` constraint also omitted `profile`, which means Personal Profile checkout could fail while inserting its pending business before Stripe session creation. The audit branch now has an explicit Personal Profile fallback and an idempotent migration to allow and provision the `profile` entitlement, plus the five-page limit. The migration has **not** been applied to production, so these database repairs are not live yet. Branch UI and E2E fixes also align the homepage headline and current four-offer USD purchase path with the public product.

The public funnel cannot yet be certified end to end. There are no current orders, subscriptions, proposals, bookings, projects, or customer approvals in the inspected tables. Stripe test checkout/webhook reconciliation, post-purchase onboarding, website publication, and inbound email/reply sync were not exercised. No test payment identity or Stripe/Resend account access was available. No production records, settings, domain records, or deployments were changed.

## Verified production snapshot

| Area | Observed state |
|---|---|
| Deployment | Vercel project `studio-real`, production target READY; deployed SHA equals repository HEAD above |
| Public pricing | `/api/public/pricing?market=INTL` returned HTTP 200 and four USD offers |
| Runtime errors | None observed in the available last-24-hour Vercel error window |
| Prospects / leads | 556 prospects; 2 current lead rows |
| Funnel activity | 1,784 tracking events; 33 analytics events |
| Revenue lifecycle | 0 orders, 0 `user_subscriptions`, 0 proposals, 0 call bookings |
| Fulfilment | 0 projects and 0 customer approvals |
| Sales tasks | 169 total: 152 open (107 overdue), 17 dismissed (12 overdue) |
| Webhooks | 44 Stripe event rows: 43 completed, 1 failed. The failed checkout-completed event is labelled “QA replay requested after Stripe activation fix deployment”; it has one attempt. No active order/subscription was found to reconcile it against. |
| Sales email | 222 message rows: 156 delivered, 15 bounced, 41 draft, 5 failed, 5 suppressed. No inbound message rows were present. |
| Outreach | 19 suppression rows; 0 outreach enrollments; 0 follow-up events; 0 delivery tasks |

Counts are a snapshot of accessible tables, not a claim that every historical customer or external provider event is represented in those tables.

### Funnel event reconciliation

The database contains 37 `platform_lead_submitted` event rows with 37 distinct IDs, of which only 2 IDs match current lead records. There are 41 `preview_lead_captured` rows with 22 distinct IDs and no matching current lead row. Event metadata and source code show that events are retained independently and may outlive the corresponding record. These counts do **not** establish that lead rows were deleted; internal previews, duplicate/stale events, or other causes remain possible. Do not recreate leads from anonymous analytics data. Reconcile only with authorized CRM/source records and retention policy.

## Offer and entitlement audit

The public catalogue returns these USD amounts. Setup cash and three-month minimum are calculated from those published amounts and exclude tax, fees, refunds, and delivery costs.

| Offer | Setup | Monthly | Minimum term | First invoice (setup + first month) | 3-month commitment |
|---|---:|---:|---:|---:|---:|
| Personal Profile | $99 | $29 | 3 months | $128 | $186 |
| Managed Website | $199 | $59 | 3 months | $258 | $376 |
| Website Growth | $299 | $99 | 3 months | $398 | $596 |
| Growth Partner | $499 | $199 | 3 months | $698 | $1,096 |

Checkout uses Stripe inline `price_data`; null static Stripe Price IDs are intentional and are not a defect. The public API reports dynamic checkout availability. Existing pricing, discounts, customer agreements, and subscriptions were not modified.

### Confirmed entitlement issues and branch repairs

1. **Managed Website page allowance:** the offer’s public delivery standard says “Up to 5 core pages.” The commercial product maps to the legacy `business` plan, whose live `project_limit` is 3. The app consumes this value as the page allowance. The branch aligns the static allowance and description to five pages and includes a targeted SQL migration setting the active `business` plan limit to five. **Production still needs the reviewed migration applied.** Existing customer contracts/records remain untouched.
2. **Personal Profile checkout is blocked by its missing entitlement:** `personal-profile` maps to entitlement slug `profile`, but the live `businesses_plan_check` allow-list excludes `profile`, so inserting the pending business can fail before the Stripe checkout session is created. The live `plans` table also lacks a `profile` row, which can leave the feature hook without the correct entitlements. The branch adds a static fallback plus a transactional, idempotent migration that allows `profile` and inserts the missing entitlement row only when absent. A dedicated regression test checks the allow-list, idempotent plan insertion, and five-page allowance. This migration has not been applied to production.
3. **Legacy plan catalog needs owner review:** live/static `business` plan metadata mixes old names and features with the current offer language; active feature grants are broader than the concise public offer. Avoid changing the wider entitlement matrix until product ownership confirms intended inclusions and any legacy customers affected.

## Security, reliability, and operations

- `npm audit --omit=dev --audit-level=moderate` initially found two high-severity dependency advisories: `follow-redirects` 1.16.0 and Vite 6.4.3. The branch lockfile now resolves to 1.16.1 and 6.4.5. The post-update audit reported zero vulnerabilities.
- Supabase security advisor reports leaked-password protection disabled. Enable it through a separately reviewed Auth configuration change.
- Advisor also reports RLS enabled without policies on `billing_worker_runs`, `commercial_otc_waivers`, and `stripe_webhook_events`. A read-only grant audit confirmed these tables grant privileges only to `service_role`, with no `anon` or `authenticated` table grants. The no-policy state is therefore deny-by-default for client roles and is not an exposure finding; keep service-only access.
- Advisor reports 36 foreign keys without indexes, 167 unused indexes, and multiple permissive-policy notices. These are backlog signals, not proof of exploitable access or a performance incident. Profile query workload and privileges before remediation.
- One Stripe webhook row is a failed QA replay. Its description suggests intentional QA context, but no order/subscription row was found to establish the outcome. Confirm the event in Stripe/test logs and reconcile idempotently; do not replay against production without evidence and authorization.
- Vercel domain configuration confirms `app.bennietay.com`; apex DNS is external. Vercel’s DNS record lookup returned 403, so authoritative apex records were not inspected. No DNS changes were made and no apex outage is asserted.

## Release readiness and unverified flows

| Capability | Status | Evidence / next verification |
|---|---|---|
| Public pricing | Verified | Live endpoint returned the four current USD offers |
| Price consistency | Verified | API values match live commercial catalogue |
| Stripe checkout creation | Partially verified | Source constructs dynamic price data; controlled test-mode payment was unavailable |
| Webhook → order/subscription activation | Unverified | No full test-mode checkout-to-database trace; one QA-labelled failed webhook row needs reconciliation |
| Profile and website entitlements | Defect found; branch fix prepared | Deploy only after branch review; apply the page-limit migration under normal change control |
| Onboarding → generated site → customer approval → publish | Unverified | No current orders, projects, or approvals to trace; no controlled test account available |
| Outbound email delivery | Partially observed | Historical DB statuses available; no provider-side event trace |
| Inbound replies / reply-to-CRM sync | Unverified | No inbound rows or controlled reply test; Resend account access unavailable |
| Lead follow-up automation | Needs operator triage | 107 open tasks overdue; 19 suppressions; no queued delivery tasks/enrollments |
| Production deploy | Current deployment healthy; release gate open | No new deployment made |

**Launch gate:** Keep new acquisition limited to flows already supported by the team until test mode proves: successful and declined checkout, duplicate webhook idempotency, correct plan activation, one profile and one five-page website onboarding, approval/publish state transitions, cancellation/refund behavior, and a controlled inbound email reply appearing once in the customer record. Then run the public smoke test against the candidate deployment. Do not use real charges or bulk customer messages for these checks.

## Revenue and 30-day operating plan

Revenue targets below are simple MRR arithmetic, not forecasts. They assume every account remains active at list monthly price and exclude churn, discounts, taxes, payment fees, delivery labor, and acquisition spend.

| Plan | Accounts for $1k MRR | Accounts for $3k MRR | Accounts for $10k MRR |
|---|---:|---:|---:|
| Personal Profile ($29/mo) | 35 | 104 | 345 |
| Managed Website ($59/mo) | 17 | 51 | 170 |
| Website Growth ($99/mo) | 11 | 31 | 102 |
| Growth Partner ($199/mo) | 6 | 16 | 51 |

Do not treat “checkout started” or anonymous preview events as paying demand. Establish actual conversion and delivery costs before projecting profitability.

**Days 1–7 — close the release gaps:** review branch; validate the Profile fallback and five-page limit in staging; apply the targeted plan-row migration only through the normal approved release; complete Stripe test-mode lifecycle and webhook reconciliation; confirm provider email event and inbound-reply behavior. Keep automatic follow-up paused for overdue items until suppression and consent checks are reviewed.

**Days 8–14 — recover the known pipeline safely:** manually triage the 107 overdue open sales tasks, starting with consent/suppression and prior-contact status. Reconcile the two current leads against source records. Do not bulk-email the 556 prospect rows or reconstruct deleted leads from analytics. Record qualification, next step, owner, and disposition.

**Days 15–21 — validate delivery capacity:** run a small, controlled set of test projects through content review, customer approval, launch checks, publishing, support handoff, and update tracking. Measure setup hours, monthly service hours, hosting/software cost, revisions, and time to first enquiry. Freeze offer copy only after the page and update allowances match fulfilment practice.

**Days 22–30 — run a measured acquisition test:** use one audience and one offer at a time. Track qualified prospects → booked calls → proposals → paid checkouts → launched projects → retained accounts, with source attribution and consent. Review weekly; stop or revise if fulfilment time or support load breaches the cost ceiling set by measured delivery data.

**Weekly operating measures:** qualified leads, contactable leads after suppression check, response rate, booked-call rate, proposal rate, paid conversion, setup hours/account, days-to-launch, first-value time, monthly service hours/account, gross margin after delivery labor and provider fees, churn/cancellations, refunds, overdue tasks, and customer approval/publish delays. Set numeric targets only after the first clean baseline; none are invented here.

## Branch changes and validation

Branch `audit/bennie-studio-system-2026-10-21` contains:

- dependency lockfile security updates (`follow-redirects` 1.16.1; Vite 6.4.5);
- Managed Website static page allowance aligned to five pages;
- Personal Profile static entitlement fallback when the legacy live plan list omits `profile`;
- transactional migration to allow the `profile` business plan slug and provision its entitlement row idempotently;
- regression tests for both entitlement fixes;
- updated stale tests to match the current USD-only new-sale catalogue and fail-closed launch crawler;
- a targeted migration for the `business.project_limit` value, not applied to production.

No production deployment, DNS change, customer email, payment, deletion, or production database mutation was performed. Stripe/Resend lifecycle verification and any migration application remain release tasks.

### Validation results for the audit branch

- `npm run lint` — passed (`tsc --noEmit`).
- `npm run build` — passed. Lazy-loading the Super Admin dashboard modules reduced its chunk from 531.09 kB to 143.46 kB and removed the >500 kB warning. The Node API bundle also completed.
- `npm test` — 304 passed, 0 failed. The API boundary test binds `127.0.0.1`; the initial sandboxed attempt was blocked by `EPERM`, then the full suite passed with the required local-port permission.
- `npm audit --omit=dev --audit-level=moderate` — 0 vulnerabilities after the lockfile updates.
- `npx playwright test --project=chromium-desktop` — 82 passed, 0 failed across desktop, tablet, and mobile; this includes the updated pricing, checkout, and public-site QA flows.
- Focused homepage and Stripe-handoff checks — 2 passed, 0 failed.
- `git diff --check` — passed.

These checks validate the local branch. They do not substitute for the unavailable Stripe/Resend test-mode lifecycle and do not certify a production deployment.
