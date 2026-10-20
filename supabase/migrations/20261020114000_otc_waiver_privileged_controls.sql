CREATE TABLE IF NOT EXISTS public.commercial_otc_waivers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 scope text NOT NULL CHECK(scope IN ('global','customer')),
 business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
 waived boolean NOT NULL DEFAULT false,
 reason text NOT NULL DEFAULT '',
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT commercial_otc_waiver_scope_check CHECK((scope='global' AND business_id IS NULL) OR (scope='customer' AND business_id IS NOT NULL)),
 CONSTRAINT commercial_otc_waivers_business_unique UNIQUE(business_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS commercial_otc_waiver_one_global ON public.commercial_otc_waivers(scope) WHERE scope='global';
ALTER TABLE public.commercial_otc_waivers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_otc_waivers FROM anon,authenticated;
INSERT INTO public.commercial_otc_waivers(scope,waived,reason) VALUES('global',false,'') ON CONFLICT DO NOTHING;