# Unified Sales Funnel Engine — release handoff (12 November 2026)

## Scope

Implement the existing engine as the single funnel product. Free ($0/month, manually granted) and Paid (US$19/month, zero one-time charge). Retain the historic Simple Funnel data and subscription records. New plan limits are enforced by database triggers; new Stripe access is server and webhook authoritative.

## Release state

- Branch: `feature/unified-funnel-tiers-20261112`, GitHub PR #102 is **ready for review**, not yet merged.
- Latest CI-equivalent isolated preview at commit `ca4145d6c4be133ca7e2a13ffed95a4329d8b084`: clean `npm ci` passed, TypeScript passed, client/server built, **422 of 422 unit tests passed**, `npm audit --audit-level=high` returned **0 vulnerabilities**. Final preview deployment should be verified READY before promotion.
- Simulated billing tests: checkout activation, failure, recovery, cancellation, stale/unrelated event delegation and pre-migration legacy access passed.
- Live Stripe test-mode checkout/webhook replay: **not executed** because connected Stripe account exposes live mode only.
- GitHub CI verify: **failed** and logs inaccessible through connection; browser E2E has not passed. Do not mark release green.
- Attempted Vercel build-time Chromium E2E: Chromium failed with missing `libnspr4.so`; Playwright dependency installation cannot proceed in this build image because `apt-get` is absent. This is a runner/environment failure, not evidence that the UI tests passed or failed. Use GitHub Ubuntu runners with `npx playwright install --with-deps chromium`.
- Supabase migration: **not applied or tested**. User will test separately; no live database DDL was executed.

## Configuration

**Keep both flags off until migration + staging tests are complete:**

- `UNIFIED_FUNNEL_TIERS_ENABLED` (server)
- `VITE_UNIFIED_FUNNEL_TIERS_ENABLED` (client build; requires rebuild when changed)

The flags are off by default and keep the existing website/funnel paths operational before the new tables exist. New $19 paid checkout is independently disabled by the `funnel_tiers.enabled` setting even after rollout flags turn on.

## Database validation (user-owned)

1. Make a backup and use staging / a cloned database. Review and apply `supabase/migrations/20261112200000_unified_funnel_entitlements.sql` there only.
2. Check `public.funnel_entitlements` and `public.funnel_trigger_jobs` exist with RLS enabled and no anonymous/authenticated direct access; `public.publish_funnel_safely(uuid,boolean)` is defined; the expected triggers on funnel content exist.
3. Test admin grant and override, free 1-funnel/2-step rule, paid 3-funnel/10-step rule, archived/reactivation paths, concurrent insert limits, and paid-only offer/workflow/variant controls.
4. Test existing legacy advanced funnels and historical `simple-two-page` funnels still render and process leads without data loss. Confirm non-entitled tenants cannot access other tenants’ data.
5. Test atomic publishing, rollback on incomplete graph, public status updates and unpublish when parent subscription expires.
6. Check the queue and workflow idempotence under concurrent cron and interrupted deliveries. Never replay a potentially sent email without checking workflow records.

## Stripe validation (must use test mode)

1. Connect a test-mode Stripe account/secret and webhook endpoint to staging only. Do not test with live cards.
2. Verify checkout session creation at **US$19/month, US$0 setup**; a returned Checkout URL alone must not grant access.
3. Verify signature-validated `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, out-of-order/duplicate events, cancellation at period end, and restoration after invoice paid only when the underlying website account is active.
4. Confirm other Stripe subscriptions and historical Simple Funnel add-on records cannot be consumed by unified funnels’ webhook handler.

## App/browser validation

1. Re-run `npm ci && npm run lint && npm run build && node --import tsx --test tests/*.test.ts && npm audit --audit-level=high`.
2. On Ubuntu GitHub Actions runner, `npx playwright install --with-deps chromium` then `npm run e2e -- --project=chromium-desktop --project=mobile-chromium`.
3. Validate unauthenticated access, Super Admin configuration, managed-only free accounts, self-managed paid accounts, lead capture, public checkout status, the public route, smartphone navigation and negative-permission cases.
4. Ensure GitHub CI verify and browser-e2e both pass. Inspect unavailable GitHub logs from the repository Actions UI, or upload CI failure diagnostics as artifacts (workflow already configured).

## Additional execution notes (2026-11-12)

- The user explicitly deferred Supabase environment testing and will handle it separately. No test branch was created and no production DDL was applied.
- A second, isolated Vercel sandbox was used to attempt Chromium browser QA. The sandbox's Ubuntu 26.04 image was rejected by the Playwright Chromium installer; the protected preview was not made public. A short-lived preview-only bypass was revoked after the attempt.
- GitHub's required `verify` and browser E2E jobs still report failure; GitHub job log downloads returned `BlobNotFound`, so the error cannot be responsibly attributed to a source defect or runner environment without direct Actions UI access.
- The new Sales Funnel plans remain disabled through server and client flags. A successful build is not an authenticated production acceptance or a live Stripe test.
- PR #102 is ready for user review; do **not** interpret this as approval to enable billing.

## Release order

1. Apply the reviewed migration after separate validation.
2. Run staging application and Stripe tests.
3. Clear GitHub CI and browser E2E; ensure final-commit preview is green.
4. Merge PR #102, release to production with both flags **off**, and perform production smoke of existing customer routes.
5. Only then enable backend and frontend feature flags, redeploy client, and enable `funnel_tiers.enabled` paid sales with Super Admin after a successful production configuration check. Roll back flags first for a failed rollout.

**Current recommendation: do not promote or enable the new funnel product before these gates pass.** This document records what remains outside the unit-test scope and is the handoff for user-owned database validation.
