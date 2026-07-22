-- Monthly update request production hardening.
-- Safe additive migration for request categorization, priority, and workflow tracking.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS onboarding_steps jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.monthly_update_requests
  ADD COLUMN IF NOT EXISTS update_category text NOT NULL DEFAULT 'content_update',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.monthly_update_requests
  DROP CONSTRAINT IF EXISTS monthly_update_requests_status_check;

ALTER TABLE public.monthly_update_requests
  ADD CONSTRAINT monthly_update_requests_status_check
  CHECK (status IN ('new', 'in_progress', 'changes_requested', 'completed', 'cancelled'));

ALTER TABLE public.monthly_update_requests
  DROP CONSTRAINT IF EXISTS monthly_update_requests_priority_check;

ALTER TABLE public.monthly_update_requests
  ADD CONSTRAINT monthly_update_requests_priority_check
  CHECK (priority IN ('normal', 'high', 'launch_blocker'));

CREATE INDEX IF NOT EXISTS idx_monthly_update_requests_status
  ON public.monthly_update_requests(status);

CREATE INDEX IF NOT EXISTS idx_monthly_update_requests_priority
  ON public.monthly_update_requests(priority);

CREATE INDEX IF NOT EXISTS idx_monthly_update_requests_period
  ON public.monthly_update_requests(allowance_period);

NOTIFY pgrst, 'reload schema';
