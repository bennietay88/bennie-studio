# Production database performance and access audit — 2026-11-13

Scope: Bennie Studio Supabase project `fxwjwnnqaczdhschqgef`. This is a **read-only review** of advisors and database statistics, not approval to drop policies or indexes.

## RLS (17 tables without policies)
The 17 advisor-listed application tables are internal-only; direct `anon` and `authenticated` SELECT/INSERT/UPDATE/DELETE permissions were checked and absent. RLS remains enabled. Supabase-managed `auth`/`storage` internals are outside this finding. **No public policies added.**

## Multiple permissive RLS policies (407 findings)

Postgres OR-combines permissive policies. Many overlaps are intentional: super-admin broad access plus owner/staff restrictions, or authenticated plus publicly readable resources. Removing one without predicate equivalence can break authorization. The table-by-table triage below provides exact advisor finding counts and policy-shape markers, not a proof that policies are equivalent.

| Table | Advisor findings | Existing policies | ALL-action policies | Unconditional TRUE predicates | Next review action |
|---|---:|---:|---:|---:|---|
| `affiliate_payouts` | 20 | 3 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `affiliate_programs` | 20 | 4 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `affiliate_referrals` | 20 | 3 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `affiliates` | 20 | 5 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `api_keys` | 20 | 4 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `appointment_settings` | 20 | 4 | 2 | 1 | Review existing role/operation predicates before any consolidation |
| `appointments` | 20 | 4 | 2 | 1 | Review existing role/operation predicates before any consolidation |
| `businesses` | 20 | 9 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `custom_website_applications` | 20 | 2 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `leads` | 20 | 5 | 2 | 1 | Review existing role/operation predicates before any consolidation |
| `posts` | 20 | 5 | 3 | 0 | Review existing role/operation predicates before any consolidation |
| `support_messages` | 20 | 2 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `support_tickets` | 20 | 3 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `notifications` | 10 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `profiles` | 10 | 6 | 0 | 0 | Review existing role/operation predicates before any consolidation |
| `onboarding_sessions` | 8 | 3 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `projects` | 8 | 4 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `ai_feature_costs` | 5 | 3 | 1 | 2 | Review existing role/operation predicates before any consolidation |
| `ai_model_routes` | 5 | 2 | 1 | 1 | Review existing role/operation predicates before any consolidation |
| `geo_pricing` | 5 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `local_seo_pages` | 5 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `orders` | 5 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `page_views` | 5 | 3 | 0 | 1 | Review existing role/operation predicates before any consolidation |
| `proposals` | 5 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `section_templates` | 5 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `template_taxonomy_options` | 5 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `templates` | 5 | 2 | 1 | 1 | Review existing role/operation predicates before any consolidation |
| `webinars` | 5 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `audit_reports` | 4 | 2 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `customer_services` | 4 | 3 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `products` | 4 | 3 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `prospects` | 4 | 3 | 2 | 0 | Review existing role/operation predicates before any consolidation |
| `admin_action_audit_logs` | 2 | 4 | 0 | 0 | Review existing role/operation predicates before any consolidation |
| `customer_accounts` | 2 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `industry_item_enquiries` | 2 | 3 | 1 | 1 | Review existing role/operation predicates before any consolidation |
| `monthly_growth_reports` | 2 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `monthly_update_requests` | 2 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `plans` | 2 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `website_error_logs` | 2 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `account_memberships` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `ai_usage_logs` | 1 | 2 | 0 | 0 | Review existing role/operation predicates before any consolidation |
| `commission_tiers` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `customer_approvals` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `customer_testimonials` | 1 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `delivery_tasks` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_connections` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_events` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_insights` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_offers` | 1 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_sessions` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_steps` | 1 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_submissions` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_variants` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_workflow_connections` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_workflow_events` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_workflow_nodes` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_workflow_runs` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnel_workflows` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `funnels` | 1 | 3 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `industry_items` | 1 | 5 | 0 | 0 | Review existing role/operation predicates before any consolidation |
| `launch_readiness_checks` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `monthly_reports` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `sales_delivery_handoff` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `settings` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |
| `website_health_checks` | 1 | 2 | 1 | 0 | Review existing role/operation predicates before any consolidation |

Priority for deeper manual security review: `leads` (public insert policy), `profiles`, `businesses`, `api_keys`, `account_memberships`, `appointments`, and `affiliate_payouts`. Never collapse broad `ALL` policies without separate SELECT/INSERT/UPDATE/DELETE and tenant-isolation tests. **No policies changed in this pass.**

## Unindexed foreign keys (53)

The advisor identifies these missing covering indexes. An FK warning is not itself evidence of a slow query. High-traffic tables `page_views`, `sales_messages`, `sales_tasks`, `prospects`, and `async_jobs` already have indexes covering their active FK joins. `leads.funnel_step_id` lacks one, but `leads` had roughly three live rows at inspection. Do not create dozens of maintenance-cost indexes without evidence of parent deletes or a real query bottleneck.

| Table | Foreign key | Recommendation |
|---|---|---|
| `internal_pilot.approved_revisions` | `approved_revisions_revision_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `internal_pilot.audit` | `audit_actor_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `internal_pilot.resources` | `resources_approved_revision_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `internal_pilot.resources` | `resources_current_revision_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `internal_pilot.resources` | `resources_destination_host_fkey` | No covering index reported; check table size and parent-delete workload |
| `internal_pilot.resources` | `resources_owner_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `internal_pilot.resources` | `resources_published_revision_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.commercial_otc_waivers` | `commercial_otc_waivers_updated_by_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_connections` | `funnel_connections_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_connections` | `funnel_connections_target_step_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_events` | `funnel_events_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_events` | `funnel_events_lead_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_events` | `funnel_events_variant_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_insights` | `funnel_insights_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_offers` | `funnel_offers_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_offers` | `funnel_offers_step_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_sessions` | `funnel_sessions_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_sessions` | `funnel_sessions_current_step_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_sessions` | `funnel_sessions_first_step_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_sessions` | `funnel_sessions_lead_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_steps` | `funnel_steps_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_submissions` | `funnel_submissions_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_submissions` | `funnel_submissions_lead_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_submissions` | `funnel_submissions_session_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_submissions` | `funnel_submissions_step_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_trigger_jobs` | `funnel_trigger_jobs_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_trigger_jobs` | `funnel_trigger_jobs_funnel_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_variants` | `funnel_variants_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_variants` | `funnel_variants_funnel_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_connections` | `funnel_workflow_connections_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_connections` | `funnel_workflow_connections_target_node_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_events` | `funnel_workflow_events_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_events` | `funnel_workflow_events_node_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_nodes` | `funnel_workflow_nodes_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_runs` | `funnel_workflow_runs_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_runs` | `funnel_workflow_runs_current_node_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_runs` | `funnel_workflow_runs_funnel_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_runs` | `funnel_workflow_runs_lead_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflow_runs` | `funnel_workflow_runs_session_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnel_workflows` | `funnel_workflows_created_by_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.funnels` | `funnels_created_by_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.leads` | `leads_funnel_step_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.monthly_growth_reports` | `monthly_growth_reports_reviewed_by_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.monthly_update_allowance_overrides` | `monthly_update_allowance_overrides_granted_by_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.monthly_update_allowance_overrides` | `monthly_update_allowance_overrides_revoked_by_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.monthly_update_request_events` | `monthly_update_request_events_actor_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.monthly_update_request_events` | `monthly_update_request_events_business_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.monthly_update_requests` | `monthly_update_requests_scope_classified_by_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.simple_funnel_addons` | `simple_funnel_addons_requested_by_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.support_tickets` | `support_tickets_funnel_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.support_tickets` | `support_tickets_website_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.tracking_events` | `tracking_events_funnel_step_id_fkey` | No covering index reported; check table size and parent-delete workload |
| `public.website_revisions` | `website_revisions_business_id_fkey` | No covering index reported; check table size and parent-delete workload |

For the new overdue queue, `EXPLAIN` selected existing `sales_tasks_due_idx(status,due_at)` on the `status='open' AND due_at <= now()` predicate. **No duplicate index is needed.**

## Unused indexes (170)
`pg_stat_database.stats_reset`: **2026-03-30 19:02:21 UTC**. Usage counters span many months but some indexes were created later; unused-index advisories alone do not justify dropping indexes (especially rare deletion, FK maintenance, and incident paths). Historical statistics and real representative workload must be compared before any DROP INDEX. **No indexes dropped.**

## Monitoring and acceptance
- Use `pg_stat_user_indexes`, query plans, database insights, and actual workload trends to select index candidates.
- Test owner/staff/admin/anonymous access with real policies before any RLS consolidation.
- Re-run advisors after scoped migrations; never use permissive policies solely to remove RLS informational notices.
