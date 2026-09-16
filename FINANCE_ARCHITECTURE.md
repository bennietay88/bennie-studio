# Finance architecture

`finance_transactions` is the canonical operational finance layer. It references existing records through `source_type` and `source_id`; it does not replace Stripe, subscriptions, orders, billing lifecycle events, or affiliate payouts.

Every record preserves its original transaction currency and optionally stores a configured base-currency amount. Missing or uncertain FX is represented by `FX_REVIEW_REQUIRED`, never fabricated.

Income is created server-side from trusted Stripe webhook data. Expenses are entered as `EXPENSE` transactions. Refunds, processor fees, affiliate payouts, transfers, owner contributions, and owner drawings use explicit transaction types so they cannot silently inflate revenue or operating expenses.

RLS limits direct Data API access to platform finance permission holders. Customer roles do not receive finance records. Future document, reconciliation, invoice, tax-review, and accountant-pack tables should reference `finance_transactions.id` and preserve immutable source facts plus audit entries.
