-- REVIEW/STAGING ONLY. Generate the numbered migration with Supabase CLI after
-- validating this script against an isolated database. Do not apply to production
-- until all legacy business-scoped readers/writers and routing have been audited.
begin;
alter table public.plans add column if not exists website_limit integer not null default 1;
alter table public.plans add constraint plans_website_limit_check check (website_limit between 0 and 1000);
alter table public.websites add column if not exists archived_at timestamptz;
alter table public.websites add column if not exists domain_challenge text;
alter table public.websites add column if not exists release_revision uuid not null default gen_random_uuid();
alter table public.websites add column if not exists submitted_revision uuid;
alter table public.websites add column if not exists internal_approved_revision uuid;
alter table public.websites add column if not exists customer_approved_revision uuid;
alter table public.websites add column if not exists internal_approved_by uuid;
alter table public.websites add column if not exists customer_approved_by uuid;
alter table public.websites add column if not exists internal_approved_at timestamptz;
alter table public.websites add column if not exists customer_approved_at timestamptz;
alter table public.websites add column if not exists released_at timestamptz;
-- Separate recurring add-on subscriptions never replace the parent subscription.
create table if not exists public.website_addon_price(
 singleton boolean primary key default true check(singleton), stripe_price_id text not null,
 updated_at timestamptz not null default now(), updated_by uuid not null
);
create table if not exists public.website_addon_orders(
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete restrict,
 created_by uuid not null, stripe_customer_id text not null,stripe_price_id text not null,
 stripe_checkout_session_id text unique,stripe_subscription_id text unique,
 status text not null default 'pending' check(status in ('pending','active','inactive','cancelled','expired')),
 paid_through timestamptz,cancel_at_period_end boolean not null default false,
 last_event_created bigint not null default 0,created_at timestamptz not null default now()
);
create unique index if not exists website_addon_one_pending on public.website_addon_orders(business_id) where status='pending';
create index if not exists website_addon_entitlements on public.website_addon_orders(business_id,status,paid_through);
alter table public.website_addon_price enable row level security;
alter table public.website_addon_orders enable row level security;
revoke all on public.website_addon_price,public.website_addon_orders from public,anon,authenticated;
grant select,insert,update on public.website_addon_price,public.website_addon_orders to service_role;
create or replace function public.effective_website_limit(p_business uuid)
returns integer language sql stable security invoker set search_path='' as $limit$
 select least(1000,coalesce((select p.website_limit from public.businesses b left join public.plans p on p.slug=b.plan where b.id=p_business),1)
 + (select count(*)::integer from public.website_addon_orders where business_id=p_business and status='active' and paid_through>now()));
$limit$;
revoke all on function public.effective_website_limit(uuid) from public,anon,authenticated;
grant execute on function public.effective_website_limit(uuid) to service_role;

-- Preserve the existing single-site business mapping. Ambiguous legacy tenants
-- must be reviewed manually rather than choosing whichever site was edited last.
update public.websites w set is_primary = true
where w.business_id is not null and not w.is_primary
and (select count(*) from public.websites x where x.business_id=w.business_id)=1;

create or replace function private.enforce_website_slots()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  slot_limit integer;
  used_slots integer;
  needs_slot boolean;
begin
  if tg_op = 'UPDATE' then
    if new.business_id is distinct from old.business_id or new.is_primary is distinct from old.is_primary then
      raise exception 'SITE_IDENTITY_IMMUTABLE' using errcode='23514';
    end if;
    if old.is_primary and new.archived_at is not null then
      raise exception 'PRIMARY_SITE_ARCHIVE_FORBIDDEN' using errcode='23514';
    end if;
    needs_slot := old.archived_at is not null and new.archived_at is null;
  else
    needs_slot := new.archived_at is null;
  end if;
  if new.business_id is null then
    return new; -- legacy platform templates / non-tenant records
  end if;
  if needs_slot then
    -- Serialize allocations for this subscribed business, including direct inserts.
    perform 1 from public.businesses where id=new.business_id for update;
    slot_limit:=public.effective_website_limit(new.business_id);
    select count(*) into used_slots from public.websites
      where business_id=new.business_id and archived_at is null
      and (tg_op='INSERT' or id<>new.id);
    if used_slots>0 and not exists(select 1 from public.websites where business_id=new.business_id and is_primary and archived_at is null) then
      raise exception 'PRIMARY_WEBSITE_RECONCILIATION_REQUIRED' using errcode='23514';
    end if;
    if used_slots>=coalesce(slot_limit,1) then
      raise exception 'WEBSITE_LIMIT_REACHED' using errcode='23514';
    end if;
    if tg_op='INSERT' then
      if used_slots=0 then new.is_primary := true;
      elsif new.is_primary then raise exception 'PRIMARY_SITE_EXISTS' using errcode='23514';
      elsif coalesce(auth.role(),'') in ('anon','authenticated') then
        raise exception 'USE_WEBSITE_LIFECYCLE_API' using errcode='42501';
      end if;
    end if;
  end if;
  if new.archived_at is not null and new.status<>'draft' then
    raise exception 'ONLY_DRAFTS_CAN_BE_ARCHIVED' using errcode='23514';
  end if;
  -- Secondary releases are enforced by the release guard below.
  if tg_op='UPDATE' and coalesce(auth.role(),'') in ('anon','authenticated') then
    if old.archived_at is not null then
      raise exception 'WEBSITE_ARCHIVED' using errcode='42501';
    end if;
    if new.archived_at is distinct from old.archived_at then
      raise exception 'USE_WEBSITE_LIFECYCLE_API' using errcode='42501';
    end if;
    if not old.is_primary and (new.custom_domain is distinct from old.custom_domain
      or new.custom_domain_status is distinct from old.custom_domain_status
      or new.custom_domain_verified_at is distinct from old.custom_domain_verified_at
      or new.custom_domain_permission_confirmed is distinct from old.custom_domain_permission_confirmed
      or new.custom_domain_suspended is distinct from old.custom_domain_suspended
      or new.domain_challenge is distinct from old.domain_challenge
      or new.domain_dns_records is distinct from old.domain_dns_records
      or new.ssl_status is distinct from old.ssl_status
      or new.service_id is distinct from old.service_id) then
      raise exception 'SITE_DOMAIN_FIELDS_SERVER_MANAGED' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_website_slots() from public, anon, authenticated;
drop trigger if exists enforce_website_slots on public.websites;
create trigger enforce_website_slots before insert or update on public.websites
for each row execute function private.enforce_website_slots();

-- Explicitly service-role-only; the HTTP handler authenticates the caller and
-- this function independently verifies their active business-admin membership.
create or replace function public.manage_website_draft(
  p_user_id uuid, p_business_id uuid, p_action text, p_site_id uuid default null,
  p_name text default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  source_site public.websites%rowtype;
  result_id uuid;
  clean_name text := btrim(coalesce(p_name,''));
begin
  if not exists(select 1 from public.profiles where id=p_user_id
    and business_id=p_business_id and role='business_admin' and status='active') then
    raise exception 'FORBIDDEN_BUSINESS_ACCESS' using errcode='42501';
  end if;
  if not exists(select 1 from public.businesses where id=p_business_id
    and status='active' and subscription_status='active') then
    raise exception 'ACTIVE_SUBSCRIPTION_REQUIRED' using errcode='42501';
  end if;
  perform 1 from public.businesses where id=p_business_id for update;
  if p_action in ('create','duplicate','rename') and (length(clean_name)<1 or length(clean_name)>100) then
    raise exception 'INVALID_WEBSITE_NAME' using errcode='23514';
  end if;
  if p_action <> 'create' then
    select * into source_site from public.websites where id=p_site_id
      and business_id=p_business_id and not is_internal_pilot for update;
    if not found then raise exception 'WEBSITE_NOT_FOUND' using errcode='P0002'; end if;
  end if;
  case p_action
    when 'create' then
      insert into public.websites(business_id,name,status,theme,pages,seo)
        values(p_business_id,clean_name,'draft',
          '{"primaryColor":"#4f46e5","secondaryColor":"#0f172a","fontFamily":"Inter","style":"modern"}'::jsonb,
          jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'title','Home','slug','','sections','[]'::jsonb)),
          jsonb_build_object('title',clean_name,'description','','keywords','[]'::jsonb,'workflowStatus','draft'))
        returning id into result_id;
    when 'duplicate' then
      if source_site.archived_at is not null then raise exception 'WEBSITE_ARCHIVED' using errcode='23514'; end if;
      insert into public.websites(business_id,name,status,theme,pages,seo)
        values(p_business_id,clean_name,'draft',source_site.theme,source_site.pages,
          jsonb_build_object('title',clean_name,'description',coalesce(source_site.seo->>'description',''),
            'keywords',coalesce(source_site.seo->'keywords','[]'::jsonb),'workflowStatus','draft'))
        returning id into result_id;
    when 'rename' then
      update public.websites set name=clean_name where id=source_site.id returning id into result_id;
    when 'archive' then
      if source_site.is_primary or source_site.status<>'draft' then
        raise exception 'ONLY_SECONDARY_DRAFTS_CAN_BE_ARCHIVED' using errcode='23514';
      end if;
      update public.websites set archived_at=coalesce(archived_at,now()) where id=source_site.id returning id into result_id;
    when 'restore' then
      update public.websites set archived_at=null where id=source_site.id returning id into result_id;
    else raise exception 'INVALID_SITE_ACTION' using errcode='23514';
  end case;
  return result_id;
end;
$$;
revoke all on function public.manage_website_draft(uuid,uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.manage_website_draft(uuid,uuid,text,uuid,text) to service_role;
-- Serialize canonical domain reservations across both legacy and site-level
-- assignments. www/apex aliases are deliberately exclusive.
create or replace function private.guard_site_domain_assignment()
returns trigger language plpgsql security definer set search_path='' as $domain_guard$
declare canonical text;
begin
  if new.custom_domain is null or btrim(new.custom_domain)='' then return new; end if;
  if tg_op='UPDATE' and new.custom_domain is not distinct from old.custom_domain then return new; end if;
  canonical := regexp_replace(lower(rtrim(btrim(new.custom_domain),'.')), '^www\.', '');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('website-domain:'||canonical,0));
  if tg_table_name='websites' then
    if exists(select 1 from public.websites w where w.id<>new.id and
      regexp_replace(lower(rtrim(btrim(w.custom_domain),'.')), '^www\.', '')=canonical)
      or exists(select 1 from public.businesses b where
      regexp_replace(lower(rtrim(btrim(b.custom_domain),'.')), '^www\.', '')=canonical
      and (not new.is_primary or b.id<>new.business_id)) then
      raise exception 'DOMAIN_ALREADY_ASSIGNED' using errcode='23505';
    end if;
  else
    if exists(select 1 from public.businesses b where b.id<>new.id and
      regexp_replace(lower(rtrim(btrim(b.custom_domain),'.')), '^www\.', '')=canonical)
      or exists(select 1 from public.websites w where
      regexp_replace(lower(rtrim(btrim(w.custom_domain),'.')), '^www\.', '')=canonical
      and (not w.is_primary or w.business_id<>new.id)) then
      raise exception 'DOMAIN_ALREADY_ASSIGNED' using errcode='23505';
    end if;
  end if;
  return new;
end;
$domain_guard$;
revoke all on function private.guard_site_domain_assignment() from public,anon,authenticated;
drop trigger if exists guard_site_domain_assignment on public.websites;
create trigger guard_site_domain_assignment before insert or update of custom_domain on public.websites
for each row execute function private.guard_site_domain_assignment();
drop trigger if exists guard_site_domain_assignment on public.businesses;
create trigger guard_site_domain_assignment before insert or update of custom_domain on public.businesses
for each row execute function private.guard_site_domain_assignment();

-- Authoritative revision invalidation and release enforcement. Runs after the
-- allocation trigger so the primary/secondary identity is already assigned.
create or replace function private.guard_secondary_site_release()
returns trigger language plpgsql security invoker set search_path='' as $release_guard$
declare
  is_server boolean := coalesce(auth.role(),'')='service_role';
  content_changed boolean := false;
begin
  if new.business_id is null or new.is_primary then return new; end if;
  if tg_op='INSERT' then
    new.release_revision := gen_random_uuid();
    new.submitted_revision := null;
    new.internal_approved_revision := null;
    new.customer_approved_revision := null;
    new.internal_approved_by := null;
    new.customer_approved_by := null;
    new.internal_approved_at := null;
    new.customer_approved_at := null;
    new.released_at := null;
    if new.status is distinct from 'draft' then raise exception 'SECONDARY_SITE_MUST_START_AS_DRAFT' using errcode='23514'; end if;
  else
    if new.release_revision is distinct from old.release_revision then
      raise exception 'RELEASE_REVISION_SERVER_MANAGED' using errcode='42501';
    end if;
    if not is_server and (new.status is distinct from old.status
      or new.submitted_revision is distinct from old.submitted_revision
      or new.internal_approved_revision is distinct from old.internal_approved_revision
      or new.customer_approved_revision is distinct from old.customer_approved_revision
      or new.internal_approved_by is distinct from old.internal_approved_by
      or new.customer_approved_by is distinct from old.customer_approved_by
      or new.internal_approved_at is distinct from old.internal_approved_at
      or new.customer_approved_at is distinct from old.customer_approved_at
      or new.released_at is distinct from old.released_at) then
      raise exception 'USE_SITE_RELEASE_API' using errcode='42501';
    end if;
    content_changed := new.pages is distinct from old.pages or new.theme is distinct from old.theme
      or new.seo is distinct from old.seo or new.custom_domain is distinct from old.custom_domain;
    if old.status='published' and content_changed then
      raise exception 'UNPUBLISH_BEFORE_EDITING' using errcode='23514';
    end if;
    if content_changed or new.archived_at is distinct from old.archived_at
      or (old.status='published' and new.status='draft') then
      new.release_revision := gen_random_uuid();
      new.submitted_revision := null;
      new.internal_approved_revision := null;
      new.customer_approved_revision := null;
      new.internal_approved_by := null;
      new.customer_approved_by := null;
      new.internal_approved_at := null;
      new.customer_approved_at := null;
      new.released_at := null;
    end if;
  end if;
  if new.status='published' then
    if exists(select 1 from public.website_domain_operation_locks where website_id=new.id) then
      raise exception 'DOMAIN_OPERATION_IN_PROGRESS' using errcode='23514';
    end if;
    if new.archived_at is not null or new.is_internal_pilot is distinct from false
      or new.submitted_revision is distinct from new.release_revision
      or new.internal_approved_revision is distinct from new.release_revision
      or new.customer_approved_revision is distinct from new.release_revision
      or new.internal_approved_by is null or new.customer_approved_by is null
      or new.internal_approved_by=new.customer_approved_by
      or new.internal_approved_at is null or new.customer_approved_at is null
      or new.customer_approved_at<new.internal_approved_at
      or new.released_at is null
      or coalesce(new.custom_domain,'')=''
      or new.custom_domain_status is distinct from 'connected'
      or new.custom_domain_verified_at is null
      or new.custom_domain_permission_confirmed is distinct from true
      or new.custom_domain_suspended is distinct from false
      or new.ssl_status is distinct from 'issued' then
      raise exception 'SITE_RELEASE_REQUIREMENTS_NOT_MET' using errcode='23514';
    end if;
  end if;
  return new;
end;
$release_guard$;
revoke all on function private.guard_secondary_site_release() from public,anon,authenticated;
drop trigger if exists z_guard_secondary_site_release on public.websites;
create trigger z_guard_secondary_site_release before insert or update on public.websites
for each row execute function private.guard_secondary_site_release();

-- Server-only, tenant/site-bound content snapshots. No public grants or direct client access.
create table if not exists public.website_content_backups(
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 website_id uuid not null references public.websites(id) on delete cascade,
 created_by uuid not null, created_at timestamptz not null default now(),
 content jsonb not null, content_bytes integer not null check(content_bytes between 1 and 10000000)
);
create index if not exists website_content_backups_scope on public.website_content_backups(business_id,website_id,created_at desc);
alter table public.website_content_backups enable row level security;
revoke all on public.website_content_backups from public,anon,authenticated;
grant select,insert,update,delete on public.website_content_backups to service_role;
alter table public.website_content_backups add column if not exists media_status text not null default 'content_only' check(media_status in ('content_only','pending','complete','failed'));
alter table public.website_content_backups add column if not exists media_manifest jsonb not null default '[]'::jsonb;
create table if not exists public.website_lifecycle_audit(
 id uuid primary key default gen_random_uuid(), business_id uuid, website_id uuid,
 actor_id uuid, action text not null, details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.website_lifecycle_audit enable row level security;
revoke all on public.website_lifecycle_audit from public,anon,authenticated;
grant select,insert on public.website_lifecycle_audit to service_role;
create or replace function public.manage_website_content_backup(p_actor uuid,p_business uuid,p_website uuid,p_action text,p_backup uuid,p_updated timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $backup$
declare w public.websites%rowtype; snapshot jsonb; restore_content jsonb; saved uuid;
begin
 if not exists(select 1 from public.profiles where id=p_actor and business_id=p_business and role='business_admin' and status='active') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into w from public.websites where id=p_website and business_id=p_business and not is_internal_pilot and archived_at is null for update;
 if not found then raise exception 'WEBSITE_NOT_FOUND' using errcode='P0002'; end if;
 if w.updated_at is distinct from p_updated then raise exception 'STALE_WEBSITE' using errcode='40001'; end if;
 if p_action not in ('create','restore') then raise exception 'INVALID_BACKUP_ACTION'; end if;
 if p_action='restore' then
  if w.is_primary or w.status<>'draft' then raise exception 'SECONDARY_DRAFT_REQUIRED'; end if;
  select content into restore_content from public.website_content_backups where id=p_backup and business_id=p_business and website_id=p_website;
  if not found then raise exception 'BACKUP_NOT_FOUND' using errcode='P0002'; end if;
 end if;
 snapshot:=jsonb_build_object('pages',w.pages,'theme',w.theme,'seo',w.seo);
 if (select count(*) from public.website_content_backups where website_id=p_website)>=30 then raise exception 'BACKUP_LIMIT_REACHED'; end if;
 insert into public.website_content_backups(business_id,website_id,created_by,content,content_bytes)
 values(p_business,p_website,p_actor,snapshot,octet_length(snapshot::text)) returning id into saved;
 if p_action='restore' then
  update public.websites set pages=restore_content->'pages',theme=restore_content->'theme',seo=restore_content->'seo',updated_at=now() where id=p_website and business_id=p_business;
 end if;
 insert into public.website_lifecycle_audit(business_id,website_id,actor_id,action,details)
 values(p_business,p_website,p_actor,'backup_'||p_action,jsonb_build_object('new_backup',saved,'restored_backup',p_backup));
 return saved;
end;
$backup$;
revoke all on function public.manage_website_content_backup(uuid,uuid,uuid,text,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.manage_website_content_backup(uuid,uuid,uuid,text,uuid,timestamptz) to service_role;

create or replace function private.audit_secondary_website()
returns trigger language plpgsql security definer set search_path='' as $audit$
begin
 if new.business_id is null or new.is_primary then return new; end if;
 if tg_op='INSERT' then
  insert into public.website_lifecycle_audit(business_id,website_id,actor_id,action) values(new.business_id,new.id,auth.uid(),'created');
 elsif row(new.status,new.custom_domain,new.custom_domain_suspended,new.archived_at,new.release_revision,new.submitted_revision,new.internal_approved_revision,new.customer_approved_revision)
 is distinct from row(old.status,old.custom_domain,old.custom_domain_suspended,old.archived_at,old.release_revision,old.submitted_revision,old.internal_approved_revision,old.customer_approved_revision) then
  insert into public.website_lifecycle_audit(business_id,website_id,actor_id,action,details) values(new.business_id,new.id,auth.uid(),'lifecycle_changed',
  jsonb_build_object('status_before',old.status,'status_after',new.status,'domain_changed',new.custom_domain is distinct from old.custom_domain,'suspended',new.custom_domain_suspended,'archived',new.archived_at is not null,'revision',new.release_revision,'internal_approved_by',new.internal_approved_by,'customer_approved_by',new.customer_approved_by));
 end if;
 return new;
end;
$audit$;
revoke all on function private.audit_secondary_website() from public,anon,authenticated;
drop trigger if exists audit_secondary_website on public.websites;
create trigger audit_secondary_website after insert or update on public.websites for each row execute function private.audit_secondary_website();

-- Entitlement changes are non-destructive: lower allowances block new allocation;
-- existing content and paid orders remain intact for customer remediation.
create or replace function private.audit_website_commercial()
returns trigger language plpgsql security definer set search_path='' as $commercial$
begin
 if tg_table_name='website_addon_orders' then
  insert into public.website_lifecycle_audit(business_id,actor_id,action,details)
  values(new.business_id,new.created_by,'website_addon_'||new.status,jsonb_build_object('order_id',new.id,'paid_through',new.paid_through,'cancel_at_period_end',new.cancel_at_period_end));
 elsif tg_table_name='website_addon_price' then
  insert into public.website_lifecycle_audit(actor_id,action,details)
  values(new.updated_by,'website_addon_price_configured',jsonb_build_object('stripe_price_id',new.stripe_price_id));
 elsif tg_table_name='plans' then
  if new.website_limit is distinct from old.website_limit then
   insert into public.website_lifecycle_audit(actor_id,action,details) values(auth.uid(),'plan_website_limit_changed',jsonb_build_object('plan',new.slug,'before',old.website_limit,'after',new.website_limit));
  end if;
 end if;
 return new;
end;
$commercial$;
revoke all on function private.audit_website_commercial() from public,anon,authenticated;
drop trigger if exists audit_website_addon_order on public.website_addon_orders;
create trigger audit_website_addon_order after insert or update of status,paid_through,cancel_at_period_end on public.website_addon_orders for each row execute function private.audit_website_commercial();
drop trigger if exists audit_website_addon_price on public.website_addon_price;
create trigger audit_website_addon_price after insert or update on public.website_addon_price for each row execute function private.audit_website_commercial();
drop trigger if exists audit_plan_website_limit on public.plans;
create trigger audit_plan_website_limit after update of website_limit on public.plans for each row execute function private.audit_website_commercial();
-- Resource reporting attributes only verified website-specific activity.
alter table public.ai_generation_logs add column if not exists website_id uuid references public.websites(id) on delete set null;
create index if not exists ai_generation_logs_site_usage on public.ai_generation_logs(website_id,created_at) where website_id is not null;
create or replace function public.website_resource_usage(p_business uuid,p_website uuid,p_since timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $usage$
 select jsonb_build_object(
  'aiCredits',coalesce((select sum(coalesce(credits_charged,0)) from public.ai_generation_logs where project_id=p_business and website_id=p_website and created_at>=p_since),0),
  'aiRequests',(select count(*) from public.ai_generation_logs where project_id=p_business and website_id=p_website and created_at>=p_since),
  'storageBytes',coalesce((select sum(case when metadata->>'size' ~ '^[0-9]{1,15}$' then (metadata->>'size')::bigint else 0 end) from storage.objects where bucket_id='website-assets' and name like 'sites/'||p_business::text||'/'||p_website::text||'/%'),0),
  'storageObjects',(select count(*) from storage.objects where bucket_id='website-assets' and name like 'sites/'||p_business::text||'/'||p_website::text||'/%'))
 where exists(select 1 from public.websites where id=p_website and business_id=p_business);
$usage$;
revoke all on function public.website_resource_usage(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.website_resource_usage(uuid,uuid,timestamptz) to service_role;

-- Primary sites retain legacy access. Secondary sites compete only for the
-- remaining slots, with a stable UUID tie-breaker. Published sites take
-- precedence over drafts; no downgrade ever deletes content.
create or replace function public.website_slot_available(p_business uuid,p_website uuid)
returns boolean language sql stable security invoker set search_path='' as $slots$
 select coalesce((select w.is_primary or (w.archived_at is null and
  (select count(*) from public.websites x where x.business_id=p_business and x.archived_at is null
   and (x.is_primary or (not x.is_primary and (case when x.status='published' then 0 else 1 end,x.id)<(case when w.status='published' then 0 else 1 end,w.id))))<public.effective_website_limit(p_business))
  from public.websites w where w.id=p_website and w.business_id=p_business),false);
$slots$;
revoke all on function public.website_slot_available(uuid,uuid) from public,anon,authenticated;
grant execute on function public.website_slot_available(uuid,uuid) to service_role;
-- The pre-existing broad ALL policy is permissive, so merely adding a second
-- permissive tenant policy would not restrict it. These policies are restrictive.
drop policy if exists multi_site_authenticated_read on public.websites;
create policy multi_site_authenticated_read on public.websites as restrictive for select to authenticated
using (not is_internal_pilot and (private.is_business_member(business_id) or private.is_super_admin()
 or public.has_platform_permission('customer_health') or public.has_platform_permission('delivery')
 or (is_primary and status='published')));
drop policy if exists multi_site_authenticated_insert on public.websites;
create policy multi_site_authenticated_insert on public.websites as restrictive for insert to authenticated
with check (not is_internal_pilot and (private.is_business_admin(business_id) or private.is_super_admin()));
drop policy if exists multi_site_authenticated_update on public.websites;
create policy multi_site_authenticated_update on public.websites as restrictive for update to authenticated
using (not is_internal_pilot and (private.is_business_admin(business_id) or private.is_super_admin()))
with check (not is_internal_pilot and (private.is_business_admin(business_id) or private.is_super_admin()));
drop policy if exists multi_site_authenticated_delete on public.websites;
create policy multi_site_authenticated_delete on public.websites as restrictive for delete to authenticated
using (is_primary and not is_internal_pilot and (private.is_business_admin(business_id) or private.is_super_admin()));
drop policy if exists multi_site_public_primary_only on public.websites;
create policy multi_site_public_primary_only on public.websites as restrictive for select to anon
using (is_primary and status='published' and not is_internal_pilot);
-- Site-scoped writes use the service's signed upload path, never the legacy
-- authenticated catch-all. Shared historical uploads remain unaffected.
drop policy if exists multi_site_signed_storage_only on storage.objects;
create policy multi_site_signed_storage_only on storage.objects as restrictive for insert to authenticated
with check (bucket_id<>'website-assets' or name not like 'sites/%');

-- Durable mutual exclusion: retain the hostname reservation until provider
-- removal succeeds. A crashed operation remains locked for operator review;
-- no timeout takeover can race an in-flight provider request.
create table if not exists public.website_domain_operation_locks(
 host text primary key, token uuid not null, website_id uuid not null references public.websites(id) on delete restrict,
 created_at timestamptz not null default now()
);
alter table public.website_domain_operation_locks enable row level security;
revoke all on public.website_domain_operation_locks from public,anon,authenticated;
grant select,insert,delete on public.website_domain_operation_locks to service_role;
-- Private backup assets must never be accessible through the legacy public bucket policy.
drop policy if exists multi_site_private_backup_assets on storage.objects;
create policy multi_site_private_backup_assets on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'website-backups') with check(bucket_id<>'website-backups');
commit;
