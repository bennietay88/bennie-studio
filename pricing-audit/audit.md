# Bennie Studio pricing and offer audit

## Journey reviewed

1. Public pricing page and market selector — fixed. Malaysia now shows MYR throughout.
2. Basic plan selection — fixed. Plan, market, currency, and billing cycle persist into signup/onboarding.
3. Customer onboarding — fixed. Page, location, and update limits now come from the canonical plan catalogue.
4. Self-serve checkout — supported. The server validates plan-owned market Stripe IDs and can charge the one-time setup price with the first subscription payment.
5. Growth Partner proposal — fixed. It now maps to its own entitlement, stores Stripe payment references, and can attach the paid proposal to the buyer's business during onboarding.
6. Custom website path — healthy. It remains a separate quote/application journey.

## Offer support

| Offer | Public promise | System support | Health |
| --- | --- | --- | --- |
| Launch | 1 page, 1 monthly update | Page limit, update allowance, onboarding, checkout fields | Healthy once Stripe MYR IDs are configured |
| Business | 3 pages, 1 location page, 1 monthly update | Generator, onboarding, dashboard allowance, checkout fields | Healthy once Stripe MYR IDs are configured |
| Scale | 5 pages, 3 location pages, 2 monthly updates | Generator, local pages, analytics/report features, dashboard allowance | Healthy once Stripe MYR IDs are configured |
| Website Growth Partner | Consultant-led build and monthly improvement | Proposal, payment link, lead status, onboarding claim, premium entitlement | Healthy |
| Custom Website | Bespoke quote | Application and quotation path | Healthy |

## Remaining operational requirement

Create monthly and setup prices in Stripe for each self-serve market, then paste the price IDs into Super Admin → Billing Plans. The app deliberately blocks checkout when a displayed setup fee does not have a matching Stripe price, preventing undercharging.

## Accessibility and visual review

- Pricing is no longer mixed between USD and MYR in the same Malaysia view.
- Cards retain readable hierarchy, consistent CTA placement, and concise included items.
- The native market select has an accessible label and keyboard behavior.
- Full keyboard, screen-reader, checkout-provider, and authenticated onboarding testing still require a real browser session and live Stripe test prices.

## Evidence

- `01-current-pricing.png`: before — Malaysia detected while basic plans remained in USD.
- `02-malaysia-pricing-fixed.png`: after — all plan tiers, setup fees, and custom pricing shown in MYR.
