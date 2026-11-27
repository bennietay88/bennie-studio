-- REVIEW/STAGING ONLY. Generate the numbered migration with Supabase CLI after
-- validating this script against an isolated database. Do not apply to production
-- until all legacy business-scoped readers/writers and routing have been audited.
begin;
alter table public.plans add column if not exists website_limit integer not null default 1;
alter table public.plans add constraint plans_website_limit_check check (website_limit between 0 and 1000);
alter table public.websites add column if not exists archived_at timestamptz;
alter table public.websites add column if not exists domain_challenge text;

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
    select coalesce(p.website_limit,1) into slot_limit from public.businesses b
      left join public.plans p on p.slug=b.plan where b.id=new.business_id;
    select count(*) into used_slots from public.websites
      where business_id=new.business_id and archived_at is null
      and (tg_op='INSERT' or id<>new.id);
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
  -- Secondary publishing remains fail-closed until site-level approvals,
  -- verified domains and public read paths are integrated.
  if not new.is_primary and new.status='published' then
    raise exception 'SECONDARY_SITE_PUBLICATION_NOT_ENABLED' using errcode='23514';
  end if;
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
commit;
