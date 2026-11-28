# Admin-only operating handbook
Routine operations begin at /admin/sales_home. No coding is required for normal sales, approved offer configuration, lead recovery, service delivery, billing review or site content management.
## Daily
- Review saved enquiries, replies in outreach review and high-priority overdue tasks. Complete only performed tasks; dismiss only after record review.
- Review proposals. Create a lead-linked quote; mark Sent after internal review, copy customer proposal URL, share personally via an approved channel. Do not send marketing without permission.
- After customer acceptance, prepare checkout; share the same proposal URL. Verify paid status against Stripe evidence. For new website leads, assign the onboarding task and create/link the customer using existing admin provisioning, then confirm access manually. Do not count acceptance as revenue.
- In Service Projects, confirm scope, content, delivery and QA; for paid pilots use the proposal fulfilment stages.
## Weekly
- Run Commercial execution read-only audit; review checkout failures, expiries, mismatched prices, incomplete evidence and unresolved replies. Review partner applications and referral attribution. Review finance and billing issues.
- Record actual acquisition expenses in Finance. Reconcile net receipts, refunds, costs and project margin. Do not publish CAC until attributable paid customers and expense categories are reconciled.
## Monthly
- Review delivery scorecard, retention cohorts, contribution by currency, paid service periods and customer value. Review current offers in Plans & Pricing. Change only approved prices and terms.
## Pilot launch
- Pilot release settings default off. Validate test-mode payment, duplicate webhook, renewal/cancellation and refunds; approve exact service terms using the owner-only controls. Approve each quotation separately. No automatic activation or marketing.
- Pause new sales via the same controls. Review outstanding Stripe checkout sessions and cancel or manage existing subscriptions in Stripe as needed; this control does not cancel customer contracts.
## Freeze rule
- Freeze feature development once the final PR is merged, CI passes, deployed build is READY, and isolated payment acceptance tests are completed. Continue security fixes, dependency patches, incident response and external-provider maintenance. Routine operations use the admin panel; external provider account administration and bank reconciliation may still require the provider dashboard.
