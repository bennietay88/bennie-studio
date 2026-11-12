# Simple Sales Funnel Add-on — Release & Operations

## Offer
- Available to signed-in business administrators with an active/trialing Bennie Studio subscription.
- One managed funnel per business, comprising a form-enabled landing page and a thank-you page.
- Customer preview: static, illustrative two-page concept without activation or payment.
- USD pricing defaults: profile/business setup $149, Growth setup $79, all paid plans monthly $19; the first Growth Partner funnel is included for $0 (plan slug `website_growth_partner`).
- One consolidated customer revision round; additional work requires a separate quotation.
- Scope excludes advertising, complex checkout, upsells, automations and additional managed pages.
- Prices are saved under Supabase `settings.id = simple_funnel_addon`, not accepted from the browser.

## Technical safety model
- Migration: `20261112062000_simple_funnel_addon.sql`. It must be applied before the API is deployed.
- All add-on persistence is service-role-only; the new table has RLS enabled, no anon/authenticated table access and a unique `business_id`.
- Customer routes require a valid Supabase token, active business-admin role, tenant access check and a valid parent subscription.
- Paid checkout creates its own Stripe subscription with setup charged on the first invoice. Main managed-website subscription ID is not replaced.
- Fulfilment is queued only after a signature-verified Stripe `checkout.session.completed` with `payment_status=paid`, while Growth Partner included requests queue without Stripe.
- Webhook dispatch isolates events by add-on metadata/subscription ID and never applies add-on payments to the base customer subscription.
- Main subscription cancellation also cancels the separately billed add-on subscription and unpublishes its funnel; public load, lead submission and checkout check both subscription states server-side.
- Super Admin can configure offer pricing and availability, provision one form-enabled landing step linked to one thank-you step, request approval, and activate only after customer approval and publication.
- The add-on starts with sales `enabled:false` and must remain disabled until test-mode Stripe checkout, webhook replay, subscription lifecycle, real-account authorization, CRM lead capture and public route checks pass.

## Release checklist
1. **Completed**: Reviewed and applied the SQL migration to linked Supabase; verified RLS enabled, no customer policies, no add-on rows, no existing funnel records changed, default sales OFF.
2. Restore CI to green: `npm ci`, `npm run lint`, `npm run build`, `node --import tsx --test tests/*.test.ts`, `npm run e2e -- --project=chromium-desktop --project=mobile-chromium`.
3. Run a controlled test Stripe checkout, ensure paid receipt gates fulfilment and webhook redelivery is idempotent.
4. Verify a Growth Partner included request, one-request-per-tenant enforcement, unrelated tenant 403, and admin-only 403 boundaries.
5. Publish an approved sample funnel, submit a real test lead, verify thank-you redirect and CRM record. Confirm the public URL cannot be used if billing expires or the add-on is paused.
6. Test add-on cancellation and parent subscription cancellation independently; verify no continued Stripe recurring charges after parent cancellation.
7. Deploy reviewed commit to production with sales still OFF, verify runtime logs, then deliberately enable `simple_funnel_addon.enabled` in Super Admin.

## Current release status
- Implemented in feature branch `feature/simple-funnel-addon-20261112` / PR #101.
- Vercel preview for an earlier feature commit built successfully; subsequent safeguards require revalidation.
- GitHub CI verify fails with no job steps/logs exposed by GitHub. A temporary isolated Vercel diagnostic build established the five new TypeScript errors; they were fixed and a subsequent typecheck passed. Continue full regression/browser verification before merging.
- Supabase production migration `20261111234014_simple_funnel_addon_20261112` has been applied and verified; sales flag remains `enabled:false`, and no existing customer/funnel data was touched.\n- Separate add-on permission is isolated: simple add-on purchases do **not** grant the advanced `sales_funnels` capability.\n- No new Stripe add-on checkout has been live-tested or activated.
