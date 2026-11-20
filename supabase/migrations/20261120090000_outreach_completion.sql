-- Bennie Studio outreach completion.
-- Additive schema only. No campaign activation, lead backfill or outbound sends.
-- Reviewed for public API access: all new tables are service-role only with RLS enabled.
CREATE TABLE IF NOT EXISTS public.outreach_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 140),
  hypothesis text NOT NULL CHECK (char_length(hypothesis) BETWEEN 8 AND 2000),
  segment text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','paused','active','completed','archived')),
  primary_metric text NOT NULL DEFAULT 'human_reply'
    CHECK (primary_metric IN ('human_reply','positive_reply','meeting','verified_payment')),
  variant_a jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant_b jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_experiments_distinct_copy CHECK (variant_a IS DISTINCT FROM variant_b)
);

CREATE TABLE IF NOT EXISTS public.outreach_experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.outreach_experiments(id) ON DELETE RESTRICT,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
  variant text NOT NULL CHECK (variant IN ('A','B')),
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, prospect_id)
);
CREATE INDEX IF NOT EXISTS outreach_experiment_assignment_prospect_idx
  ON public.outreach_experiment_assignments(prospect_id, created_at DESC);

ALTER TABLE public.sales_messages
  ADD COLUMN IF NOT EXISTS outreach_experiment_id uuid REFERENCES public.outreach_experiments(id),
  ADD COLUMN IF NOT EXISTS outreach_experiment_variant text CHECK (outreach_experiment_variant IN ('A','B'));
CREATE INDEX IF NOT EXISTS sales_messages_experiment_idx
  ON public.sales_messages(outreach_experiment_id, outreach_experiment_variant, created_at DESC)
  WHERE outreach_experiment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.outreach_attribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE RESTRICT,
  lead_id uuid REFERENCES public.leads(id) ON DELETE RESTRICT,
  business_id uuid REFERENCES public.businesses(id) ON DELETE RESTRICT,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE RESTRICT,
  message_id uuid REFERENCES public.sales_messages(id) ON DELETE RESTRICT,
  event_type text NOT NULL
    CHECK (event_type IN ('qualified_conversation','meeting_confirmed','proposal_sent',
                         'proposal_accepted','customer_won','customer_lost','payment_verified')),
  occurred_at timestamptz NOT NULL,
  amount numeric(18,2) CHECK (amount IS NULL OR amount >= 0),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  evidence_url text,
  notes text,
  provider_verified boolean NOT NULL DEFAULT false,
  verification_source text NOT NULL DEFAULT 'manual'
    CHECK (verification_source IN ('manual','stripe')),
  source_event_key text UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_attribution_has_contact CHECK (prospect_id IS NOT NULL OR lead_id IS NOT NULL),
  CONSTRAINT outreach_attribution_verified_payment CHECK (
    event_type <> 'payment_verified'
    OR (provider_verified = true AND verification_source = 'stripe' AND source_event_key IS NOT NULL)
  ),
  CONSTRAINT outreach_attribution_manual_not_verified CHECK (
    verification_source <> 'manual' OR provider_verified = false
  )
);
CREATE INDEX IF NOT EXISTS outreach_attribution_prospect_created_idx
  ON public.outreach_attribution_events(prospect_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS outreach_attribution_lead_created_idx
  ON public.outreach_attribution_events(lead_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.outreach_evidence_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE RESTRICT,
  event_type text NOT NULL
    CHECK (event_type IN ('website_verified','qualification_scored',
                         'contact_permission_reviewed','task_reviewed')),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  previous_record jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_record jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outreach_evidence_audit_prospect_idx
  ON public.outreach_evidence_audit(prospect_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.outreach_acquisition_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text,
  source_type text NOT NULL
    CHECK (source_type IN ('lead_research','verified_data','campaign_production','email_provider','other')),
  market text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  evidence_url text NOT NULL CHECK (evidence_url ~ '^https?://'),
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_cost_period_valid CHECK (period_end >= period_start)
);
CREATE INDEX IF NOT EXISTS outreach_acquisition_cost_period_idx
  ON public.outreach_acquisition_costs(period_start, period_end, campaign_id);

-- Browser clients cannot read prospect evidence, commercial contracts or campaign budgets.
ALTER TABLE public.outreach_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_evidence_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_acquisition_costs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.outreach_experiments, public.outreach_experiment_assignments,
  public.outreach_attribution_events, public.outreach_evidence_audit, public.outreach_acquisition_costs
  FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.outreach_experiments TO service_role;
GRANT SELECT, INSERT ON public.outreach_experiment_assignments TO service_role;
GRANT SELECT, INSERT ON public.outreach_attribution_events TO service_role;
GRANT SELECT, INSERT ON public.outreach_evidence_audit TO service_role;
GRANT SELECT, INSERT ON public.outreach_acquisition_costs TO service_role;

-- Enforce append-only audit histories even from a service-role client.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION private.reject_outreach_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $audit$
BEGIN
  RAISE EXCEPTION 'outreach audit and attribution events are append-only';
END;
$audit$;
DROP TRIGGER IF EXISTS outreach_evidence_audit_append_only ON public.outreach_evidence_audit;
CREATE TRIGGER outreach_evidence_audit_append_only
  BEFORE UPDATE OR DELETE ON public.outreach_evidence_audit
  FOR EACH ROW EXECUTE FUNCTION private.reject_outreach_audit_mutation();
DROP TRIGGER IF EXISTS outreach_attribution_append_only ON public.outreach_attribution_events;
CREATE TRIGGER outreach_attribution_append_only
  BEFORE UPDATE OR DELETE ON public.outreach_attribution_events
  FOR EACH ROW EXECUTE FUNCTION private.reject_outreach_audit_mutation();
DROP TRIGGER IF EXISTS outreach_costs_append_only ON public.outreach_acquisition_costs;
CREATE TRIGGER outreach_costs_append_only
  BEFORE UPDATE OR DELETE ON public.outreach_acquisition_costs
  FOR EACH ROW EXECUTE FUNCTION private.reject_outreach_audit_mutation();

NOTIFY pgrst, 'reload schema';
