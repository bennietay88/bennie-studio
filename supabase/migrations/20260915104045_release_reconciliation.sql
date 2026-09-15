-- Release reconciliation: server-owned profile bootstrap and active fulfilment FK indexes.
-- Additive and safe to replay; existing customer rows are not modified.

revoke all on function public.create_customer_profile() from public, anon, authenticated;
grant execute on function public.create_customer_profile() to service_role;

create index if not exists idx_account_cost_entries_business_id
  on public.account_cost_entries (business_id);
create index if not exists idx_account_cost_entries_created_by
  on public.account_cost_entries (created_by);
create index if not exists idx_business_lifecycle_events_actor_id
  on public.business_lifecycle_events (actor_id);
create index if not exists idx_content_provenance_approved_by
  on public.content_provenance (approved_by);
create index if not exists idx_content_provenance_business_id
  on public.content_provenance (business_id);
create index if not exists idx_content_provenance_website_id
  on public.content_provenance (website_id);
create index if not exists idx_delivery_tasks_assigned_to
  on public.delivery_tasks (assigned_to);
create index if not exists idx_delivery_tasks_website_id
  on public.delivery_tasks (website_id);
create index if not exists idx_fulfilment_events_project_id
  on public.fulfilment_events (project_id);
create index if not exists idx_fulfilment_events_website_id
  on public.fulfilment_events (website_id);
create index if not exists idx_launch_readiness_checks_overridden_by
  on public.launch_readiness_checks (overridden_by);
create index if not exists idx_monthly_reports_published_by
  on public.monthly_reports (published_by);
create index if not exists idx_sales_delivery_handoff_acknowledged_by
  on public.sales_delivery_handoff (handoff_acknowledged_by);
create index if not exists idx_sales_delivery_handoff_created_by
  on public.sales_delivery_handoff (handoff_created_by);
create index if not exists idx_website_health_checks_business_id
  on public.website_health_checks (business_id);
