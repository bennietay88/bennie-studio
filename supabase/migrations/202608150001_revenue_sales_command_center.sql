-- Additive proposal compatibility for the unified lead-to-checkout sales workflow.
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_name text,
  ADD COLUMN IF NOT EXISTS value numeric,
  ADD COLUMN IF NOT EXISTS setup_fee numeric,
  ADD COLUMN IF NOT EXISTS scope jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS proposal_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_token
  ON public.proposals(proposal_token);

CREATE INDEX IF NOT EXISTS idx_proposals_lead
  ON public.proposals(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposals_status_expiry
  ON public.proposals(status, expires_at);

UPDATE public.proposals
SET
  value = COALESCE(value, amount),
  expires_at = COALESCE(expires_at, valid_until),
  package_name = COALESCE(package_name, config->>'package_name'),
  setup_fee = COALESCE(setup_fee, NULLIF(config->>'setup_fee', '')::numeric),
  scope = CASE
    WHEN scope = '[]'::jsonb AND jsonb_typeof(config->'scope') = 'array' THEN config->'scope'
    ELSE scope
  END,
  outcome = COALESCE(outcome, config->>'outcome')
WHERE value IS NULL
   OR expires_at IS NULL
   OR package_name IS NULL
   OR setup_fee IS NULL
   OR scope = '[]'::jsonb
   OR outcome IS NULL;

NOTIFY pgrst, 'reload schema';
