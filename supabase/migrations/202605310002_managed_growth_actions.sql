-- Managed Growth Platform artifacts and queued actions.
-- Safe additive migration. Stores generated audits, offers, reports, manual review imports,
-- proof selections, competitor notes, and improvement tasks without changing existing flows.

CREATE TABLE IF NOT EXISTS public.managed_growth_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority text NOT NULL DEFAULT 'normal',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.managed_growth_actions
  DROP CONSTRAINT IF EXISTS managed_growth_actions_status_check;

ALTER TABLE public.managed_growth_actions
  ADD CONSTRAINT managed_growth_actions_status_check
  CHECK (status IN ('queued', 'in_progress', 'applied', 'ignored', 'completed', 'cancelled'));

ALTER TABLE public.managed_growth_actions
  DROP CONSTRAINT IF EXISTS managed_growth_actions_priority_check;

ALTER TABLE public.managed_growth_actions
  ADD CONSTRAINT managed_growth_actions_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'launch_blocker'));

CREATE INDEX IF NOT EXISTS idx_managed_growth_actions_business_created
  ON public.managed_growth_actions(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_managed_growth_actions_business_type
  ON public.managed_growth_actions(business_id, action_type);

CREATE INDEX IF NOT EXISTS idx_managed_growth_actions_status
  ON public.managed_growth_actions(status);

ALTER TABLE public.managed_growth_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business users manage own managed growth actions" ON public.managed_growth_actions;
CREATE POLICY "Business users manage own managed growth actions" ON public.managed_growth_actions
  FOR ALL USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
