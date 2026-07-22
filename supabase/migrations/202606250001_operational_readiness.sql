-- Operational readiness support for admin health checks and audit logging.
-- Safe to run manually in Supabase SQL editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.platform_schema_versions (
  version text PRIMARY KEY,
  description text,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_schema_versions (version, description)
VALUES (
  '202606250001_operational_readiness',
  'Adds schema version tracking and admin action audit logging.'
)
ON CONFLICT (version) DO UPDATE
SET
  description = EXCLUDED.description,
  applied_at = COALESCE(public.platform_schema_versions.applied_at, now());

CREATE TABLE IF NOT EXISTS public.admin_action_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  target_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_audit_logs_actor
  ON public.admin_action_audit_logs (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_audit_logs_action
  ON public.admin_action_audit_logs (action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_audit_logs_target
  ON public.admin_action_audit_logs (target_type, target_id, created_at DESC);

ALTER TABLE public.platform_schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can read schema versions" ON public.platform_schema_versions;
CREATE POLICY "Super admins can read schema versions"
  ON public.platform_schema_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can read admin audit logs" ON public.admin_action_audit_logs;
CREATE POLICY "Super admins can read admin audit logs"
  ON public.admin_action_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can create admin audit logs" ON public.admin_action_audit_logs;
CREATE POLICY "Super admins can create admin audit logs"
  ON public.admin_action_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );
