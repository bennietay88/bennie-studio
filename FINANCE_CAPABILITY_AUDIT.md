# Bennie Studio finance capability audit

Audit date: 2026-09-16. Source of truth: repository and production Supabase schema.

| Capability | Status | Evidence / gap |
|---|---|---|
| Stripe checkout and subscriptions | COMPLETE | Stripe Checkout and `user_subscriptions` are already used by the production webhook. |
| Stripe webhook idempotency | COMPLETE | `stripe_webhook_events` claims and records event processing. |
| Revenue and MRR views | PARTIAL | Existing Revenue Command and `revenue_by_business` support operational MRR, but not a normalized accounting ledger. |
| Affiliate payouts | FOUNDATION EXISTS | `affiliate_payouts` exists; no accountant-ready expense mapping. |
| Cost entries | FOUNDATION EXISTS | `account_cost_entries` stores simple period/category/amount entries only. |
| Canonical finance ledger | MISSING | No single transaction model with source references, reconciliation, document, tax, or FX state. |
| Multi-currency normalization | PARTIAL | Source currency exists in billing records; no configurable base-currency conversion layer. |
| Expense capture and receipts | MISSING | No production-safe expense/document workflow. |
| Reconciliation | MISSING | No transaction-to-payout/document reconciliation status. |
| Invoices / AR / AP | PARTIAL | Stripe invoices and billing lifecycle events exist; no unified invoice or vendor-bill views. |
| Finance needs-attention queue | PARTIAL | Operations queue surfaces billing issues, but not finance classification/receipt/FX exceptions. |
| Audit trail | FOUNDATION EXISTS | `admin_action_audit_logs` exists and should be reused for finance mutations. |
| Accountant export | MISSING | No period package/manifest export. |
| Accountant role | PARTIAL | Existing RBAC can support a read-only finance permission; no finance screen yet. |
| Tax monitoring | MISSING | Country/currency facts exist in operational records; no review-only tax exposure layer. |

## Launch conclusion

The operational billing system is usable, but it is not yet an accounting ledger. The first safe slice is to add a normalized, source-linked ledger and review states without changing existing Stripe or customer records. Tax decisions, bank feeds, OCR, and automated payments remain deliberately out of scope for the first slice.
