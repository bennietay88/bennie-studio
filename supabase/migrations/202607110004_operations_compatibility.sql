-- Compatibility patch for Operations Control installations where the original
-- profiles and support_tickets tables predate the operations layer.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS staff_permissions text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.support_tickets AS ticket
SET business_id = profile.business_id
FROM public.profiles AS profile
WHERE ticket.user_id = profile.id
  AND ticket.business_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_business_id
  ON public.support_tickets (business_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.assign_support_ticket_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT profiles.business_id INTO NEW.business_id
    FROM public.profiles
    WHERE profiles.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_support_ticket_business_trigger ON public.support_tickets;
CREATE TRIGGER assign_support_ticket_business_trigger
BEFORE INSERT OR UPDATE OF user_id ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.assign_support_ticket_business();

NOTIFY pgrst, 'reload schema';
