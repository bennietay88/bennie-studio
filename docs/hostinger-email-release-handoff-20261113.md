# Hostinger SMTP integration — release handoff (2026-11-13)

## Scope
- Super Admin > Settings allows selecting Resend or Hostinger SMTP for **customer onboarding** and **manual permissioned prospect email**.
- SMTP credentials remain solely in the Vercel server environment: `HOSTINGER_SMTP_USER`, `HOSTINGER_SMTP_PASSWORD`, `HOSTINGER_SMTP_PORT=465`, `HOSTINGER_FROM_EMAIL`. Never add them to the public frontend or the `settings` table.
- A shared database RPC reserves one sending slot per mailbox in a rolling 24-hour window, before SMTP. It conservatively keeps reservations even after uncertain failures.
- Resend provider quota responses now surface as HTTP 429, and the manual bulk follow-up UI halts on 429/503 instead of continuing the whole batch.
- Hostinger sales sends require documented recipient consent. No automatic provider rotation or quota circumvention.
- The legacy Resend integrations for other transactional message categories remain unchanged; do not assume every email route has been migrated.

## Required deployment order
1. Run migration `20261113090000_hostinger_smtp_quota.sql` in isolated staging first. Confirm RPC service role is required; anonymous users cannot claim or read quota records.
2. Set Hostinger credentials in the correct Vercel **server-side** environment only. Use the actual Hostinger mailbox address, and a private mailbox password. Do not put passwords into `settings` JSON or commits.
3. Deploy preview branch with dedicated staging Supabase, use disposable test mailboxes and an allowlisted test recipient.
4. Run `npm ci && npm run lint && npm run build && npm test && npm audit --audit-level=high` and the authenticated Stripe/customer journey. Validate SMTP on ports 465/587 from actual deployment runtime with one authorized test email, then compare mail logs.
5. In Super Admin, choose Hostinger only for approved message categories and save settings. Confirm disabled/unconfigured and quota-depleted scenarios fail closed.
6. Reconcile the 25 previously failed Resend follow-ups in provider logs before any manual retry. Never automatically requeue uncertain sends.
7. Verify production Vercel project Git integration now points at `bennietay/bennietay-studio` rather than the old mirror; inspect branch/commit/environment before any promotion.

## Remaining production GO gates
**NO-GO until independently verified:** migration baseline/replay and rollback, cross-tenant/auth isolation, Stripe sandbox checkout/webhooks, customer onboarding E2E, security and secrets scan, performance baselines, email-provider acceptance and reply handling, DNS/SPF/DKIM/DMARC, GitHub Actions execution, and runtime error scan. This PR does not claim these have passed.

This branch does not migrate existing contact data, change production credentials, deploy to production, or initiate unsolicited outreach. No live email was sent by this work.

## 2026-11-13 additional release qualification

- GitHub CI verified the initial provider branch: dependency install, TypeScript, production build, full unit suite and dependency audit passed.
- Browser E2E of commit `dc33d4a` passed 198 tests, skipped 4, and failed 2 corresponding desktop/mobile payment initiation flows. Playwright trace identified the cookie-preferences banner (`z-[120]`) intercepting the order-summary checkout button (`z-50`). The order-summary modal now uses `z-[130]` to remain above the cookie banner. **Re-run E2E on the corrected commit before GO**.
- Added admin-only SMTP TLS/authentication verification endpoint and Super Admin test button; it sends **no email** and does not attest message delivery.
- Vercel project Git link was confirmed migrated to `bennietay/bennietay-studio`. Last production deployment still reflects prior `bennietayhh` commit. Do not confuse Git connection with production rollout.
- Production environment has no `HOSTINGER_SMTP_USER` or `HOSTINGER_SMTP_PASSWORD` defined. The quota migration is not applied. No SMTP acceptance test performed.
- The production Supabase project has no staging branch. Avoid running untested migrations on the live database. Run isolated migration/replay, validate cross-tenant access and database advisors before release.
- Supabase security advisor flags signed-in execution of 9 security-definer functions, and leaked-password protection disabled. Review business authorization checks for each function and enable authentication hardening; do not blanket revoke customer RPCs that the app requires.
- Release candidate PR #1 remains independent, with authentication/tenant, tax-approved checkout, migration replay, performance and recovery evidence still required.
