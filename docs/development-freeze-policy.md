# Development freeze decision

**Decision on 28 November 2026: hold.** PR #43, main commit `c5bb89fd9f2c92e785dfbd02e0a2debff54c05eb`, was assigned to production. It failed the production access smoke. No known-good freeze baseline has been approved.

The existing architecture consists of a Vite/React application, an Express API served by Vercel, Supabase Auth and PostgreSQL, and Stripe Checkout and webhooks. Commercial configuration belongs in the admin catalogue and signed pilot controls. The commercial owner approves price, scope, commission and pilot changes. Sales owns qualification and quotes. Delivery owns approvals and fulfilment. Finance reconciles collections, fees, refunds and service costs by currency.

After the release checklist is signed, record the exact Git SHA, Vercel deployment ID, schema baseline, rollback deployment and the approving owner. Only then begin a feature freeze. Continue dependency and security patch reviews, provider maintenance and production incident response through reviewed changes with regression evidence. Test recovery against an isolated restore before recording recovery objectives as met.

Reopen development for a confirmed production incident, security exposure, provider incompatibility, billing correctness issue or a documented routine operation that the admin cannot perform. Record impact, affected versions, owner, verification and rollback before release. New product scope requires a separate commercial decision.
