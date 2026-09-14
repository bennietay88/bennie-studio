# OTC + MRC launch implementation matrix

This branch is the gated launch foundation for the productised managed website offer. Production is not deployed from this branch and existing customer/Stripe records remain untouched.

| Area | Existing system reused | Change on this branch | Verification |
| --- | --- | --- | --- |
| Commercial catalogue | `commercial_products`, `commercial_market_prices`, public pricing and checkout routes | Add gated recurring configuration fields and 12-month contract terms without changing the currently published one-time package rows; expose draft/live fields and release switches in Super Admin | Typecheck, pricing unit tests, migration review |
| Contracts | `user_subscriptions`, business subscription status, Stripe webhook mapping | Add nullable contract lifecycle fields, cancellation/renewal state, and indexes for operational queries | Migration lint/review; existing webhook compatibility |
| Feature flags | `settings` JSON configuration | Add typed server/client flag defaults for OTC/MRC, internal AI, and analytics v2; disabled by default | Unit tests |
| AI content | Existing provider router, credit deduction RPC, generation logs | Add structured internal-only content-engine contract and provenance fields; customer AI remains hidden | Typecheck and API boundary tests |
| Customer credits | Existing `ai_credit_balances` and credit RPCs | Add hidden ledger/top-up metadata while preserving existing balances | Migration review; no public UI change |
| Analytics | Existing event capture and aggregate routes | Add canonical event names and a privacy-safe attribution shape for the next analytics revision | Typecheck; route contract tests |
| Release safety | Existing Vite/esbuild build and tests | Add a release flag and explicit no-live-Stripe guard to the implementation notes | Build, lint, sales tests |

## Deliberate non-goals

- No production deployment.
- No live Stripe price creation, mutation, or replacement.
- No destructive rewrite of existing plans, subscriptions, businesses, leads, or credit balances.
- No customer-facing AI controls or AI-credit upsell UI.
- No new bespoke website architecture; template configuration remains the delivery model.

## Rollout sequence

1. Apply the additive database migration in a staging project.
2. Seed recurring prices as draft/configuration values and attach Stripe price IDs only after manual Stripe verification.
3. Enable `otc_mrc_catalogue` for internal preview, then run the authenticated checkout journey with a test customer.
4. Enable the public flag only after pricing, checkout, webhook, contract, and onboarding checks pass.
