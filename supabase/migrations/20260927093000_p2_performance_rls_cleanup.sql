-- Bennie Studio P2 database performance cleanup.
-- Optimize only currently flagged auth.uid() policies without changing policy semantics,
-- and add indexes only for active funnel query paths observed in the application.

create index if not exists idx_funnel_workflows_funnel_business_status
  on public.funnel_workflows (funnel_id, business_id, status, updated_at desc);

create index if not exists idx_funnel_workflow_runs_workflow_started
  on public.funnel_workflow_runs (workflow_id, started_at desc);

do $$
declare
  policy_row record;
  next_using text;
  next_check text;
  alter_sql text;
begin
  for policy_row in
    select p.*
    from pg_policies p
    join (
      values
      ('profiles','Users can view own profile'),
      ('user_subscriptions','Users can view own subscription'),
      ('ai_credit_balances','Users can view own credits'),
      ('ai_generation_logs','Users can view own logs'),
      ('ai_daily_usage','Users can view own daily usage'),
      ('plans','Admins can manage plans'),
      ('affiliates','Users can apply to platform affiliate program'),
      ('industry_items','Business admins can update own industry items'),
      ('businesses','Business members can view own business'),
      ('businesses','Owners can insert business'),
      ('custom_website_applications','Users can manage their own applications'),
      ('businesses','Business admins can update own business'),
      ('local_seo_pages','Business users view own local seo pages'),
      ('local_seo_pages','Business admins manage own local seo pages'),
      ('custom_website_applications','Super Admins can manage all applications'),
      ('businesses','Owners can delete own business'),
      ('projects','Super Admins can manage all projects'),
      ('projects','Business admins can view their projects'),
      ('industry_items','Business admins can delete own industry items'),
      ('managed_growth_actions','Business users manage own managed growth actions'),
      ('industry_item_enquiries','Business users can view own industry item enquiries'),
      ('industry_item_enquiries','Business admins can manage own industry item enquiries'),
      ('platform_schema_versions','Super admins can read schema versions'),
      ('support_tickets','Users can manage own tickets'),
      ('support_messages','Users can manage messages for own tickets'),
      ('affiliate_programs','Affiliates can view their business program'),
      ('affiliates','Affiliates can view their earnings'),
      ('affiliate_referrals','Affiliates can view their referrals'),
      ('affiliate_payouts','Affiliates can view their payouts'),
      ('affiliate_payouts','Affiliates can insert payout requests'),
      ('app_error_logs','Users can insert own app errors'),
      ('notifications','Users can view own notifications'),
      ('notifications','Users can update own notifications'),
      ('api_keys','Users can view own business API keys'),
      ('api_keys','Users can manage own business API keys'),
      ('industry_items','Business users can view own industry items'),
      ('industry_items','Business admins can insert own industry items'),
      ('admin_action_audit_logs','Super admins can read admin audit logs'),
      ('admin_action_audit_logs','Super admins can create admin audit logs'),
      ('projects','Customers view their projects'),
      ('customer_approvals','Customers view their approvals'),
      ('admin_action_audit_logs','Platform operators create audit history'),
      ('customer_testimonials','Customers view their own testimonial records'),
      ('ai_credit_ledger','Users can view own AI credit ledger')
    ) as targets(tablename, policyname)
      on targets.tablename = p.tablename
     and targets.policyname = p.policyname
    where p.schemaname = 'public'
  loop
    next_using := case
      when policy_row.qual is null then null
      else replace(policy_row.qual, 'auth.uid()', '(select auth.uid())')
    end;
    next_check := case
      when policy_row.with_check is null then null
      else replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    alter_sql := format(
      'alter policy %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );

    if next_using is not null then
      alter_sql := alter_sql || format(' using (%s)', next_using);
    end if;

    if next_check is not null then
      alter_sql := alter_sql || format(' with check (%s)', next_check);
    end if;

    if next_using is distinct from policy_row.qual
       or next_check is distinct from policy_row.with_check then
      execute alter_sql;
    end if;
  end loop;
end
$$;
