# Bennie Studio automation capability audit

Audit date: 2026-09-16  
Source of truth: current repository, migrations, API routes, and production smoke checks. This is an implementation map, not a claim that every external provider has been configured.

| Capability | Existing implementation | Status | Missing pieces | Recommendation |
|---|---|---|---|---|
| Prospect discovery | `prospects` table, CSV import, admin prospecting UI | PARTIAL | No in-app discovery provider | Keep CSV/manual discovery for launch; add provider only when volume justifies it |
| Prospect enrichment | Prospect contact/website fields and import normalization | PARTIAL | Automated enrichment and verification | Add deterministic email/domain validation before outreach |
| Website/business analysis | Public website audit jobs and structured audit reports | COMPLETE | External crawler coverage varies by site | Keep evidence-based scores; never invent metrics |
| Lead scoring | Inbound automation snapshot and opportunity level | PARTIAL | Unified persisted score model | Persist score/reasons on prospect/lead and recalculate on material changes |
| Lead source attribution | UTM/referrer/source fields, tracking events | COMPLETE | Cross-device identity | Preserve first/last touch; do not overbuild identity matching |
| Personalized outreach | Sequence templates, AI-assisted draft generation, approval-first messages | PARTIAL | Stronger merge fields and bounce feedback | Add audited personalization fields; keep outbound approval-gated |
| Automated follow-up | `outreach_sequences`, steps, enrollments, cron/manual runner | COMPLETE | Provider delivery health dashboard | Add delivery/bounce metrics and retry visibility |
| Reply detection | Resend webhook endpoint and suppression handling | PARTIAL | Provider event mapping for all reply formats | Normalize inbound events and stop sequences on reply |
| Reply classification | Lead status updates and manual sales notes | FOUNDATION EXISTS | Structured intent classification | Add deterministic buckets first; AI suggestion must be reviewable |
| Sales pipeline | Lead stages, deal stage events, admin CRM | COMPLETE | Opportunity amount/forecast consistency | Keep lightweight; add required next action and close reason |
| Opportunity scoring | Opportunity level and automation temperature | PARTIAL | Explainable score and history | Store score factors and timestamp, not just a label |
| Preview generation | Public preview flow, job polling, preview CTA | COMPLETE | More template coverage | Expand styles through configuration, not new bespoke apps |
| Proposal generation | Proposal records, public proposal page, events | COMPLETE | Proposal templates/versioning | Add reusable scope blocks and expiry reminders |
| Proposal tracking | Viewed/accepted events and checkout URL persistence | COMPLETE | Email/open tracking quality | Keep event dedupe and expose last activity in CRM |
| Checkout | Stripe checkout session and proposal checkout endpoints | COMPLETE | Controlled full paid test journey | Run test-mode checkout before first live customer |
| Abandoned checkout follow-up | Checkout-started tracking exists | MISSING | Scheduled reminder and suppression rules | Build only after verified payment events; use one reminder initially |
| Payment processing | Stripe webhooks, idempotent claims, lifecycle handling | COMPLETE | Live alerting on failures | Add operator alert for repeated webhook failures |
| Subscription management | Customer portal, cancellation/contract term logic | COMPLETE | Dunning workflow visibility | Surface failed payment and recovery state in admin |
| Customer onboarding | Multi-step onboarding, billing gate, onboarding sessions | COMPLETE | Automated reminders and completeness SLA | Add reminder cadence and missing-field summary |
| Asset collection | Business/brand/service/content inputs and uploads | PARTIAL | Central asset checklist/versioning | Add required/optional checklist and secure upload status |
| Project creation | `projects` and operations layer | PARTIAL | Automatic project creation on payment | Trigger idempotently from paid webhook |
| Website generation | Template taxonomy, blueprints, generator, renderer | COMPLETE | Automated content QA gate | Enforce blueprint validation before preview/publish |
| Automated QA | Design/SEO QA utilities and launch checks | PARTIAL | Single persisted QA run across all checks | Add blocking checks for forms, mobile, metadata, and links |
| Internal review | Admin delivery/operations surfaces | FOUNDATION EXISTS | Explicit review transition and checklist | Use existing approval model; add review evidence |
| Customer review | `customer_approvals`, preview/revision flow | COMPLETE | Notification escalation | Add due date and reminder |
| Revision management | Update requests, statuses, monthly allowance | COMPLETE | Scope classification automation | Keep included/out-of-scope decision explicit |
| Approval | Draft/review/changes/approved/published concepts | COMPLETE | One canonical project status mapping | Map UI labels to existing persisted states |
| Deployment | Domain verification, Vercel/custom-domain endpoints | PARTIAL | Fully automated post-approval deploy | Add idempotent deploy job and rollback link |
| Domain connection | Custom domain resolve/verify/delete routes | COMPLETE | DNS instruction automation | Keep human DNS step with verification polling |
| Post-launch checks | Domain/website checks and error logs | PARTIAL | Automated launch checklist run | Schedule one post-publish validation |
| Website monitoring | Website error logs, system status, health checks | PARTIAL | Uptime/broken-link scheduler | Add low-frequency monitor with alert threshold |
| Maintenance | Monthly update requests, managed growth actions | COMPLETE | SLA timers and workload view | Add due-date aging and breach alert |
| Support automation | Support/update request routes and notifications | PARTIAL | Unified ticket model | Avoid duplicate ticket system; extend update requests |
| Customer health scoring | `customer_health_signals` migration and operations controls | FOUNDATION EXISTS | Computed health score and playbook | Add simple rules: payment, onboarding, activity, unresolved issues |
| Reporting | Traffic/MRR metrics, monthly growth reports | PARTIAL | Customer-facing period report automation | Show “not enough data” until real events exist |
| Renewal | Contract terms, renewal endpoints, lifecycle events | COMPLETE | Renewal reminders and owner queue | Schedule 30/14/3-day reminders |
| Upsell | Plans, commercial catalogue, upgrade paths | PARTIAL | Trigger criteria and proposal CTA | Use health/usage signals; keep human-approved |
| Testimonial request | `customer_testimonials`, review campaigns | FOUNDATION EXISTS | Eligibility trigger and consent workflow | Request only after verified launch/value milestone |
| Referral request | Affiliate tracking and referral codes | PARTIAL | Customer referral campaign UX | Add simple referral invite after success milestone |
| Affiliate management | Affiliate join/dashboard, payout requests | COMPLETE | Fraud/approval reporting | Keep payout approval-gated |
| Automation execution history | `async_jobs`, logs, audit events, sales tasks | COMPLETE | Cross-workflow operations view | Add one filtered execution view, not another engine |
| Retry/failure handling | Job retries, webhook idempotency, bounded attempts | COMPLETE | Dead-letter/operator alerts | Add alert when max attempts reached |
| Human approval gates | Approval-first sales messages and customer approvals | PARTIAL | Reusable gate for risky actions | Extend existing approvals to publish, refunds, unusual pricing |
| Autopilot mode | Operating-system flags and operations controls | FOUNDATION EXISTS | Per-business OFF/ASSISTED/FULL setting | Add scoped setting and default ASSISTED |
| COO/dashboard overview | Superadmin dashboards, revenue/sales/operations views | PARTIAL | Single cross-lifecycle action queue | Build a compact “needs attention” view from existing tables |

## Highest-value next implementation order

1. Persist explainable prospect scoring and a single next-action queue.
2. Add abandoned-checkout reminder and renewal reminders using existing jobs/notifications.
3. Add payment-to-project creation and post-launch QA as idempotent events.
4. Add per-business automation mode (default `ASSISTED`) and reuse existing approval gates.
5. Add customer health rules and a compact operations queue.

## Important findings

- The repository already has substantial automation infrastructure. A parallel workflow engine would create duplication and should not be introduced.
- The largest revenue-autopilot gap is not lead capture; it is the handoff from paid checkout to project creation, deployment QA, and lifecycle reminders.
- AI should remain assistive and approval-gated. Existing content safeguards should remain the source of truth.
- WordPress integration and legacy AI-credit tables remain compatibility code; they should be hidden from the launch path before deletion.
