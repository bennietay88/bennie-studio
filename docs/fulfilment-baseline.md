# Fulfilment baseline (implementation audit)

The current flow is split between Stripe webhook handling, `/api/onboarding/complete`, `projects`, `websites`, `onboarding_sessions`, and existing async jobs. There is no reliable timing telemetry for the full order journey yet, so elapsed and labour values below are intentionally marked unknown.

| Stage | Automated today | Source of truth | Human touch | Machine time | Customer/external wait | Main failure mode | Improvement |
|---|---|---|---:|---:|---:|---|---|
| Checkout/subscription | Yes, Stripe + webhook | `orders`, `businesses`, Stripe events | Unknown | Unknown | Stripe/network | duplicate or delayed webhook | idempotent fulfilment initializer |
| Business/project initialization | Partial | `businesses`, `projects` | Unknown | Unknown | None | missing/legacy schema | one idempotent initializer |
| Onboarding | Customer-driven | `onboarding_sessions`, business fields | Unknown | Unknown | Customer | incomplete facts/assets | prefilled structured brief |
| Website generation | Partial | `websites`, async jobs | Unknown | Unknown | AI/provider | missing assets/content | fact-grounded draft pipeline |
| Internal QA | Existing checks, not a single gate | `validation_report`, button health, design QA | Unknown | Unknown | None | checks not unified | readiness result with blockers |
| Customer review/revision | Existing approval/request paths | approvals/update requests | Unknown | Unknown | Customer | fragmented feedback | one consolidated review |
| Domain setup | Existing domain/SSL fields | `businesses` | Unknown | Unknown | Registrar/customer | DNS access | run in parallel from onboarding |
| Publish/managed service | Existing publish/billing logic | website status/business subscription | Unknown | Unknown | Domain/customer | manual transition | publish event → managed cycle |

The new timing migration records event timestamps and explicit human/customer/domain minutes. It does not infer labour from elapsed time.
