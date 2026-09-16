# Final Launch QA

Commit: `8b2beb6` (`Add crawlable global marketing fallbacks`)
Production deployment: `BSLQGVAQHAmxDPXcq7ZnPzVYkyve` (Ready; app.bennietay.com assigned)
Test date: 2026-09-16
Environment: local repository, Vercel preview, Chrome authenticated preview, Supabase/Stripe production integrations not mutated

## Executive Result

FAIL - DO NOT LAUNCH

The candidate builds cleanly and the public market-pricing routes were verified in production with anonymous HTTP fetches and Chrome. The final gate remains conditional only on the isolated Stripe TEST checkout/webhook journey and authenticated lifecycle execution.

## Test Summary

Total automated tests: 73 passed
Passed: lint, build, SEO (3), sales/commercial (42), billing (4), design (4), permissions (4), operating system (5), fulfilment (3), fixtures (1)
Failed: 0 application assertions
Blocked: Stripe TEST checkout/webhook E2E; full authenticated lifecycle E2E
Fixed during QA: removed static `public/pricing/index.html` and `public/generate-preview/index.html` so SSR market routes are authoritative

## Launch Blockers

| Severity | Component | Status | Required action |
| --- | --- | --- | --- |
| P1 | Stripe checkout/webhook | BLOCKED | Run isolated Stripe TEST checkout, signed webhook, duplicate/replay/invalid-signature cases, and verify entitlement/account creation in a permitted environment. |
| P1 | Authenticated payment lifecycle | BLOCKED | Run isolated Stripe TEST checkout and signed webhook lifecycle with a non-production test account. |

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

Verified after promotion: anonymous HTTP responses from `/`, `/pricing` and `/generate-preview` contain route-specific titles, descriptions, OG images and full marketing copy. Chrome production pricing rendered Singapore prices and explicit trial/billing/cancellation terms.

## Non-blocking Issues

- Supabase leaked-password protection and advisor indexing/permissive-policy warnings remain operational configuration work and are not changed by this QA pass.
- Full browser matrix (mobile/tablet/Safari) and authenticated customer lifecycle remain unverified without safe test credentials and permitted integration access.

## Changes Made

- Added crawlable public fallbacks for `/pricing` and `/generate-preview` so direct anonymous requests receive full marketing content while the app hydrates normally.
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
- [x] Production candidate promoted and SHA verified
- [ ] Stripe TEST checkout completed
- [ ] Signed webhook, replay, duplicate, and invalid-signature cases verified
- [ ] Authenticated customer lifecycle completed
- [x] Cross-tenant/API boundary regression suite completed in permitted runtime
- [ ] Production logs reviewed after Stripe test

## Final Decision

Do not launch yet. The remaining blockers are execution/verification blockers, not a newly observed application assertion failure. Complete the isolated Stripe TEST journey and permitted API-boundary/production verification, then rerun this gate before promotion.
