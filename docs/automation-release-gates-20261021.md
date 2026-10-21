# Release validation — automation hardening (2026-10-21)

This change is deliberately scoped. It does not certify the full commercial/customer lifecycle.

## Changes
- Escape all customer-supplied body text before interpolating it into the funnel automation HTML email. Line breaks are retained.
- Treat uncertain remote resource checks (HTTP 401/403/429) as an inconclusive launch gate, not a passing launch check. Operators must recheck or manually approve through a separate governed process.
- Preserve all existing customer records, Stripe prices and subscription behaviour.

## Production launch blockers still requiring evidence
1. Signed Stripe test checkout → webhook → business/project initialization, including replay and duplicate events.
2. Customer onboarding → generated website → approval → deployment and rollback simulation.
3. Live domain/SSL post-publish verification and alert delivery.
4. Scheduled abandonment/recovery, health and renewal runners with real provider credentials and suppression rules.
5. Real cost/human-minute instrumentation and report accuracy; do not present estimates as actual data.

## Acceptance gates
- Run `npm run lint`, `npm run build`, `npm test` in an environment with dependencies installed.
- Execute the isolated Stripe **test mode** checkout lifecycle and an authenticated website publish flow.
- Verify the single Vercel deployment finishes READY and smoke-test public pricing without creating a paid order.
- Do not declare full automation complete before the above checks pass.
