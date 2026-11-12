# Unified Funnel Release — Deployment and Manual Supabase Test Handoff

The original Sales Funnel Engine remains the production implementation until a deliberate activation. This release **does not** apply the Supabase migration, create live Stripe charges, or switch existing customer entitlements.

## Release switches (default OFF)

- Backend: `UNIFIED_FUNNEL_TIERS_ENABLED=true`, required only **after** migration + billing tests are complete.
- Frontend build: `VITE_UNIFIED_FUNNEL_TIERS_ENABLED=true`, required only **after** migration + backend activation.
- Both switches are **absent/false by default**. Do not set either while the migration is unverified.
- New paid orders are **also** locked behind `public.settings['funnel_tiers'].content.enabled=false`, and need deliberate Super Admin enablement after validation.

With switches OFF, legacy advanced funnel routes, public funnels, existing Stripe checkout, and workflow automation continue without querying the new `funnel_entitlements` or `funnel_trigger_jobs` tables. The new plans page and Admin tier controls are concealed. Historical Simple Funnel subscriptions remain in the original tables.

## Database handoff (manual; NOT performed by this release)

The additive migration is `supabase/migrations/20261112200000_unified_funnel_entitlements.sql`. Test it **against an isolated database first**, then take a backup/snapshot prior to production application. Do not replace old migrations. Note that repository production-migration workflow requires an explicit `APPLY_PRODUCTION_MIGRATIONS` input.

Acceptance checks:

1. Migration succeeds; new `funnel_entitlements` and `funnel_trigger_jobs` tables exist, with RLS and service-role-only access.
2. `public.publish_funnel_safely` exists, is callable by entitled authenticated users and atomically publishes funnels/steps. Check unauthorized callers cannot publish.
3. Existing advanced customer still creates, edits and publishes after migration. Historical paid/included Simple Funnel can still complete managed fulfilment; its old Stripe subscription remains untouched.
4. Free grant permits one funnel of two steps; third step, second active funnel and checkout/workflows are denied by PostgreSQL even when a browser sends direct writes.
5. Paid customer allows three funnels, ten steps, advanced modules. Simultaneous requests cannot bypass quotas.
6. Expired/cancelled parent website subscription does not serve a public funnel. Suspended paid funnel add-on does not serve visitors.
7. Stripe test-mode checkout at $19 USD/month with $0 setup; verify successful subscription, webhook retries/idempotency, renewal, failed payment, cancellation at term end, and downgrade to managed free. **Do not use live card charges as tests.**
8. Automation queue retries only safe idempotent actions; no duplicate email, no cross-tenant data, and cron has adequate execution time.
9. Confirm admin and customer plan pages, real authenticated publish/unpublish, responsive mobile layout, public lead form, CRM attribution, UTM source and A/B analytics.
10. After staging checks, apply migration deliberately, enable backend switch, verify, deploy frontend with build switch, and **last** open the paid order gate in Super Admin.

## Verification / rollback

- Vercel preview builds are not production releases. Source of truth is the exact commit identified in the preview deployment metadata.
- Required checks: TypeScript, Vite+server bundle, all unit tests, npm high-severity audit, Chromium desktop/mobile E2E, read-only smoke. Do not assume GitHub failed/unknown checks are green.
- Backout **without dropping database tables or cancelling subscriptions**: disable new orders, set switches false, redeploy previous production revision. Keep all historical Stripe and funnel rows.
- No payment migration automatically reassigns existing Simple Funnel customer contracts to the new $19 tier.

## Known scope restrictions

Paid customer subscription and advanced checkout cannot be validated without Stripe sandbox access. This handoff is not a substitute for executing the database and paid-billing tests.
