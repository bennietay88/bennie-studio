-- Release SQL: generate a new Supabase migration with the CLI, copy this SQL into it,
-- replay on staging and validate before deploying the matching application revision.
-- Existing opt-in, suppression, RLS and lawful-basis constraints remain unchanged.
BEGIN;
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_contact_jurisdiction_check,
  ADD CONSTRAINT prospects_contact_jurisdiction_check CHECK (contact_jurisdiction IS NULL OR contact_jurisdiction IN ('US','GB','SG','MY','CA','AU'));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_contact_jurisdiction_check,
  ADD CONSTRAINT leads_contact_jurisdiction_check CHECK (contact_jurisdiction IS NULL OR contact_jurisdiction IN ('US','GB','SG','MY','CA','AU'));
COMMIT;
