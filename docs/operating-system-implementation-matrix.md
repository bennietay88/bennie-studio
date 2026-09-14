# Bennie Studio operating-system implementation matrix

| Requirement | Existing source of truth | Decision | Implementation | Risk |
|---|---|---|---|---|
| Customer lifecycle | `businesses`, `projects`, billing events | Extend | Add lifecycle stage/timestamps and append-only history | Existing status values need compatibility mapping |
| Capabilities | profiles, dashboard visibility, platform permissions | Refactor | Reuse `private.is_business_member/admin`, add shared TypeScript capability helpers | Gradual caller migration |
| Delivery queue | `projects`, SEO tasks, update requests | Extend | Add tenant-scoped `delivery_tasks` with idempotency key | Avoid duplicating sales tasks |
| Launch gate | website validation/button health/approvals | Extend | Add one readiness record per website and blocking checks | Existing publish paths must call gate |
| Monthly service | monthly update requests and analytics | New | Add cycles, usage ledger, and reports | Metrics remain unavailable when not collected |
| Economics | billing lifecycle, Stripe data, task metadata | New | Add internal cost/time ledger; estimates are labelled | Manual cost inputs initially |
| Health | domain/SSL fields and `/api/health-check` | Extend | Add scheduled health snapshots and issue JSON | Polling must remain conservative |
| Handoff | onboarding completion endpoint | Extend | Add one immutable sales-to-delivery brief per business | Preserve historical proposal notes |
| Provenance | `ai_generation_logs.provenance` | Extend | Add field-level provenance records, linked to generation IDs | No fabricated claims |
| Versioning | `websites.template_id`, theme/pages JSON | Extend | Pin template/design/renderer/schema versions on each site | No silent upgrades |

The new migration is additive and preserves existing customer records. Customer-facing features remain flag-gated until the associated API/UI flow is verified.
