-- Private internal role-test authorization registry. No direct browser access.
begin;
create table if not exists public.internal_role_test_owners(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 business_id uuid not null unique references public.businesses(id) on delete cascade,
 enabled boolean not null default true
);
create table if not exists public.internal_role_test_personas(
 owner_id uuid not null references public.internal_role_test_owners(owner_id) on delete cascade,
 persona_id uuid not null unique references auth.users(id) on delete cascade,
 role text not null check(role in ('staff','client','affiliate','platform_staff','super_admin')),
 primary key(owner_id,role),check(owner_id<>persona_id)
);
create table if not exists public.internal_role_test_audit(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null,persona_id uuid not null,
 role text not null,created_at timestamptz not null default now()
);
alter table public.internal_role_test_owners enable row level security;
alter table public.internal_role_test_personas enable row level security;
alter table public.internal_role_test_audit enable row level security;
revoke all on public.internal_role_test_owners,public.internal_role_test_personas,public.internal_role_test_audit from public,anon,authenticated;
grant select,insert,update,delete on public.internal_role_test_owners,public.internal_role_test_personas to service_role;
grant select,insert on public.internal_role_test_audit to service_role;
alter table public.businesses drop constraint if exists businesses_plan_check;
alter table public.businesses add constraint businesses_plan_check check(plan in ('starter','business','growth','premium','authority','pro','elite','website_growth_partner','managed-website','website-growth','growth-partner','custom-website','profile','internal_owner'));
create or replace function private.guard_internal_owner_plan() returns trigger language plpgsql set search_path='' as $guard$
begin
 if new.plan='internal_owner' and new.internal_access_mode is distinct from 'owner' then raise exception 'INTERNAL_OWNER_PLAN_REQUIRED' using errcode='23514';end if;
 return new;
end;
$guard$;
revoke all on function private.guard_internal_owner_plan() from public,anon,authenticated;
drop trigger if exists guard_internal_owner_plan on public.businesses;
create trigger guard_internal_owner_plan before insert or update on public.businesses for each row execute function private.guard_internal_owner_plan();
insert into public.plans(slug,name,description,monthly_credit_limit,daily_request_limit,project_limit,website_limit,location_page_limit,chatgpt_enabled,monthly_chatgpt_action_limit,price_usd,is_active,enabled_features,monthly_update_limit)
values('internal_owner','Internal Owner','Not for sale; production verification only',10000,500,100,100,100,true,10000,0,false,'["ai_synthesis","lead_crm","booking","automation","ecommerce","analytics","custom_domain","priority_support","ai_chatbot","review_management","advanced_seo","local_seo_geo","blog","website_growth_score","monthly_improvement_engine","whatsapp_enquiry_kit","enquiry_path_tracker","campaign_landing_pages","website_rescue_audit","industry_page_packs","industry_content","local_growth_pages","business_offer_builder","website_growth_autopilot","enquiry_loss_detector","competitor_gap_scanner","offer_strength_score","whatsapp_follow_up_crm","local_seo_opportunity_map","trust_proof_builder","campaign_calendar","sales_page_doctor","done_for_you_request_portal","review_to_website_import","local_ranking_readiness_score","monthly_website_report","trust_proof_vault","ai_receptionist_triage","before_after_rescue_tool","affiliate_system","sales_funnels","wordpress_sync"]'::jsonb,100)
on conflict(slug) do nothing;
commit;
