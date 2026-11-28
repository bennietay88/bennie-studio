# Production acceptance checklist

- [x] Match GitHub main and the production alias to PR #43.
- [x] Reproduce the API failure from the release smoke and match it to a Vercel startup error.
- [x] Reproduce the import failure using native Node ESM and verify the regression test after repair.
- [x] Compare production source HTML to the sitemap and verify the candidate's generated canonical URLs.
- [ ] Record independent PR review, latest full CI, preview deployment ID, SHA and preview health.
- [ ] Confirm quote-to-payment, refunds, renewals, entitlement changes and webhook reconciliation with a test-mode Stripe account and an isolated application database.
- [ ] Complete persisted admin, tenant, delivery, affiliate and monthly-close scenarios. Review role boundaries and service ownership.
- [ ] Review historical migration differences by actual schema and function definitions. This PR requires no application schema migration. Do not bulk-apply unmatched history.
- [ ] Record a tested backup restore and a reachable rollback deployment. Confirm compatibility with current records and open payment sessions.
- [ ] Obtain explicit owner approval for the exact production promotion.
- [ ] After promotion, verify the production alias and SHA, health 200 with healthy dependencies, signed-out access boundaries, verified catalogue prices, and at least one non-mutating customer and admin journey.
- [ ] Record release decision and ongoing incident owner. Continue holding the freeze if a required item remains open.
