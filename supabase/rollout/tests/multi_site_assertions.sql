\set ON_ERROR_STOP on
begin;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
do $test$
declare a constant uuid:='00000000-0000-4000-8000-000000000001'; b constant uuid:='00000000-0000-4000-8000-000000000002'; actor constant uuid:='00000000-0000-4000-8000-000000000011'; primary_id constant uuid:='00000000-0000-4000-8000-000000000021'; site uuid; dup uuid; backup uuid; revision uuid; old_time timestamptz; usage jsonb;
begin
 begin perform public.manage_website_draft(actor,a,'create',null,'Over limit'); raise exception 'quota bypass'; exception when check_violation then null; end;
 insert into public.profiles(id,role,status) values('00000000-0000-4000-8000-000000000099','super_admin','active');
 update public.plans set website_limit=3 where slug='starter';
 site:=public.manage_website_draft(actor,a,'create',null,'Secondary');
 dup:=public.manage_website_draft('00000000-0000-4000-8000-000000000099',a,'duplicate',site,'Admin Duplicate');
 if not exists(select 1 from public.website_lifecycle_audit where website_id=dup and actor_id='00000000-0000-4000-8000-000000000099' and action='portfolio_duplicate') then raise exception 'admin audit missing';end if;
 begin perform public.manage_website_draft('00000000-0000-4000-8000-000000000099',b,'rename',site,'Wrong scope');raise exception 'admin site/business mismatch bypass';exception when sqlstate 'P0002' then null;end;
 update public.profiles set status='suspended' where id='00000000-0000-4000-8000-000000000099';
 begin perform public.manage_website_draft('00000000-0000-4000-8000-000000000099',a,'rename',site,'Unauthorized');raise exception 'suspended admin bypass';exception when insufficient_privilege then null;end;
 update public.profiles set status='active' where id='00000000-0000-4000-8000-000000000099';
 if (select is_primary from public.websites where id=site) then raise exception 'secondary is primary'; end if;
 begin perform public.manage_website_draft(actor,b,'create',null,'Wrong tenant'); raise exception 'tenant bypass'; exception when insufficient_privilege then null; end;
 update public.websites set custom_domain='example.test' where id=site;
 begin update public.websites set custom_domain='www.example.test' where id=dup; raise exception 'domain collision bypass'; exception when unique_violation then null; end;
 begin update public.websites set status='published' where id=site; raise exception 'approval bypass'; exception when check_violation then null; end;
 select release_revision,updated_at into revision,old_time from public.websites where id=site;
 backup:=public.manage_website_content_backup('00000000-0000-4000-8000-000000000099',a,site,'create',null,old_time);
 update public.websites set pages='[{"slug":"changed"}]',updated_at=clock_timestamp() where id=site;
 if (select release_revision from public.websites where id=site)=revision then raise exception 'revision did not change'; end if;
 select updated_at into old_time from public.websites where id=site;
 perform public.manage_website_content_backup(actor,a,site,'restore',backup,old_time);
 if (select pages from public.websites where id=site)->0->>'slug'<>'' then raise exception 'restore failed'; end if;
 begin perform public.manage_website_content_backup(actor,a,dup,'restore',backup,(select updated_at from public.websites where id=dup)); raise exception 'cross-site backup bypass'; exception when sqlstate 'P0002' then null; end;
 insert into public.ai_generation_logs(project_id,website_id,credits_charged) values(a,site,7),(a,dup,9);
 insert into storage.objects(bucket_id,name,metadata) values('website-assets','sites/'||a||'/'||site||'/one.png','{"size":200}'),('website-assets','sites/'||a||'/'||dup||'/two.png','{"size":500}');
 usage:=public.website_resource_usage(a,site,now()-interval '1 day');
 if usage->>'aiCredits'<>'7' or usage->>'storageBytes'<>'200' then raise exception 'usage scope incorrect: %',usage; end if;
 update public.plans set website_limit=1 where slug='starter';
 if public.website_slot_available(a,site) or not public.website_slot_available(a,primary_id) then raise exception 'downgrade enforcement failed'; end if;
 insert into public.website_addon_orders(business_id,created_by,stripe_customer_id,stripe_price_id,status,paid_through) values(a,actor,'cus_fixture','price_fixture','active',now()+interval '1 day');
 if public.effective_website_limit(a)<>2 then raise exception 'paid slot not counted'; end if;
 update public.website_addon_orders set status='inactive' where business_id=a;
 if public.effective_website_limit(a)<>1 then raise exception 'failed payment retained slot'; end if;
end;
$test$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
do $test$
declare changed int;
begin
 if exists(select 1 from public.websites where id='00000000-0000-4000-8000-000000000022') then raise exception 'cross-tenant read bypass'; end if;
 update public.websites set name='unauthorized' where id='00000000-0000-4000-8000-000000000022';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'cross-tenant write bypass'; end if;
 begin insert into storage.objects(bucket_id,name) values('website-assets','sites/other/site/evil.png'); raise exception 'signed storage bypass'; exception when insufficient_privilege then null; end;
end;
$test$;
reset role;
rollback;
