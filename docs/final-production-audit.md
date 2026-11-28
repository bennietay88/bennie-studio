# Bennie Studio production audit • 28 November 2026

**Hold the development freeze.** The public site returned HTML, while the shared production API failed during module loading. Pricing showed an explicit unavailable-prices alert with checkout disabled. Four active international USD recurring price entries exist in the production database. Changing the prices would not repair the outage.

GitHub main and Vercel's production alias matched `c5bb89fd9f2c92e785dfbd02e0a2debff54c05eb`. Vercel reported READY for `dpl_5oXqBz1keMXpLNPkAriNGFFqRvpd` in Singapore. The release CI passed verification, all four browser shards and the PostgreSQL job, then failed production smoke. A fresh read of the health endpoint returned HTTP 500. The operator should keep sales activation on hold pending preview and post-promotion acceptance. [Release CI](https://github.com/bennietay88/bennie-studio/actions/runs/46100258123) · [Repair PR](https://github.com/bennietay88/bennie-studio/pull/44)

## Defect register

| ID | Severity | Module | Root cause | Candidate fix | Verification evidence | Production status |
|---|---|---|---|---|---|---|
| API-01 | Critical | Shared API | Emitted plans module imported commercialPricing without a file extension. Native Node ESM failed before registering handlers. | Use the emitted .js path. | Same ERR_MODULE_NOT_FOUND in Vercel stderr and the new unbundled native Node test before the fix. Test passes after fix. | Open until approved deployment |
| PAY-01 | High | Public order and account claim | No-payment-required Checkout Sessions qualified as paid in the webhook, status and claim paths. | Require a completed, paid Stripe session with positive integer minor units on all three paths. | Positive and zero-collection fixtures, cancellation/unpaid cases. | Branch only. Provider acceptance pending |
| PAY-02 | High | Direct proposals | Missing stored checkout session skipped reconciliation. The paid update also overwrote the original acceptance time. | Route unmatched legacy payments to finance review, require amount, currency, mode, session, signed terms and payer match before applying changes. Preserve acceptance fields. | Source review and proposal domain suite. Outstanding legacy receipts require manual reconciliation. | Branch only. Webhook integration open |
| SEO-01 | Medium | Acquisition | Static case-studies document was copied from Services. Thirteen article, comparison and subscription pages served the homepage canonical before hydration. | Correct case-studies metadata, emit route-specific pages from published content and add explicit static rewrites. | Production source scan found 14 mismatches. Candidate build passes the 46-location canonical test. | Branch only |

## Infrastructure and regression evidence

- All 46 same-origin sitemap entries returned HTTP 200. Each HTML response contained one H1. Robots and sitemap returned HTTP 200. These checks cover served documents. The pricing browser check separately observed a loading screen, hydrated plans and the checkout-disabled alert.
- The production Supabase project reported ACTIVE_HEALTHY. Read-only catalog queries returned 179 public tables with RLS enabled on all 179, and 632 public indexes. The multi-site draft and backup functions, delivery-work totals and paid-service-period tables exist. Exact production tenant permission behaviour still needs acceptance.
- Supabase reported 121 applied migration versions. The repository contains 130 migration files. Historical IDs differ. Some objects from unmatched versions already exist. Reconcile schema, definitions and migration history before applying any SQL.
- Advisory groups include 36 RLS-enabled tables without policies, one leaked-password-protection warning, 72 unindexed foreign keys, 168 unused-index findings and 400 overlapping permissive-policy findings. Health advisors returned no findings. These are triage counts; index removal or policy changes require query and permission evidence.
- Vercel reported production variable names for Supabase, Stripe, Resend and cron authentication. No decrypted values were requested. Three cron routes are configured for sales automation, billing cancellations and website audits. Successful execution, mailbox delivery, monitoring alerts and backup restoration remain open.
- The build, TypeScript, native ESM, unit/domain and auxiliary checks ran locally. The package audit reported zero known vulnerabilities at query time. GitHub runs the supported Node 26 runtime and disposable PostgreSQL 17. Local Chromium could not launch inside the macOS process sandbox, and local PostgreSQL could not allocate shared memory. The CI browser and SQL jobs are the acceptance evidence for those environments.
- The feature matrix indexes 110 distinct router patterns and 37 admin tab keys. These are navigation surfaces. End-to-end feature totals, per-control pass rates and full role coverage remain undetermined.

## Commercial verification

| Workstream | Evidence obtained | Required before acceptance |
|---|---|---|
| D1 Revenue leakage | Readiness code counts raw tracking events, saved leads/orders, unresolved messages and open tasks separately. Stripe scan is bounded. | Reconcile real attribution and overdue tasks to an authorized sample, including failures and expired sessions. |
| D2 Catalogue | Four active INTL USD recurring entries. Quote checkout compares accepted terms with current catalogue and waiver. Live pricing failed closed during the outage. | Verify public prices, quotes, invoices and entitlements for each product and approved waiver. |
| D3 Conversion | Publication and preview routes present. Production pricing prevented purchase. | Resume interrupted preview, recover lead, verify checkout or consultation and onboarding persistence in isolation. |
| D4 Recovery | Lead inbox, prospect explorer, outreach lab and overdue follow-ups have admin routes. Commercial browser fixtures exercise sales workflows. | Reopen saved records under sales permissions, confirm search/export, dismissal, suppression and consent. |
| D5 Direct sales | Signed quotations, checkout reconciliation and amount/mode tests inspected. PAY-01/02 fixed on branch. | Actual test provider lifecycle, concurrent requests, replay, failures, refunds and entitlement evidence. |
| D6 Conversion Sprint | Signed default-off controls and positive one-time quote validation. Production pilot settings row absent. | Isolated approved quote, test charge, QA and handover. |
| D7 Website Care | Recurring quote validation and active-subscription check before continuing fulfilment. Default-off state. | Verify compatibility, renewal, failure, cancellation, termination and handover. |
| D8 Industry solutions | Source maps contractor, clinic, professional services, automotive and multi-location paths to preview, example or consultation. | Prove selected industry and product persist on the CRM record. |
| D9 Partnerships | Partner application and affiliate management paths exist. Agency pilot gated. | Confirm attribution, eligible collected payment, reversal and payout eligibility with isolated records. |
| D10 Reporting | Report separates gross checkout by currency, handles incomplete scans, and identifies manual/test invoice limitations. | Reconcile bank/provider receipts, expenses, labour, refunds, renewals, CAC and margins. |

## Owner scenarios and operational sign-off

Managed website, Sprint and Care scenarios require a test Stripe workspace paired with a separate application database. Multi-location acceptance requires two controlled tenants, separate websites and a disposable domain or route. Agency acceptance needs a qualifying test payment and reversal. Daily sales and monthly review require authorized staff and finance fixtures with saved records. None of the seven scenarios has complete persisted evidence.

Owner-access and publication operations are still pending, including customer, staff, collaborator, affiliate, delivery and platform roles. Browser fixtures and SQL assertions provide narrower evidence than an operator completing these workflows. The handbook lists the actual routes to rehearse. The three named commercial pilots have an absent release row and fail-closed code. No customer records, live catalogue, payouts, marketing messages or production deployment were changed during this audit.

## Preview cold-start result

Vercel built the payment and import repair at 61192ba as preview deployment dpl_84YuNzt2xi9GvyBfj8PHa8qeh23k. An authenticated preview fetch reached the health handler. It returned structured HTTP 503 for missing preview Supabase configuration. This verifies the cold-start repair on Vercel and leaves database-backed preview acceptance open. The six handover documents and final metadata changes are consolidated in PR #44.
