# Bennie Studio superadmin feature and sales study

Updated: 15 August 2026

## Decision rule

Keep every existing module accessible to the superadmin. Use the module controls to simplify the everyday sidebar without deleting routes or data. Prioritise work that moves a real prospect through this path:

`lead captured -> qualified -> reviewed -> contacted -> followed up -> proposal -> payment -> onboarding`

## Keep enabled: helps sales now

| Module | Why it matters now | Next improvement |
| --- | --- | --- |
| Lead Inbox | Single source for new inbound interest | Add owner, response due time, next action, and overdue follow-up views |
| Prospects | Creates an outbound target list | Add qualification criteria, source, owner, and next-contact date |
| Website Reviews | Gives outreach a specific, useful reason to reply | Save findings to the lead and reuse them in outreach and previews |
| Outreach | Turns research into personalised messages | Add send/log actions, follow-up sequence, replies, and opt-out handling before calling it automation |
| Sales Pipeline | Shows which opportunities need action | Make every open deal require a next action and due date |
| Plans & Pricing | Controls the offer prospects see | Keep one primary managed website offer and a clear custom-work path |
| Traffic Analytics | Measures real acquisition and enquiry events | Add source-to-lead and lead-to-won reporting using measured events only |
| Blog CMS | Supports authority and search discovery | Publish high-intent case studies and service/location content, not generic volume |

## Keep enabled when delivering customers

| Module | Purpose |
| --- | --- |
| Active Sites | Customer and website source of truth |
| Users & Access | Account and permission management |
| Custom Applications | Captures non-standard commercial work |
| Service Projects | Tracks delivery ownership and blockers |
| Launch Checks | Protects publishing quality |
| Client Handover | Connects payment to onboarding and launch |
| Operations Control | Coordinates approvals, billing events, and work |
| Update Queue | Delivers the ongoing managed-service promise |
| Support | Retains customers and resolves issues |
| Website Templates | Speeds delivery without weakening personalisation |
| Policies CMS | Maintains public legal and policy content |
| Compliance & Market | Supports accurate country and compliance information |
| Revenue | Useful only when showing real Stripe/payment data |
| Feature Controls | Keeps module visibility and platform configuration reversible |
| System Status | Useful for operational diagnosis |
| Platform Settings | Required platform administration |

## Available, but disable from the everyday sidebar for now

| Module | Current issue | Re-enable when |
| --- | --- | --- |
| Campaigns | Stores campaign records but is not a complete sending/sequencing system | A real provider, delivery events, replies, unsubscribe, and compliance controls are connected |
| Webinars | Stores webinar records but does not provide a complete acquisition funnel | Registration, reminders, attendance, replay, and lead attribution are integrated |
| Operations Lab | Includes simulated conversion and chart data | Every KPI is sourced from real events and empty states say `Not enough data yet` |
| Local SEO | Valuable later, but not the fastest route to the first sales | A repeatable customer delivery process and measured local-search workflow exist |
| Market Pricing | Adds complexity before multiple markets have meaningful sales | Country-level demand and operating costs justify distinct offers |
| Partners & Affiliates | Requires payout, attribution, fraud, and partner operations | Direct sales is repeatable and referral volume justifies the overhead |
| AI Credits | Premature without material customer AI usage and cost | Usage is metered, billed, and valuable to paying customers |
| AI Control | Internal sophistication does not directly close customers | Multiple live AI workflows require routing, budgets, and reliability controls |
| Ecosystem Architect | Shows hard-coded latency and uptime values | Infrastructure signals are measured and operational decisions depend on them |

## Trust issues to correct before relying on the affected screens

- `SalesHome` contains a simulated 18.5% conversion rate and fixed chart data.
- `RevenueDashboard` can show simulated data and fixed weekly growth copy when Stripe metrics are unavailable.
- `OutreachLab` displays a hard-coded `+24% ROI` claim even though it is currently a drafting tool.
- `MassCampaigns` presents campaign/yield language without a complete sending and response pipeline.
- `Ecosystem Architect` displays hard-coded latency and uptime values.
- Legal/compliance placeholders must be reviewed and replaced with approved text before being represented as final.

The correct empty state is `Not enough data yet`, accompanied by the tracking or setup action required to produce real data.

## Highest-impact sales build order

1. **Follow-up discipline:** owner, next action, due date, response-time indicator, and reminders on every lead and open deal.
2. **One connected prospect journey:** prospect -> website review -> personalised outreach -> reply -> proposal -> checkout, with context carried between steps.
3. **Proof that closes:** three strong case studies with problem, changes made, launch result, screenshots, and a relevant CTA.
4. **Real attribution:** capture UTM/referrer and connect leads, checkout, and won revenue so channel performance is factual.
5. **Sales-ready previews:** reuse review data to create a limited personalised preview without asking for the same information again.
6. **Offer clarity:** lead with one managed website plan, who it is for, what happens after signup, and the first 30-day outcome.
7. **Outbound execution:** only after the manual workflow converts, connect compliant email sending, reply detection, opt-outs, and sequenced follow-ups.

## Metrics worth showing

- New leads by source
- First response time
- Leads awaiting follow-up
- Reviews completed and previews requested
- Proposals sent, accepted, and awaiting decision
- Checkout started and payment completed
- Lead-to-customer conversion from real records
- Monthly recurring revenue from Stripe/payment records

Avoid decorative ROI, conversion, uptime, latency, or growth figures that are not backed by stored events.
