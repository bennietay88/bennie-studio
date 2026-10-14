-- Permission-based outreach: a public business address is not marketing consent.
-- Existing prospects default to ineligible, without deleting their research.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS consent_source text;

COMMENT ON COLUMN public.prospects.marketing_consent IS
  'True only after an administrator verifies explicit permission to receive marketing email.';
COMMENT ON COLUMN public.prospects.consent_timestamp IS
  'Original date/time of the recipient opt-in, not the time the CRM record was updated.';
COMMENT ON COLUMN public.prospects.consent_source IS
  'Verifiable evidence/source of email opt-in, such as a recorded form submission or written request.';

ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_marketing_consent_evidence_check
  CHECK (
    NOT marketing_consent OR (
      consent_timestamp IS NOT NULL
      AND consent_timestamp <= now()
      AND length(btrim(coalesce(consent_source, ''))) >= 10
    )
  );
