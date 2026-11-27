\set ON_ERROR_STOP on
begin;
insert into auth.users values('00000000-0000-4000-8000-000000000011');
insert into auth.sessions values('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000011',now()+interval '1 hour');
update public.businesses set owner_id='00000000-0000-4000-8000-000000000011',internal_access_mode='owner',plan='internal_owner' where id='00000000-0000-4000-8000-000000000001';
insert into public.internal_role_test_owners(owner_id,business_id) values('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001');
do $test$
begin
 if not public.internal_role_session_active('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000111') then raise exception 'active session rejected';end if;
 if public.internal_role_session_active('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000111') then raise exception 'wrong owner accepted';end if;
 if public.effective_website_limit('00000000-0000-4000-8000-000000000001')<>100 then raise exception 'owner limit failed';end if;
 if (select is_active from public.plans where slug='internal_owner') then raise exception 'internal plan purchasable';end if;
 if has_table_privilege('authenticated','public.internal_role_test_owners','INSERT') or has_function_privilege('authenticated','public.internal_role_session_active(uuid,uuid)','EXECUTE') then raise exception 'direct registry access';end if;
 begin update public.businesses set plan='internal_owner' where id='00000000-0000-4000-8000-000000000002';raise exception 'ordinary business accepted internal plan';exception when check_violation then null;end;
end;$test$;
grant update,select on public.businesses to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',true);
do $test$
begin
 begin update public.businesses set internal_access_mode='owner' where id='00000000-0000-4000-8000-000000000002';raise exception 'ordinary customer can self-grant owner mode';exception when insufficient_privilege then null;end;
end;$test$;
reset role;
rollback;
