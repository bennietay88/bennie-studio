-- Release-specific rollout: preserve existing eligibility and suppression guards.
-- Only the trusted service-role API may submit validated external evidence.
CREATE OR REPLACE FUNCTION private.guard_sales_message_eligibility()
RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $function$
DECLARE
  v_email text;
  v_consent boolean;
  v_consent_at timestamptz;
  v_external_at timestamptz;
  v_external boolean := false;
BEGIN
  IF new.status IN ('queued','scheduled','sending') AND new.prospect_id IS NOT NULL THEN
    SELECT p.contact_email, coalesce(p.marketing_consent,false), p.consent_timestamp
      INTO v_email,v_consent,v_consent_at
    FROM public.prospects p
    WHERE p.id=new.prospect_id AND p.deleted_at IS NULL AND p.archived_at IS NULL;
    IF v_email IS NULL THEN RAISE EXCEPTION 'prospect is not eligible for outreach'; END IF;
    IF EXISTS (SELECT 1 FROM public.sales_suppressions s
      WHERE s.channel IN ('email','all') AND lower(s.email)=lower(trim(v_email))) THEN
      RAISE EXCEPTION 'recipient is suppressed';
    END IF;
    IF NOT v_consent AND current_user = 'service_role'
      AND new.direction = 'outbound' AND new.channel = 'email' AND new.status = 'sending'
      AND new.provider_payload->'directSend' = 'true'::jsonb
      AND new.provider_payload->'recipientPermissionVerified' = 'true'::jsonb
      AND new.provider_payload->>'permissionSource' = 'external_record'
      AND lower(trim(new.recipient)) = lower(trim(v_email))
      AND lower(trim(new.provider_payload->>'permissionRecipient')) = lower(trim(v_email))
      AND new.provider_payload->>'permissionEvidenceHash' ~ '^[a-f0-9]{64}$'
      AND coalesce(new.provider_payload->>'actorId','') <> '' THEN
      BEGIN
        v_external_at := (new.provider_payload->>'permissionConsentTimestamp')::timestamptz;
        v_external := v_external_at IS NOT NULL AND v_external_at <= now()
          AND (v_consent_at IS NULL OR v_external_at > v_consent_at);
      EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
        v_external := false;
      END;
    END IF;
    IF NOT v_consent AND NOT v_external THEN
      RAISE EXCEPTION 'prospect is not eligible for outreach';
    END IF;
  END IF;
  RETURN new;
END;
$function$;
-- Recheck protected fields as well as status to prevent eligibility drift.
DROP TRIGGER IF EXISTS sales_messages_check_prospect_eligibility ON public.sales_messages;
CREATE TRIGGER sales_messages_check_prospect_eligibility
BEFORE INSERT OR UPDATE OF status, prospect_id, recipient, channel, direction, provider_payload
ON public.sales_messages FOR EACH ROW EXECUTE FUNCTION private.guard_sales_message_eligibility();
