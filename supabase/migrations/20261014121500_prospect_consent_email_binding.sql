-- Consent belongs to an email identity, not merely the prospect company.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS consent_email text;

ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_consent_email_matches_contact_check
  CHECK (
    NOT marketing_consent
    OR (
      consent_email IS NOT NULL
      AND length(btrim(consent_email)) > 3
      AND lower(btrim(consent_email)) = lower(btrim(contact_email))
    )
  );

COMMENT ON COLUMN public.prospects.consent_email IS
  'Exact email identity that explicitly opted into Bennie Studio marketing; cannot silently transfer after contact_email changes.';
