# Final Launch QA

Commit: `2018732` (`Route marketing pages through SSR`)
Production deployment: `99YL7iayw3A1bUyptATxrJLYjTMj` (older production deployment; candidate not promoted)
Test date: 2026-09-16
Environment: local repository, Vercel preview, Chrome authenticated preview, Supabase/Stripe production integrations not mutated

## Executive Result

FAIL - DO NOT LAUNCH

The candidate builds cleanly and the public market-pricing routes were verified in the authenticated Vercel preview. The final gate cannot pass because the real Stripe TEST checkout/webhook journey, production anonymous fetch, and the HTTP API-boundary test were not executable in this environment. No production promotion was performed.

## Test Summary

Total automated tests: 72 passed, 1 blocked by sandbox listener permission
Passed: lint, build, SEO (3), sales/commercial (42), billing (4), design (4), permissions (4), operating system (5), fulfilment (3), fixtures (1)
Failed: 0 application assertions
Blocked: `tests/sales-api-boundaries.test.ts` (`listen EPERM`); production DNS fetch; Stripe TEST checkout/webhook E2E; full authenticated lifecycle E2E
Fixed during QA: removed static `public/pricing/index.html` and `public/generate-preview/index.html` so SSR market routes are authoritative

## Launch Blockers

| Severity | Component | Status | Required action |
| --- | --- | --- | --- |
| P1 | Stripe checkout/webhook | BLOCKED | Run isolated Stripe TEST checkout, signed webhook, duplicate/replay/invalid-signature cases, and verify entitlement/account creation in a permitted environment. |
| P1 | Production candidate | BLOCKED | Promote `2018732` only after the above test and verify the production SHA. |
| P1 | API boundary E2E | BLOCKED | Re-run `tests/sales-api-boundaries.test.ts` where loopback listener binding is permitted. |

## Role/Permission Matrix

| Resource/action | Anonymous | Client | Business Admin | Staff | Platform Staff | Affiliate | Super Admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public marketing/preview | ALLOW (preview verified) | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| Own business/customer data | DENY | ALLOW (automated policy tests) | ALLOW (automated policy tests) | scoped | scoped | DENY | ALLOW |
| Cross-tenant data | DENY | DENY (policy tests) | DENY (policy tests) | DENY unless scoped | DENY unless scoped | DENY | ALLOW |
| Billing/platform configuration | DENY | DENY | DENY | DENY | permission-scoped | DENY | ALLOW |
| Outreach operations | DENY | DENY | DENY | permission-scoped | permission-scoped | DENY | ALLOW |

## Payment Test Result

Not verified end-to-end. The repository contains fail-closed checkout and idempotent webhook tests, but no permitted Stripe TEST transaction and signed webhook delivery was executed during this QA pass.

## Production Error Review

Not verified from shell because `app.bennietay.com` DNS resolution was unavailable. Vercel preview deployment `2018732` reached Ready and global market routes rendered correctly in Chrome.

## Non-blocking Issues

- Supabase leaked-password protection and advisor indexing/permissive-policy warnings remain operational configuration work and are not changed by this QA pass.
- Full browser matrix (mobile/tablet/Safari) and authenticated customer lifecycle remain unverified without safe test credentials and permitted integration access.

## Changes Made

- Deleted `public/pricing/index.html` and `public/generate-preview/index.html`; these static files were overriding the server-rendered marketing routes and forcing stale/default pricing.
- Preserved the existing SSR route, market query handoff, fail-closed checkout, and commercial catalogue logic.

## Tests Added

No new tests added in this pass; existing regression coverage was executed. The blocked API-boundary test should be rerun in CI or a permitted local runtime.

## Final Launch Checklist

- [x] Candidate commit identified
- [x] Candidate Vercel preview Ready
- [x] Typecheck/lint passed
- [x] Production build passed
- [x] SEO and commercial regression suites passed
- [x] Global SG/GB/USD pricing rendered in preview
- [ ] Production candidate promoted and SHA verified
- [ ] Stripe TEST checkout completed
- [ ] Signed webhook, replay, duplicate, and invalid-signature cases verified
- [ ] Authenticated customer lifecycle completed
- [ ] Cross-tenant/API boundary adversarial tests completed in permitted runtime
- [ ] Production logs reviewed after test

## Final Decision

Do not launch yet. The remaining blockers are execution/verification blockers, not a newly observed application assertion failure. Complete the isolated Stripe TEST journey and permitted API-boundary/production verification, then rerun this gate before promotion.
