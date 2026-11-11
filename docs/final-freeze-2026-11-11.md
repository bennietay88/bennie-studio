# Bennie Studio — release hardening and feature-freeze gate (11 November 2026)

## Operating decision
The owner has confirmed that payment testing was completed and passed. Do **not** repeatedly retest or modify the Stripe payment flow absent new evidence of a defect. Freeze new feature development after the remaining release gates are verified, retaining only production bug, security and customer-delivery maintenance.

## Baseline and verified facts
- Repository: `bennietayhh/bennietay-studio`, base `32f3efbbfcd8ccf0620e8e18319b1f5096c75249`.
- Primary deployed Vercel project: `bennietay-studio` at `app.bennietay.com`.
- Vercel runtime reported Node 26.x, previously outside the declared `>=22 <25` engine range.
- New-business checkout uses the international USD catalogue. Static pricing fallback formerly described per-country currencies, creating a false promise.
- The production database contains the `profile` entitlement and a five-page `business` allowance, previously flagged as missing in an October audit.
- As inspected, the production database had no orders, subscriptions, projects, or customer approvals from which to independently verify a complete paid-customer operating journey.
- Browser E2E coverage exists with mocked customer/business data; independently run a disposable authenticated customer journey before final freeze.

## Changes in this candidate
1. Align declared Node engine support with Node 26 without changing the production runtime or dependencies.
2. Align crawlable/no-JavaScript pricing copy with the actual USD new-customer catalogue.
3. Add Super Admin ability to pause/resume new sales on the four managed-website offers, guarded by authenticated Super Admin API, validation and confirmation. Existing subscription records are not modified by this operation.
4. Surface failures while toggling promotions rather than silently refreshing.
5. Remove the legacy browser-driven ecosystem-wide database purge from the Super Admin UI. Scoped account deletion and approved retention procedures remain separate.
6. Add regression guards for these release changes.

## Verification and production hardening completed
- Owner confirmed the Stripe payment test passed; payment logic was not modified.
- The PR verified, built and passed unit/domain regression, dependency audit, desktop and mobile Chromium E2E tests at commit `2e0023343d97adff5a271286f60e6adcd75496fc`; the final commit must still pass its own checks.
- Production Vercel variables `VITE_ENABLE_TEST_ACCOUNT_BYPASS` and `ENABLE_TEST_ACCOUNT_BYPASS` were explicitly set to `false`; their saved values were independently re-read.
- A Super Admin product-availability toggle now records an admin audit event, and reports a failed audit insert rather than hiding it.
- Supabase production migration `20261111072208_freeze_rls_initplan_and_duplicate_index` was applied successfully. Three RLS auth.initplan warnings and one duplicate-index warning disappeared on the follow-up performance advisory. No customer records were deleted.
- The project connected to `app.bennietay.com` is Vercel `bennietay-studio`, configured with Node 26.

## Remaining environment-dependent controls
- Supabase Auth leaked-password protection remains disabled. The connected Supabase API does not expose an Auth settings write tool. Enable the toggle under Supabase Dashboard > Authentication > Security and verify the Auth security advisor clears.
- Authenticated live customer onboarding/approval/publishing acceptance was exercised via mocked browser E2E but cannot be certified against live customer identities without a controlled real-account fixture. Do not manufacture production customer subscriptions as a shortcut.
- Public endpoint rate limits currently fall back to per-instance memory when UPSTASH_REDIS_REST_URL/TOKEN are absent. For distributed limits, set up and connect a shared Redis service before any large public traffic scale. The existing conservative per-instance limits remain active.
- Large-scale RLS policy and unused-index advisor counts are advisory signals; do not bulk rewrite/drop these without workload analysis.

## Outstanding verification / outside this candidate
| Area | Acceptance condition | Notes |
| --- | --- | --- |
| Customer portal | Complete a disposable test-user onboarding, draft review, approval, publication, update request, billing and support journey | Do not use production customer data for destructive tests |
| System stability | Verify latest CI, preview smoke, mobile and authenticated role isolation; investigate failed checks | A deployment being READY is not proof of all business flows |
| Platform secrets | Audit production-only test and bypass environment flags and remove obsolete credentials through approved secret rotation | Do not print or publish secret values |
| Supabase Auth | Enable leaked-password protection using authenticated project settings and verify the advisor result | Not controlled through the existing Super Admin portal |
| Supabase RLS | Review nine privileged RPC advisories and test scoped role authorization | An intentional authenticated SECURITY DEFINER with an explicit authorization guard is not automatically exploitable |
| Performance | Measure mobile Core Web Vitals and key customer/admin API p95 latency with actual traffic; review high-frequency query plans | Do not blindly remove 168 “unused” indexes or change hundreds of permissive policies |
| Monthly reporting | Verify the release flag, draft generation, operator review and actual customer-visible publication before promising monthly reports | Never fabricate analytics or client results |
| Customer acquisition | Verify consent, verified observations, deduplication, suppressed contacts, 3/5/7-day follow-up stages and inbound reply stop rules | Preserve deliberate human approval for outbound messages |
| Legacy cleanup | Remove only proven unreferenced components or dangerous obsolete paths; keep historical migrations, billing and customer compatibility | See `docs/legacy-feature-inventory.md` |

## Feature freeze definition
- All P0 issues are closed or proven nonissues with recorded evidence.
- No new feature modules, UI redesign programmes, or speculative AI features.
- Super Admin can safely change routine public offers and operating settings without a code deployment; secrets and authentication security settings remain protected infrastructure controls.
- CI and smoke are green for the candidate SHA, and rollback information is documented.
- Afterwards focus on qualified prospect discovery, contactable verified email, consultation booking, conversion and measured fulfilment quality.
