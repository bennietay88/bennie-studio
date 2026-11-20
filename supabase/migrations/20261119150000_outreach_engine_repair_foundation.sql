-- Outreach repair foundation. Additive and forward-only: no historical message,
-- consent, website-status, task, or prospect rows are rewritten by this migration.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS website_evidence_source_url text,
  ADD COLUMN IF NOT EXISTS website_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS website_verification_method text,
  ADD COLUMN IF NOT EXISTS website_finding text,
  ADD COLUMN IF NOT EXISTS website_evidence_confidence text,
  ADD COLUMN IF NOT EXISTS website_verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS qualification_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS qualification_component_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS qualification_score_version text,
  ADD COLUMN IF NOT EXISTS qualification_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS recommended_next_action text,
  ADD COLUMN IF NOT EXISTS contact_jurisdiction text,
  ADD COLUMN IF NOT EXISTS contact_recipient_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS contact_lawful_basis text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS contact_eligibility_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_eligibility_reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_jurisdiction text,
  ADD COLUMN IF NOT EXISTS contact_recipient_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS contact_lawful_basis text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS contact_eligibility_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_eligibility_reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.prospects
  DROP CONSTRAINT IF EXISTS prospects_website_evidence_confidence_check,
  ADD CONSTRAINT prospects_website_evidence_confidence_check
    CHECK (website_evidence_confidence IS NULL OR website_evidence_confidence IN ('low','medium','high')),
  DROP CONSTRAINT IF EXISTS prospects_contact_jurisdiction_check,
  ADD CONSTRAINT prospects_contact_jurisdiction_check
    CHECK (contact_jurisdiction IS NULL OR contact_jurisdiction IN ('US','GB','SG','MY')),
  DROP CONSTRAINT IF EXISTS prospects_contact_recipient_type_check,
  ADD CONSTRAINT prospects_contact_recipient_type_check
    CHECK (contact_recipient_type IN ('business','individual','unknown')),
  DROP CONSTRAINT IF EXISTS prospects_contact_lawful_basis_check,
  ADD CONSTRAINT prospects_contact_lawful_basis_check
    CHECK (contact_lawful_basis IN ('consent','legitimate_interest','contract','legal_obligation','unknown'));

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_contact_jurisdiction_check,
  ADD CONSTRAINT leads_contact_jurisdiction_check
    CHECK (contact_jurisdiction IS NULL OR contact_jurisdiction IN ('US','GB','SG','MY')),
  DROP CONSTRAINT IF EXISTS leads_contact_recipient_type_check,
  ADD CONSTRAINT leads_contact_recipient_type_check
    CHECK (contact_recipient_type IN ('business','individual','unknown')),
  DROP CONSTRAINT IF EXISTS leads_contact_lawful_basis_check,
  ADD CONSTRAINT leads_contact_lawful_basis_check
    CHECK (contact_lawful_basis IN ('consent','legitimate_interest','contract','legal_obligation','unknown'));

-- Guard only new classifications and explicit status changes. Historical rows are
-- preserved so a migration cannot silently relabel imported records as verified.
CREATE OR REPLACE FUNCTION private.require_website_evidence_for_new_classification()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.website_status IS DISTINCT FROM OLD.website_status)
     AND NEW.website_status IN ('no_website','weak','average','strong')
     AND (NEW.website_evidence_source_url IS NULL OR NEW.website_evidence_source_url !~* '^https?://'
       OR NEW.website_verified_at IS NULL
       OR NULLIF(btrim(NEW.website_verification_method),'') IS NULL
       OR NULLIF(btrim(NEW.website_finding),'') IS NULL
       OR NEW.website_evidence_confidence IS NULL
       OR NEW.website_verified_at > now()
       OR NEW.website_verified_by IS NULL) THEN
    RAISE EXCEPTION 'website status requires dated, attributable evidence';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospects_require_website_evidence ON public.prospects;
CREATE TRIGGER prospects_require_website_evidence
  BEFORE INSERT OR UPDATE OF website_status ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION private.require_website_evidence_for_new_classification();

ALTER TABLE public.sales_messages
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS provider_mailbox text,
  ADD COLUMN IF NOT EXISTS from_address text,
  ADD COLUMN IF NOT EXISTS reply_to_address text,
  ADD COLUMN IF NOT EXISTS attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_state text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS delivery_uncertainty_reason text,
  ADD COLUMN IF NOT EXISTS last_provider_event text,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS campaign_id text;

ALTER TABLE public.sales_messages
  DROP CONSTRAINT IF EXISTS sales_messages_delivery_state_check,
  ADD CONSTRAINT sales_messages_delivery_state_check
    CHECK (delivery_state IN ('unknown','provider_accepted','delivery_unconfirmed','delivery_confirmed','bounced','complained','rejected','failed','uncertain'));

CREATE INDEX IF NOT EXISTS sales_messages_provider_message_idx
  ON public.sales_messages(provider_name, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_messages_delivery_state_created_idx
  ON public.sales_messages(delivery_state, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sales_email_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('resend','hostinger')),
  event_key text NOT NULL,
  provider_event_id text,
  event_type text NOT NULL,
  provider_message_id text,
  message_id uuid REFERENCES public.sales_messages(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  occurred_at timestamptz,
  match_method text,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_email_provider_events_event_key_unique UNIQUE(provider,event_key)
);

ALTER TABLE public.sales_email_provider_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sales operators read email provider event ledger" ON public.sales_email_provider_events;
CREATE POLICY "Sales operators read email provider event ledger"
  ON public.sales_email_provider_events FOR SELECT TO authenticated
  USING (private.is_super_admin() OR public.has_platform_permission('sales'));
REVOKE ALL ON public.sales_email_provider_events FROM anon, authenticated;
GRANT SELECT ON public.sales_email_provider_events TO authenticated;
GRANT INSERT, SELECT ON public.sales_email_provider_events TO service_role;

CREATE OR REPLACE FUNCTION private.reject_sales_email_event_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'sales email provider events are append-only';
END;
$$;
CREATE OR REPLACE FUNCTION private.reject_sales_email_event_truncate()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'sales email provider events are append-only';
END;
$$;
DROP TRIGGER IF EXISTS sales_email_provider_events_append_only ON public.sales_email_provider_events;
CREATE TRIGGER sales_email_provider_events_append_only
  BEFORE UPDATE OR DELETE ON public.sales_email_provider_events
  FOR EACH ROW EXECUTE FUNCTION private.reject_sales_email_event_mutation();
DROP TRIGGER IF EXISTS sales_email_provider_events_no_truncate ON public.sales_email_provider_events;
CREATE TRIGGER sales_email_provider_events_no_truncate
  BEFORE TRUNCATE ON public.sales_email_provider_events
  FOR EACH STATEMENT EXECUTE FUNCTION private.reject_sales_email_event_truncate();

-- Keep the historical category values readable while permitting the new tier model.
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_qualification_category_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_qualification_category_check
  CHECK (qualification_category IS NULL OR qualification_category IN
    ('high_intent','qualified','nurture','tier_a','tier_b','tier_c','reject'));

NOTIFY pgrst, 'reload schema';
