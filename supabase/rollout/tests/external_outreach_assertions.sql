-- Disposable PostgreSQL regression test. No real recipients or email delivery.
BEGIN;
CREATE TABLE public.prospects(id uuid primary key,contact_email text,marketing_consent boolean,consent_timestamp timestamptz,deleted_at timestamptz,archived_at timestamptz);
CREATE TABLE public.sales_suppressions(email text,channel text);
CREATE TABLE public.sales_messages(id uuid default gen_random_uuid(),prospect_id uuid,recipient text,channel text,direction text,status text,provider_payload jsonb);
GRANT SELECT,INSERT,UPDATE ON public.prospects,public.sales_messages,public.sales_suppressions TO service_role,authenticated;
\ir ../external_outreach_eligibility.sql
INSERT INTO public.prospects VALUES ('00000000-0000-4000-8000-000000000101','fixture@example.test',false,null,null,null);
CREATE FUNCTION public.test_external_message(payload jsonb, recipient text default 'fixture@example.test', state text default 'sending') RETURNS void LANGUAGE sql AS $$
INSERT INTO public.sales_messages(prospect_id,recipient,channel,direction,status,provider_payload) VALUES ('00000000-0000-4000-8000-000000000101',recipient,'email','outbound',state,payload)
$$;
CREATE FUNCTION public.test_expect_rejection(payload jsonb, recipient text default 'fixture@example.test', state text default 'sending', expected text default 'prospect is not eligible for outreach') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    PERFORM public.test_external_message(payload,recipient,state);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = expected THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Unexpectedly accepted message';
END;
$$;
CREATE FUNCTION public.test_evidence() RETURNS jsonb LANGUAGE sql AS $$
SELECT jsonb_build_object('directSend',true,'recipientPermissionVerified',true,'permissionSource','external_record','permissionRecipient','fixture@example.test','permissionEvidenceHash',repeat('a',64),'actorId','fixture-admin','permissionConsentTimestamp','2026-08-25T10:00:00Z')
$$;
SET LOCAL ROLE service_role;
SELECT public.test_expect_rejection('{}');
SELECT public.test_expect_rejection(public.test_evidence(),'other@example.test');
SELECT public.test_expect_rejection(public.test_evidence(),'fixture@example.test','queued');
SELECT public.test_expect_rejection(public.test_evidence() || '{"permissionConsentTimestamp":"2999-01-01T00:00:00Z"}');
SELECT public.test_external_message(public.test_evidence());
DO $$ BEGIN
 IF (SELECT marketing_consent FROM public.prospects LIMIT 1) IS DISTINCT FROM false THEN RAISE EXCEPTION 'CRM consent mutated'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT public.test_expect_rejection(public.test_evidence());
RESET ROLE;
UPDATE public.prospects SET consent_timestamp='2026-09-01T00:00:00Z';
SET LOCAL ROLE service_role;
SELECT public.test_expect_rejection(public.test_evidence());
RESET ROLE;
UPDATE public.prospects SET consent_timestamp=null;
INSERT INTO public.sales_suppressions VALUES('fixture@example.test','email');
SET LOCAL ROLE service_role;
SELECT public.test_expect_rejection(public.test_evidence(),'fixture@example.test','sending','recipient is suppressed');
RESET ROLE;
DELETE FROM public.sales_suppressions;
UPDATE public.prospects SET archived_at=now();
SET LOCAL ROLE service_role;
SELECT public.test_expect_rejection(public.test_evidence());
RESET ROLE;
UPDATE public.prospects SET archived_at=null,marketing_consent=true;
SET LOCAL ROLE service_role;
SELECT public.test_external_message('{}');
RESET ROLE;
ROLLBACK;
