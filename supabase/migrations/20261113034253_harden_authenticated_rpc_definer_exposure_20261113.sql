-- Applied to Bennie Studio Supabase on 2026-11-13.
-- Keep public PostgREST RPCs and existing signatures stable while moving the
-- privileged implementations to an unexposed schema. Preserve every original
-- actor/business permission check, defaults, volatility and return type.
-- No change to Supabase Auth leaked-password protection.
CREATE SCHEMA IF NOT EXISTS app_rpc_impl AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA app_rpc_impl FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_rpc_impl TO authenticated, service_role;
DO $migration$
DECLARE
 f record;
 original_def text;
 arg_pass text;
 v_count integer := 0;
BEGIN
 FOR f IN SELECT p.oid, p.proname,
                  pg_get_function_arguments(p.oid) AS signature_args,
                  pg_get_function_identity_arguments(p.oid) AS identity_args,
                  pg_get_function_result(p.oid) AS result_type,
                  p.provolatile
          FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
          WHERE n.nspname='public' AND p.prosecdef
            AND p.proname = ANY(ARRAY['account_service_contract','admin_update_monthly_update_request','customer_respond_monthly_update_request','escalate_monthly_update_request','get_monthly_update_allowance','grant_monthly_update_allowance_override','list_monthly_update_allowance_overrides','revoke_monthly_update_allowance_override','submit_monthly_update_request'])
          ORDER BY p.proname
 LOOP
  v_count := v_count + 1;
  original_def := pg_get_functiondef(f.oid);
  IF original_def NOT LIKE 'CREATE OR REPLACE FUNCTION public.%' THEN
    RAISE EXCEPTION 'Unexpected RPC definition for %', f.proname;
  END IF;
  EXECUTE replace(original_def,'CREATE OR REPLACE FUNCTION public.',
                              'CREATE OR REPLACE FUNCTION app_rpc_impl.');
  EXECUTE format('REVOKE ALL ON FUNCTION app_rpc_impl.%I(%s) FROM PUBLIC, anon, authenticated',f.proname,f.identity_args);
  EXECUTE format('GRANT EXECUTE ON FUNCTION app_rpc_impl.%I(%s) TO authenticated, service_role',f.proname,f.identity_args);
  arg_pass := CASE f.proname
    WHEN 'account_service_contract' THEN 'p_business_id'
    WHEN 'admin_update_monthly_update_request' THEN 'p_request_id,p_status,p_scope_classification,p_scope_notes,p_admin_response'
    WHEN 'customer_respond_monthly_update_request' THEN 'p_request_id,p_response,p_idempotency_key'
    WHEN 'escalate_monthly_update_request' THEN 'p_request_id,p_reason'
    WHEN 'get_monthly_update_allowance' THEN 'p_business_id'
    WHEN 'grant_monthly_update_allowance_override' THEN 'p_business_id,p_allowance_period,p_allowance_delta,p_reason,p_idempotency_key'
    WHEN 'list_monthly_update_allowance_overrides' THEN 'p_business_id'
    WHEN 'revoke_monthly_update_allowance_override' THEN 'p_override_id,p_reason'
    WHEN 'submit_monthly_update_request' THEN 'p_request'
    ELSE NULL END;
  IF arg_pass IS NULL THEN RAISE EXCEPTION 'Unrecognized wrapper %',f.proname; END IF;
  EXECUTE format(
     'CREATE OR REPLACE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql %s SECURITY INVOKER SET search_path = '''' AS $wrapped$ SELECT * FROM app_rpc_impl.%I(%s) $wrapped$;',
     f.proname, f.signature_args, f.result_type,
     CASE f.provolatile WHEN 's' THEN 'STABLE' WHEN 'i' THEN 'IMMUTABLE' ELSE 'VOLATILE' END,
     f.proname, arg_pass);
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',f.proname,f.identity_args);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',f.proname,f.identity_args);
 END LOOP;
 IF v_count <> 9 THEN RAISE EXCEPTION 'Expected exactly nine RPCs, found %',v_count; END IF;
END $migration$;
