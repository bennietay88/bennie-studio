-- All operational timestamps are observed. NULL means the milestone has not been recorded.
alter table public.projects
  add column if not exists brief_ready_at timestamptz,
  add column if not exists reviewed_draft_at timestamptz,
  add column if not exists first_live_at timestamptz,
  add column if not exists delivery_plan text,
  add column if not exists delivery_exception text,
  add column if not exists revision_rounds integer not null default 0,
  add column if not exists customer_wait_started timestamptz,
  add column if not exists domain_wait_started timestamptz,
  add column if not exists observed_customer_wait_minutes numeric,
  add column if not exists observed_domain_wait_minutes numeric;

create function public.record_delivery_milestones() returns trigger language plpgsql
set search_path = '' as $$
begin
  if new.brief_ready_at is not null then
    if new.status is distinct from old.status then
      if old.customer_wait_started is not null then
        new.observed_customer_wait_minutes := coalesce(old.observed_customer_wait_minutes,0) + extract(epoch from now()-old.customer_wait_started)/60;
      end if;
      if old.domain_wait_started is not null then
        new.observed_domain_wait_minutes := coalesce(old.observed_domain_wait_minutes,0) + extract(epoch from now()-old.domain_wait_started)/60;
      end if;
      new.customer_wait_started := case when new.status='customer_review' then now() end;
      new.domain_wait_started := case when new.status='domain_setup' then now() end;
      if new.status='changes_requested' then new.revision_rounds := old.revision_rounds+1; end if;
    end if;
    if new.status = 'customer_review' then
      new.reviewed_draft_at := coalesce(old.reviewed_draft_at, now());
    end if;
    if new.status in ('live','maintenance') and exists(select from public.websites w where w.id=new.website_id and w.business_id=new.business_id and w.status='published') then
      new.first_live_at := coalesce(old.first_live_at, now());
    end if;
  end if;
  return new;
end $$;
create trigger record_delivery_milestones before update of status on public.projects
for each row execute function public.record_delivery_milestones();

-- Serialize repeat handoffs and preserve projects that already moved beyond intake.
create function public.accept_generated_handoff(p_business uuid, p_website uuid, p_payload jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare project public.projects%rowtype; site public.websites%rowtype; stage text; reason text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_business::text, 0));
  select * into strict site from public.websites where id=p_website and business_id=p_business;
  select * into project from public.projects
    where business_id=p_business and type='waas' and (website_id=p_website or
      (website_id is null and status in ('pending','new_customer','onboarding_incomplete','ready_for_build')))
    order by (website_id=p_website) desc nulls last, created_at desc limit 1 for update;
  if (project.brief_ready_at is not null and (project.status <> 'ready_for_build' or project.delivery_exception is null)) or (project.id is not null and project.status not in
    ('pending','new_customer','onboarding_incomplete','ready_for_build','discovery','design')) then return project.status; end if;
  if coalesce(site.seo#>>'{buttonHealth,criticalBroken}','0') ~ '^[1-9][0-9]*$' then
    stage := 'ready_for_build'; reason := 'Repair the critical enquiry route identified by automated QA.';
    elsif exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(to_jsonb(site.pages))='array'
          then to_jsonb(site.pages) else '[]'::jsonb end
      ) as page(value)
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(page.value->'sections')='array'
          then page.value->'sections' else '[]'::jsonb end
      ) as section(value)
    )
    then stage := 'internal_review';
    else stage := 'ready_for_build'; reason := 'No generated page sections available. Inspect the draft before review.'; end if;
  if project.id is null then
    insert into public.projects (business_id,website_id,title,type,status,priority,package_name,
      target_launch_date,admin_notes,delivery_plan,brief_ready_at,delivery_exception)
    values (p_business,p_website,p_payload->>'title','waas',stage,'medium',p_payload->>'plan',
      (p_payload->>'launch')::date,p_payload->>'notes',p_payload->>'slug',now(),reason) returning id into project.id;
  else
    update public.projects set website_id=p_website,title=p_payload->>'title',status=stage,
      package_name=p_payload->>'plan',target_launch_date=(p_payload->>'launch')::date,
      admin_notes=concat_ws(E'\n',admin_notes,p_payload->>'notes'),delivery_plan=p_payload->>'slug',
      brief_ready_at=coalesce(brief_ready_at,now()),delivery_exception=reason,updated_at=now() where id=project.id;
  end if;
  insert into public.delivery_work_totals(project_id,category,minutes)
  select project.id,metric,round(raw_ms::numeric/60000,4) from
  (values ('generation',site.seo#>>'{buildTiming,generationMs}'), ('automated_qa',site.seo#>>'{buildTiming,qaMs}')) t(metric,raw_ms)
  where raw_ms ~ '^[0-9]{1,9}$' on conflict(project_id,category) do nothing;
  return stage;
end $$;
revoke all on function public.accept_generated_handoff(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.accept_generated_handoff(uuid,uuid,jsonb) to service_role;

-- One editable total per project and work category avoids double counting retries.
create table public.delivery_work_totals (
  project_id uuid references public.projects on delete cascade,
  category text check(category in ('draft_review','review_handoff','revision','launch','customer_wait','domain_wait','generation','automated_qa')),
  minutes numeric not null check(minutes between 0 and 100000),
  exception text check(length(exception)<=500),
  primary key(project_id,category)
);
alter table public.delivery_work_totals enable row level security;
revoke all on public.delivery_work_totals from public,anon,authenticated;
grant select,insert,update on public.delivery_work_totals to authenticated,service_role;
create policy delivery_staff on public.delivery_work_totals to authenticated
using (private.is_super_admin() or public.has_platform_permission('delivery'))
with check (private.is_super_admin() or public.has_platform_permission('delivery'));

create table public.enquiry_outcomes (
  lead_id uuid references public.leads on delete cascade,
  outcome text not null check(outcome in ('qualified','booked','won','unsuitable')),
  job_value numeric check(job_value>=0 and job_value<1e12),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  month date not null check(extract(day from month)=1),
  primary key(lead_id,month),
  confirmed_at timestamptz not null default now()
);
create table public.owner_monthly_checkins (
  business_id uuid references public.businesses on delete cascade,
  month date check(extract(day from month)=1),
  priority text not null check(length(priority) between 1 and 500),
  baseline text check(length(baseline)<=500),
  offline_qualified integer check(offline_qualified between 0 and 100000),
  route_verified boolean not null default false,
  primary key(business_id,month)
);
alter table public.enquiry_outcomes enable row level security;
alter table public.owner_monthly_checkins enable row level security;
revoke all on public.enquiry_outcomes,public.owner_monthly_checkins from public,anon,authenticated;
grant select,insert,update on public.enquiry_outcomes,public.owner_monthly_checkins to authenticated,service_role;
create policy outcome_owner on public.enquiry_outcomes to authenticated using
(exists(select 1 from public.leads l where l.id=lead_id and private.is_business_admin(l.business_id)))
with check (exists(select 1 from public.leads l where l.id=lead_id and private.is_business_admin(l.business_id)) and month=date_trunc('month',now() at time zone 'UTC')::date);
create policy checkin_owner on public.owner_monthly_checkins to authenticated
using(private.is_business_admin(business_id)) with check(private.is_business_admin(business_id) and month<=date_trunc('month',now() at time zone 'UTC')::date);

-- Keep paid service coverage per invoice for milestone retention, including reactivations.
create table public.paid_service_periods (
  invoice_id text primary key, business_id uuid not null references public.businesses on delete cascade,
  plan text not null, period_start timestamptz not null, period_end timestamptz not null,
  paid_at timestamptz not null, check(period_end>period_start)
);
create index paid_service_periods_business on public.paid_service_periods(business_id,period_start);
alter table public.paid_service_periods enable row level security;
revoke all on public.paid_service_periods from public,anon,authenticated;
grant select,insert,update on public.paid_service_periods to service_role;
alter table public.paid_service_periods add column first_subscription_invoice boolean not null default false;

-- Historical paid invoices without an observed start remain outside the cohort denominator.
create function public.service_retention_cohorts() returns table(cohort date, plan text, month_number int, eligible bigint, retained bigint)
language sql stable security invoker set search_path='' as $$
 with starts as (
   select distinct on (business_id) business_id, period_start, plan
   from public.paid_service_periods where first_subscription_invoice order by business_id,period_start
 ), points as (
   select s.*, m, s.period_start + make_interval(months=>m) as anniversary
   from starts s cross join unnest(array[3,6,12,18,24]) m
 )
 select date_trunc('month',p.period_start at time zone 'UTC')::date,p.plan,m,count(*),
 count(*) filter(where exists(select from public.paid_service_periods x where x.business_id=p.business_id
   and x.period_start<=p.anniversary and x.period_end>p.anniversary))
 from points p where anniversary<=now() group by 1,2,3 order by 1 desc,2,3
$$;

create function public.report_owner_evidence(p_from timestamptz,p_to timestamptz)
returns table(business_id uuid, confirmed jsonb, checkin jsonb, plan text, service_month integer)
language sql stable security invoker set search_path='' as $$
 select b.id, coalesce(e.counts,'{}'), coalesce(to_jsonb(c)-'business_id','{}'::jsonb) || jsonb_build_object('routeCheck',(
 select jsonb_build_object('status',h.health_status,'checked',h.checks->'contactActionsChecked')
 from public.website_health_checks h where h.business_id=b.id and h.checks->>'retentionPeriod'=to_char(p_from at time zone 'UTC','YYYY-MM')
 order by h.checked_at desc limit 1),'previousYear',(
 select r.payload->'measured' from public.monthly_growth_reports r where r.business_id=b.id
 and r.status='published' and r.report_month=to_char((p_from at time zone 'UTC')-interval '1 year','YYYY-MM') limit 1)),

 coalesce(b.commercial_product_slug,b.plan),case when b.launched_at is not null then
 greatest(1,1+extract(year from age(p_from,b.launched_at))::int*12+extract(month from age(p_from,b.launched_at))::int) end
 from public.businesses b left join public.owner_monthly_checkins c on c.business_id=b.id and c.month=(p_from at time zone 'UTC')::date
 left join lateral (select jsonb_object_agg(t.outcome,t.n) as counts from (
 select o.outcome,count(*) n from public.enquiry_outcomes o join public.leads l on l.id=o.lead_id
 where l.business_id=b.id and o.month=(p_from at time zone 'UTC')::date group by o.outcome) t) e on true
 where b.status='active'
$$;
revoke all on function public.service_retention_cohorts(),public.report_owner_evidence(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.service_retention_cohorts(),public.report_owner_evidence(timestamptz,timestamptz) to service_role;

-- Freeze the first verified preview and payment times independently of later profile edits.
create table public.preview_conversion_observations (
 preview_id text primary key, completed_at timestamptz, paid_at timestamptz
);
alter table public.preview_conversion_observations enable row level security;
revoke all on public.preview_conversion_observations from public,anon,authenticated;
grant select,insert,update on public.preview_conversion_observations to service_role;

create function public.observe_preview(p_preview text,p_event text,p_time timestamptz) returns void
language sql security invoker set search_path='' as $$
 insert into public.preview_conversion_observations(preview_id,completed_at,paid_at)
 values(p_preview,case when p_event='completed' then p_time end,case when p_event='paid' then p_time end)
 on conflict(preview_id) do update set completed_at=least(preview_conversion_observations.completed_at,excluded.completed_at),
 paid_at=least(preview_conversion_observations.paid_at,excluded.paid_at)
$$;

create function public.queue_service_reviews() returns void language sql security invoker set search_path='' as $$
 with accounts as (
 select b.id,coalesce(b.commercial_product_slug,b.plan) as plan,
 coalesce(b.launched_at,(select min(p.first_live_at) from public.projects p where p.business_id=b.id),
 (select b.commercial_started_at where exists(select from public.websites w where w.business_id=b.id and w.status='published' and coalesce(w.slug,'') not like 'preview-%' and coalesce(w.slug,'') not like 'prospect-%'))) as launched
 from public.businesses b where b.subscription_status='active' and b.stripe_subscription_id is not null
 ), due as (
 select a.*, 1+12*(extract(year from now() at time zone 'UTC')-extract(year from launched at time zone 'UTC'))::int
 + (extract(month from now() at time zone 'UTC')-extract(month from launched at time zone 'UTC'))::int as service_month,
 date_trunc('month',now() at time zone 'UTC') as period from accounts a where launched<=now()
 )
 insert into public.delivery_tasks(business_id,task_type,source,due_at,metadata,idempotency_key)
 select id,'service_review','retention',period at time zone 'UTC',
 jsonb_build_object('month',service_month,'plan',plan,'action',case
 when service_month between 2 and 3 and plan in ('website-growth','growth-partner','growth','premium','website_growth','growth_partner') then 'Diagnose traffic, contact routes, enquiry fit and follow-up before choosing the next improvement.'
 when service_month=1 then 'Agree the baseline and verify an enquiry reaches the owner.'
 when service_month in (12,18,24) then 'Review results, current priorities and plan fit with the owner.'
 when service_month>12 and mod(service_month,3)=0 then 'Compare seasonal results and refresh project evidence.'
 when mod(service_month,3)=0 and plan in ('growth-partner','growth_partner') then 'Review the quarterly commercial priority with the owner and choose a consultant-led experiment.'
 when mod(service_month,3)=0 then 'Confirm the next quarterly priority and review qualified enquiries.'
 when plan in ('website-growth','growth-partner','growth','premium','website_growth','growth_partner') then 'Review lead quality and choose one improvement within scope.'
 else 'Verify contact details and the enquiry route. Offer the included edit.' end),
 'service-review:'||id||':'||to_char(period,'YYYY-MM')
 from due where service_month<=3 or mod(service_month,3)=0 or plan in ('website-growth','growth-partner','growth','premium','website_growth','growth_partner')
 on conflict (idempotency_key) where idempotency_key is not null do nothing
$$;
revoke all on function public.observe_preview(text,text,timestamptz),public.queue_service_reviews() from public,anon,authenticated;
grant execute on function public.observe_preview(text,text,timestamptz),public.queue_service_reviews() to service_role;

create function public.delivery_business_metrics() returns jsonb language sql stable security invoker set search_path='' as $$
 with preview as (select date_trunc('month',completed_at)::date cohort,count(*) eligible,
 count(*) filter(where paid_at between completed_at and completed_at+interval '30 days') converted
 from public.preview_conversion_observations where completed_at<=now()-interval '30 days' group by 1),
 quarterly as (select b.id,coalesce(b.commercial_product_slug,b.plan) plan,
 exists(select from public.owner_monthly_checkins c where c.business_id=b.id and c.month >= date_trunc('quarter',now())::date and c.route_verified) verified,
 (exists(select from public.enquiry_outcomes o join public.leads l on l.id=o.lead_id where l.business_id=b.id and
 o.outcome in ('qualified','booked','won') and o.month>=date_trunc('quarter',now())::date) or exists(select from public.owner_monthly_checkins c
 where c.business_id=b.id and c.month>=date_trunc('quarter',now())::date and c.offline_qualified>0)) outcome
 from public.businesses b where b.subscription_status='active' and b.stripe_subscription_id is not null),
 evidence as (select plan,count(*) accounts,count(*) filter(where verified) verified,count(*) filter(where outcome) outcome from quarterly group by plan),
 billing as (select date_trunc('month',created_at)::date as month,event_type,count(distinct business_id) accounts from public.billing_lifecycle_events
 where event_type in ('payment_failed','cancellation_requested','subscription_cancelled','plan_downgraded') group by 1,2)
 select jsonb_build_object('retention',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('percent',round(100.0*r.retained/r.eligible,1))) from public.service_retention_cohorts() r),'[]'),
 'preview',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('percent',round(100.0*p.converted/p.eligible,1)) order by cohort desc) from preview p),'[]'),
 'value',coalesce((select jsonb_agg(to_jsonb(e)) from evidence e),'[]'),
 'billing',coalesce((select jsonb_agg(to_jsonb(b) order by month desc) from billing b),'[]'))
$$;
revoke all on function public.delivery_business_metrics() from public,anon,authenticated;
grant execute on function public.delivery_business_metrics() to service_role;

create function public.publish_reviewed_action(p_report_id uuid,p_reviewer uuid,p_action text)
returns setof public.monthly_growth_reports language plpgsql security invoker set search_path='' as $$
begin
 if length(p_action)>500 then raise exception 'Action too long'; end if;
 update public.monthly_growth_reports set recommendations=case when nullif(trim(p_action),'') is null then array[]::text[] else array[trim(p_action)] end
 where id=p_report_id and status='draft' and source_kind='scheduled';
 if not found then return; end if;
 return query select * from public.publish_monthly_growth_report(p_report_id,p_reviewer);
end $$;
revoke all on function public.publish_reviewed_action(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.publish_reviewed_action(uuid,uuid,text) to service_role;

-- Reconciled costs are entered in a single currency for each period. Missing inputs have no margin.
create table public.delivery_margin_inputs (
 project_id uuid references public.projects on delete cascade, month date check(extract(day from month)=1),
 phase text check(phase in ('setup','service')), currency text not null check(currency ~ '^[A-Z]{3}$'),
 net_revenue numeric not null, labour_minutes numeric not null check(labour_minutes>=0),
 hourly_cost numeric not null check(hourly_cost>=0), direct_cost numeric not null check(direct_cost>=0),
 primary key(project_id,month,phase)
);
alter table public.delivery_margin_inputs enable row level security;
revoke all on public.delivery_margin_inputs from public,anon,authenticated;
grant select,insert,update on public.delivery_margin_inputs to authenticated,service_role;
create policy margin_admin on public.delivery_margin_inputs to authenticated using(private.is_super_admin()) with check(private.is_super_admin());

-- Store actual plan changes, including downgrades, separately from billing failures.
create table public.service_plan_changes (
 id bigint generated always as identity primary key,business_id uuid not null references public.businesses on delete cascade,
 previous_plan text not null,next_plan text not null,changed_at timestamptz not null default now()
);
alter table public.service_plan_changes enable row level security;
revoke all on public.service_plan_changes from public,anon,authenticated;
grant select,insert on public.service_plan_changes to service_role;
create function public.record_service_plan_change() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user='service_role' and old.stripe_subscription_id is not null and
 old.commercial_product_slug is not null and new.commercial_product_slug is not null and
 old.commercial_product_slug<>new.commercial_product_slug then
 insert into public.service_plan_changes(business_id,previous_plan,next_plan) values(new.id,old.commercial_product_slug,new.commercial_product_slug);
 end if;
 return new;
end $$;
create trigger service_plan_change after update of commercial_product_slug on public.businesses for each row execute function public.record_service_plan_change();
grant usage on sequence public.service_plan_changes_id_seq to service_role;

alter table public.projects add column if not exists pilot_intake boolean not null default false;
create function public.delivery_pilot_metrics() returns jsonb language sql stable security invoker set search_path='' as $$
 with pilot as (select * from public.projects where pilot_intake order by created_at,id limit 20),
 measured as (select p.*, t.minutes, t.recorded,
 ((p.brief_ready_at at time zone 'UTC')::date +
 case extract(isodow from p.brief_ready_at at time zone 'UTC') when 5 then 3 when 6 then 2 else 1 end) as due
 from pilot p left join lateral (select sum(minutes) minutes,count(*) recorded from public.delivery_work_totals w
 where w.project_id=p.id and category in ('draft_review','review_handoff','revision','launch')) t on true),
 margins as (select p.delivery_plan,m.month,m.phase,m.currency,count(*) accounts,sum(m.net_revenue) revenue,
 sum(m.net_revenue-m.direct_cost-m.hourly_cost*m.labour_minutes/60) contribution
 from public.delivery_margin_inputs m join public.projects p on p.id=m.project_id group by 1,2,3,4),
 changes as (select date_trunc('month',changed_at)::date as month,count(distinct business_id) downgrades
 from public.service_plan_changes where array_position(array['personal-profile','managed-website','website-growth','growth-partner'],previous_plan)>
 array_position(array['personal-profile','managed-website','website-growth','growth-partner'],next_plan) group by 1)
 select jsonb_build_object('intake',count(*),'reviewed',count(reviewed_draft_at),'onTime',
 count(*) filter(where (reviewed_draft_at at time zone 'UTC')::date<=due),'fullyTimed',count(*) filter(where first_live_at is not null and recorded=4),
 'averageMinutes',round(avg(minutes) filter(where first_live_at is not null and recorded=4),1),
 'repeatRevisions',count(*) filter(where revision_rounds>1),
 'exceptions',count(*) filter(where delivery_exception is not null or exists(select from public.delivery_work_totals w where w.project_id=measured.id and nullif(trim(w.exception),'') is not null)),
 'under45',count(*) filter(where first_live_at is not null and recorded=4 and minutes<=45),
 'margins',coalesce((select jsonb_agg(to_jsonb(m) order by month desc) from margins m),'[]'),
 'downgrades',coalesce((select jsonb_agg(to_jsonb(c) order by month desc) from changes c),'[]')) from measured
$$;
revoke all on function public.delivery_pilot_metrics() from public,anon,authenticated;
grant execute on function public.delivery_pilot_metrics() to service_role;

create unique index retention_route_check_month on public.website_health_checks(website_id,(checks->>'retentionPeriod'))
where checks ? 'retentionPeriod';
create function public.due_enquiry_route_checks(p_period text)
returns table(id uuid,business_id uuid,pages jsonb,theme jsonb,seo jsonb) language sql stable security invoker set search_path='' as $$
 select w.id,w.business_id,to_jsonb(w.pages),to_jsonb(w.theme),to_jsonb(w.seo) from public.websites w
 join public.businesses b on b.id=w.business_id
 where w.status='published' and b.subscription_status='active' and b.stripe_subscription_id is not null
 and coalesce(w.slug,'') not like 'preview-%' and coalesce(w.slug,'') not like 'prospect-%'
 and not exists(select from public.website_health_checks c where c.website_id=w.id and c.checks->>'retentionPeriod'=p_period)
 order by w.id limit 40
$$;
create function public.save_enquiry_route_check(p_site uuid,p_period text,p_count int,p_issues jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare business uuid; issue_count int:=jsonb_array_length(p_issues);
begin
 select business_id into strict business from public.websites where id=p_site;
 insert into public.website_health_checks(website_id,business_id,health_status,checks,issues)
 values(p_site,business,case when issue_count=0 then 'healthy' else 'warning' end,
 jsonb_build_object('retentionPeriod',p_period,'contactActionsChecked',p_count),p_issues)
 on conflict do nothing;
 if issue_count>0 then
 insert into public.delivery_tasks(business_id,website_id,task_type,source,priority,due_at,metadata,idempotency_key)
 values(business,p_site,'enquiry_route_issue','retention','high',now(),
 jsonb_build_object('action','Inspect the website contact route: '||(p_issues->0->>'reason'),'period',p_period),
 'route-check:'||p_site||':'||p_period)
 on conflict(idempotency_key) where idempotency_key is not null do nothing;
 end if;
end $$;
revoke all on function public.due_enquiry_route_checks(text),public.save_enquiry_route_check(uuid,text,int,jsonb) from public,anon,authenticated;
grant execute on function public.due_enquiry_route_checks(text),public.save_enquiry_route_check(uuid,text,int,jsonb) to service_role;

create function public.record_site_launch_time() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='published' and old.status is distinct from new.status then
  update public.projects set first_live_at=now() where website_id=new.id and business_id=new.business_id
    and brief_ready_at is not null and first_live_at is null;
 end if;
 return new;
end $$;
create trigger record_site_launch_time after update of status on public.websites
for each row execute function public.record_site_launch_time();
