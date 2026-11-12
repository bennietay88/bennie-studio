# Unified Sales Funnel Engine — Free and Paid Access

Decision: retire the Simple Sales Funnel add-on as a separate product. Keep one Sales Funnel Engine, one route (`/dashboard/funnels`), one Super Admin management area, and one set of funnel, step, submission, analytics and automation tables.

## Proposed offer (must not be published as live pricing until entitlement and billing tests pass)

| Capability | Complimentary / Free | Paid |
| --- | --- | --- |
| Monthly charge | USD $0, granted by Super Admin or included in eligible plan | USD $19 / month |
| One-time setup | USD $0 | USD $0 |
| Active funnels | 1 | 3 |
| Steps per funnel | 2: landing + thank-you | Up to 10 |
| Lead capture and CRM | Included | Included |
| Conversion reporting | Basic | Advanced |
| Checkout, upsells, A/B testing, workflows | Not included | Available only when independently release-gated and tested |
| Editing | Managed by Bennie Studio | Managed by default; collaborative/self-managed only if granted |

The values above are proposed defaults and must be centrally configurable through Super Admin; not hard-coded into the browser. Explicit business overrides take precedence over plan defaults. Never silently downgrade or delete an existing custom customer's funnels.

## Technical completion checklist

1. Implement a single server-authoritative funnel entitlement with tier `free` or `paid`, per-business overrides and effective limits; no browser-editable prices or permissions.
2. Enforce the limits in database RLS/triggers and all server-side create, clone, publish, AI-generation, editor, webhook and public submission/checkout paths. Avoid client-only checks and concurrent creation bypasses.
3. Reuse the existing `sales_funnels` capability and `sales_funnels_access_mode`, but separate activation of a free entitlement from advanced builder permission.
4. Expose Super Admin grant/revoke, free/paid switches, price, limits, billing status, funnel usage and auditing. Existing custom funnel customers retain their current permissions until explicitly migrated.
5. Add $19/month Stripe subscriptions without one-time fees, verify payment before paid capabilities, protect main website subscription, implement payment failure/cancel and plan downgrade handling.
6. Retire simple add-on checkout and dashboard routes for new orders, but retain webhook reconciliation and historical `simple_funnel_addons` records until verified no active Stripe subscriptions or production customers require them. Migrate existing simple-two-page funnels to the unified entitlement without deleting them.
7. Keep a public funnel available only when published, its owner is active and the relevant entitlement is valid. Do not remove existing `simpleFunnelMayServe` safeguards until equivalent checks exist for unified funnels.
8. Tests: free cap, paid cap, no-OTC checkout, admin grants, tenant isolation, staff roles, direct Supabase writes, concurrent writes, failed payments, cancellation, webhooks and migration.
9. Keep new public sales disabled until end-to-end verification and reviewed production release.

## Current branch scope and release status — 12 November 2026

This branch now implements the unified entitlement ledger, database-side quota guards, Stripe monthly checkout without OTC, complimentary grants, Super Admin controls, single customer funnel route, transactional public guards, workflow trigger queue, A/B analysis, strengthened public forms and conversion-page sections.

The SQL migration is committed but has **not** been applied. New paid sales remain disabled by default. The separate Simple Funnel new-order route is retired, while existing billing, webhook and history compatibility are preserved.

**Preview evidence:** A Vercel preview executed TypeScript checking, passed 17 funnel tests and completed Vite client building at commit `0dd374a5`. Later commits require repeat verification. The isolated Supabase QA branch could not be created because the provider requires a separate cost confirmation. No production SQL migration, live billing enablement or customer-data changes have been performed.

**Must pass before merge/release:** database migration and security checks, test-mode Stripe subscription/webhook end-to-end, free/paid lifecycle/downgrade, published funnel access and data isolation, workflow retries and no duplicate customer communications, mobile and authenticated browser E2E, final CI green and rollback drill. No release claim before those checks complete.

The product direction is inspired by ClickFunnels' integrated workflows and analytics, but is not a claim of full ClickFunnels feature parity. Advanced checkout and CRM integrations should remain controlled where unverified.


## Deployment runbook — staged rollout with external database QA

The user has elected to test the Supabase migration separately. Do **not** run this migration automatically or assume that a successful application build proves its safety.

### Stage 1 — deploy compatible code without activating new billing

Both switches default to disabled unless explicitly set to the literal string `true`:
- API runtime `UNIFIED_FUNNEL_TIERS_ENABLED` (server-side, never browser-exposed)
- Vite build-time `VITE_UNIFIED_FUNNEL_TIERS_ENABLED` (browser UI)

Keep **both disabled** until SQL, permissions, parent-plan state, and test-mode Stripe subscription webhook flows are validated. In disabled mode, existing published advanced funnels, their public submissions and payment pages use legacy access semantics; existing customer builder publishes through the pre-migration write path. The new paid plan and Super Admin tier screens are hidden. Retired duplicate Simple Funnel *new-order* route remains closed but historical Simple Funnel records and webhook handlers are retained.

### Stage 2 — separate user database acceptance

Review and apply `supabase/migrations/20261112200000_unified_funnel_entitlements.sql` via the authorized migration path, **not** by enabling the UI first. Verify SQL function compilation, table grants, managed/customer RLS, live and archived funnels, legacy Simple Funnel fulfilment, backdated payment states, and concurrent quota creation. Ensure `settings.funnel_tiers.enabled` stays false.

### Stage 3 — verified billing and activation

Use **Stripe test mode** (not a live charge) for recurring checkout, verified successful payment, failed payment, cancellation at period end, retries, duplicate webhooks, and parent website cancellation. Keep UI and API switches coordinated, then enable the paid ordering switch only after the tests pass. Do not assume a checkout redirect confirms payment.

### Release acceptance

Typecheck, frontend/server bundle, complete unit suite, dependency audit, GitHub verify + desktop/mobile browser E2E, preview health/security smoke, and production smoke must pass on the exact release commit. Maintain an identified rollback deployment. Do not claim database tests were run if the user has deferred them.
