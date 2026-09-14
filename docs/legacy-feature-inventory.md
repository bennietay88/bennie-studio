# Legacy/dead-code audit (evidence-based)

This is an inventory, not a deletion list. Applied migrations and historical billing data are preserved.

| Feature/system | Evidence | Classification | Decision |
|---|---|---|---|
| Commercial catalogue | `/api/public/pricing`, Pricing UI, Stripe checkout | ACTIVE | Keep as current pricing source |
| Legacy `plans` table | Admin catalogue endpoint and historical subscriptions | INFREQUENT/HISTORICAL | Retain; stop adding new public offers |
| One-time checkout/order records | Stripe webhook and `orders` references; historical compatibility comments | HISTORICAL/COMPATIBILITY | Retain, do not expose as new offer |
| Trial fields | Businesses, legacy migrations, admin settings | HISTORICAL/UNKNOWN | Keep schema; remove only stale public UX after telemetry review |
| WordPress integration | Multiple API routes, feature flag, migrations, existing adapter types | ACTIVE/INFREQUENT | Do not remove; isolate from current WAAS offer |
| AI providers/generation logs | Current internal content routes and `ai_generation_logs` | ACTIVE INTERNAL | Consolidate later; no deletion |
| Analytics V1/V2 | Raw events plus V2 aggregation | ACTIVE/TRANSITIONING | Keep raw history; retire UI only after usage proof |
| SEO tasks/jobs | Admin and customer SEO workspace callers | ACTIVE | Reuse for delivery integration |
| Projects/update requests | Onboarding handoff and customer update flows | ACTIVE | Extend rather than duplicate |
| Affiliate features | Routes/components and role references exist | UNKNOWN | Retain; require telemetry before deprecation |
| Duplicate editor/generator paths | Website editor, generator, renderer are separately referenced | UNKNOWN | Refactor only after runtime route audit |

No feature in this inventory met the removal standard of zero imports, zero dynamic use, no external links, no database dependency, and no live-customer dependency. Therefore no runtime feature or applied migration was deleted in this release.
