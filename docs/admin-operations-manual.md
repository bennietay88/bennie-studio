# Owner operating handbook

## Before opening for sales

Open Pricing in a signed-out browser. Confirm each active product shows verified USD setup and recurring amounts. If the unavailable-prices alert appears, keep payment links on hold and use an approved enquiry channel. On November 28 the deployed API returned HTTP 500 and the alert was visible. An engineer must restore the API and verify the production deployment before the owner accepts this handover.

The routes below come from the current admin router. Persistent operations still need a complete rehearsal with isolated accounts.

| When | Open | Action and evidence to retain |
|---|---|---|
| Each morning | `/admin/sales_home`, then `/admin/inbound_leads` | Review Commercial execution and saved enquiries. Open the lead record, check source and recipient, assign the next action, and reload the record. Anonymous events measure activity only. |
| Daily follow-up | `/admin/prospect_explorer`, `/admin/outreach_lab`, `/admin/overdue_followups` | Qualify the prospect, inspect replies, consent, suppression and outstanding tasks. Dismiss invalid tasks with the reason. Mark performed tasks complete. Review the lead stage independently. |
| Quotation | `/admin/proposals_deals` | Start with a saved lead and verified recipient, select the current product, check scope, setup fee, monthly amount, currency and expiry. Review the draft, mark it sent and use the approved channel to share the customer link. The customer confirms the same email and accepts the terms. |
| Payment | `/admin/proposals_deals`, then `/admin/finance` | Prepare checkout after acceptance and return the same proposal link to the recipient. For changed terms or expired quotes, obtain fresh acceptance. For a legacy link or ambiguous status, match the Stripe session and actual collected payment before provisioning. Preserve the acceptance timestamp. |
| Onboarding | `/admin/client_onboarding`, `/admin/businesses`, `/admin/users` | Verify the paying entity and service entitlement. Link the customer, assign onboarding, confirm invitations and access with the recipient, then record content and domain prerequisites. Use an isolated tenant for rehearsals. |
| Delivery | `/admin/projects`, `/admin/website_operations`, `/admin/update_requests` | Confirm business and website before editing. Record scope, assignee, review evidence and costs. Obtain customer approval, preview the exact site, confirm domain and publish. Reopen the published site and check its enquiry path. |
| Website content | `/admin/platform_site_cms`, `/admin/studio_showcases`, `/admin/blog`, `/admin/policies` | Select the intended platform page or asset, review the draft, publish through the module and verify the public URL signed out. Use approved claims and permissioned portfolio material. |
| Weekly | `/admin/plans`, `/admin/affiliates`, `/admin/support` | Review product availability and entitlements against approved commercial records. Review applications, eligible paid referrals, adjustments and customer issues. Escalate discrepancies before payout or a price change. |
| Monthly | `/admin/finance`, `/admin/revenue_command`, `/admin/projects` | Match paid invoices to Stripe collections, fees, refunds and subscriptions by currency. Record actual expenses and delivery labour. Review retention, cancellations and unresolved payments. Report unavailable CAC or margin wherever inputs are missing. |
| Incident | `/admin/status`, `/admin/operations_control` | Record affected route, time, tenant scope and sanitized request ID. Verify through a second read. For a failed checkout or ambiguous write, reconcile existing records before retrying. Escalate runtime failures to the Vercel operator and database incidents to the Supabase operator. |

## Pilot services

Use Sales Home → Commercial execution → Owner-only commercial pilot release controls. Conversion Sprint requires a scoped one-time quote. Website Care requires a compatibility assessment, recurring support and cancellation terms. Agency delivery requires individual scope. The owner separately approves the service release and each exact quote. During this audit all three remain gated. A pause blocks new approvals and payment access. Inspect already-issued open Stripe sessions and active subscriptions separately. Capture evidence of access, delivery, QA, customer handover and the service's final state.

## Provider responsibilities

The owner reviews bank settlements in the payment provider and banking dashboards. Infrastructure operators handle domain ownership, provider credentials, recovery and deploys. A saved toast, successful route load or customer return to a success page is insufficient evidence of a charge, publish or entitlement change. Reopen the relevant record and reconcile the external outcome.
