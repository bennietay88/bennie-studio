-- Additive admin operations after multi_site_lifecycle.sql. No changes to commercial prices.
begin;
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
    and status='active' and (role='super_admin' or (business_id=p_business_id and role='business_admin'))) then
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
  insert into public.website_lifecycle_audit(business_id,website_id,actor_id,action,details) values(p_business_id,result_id,p_user_id,'portfolio_'||p_action,jsonb_build_object('source_site',p_site_id));
  return result_id;
end;
$$;
revoke all on function public.manage_website_draft(uuid,uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.manage_website_draft(uuid,uuid,text,uuid,text) to service_role;

create or replace function public.manage_website_content_backup(p_actor uuid,p_business uuid,p_website uuid,p_action text,p_backup uuid,p_updated timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $backup$
declare w public.websites%rowtype; snapshot jsonb; restore_content jsonb; saved uuid;
begin
 if not exists(select 1 from public.profiles where id=p_actor and status='active' and (role='super_admin' or (business_id=p_business and role='business_admin'))) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
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


commit;
