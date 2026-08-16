-- Follow-up hardening based on Supabase security and performance advisors.

drop policy if exists "Service role manages SEO product config" on public.seo_product_config;
create policy "Service role manages SEO product config" on public.seo_product_config
  for all to service_role using (true) with check (true);

drop policy if exists "Service role manages SEO module definitions" on public.seo_module_definitions;
create policy "Service role manages SEO module definitions" on public.seo_module_definitions
  for all to service_role using (true) with check (true);

drop policy if exists "Service role manages SEO plan entitlements" on public.seo_plan_entitlements;
create policy "Service role manages SEO plan entitlements" on public.seo_plan_entitlements
  for all to service_role using (true) with check (true);

create index if not exists idx_local_seo_pages_website_fk on public.local_seo_pages (website_id);
create index if not exists idx_local_seo_pages_created_by_fk on public.local_seo_pages (created_by);
create index if not exists idx_local_seo_pages_reviewed_by_fk on public.local_seo_pages (reviewed_by);

create index if not exists seo_product_config_updated_by_fk_idx on public.seo_product_config (updated_by);
create index if not exists seo_plan_entitlements_module_fk_idx on public.seo_plan_entitlements (module_key);
create index if not exists seo_business_entitlements_updated_by_fk_idx on public.seo_business_entitlements (updated_by);
create index if not exists seo_projects_created_by_fk_idx on public.seo_projects (created_by);
create index if not exists seo_project_overrides_module_fk_idx on public.seo_project_overrides (module_key);
create index if not exists seo_project_overrides_updated_by_fk_idx on public.seo_project_overrides (updated_by);
create index if not exists seo_audit_runs_job_fk_idx on public.seo_audit_runs (job_id);
create index if not exists seo_audit_runs_requested_by_fk_idx on public.seo_audit_runs (requested_by);
create index if not exists seo_issues_audit_run_fk_idx on public.seo_issues (audit_run_id);
create index if not exists seo_opportunities_source_issue_fk_idx on public.seo_opportunities (source_issue_id);
create index if not exists seo_tasks_opportunity_fk_idx on public.seo_tasks (opportunity_id);
create index if not exists seo_tasks_issue_fk_idx on public.seo_tasks (issue_id);
create index if not exists seo_tasks_created_by_fk_idx on public.seo_tasks (created_by);
create index if not exists seo_keywords_business_fk_idx on public.seo_keywords (business_id);
create index if not exists seo_rankings_business_fk_idx on public.seo_rankings (business_id);
create index if not exists seo_competitors_business_fk_idx on public.seo_competitors (business_id);
create index if not exists seo_content_business_fk_idx on public.seo_content_items (business_id);
create index if not exists seo_content_opportunity_fk_idx on public.seo_content_items (opportunity_id);
create index if not exists seo_backlinks_business_fk_idx on public.seo_backlinks (business_id);
create index if not exists seo_outreach_business_fk_idx on public.seo_outreach (business_id);
create index if not exists seo_locations_business_fk_idx on public.seo_locations (business_id);
create index if not exists seo_ai_visibility_business_fk_idx on public.seo_ai_visibility (business_id);
create index if not exists seo_integrations_business_fk_idx on public.seo_integrations (business_id);
create index if not exists seo_schedules_business_fk_idx on public.seo_schedules (business_id);
create index if not exists seo_usage_project_fk_idx on public.seo_usage (project_id);
create index if not exists seo_activity_user_fk_idx on public.seo_activity_logs (user_id);

notify pgrst, 'reload schema';
