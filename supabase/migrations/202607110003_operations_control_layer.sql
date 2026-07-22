-- Connected operations layer: staff permissions, prospect conversion, delivery,
-- customer approvals, billing lifecycle, retention health inputs, and audit history.
-- Apply manually after 202607110001 and 202607110002.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_permissions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS full_name text;

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

CREATE OR REPLACE FUNCTION public.has_platform_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR (
          profiles.role = 'platform_staff'
          AND p_permission = ANY(profiles.staff_permissions)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_platform_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(text) TO authenticated;

DO $$
DECLARE
  role_constraint record;
BEGIN
  FOR role_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', role_constraint.conname);
  END LOOP;
END $$;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'platform_staff', 'business_admin', 'staff', 'client', 'affiliate'));

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS converted_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  title text,
  type text NOT NULL DEFAULT 'waas',
  package_name text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_launch_date date,
  delivery_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_launch_date date,
  ADD COLUMN IF NOT EXISTS delivery_checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.customer_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  approval_type text NOT NULL DEFAULT 'website_review',
  title text NOT NULL,
  description text,
  version_label text,
  preview_url text,
  status text NOT NULL DEFAULT 'pending',
  customer_notes text,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  responded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_approvals_status_check
    CHECK (status IN ('pending', 'approved', 'changes_requested', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.billing_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'platform',
  amount numeric(12,2),
  currency text,
  due_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_lifecycle_status_check
    CHECK (status IN ('open', 'processing', 'resolved', 'ignored'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_staff_permissions
  ON public.profiles USING gin (staff_permissions);
CREATE INDEX IF NOT EXISTS idx_prospects_converted_business
  ON public.prospects (converted_business_id);
CREATE INDEX IF NOT EXISTS idx_projects_business_status
  ON public.projects (business_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_approvals_business_status
  ON public.customer_approvals (business_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_lifecycle_business_status
  ON public.billing_lifecycle_events (business_id, status, created_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform operators manage projects" ON public.projects;
CREATE POLICY "Platform operators manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (public.has_platform_permission('delivery'))
  WITH CHECK (public.has_platform_permission('delivery'));

DROP POLICY IF EXISTS "Customers view their projects" ON public.projects;
CREATE POLICY "Customers view their projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.business_id = projects.business_id
    )
  );

DROP POLICY IF EXISTS "Platform operators manage approvals" ON public.customer_approvals;
CREATE POLICY "Platform operators manage approvals"
  ON public.customer_approvals FOR ALL TO authenticated
  USING (public.has_platform_permission('approvals'))
  WITH CHECK (public.has_platform_permission('approvals'));

DROP POLICY IF EXISTS "Customers view their approvals" ON public.customer_approvals;
CREATE POLICY "Customers view their approvals"
  ON public.customer_approvals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.business_id = customer_approvals.business_id
    )
  );

DROP POLICY IF EXISTS "Customers respond to their approvals" ON public.customer_approvals;
CREATE POLICY "Customers respond to their approvals"
  ON public.customer_approvals FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.business_id = customer_approvals.business_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.business_id = customer_approvals.business_id
    )
  );

CREATE OR REPLACE FUNCTION public.protect_customer_approval_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.has_platform_permission('approvals') THEN
    RETURN NEW;
  END IF;

  IF NEW.business_id IS DISTINCT FROM OLD.business_id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.website_id IS DISTINCT FROM OLD.website_id
    OR NEW.approval_type IS DISTINCT FROM OLD.approval_type
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.version_label IS DISTINCT FROM OLD.version_label
    OR NEW.preview_url IS DISTINCT FROM OLD.preview_url
    OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
    OR NEW.requested_at IS DISTINCT FROM OLD.requested_at
    OR NEW.status NOT IN ('approved', 'changes_requested')
  THEN
    RAISE EXCEPTION 'Only the approval response fields may be changed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_customer_approval_fields_trigger
  ON public.customer_approvals;
CREATE TRIGGER protect_customer_approval_fields_trigger
BEFORE UPDATE ON public.customer_approvals
FOR EACH ROW EXECUTE FUNCTION public.protect_customer_approval_fields();

DROP POLICY IF EXISTS "Platform operators manage billing lifecycle" ON public.billing_lifecycle_events;
CREATE POLICY "Platform operators manage billing lifecycle"
  ON public.billing_lifecycle_events FOR ALL TO authenticated
  USING (public.has_platform_permission('billing'))
  WITH CHECK (public.has_platform_permission('billing'));

DROP POLICY IF EXISTS "Platform operators read audit history" ON public.admin_action_audit_logs;
CREATE POLICY "Platform operators read audit history"
  ON public.admin_action_audit_logs FOR SELECT TO authenticated
  USING (public.has_platform_permission('activity_logs'));

DROP POLICY IF EXISTS "Platform operators create audit history" ON public.admin_action_audit_logs;
CREATE POLICY "Platform operators create audit history"
  ON public.admin_action_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'platform_staff')
    )
  );

DROP POLICY IF EXISTS "Platform operators can read prospects" ON public.prospects;
DROP POLICY IF EXISTS "Platform operators can create prospects" ON public.prospects;
DROP POLICY IF EXISTS "Platform operators can update prospects" ON public.prospects;
DROP POLICY IF EXISTS "Platform operators can delete prospects" ON public.prospects;
DROP POLICY IF EXISTS "Permitted staff view prospects" ON public.prospects;
CREATE POLICY "Permitted staff view prospects"
  ON public.prospects FOR SELECT TO authenticated
  USING (public.has_platform_permission('prospects') OR public.has_platform_permission('sales'));

DROP POLICY IF EXISTS "Permitted staff manage prospects" ON public.prospects;
CREATE POLICY "Permitted staff manage prospects"
  ON public.prospects FOR ALL TO authenticated
  USING (public.has_platform_permission('prospects') OR public.has_platform_permission('sales'))
  WITH CHECK (public.has_platform_permission('prospects') OR public.has_platform_permission('sales'));

DROP POLICY IF EXISTS "Delivery staff manage onboarding sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Platform operators can view onboarding sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Platform operators can create onboarding sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Platform operators can update onboarding sessions" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Platform operators can delete onboarding sessions" ON public.onboarding_sessions;
CREATE POLICY "Delivery staff manage onboarding sessions"
  ON public.onboarding_sessions FOR ALL TO authenticated
  USING (public.has_platform_permission('delivery'))
  WITH CHECK (public.has_platform_permission('delivery'));

DROP POLICY IF EXISTS "Platform operators can view handover businesses" ON public.businesses;
DROP POLICY IF EXISTS "Permitted staff view businesses" ON public.businesses;
CREATE POLICY "Permitted staff view businesses"
  ON public.businesses FOR SELECT TO authenticated
  USING (
    public.has_platform_permission('prospects')
    OR public.has_platform_permission('sales')
    OR public.has_platform_permission('delivery')
    OR public.has_platform_permission('approvals')
    OR public.has_platform_permission('support')
    OR public.has_platform_permission('customer_health')
    OR public.has_platform_permission('billing')
  );

DROP POLICY IF EXISTS "Platform operators can read audit reports" ON public.audit_reports;
DROP POLICY IF EXISTS "Platform operators can create audit reports" ON public.audit_reports;
DROP POLICY IF EXISTS "Platform operators can update audit reports" ON public.audit_reports;
DROP POLICY IF EXISTS "Permitted staff manage audit reports" ON public.audit_reports;
CREATE POLICY "Permitted staff manage audit reports"
  ON public.audit_reports FOR ALL TO authenticated
  USING (public.has_platform_permission('prospects'))
  WITH CHECK (public.has_platform_permission('prospects'));

DROP POLICY IF EXISTS "Health staff view websites" ON public.websites;
CREATE POLICY "Health staff view websites"
  ON public.websites FOR SELECT TO authenticated
  USING (public.has_platform_permission('customer_health') OR public.has_platform_permission('delivery'));

DROP POLICY IF EXISTS "Health staff view leads" ON public.leads;
CREATE POLICY "Health staff view leads"
  ON public.leads FOR SELECT TO authenticated
  USING (public.has_platform_permission('customer_health'));

DROP POLICY IF EXISTS "Support staff view tickets" ON public.support_tickets;
CREATE POLICY "Support staff view tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_platform_permission('support') OR public.has_platform_permission('customer_health'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_lifecycle_events TO authenticated;
GRANT SELECT, INSERT ON public.admin_action_audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.convert_prospect_to_customer(
  p_prospect_id uuid,
  p_plan text,
  p_subdomain text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prospect public.prospects%ROWTYPE;
  v_business_id uuid;
  v_subdomain text;
BEGIN
  IF NOT public.has_platform_permission('sales') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_plan NOT IN ('starter', 'business', 'growth', 'premium', 'authority') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;

  v_subdomain := lower(regexp_replace(trim(p_subdomain), '[^a-zA-Z0-9-]+', '-', 'g'));
  v_subdomain := trim(both '-' from v_subdomain);
  IF length(v_subdomain) < 3 THEN
    RAISE EXCEPTION 'Subdomain must contain at least three characters';
  END IF;

  SELECT * INTO v_prospect
  FROM public.prospects
  WHERE id = p_prospect_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Prospect not found'; END IF;
  IF v_prospect.converted_business_id IS NOT NULL THEN
    RETURN v_prospect.converted_business_id;
  END IF;

  INSERT INTO public.businesses (
    name, plan, status, subscription_status, trial_ends_at,
    industry, location, subdomain, platform_type
  ) VALUES (
    v_prospect.name, p_plan, 'active', 'trialing', now() + interval '14 days',
    v_prospect.industry, v_prospect.location, v_subdomain, 'waas'
  ) RETURNING id INTO v_business_id;

  INSERT INTO public.projects (
    business_id, title, type, package_name, status, priority
  ) VALUES (
    v_business_id, v_prospect.name || ' Managed Website', 'waas', p_plan,
    'pending', CASE WHEN v_prospect.opportunity_level = 'high' THEN 'high' ELSE 'medium' END
  );

  INSERT INTO public.onboarding_sessions (
    business_id, current_step, status, progress, notes
  ) VALUES (
    v_business_id, 'Business details required', 'In Progress', 5,
    'Created from prospect conversion.'
  );

  UPDATE public.prospects
  SET converted_business_id = v_business_id,
      converted_at = now(),
      outreach_status = 'won',
      status = 'converted',
      updated_at = now()
  WHERE id = p_prospect_id;

  INSERT INTO public.admin_action_audit_logs (
    actor_user_id, action_type, target_type, target_id, target_label, metadata
  ) VALUES (
    auth.uid(), 'prospect.converted', 'business', v_business_id::text,
    v_prospect.name, jsonb_build_object('prospect_id', p_prospect_id, 'plan', p_plan)
  );

  RETURN v_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_prospect_to_customer(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_prospect_to_customer(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_handover_platform_type(
  p_business_id uuid,
  p_platform_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_platform_permission('delivery') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_platform_type NOT IN ('waas', 'wordpress') THEN
    RAISE EXCEPTION 'Invalid platform type';
  END IF;
  UPDATE public.businesses SET platform_type = p_platform_type WHERE id = p_business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Business not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_handover_platform_type(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_handover_platform_type(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_billing_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
    INSERT INTO public.billing_lifecycle_events (
      business_id, event_type, status, source, due_at, metadata
    ) VALUES (
      NEW.id,
      CASE
        WHEN NEW.subscription_status IN ('past_due', 'unpaid') THEN 'payment_attention_required'
        WHEN NEW.subscription_status IN ('canceled', 'cancelled') THEN 'subscription_cancelled'
        WHEN NEW.subscription_status IN ('active', 'trialing') THEN 'subscription_activated'
        ELSE 'subscription_status_changed'
      END,
      CASE WHEN NEW.subscription_status IN ('past_due', 'unpaid') THEN 'open' ELSE 'resolved' END,
      'business_subscription_trigger',
      CASE WHEN NEW.subscription_status IN ('past_due', 'unpaid') THEN now() + interval '3 days' ELSE NULL END,
      jsonb_build_object('previous', OLD.subscription_status, 'current', NEW.subscription_status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_billing_lifecycle_trigger ON public.businesses;
CREATE TRIGGER businesses_billing_lifecycle_trigger
AFTER UPDATE OF subscription_status ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.capture_billing_lifecycle_event();

CREATE OR REPLACE FUNCTION public.capture_operations_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_target_type text := TG_TABLE_NAME;
  v_target_id text;
  v_target_label text;
  v_metadata jsonb := '{}'::jsonb;
BEGIN
  IF TG_TABLE_NAME = 'projects' THEN
    v_action := CASE WHEN TG_OP = 'INSERT' THEN 'project.created' ELSE 'project.updated' END;
    v_target_id := NEW.id::text;
    v_target_label := COALESCE(NEW.title, 'Website project');
    v_metadata := jsonb_build_object('status', NEW.status, 'business_id', NEW.business_id);
  ELSIF TG_TABLE_NAME = 'customer_approvals' THEN
    v_action := CASE
      WHEN TG_OP = 'INSERT' THEN 'approval.requested'
      WHEN NEW.status = 'approved' THEN 'approval.approved'
      WHEN NEW.status = 'changes_requested' THEN 'approval.changes_requested'
      ELSE 'approval.updated'
    END;
    v_target_id := NEW.id::text;
    v_target_label := NEW.title;
    v_metadata := jsonb_build_object('status', NEW.status, 'business_id', NEW.business_id);
  END IF;

  INSERT INTO public.admin_action_audit_logs (
    actor_user_id, action_type, target_type, target_id, target_label, metadata
  ) VALUES (
    auth.uid(), v_action, v_target_type, v_target_id, v_target_label, v_metadata
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_operations_activity() FROM PUBLIC;

DROP TRIGGER IF EXISTS projects_operations_activity_trigger ON public.projects;
CREATE TRIGGER projects_operations_activity_trigger
AFTER INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.capture_operations_activity();

DROP TRIGGER IF EXISTS approvals_operations_activity_trigger ON public.customer_approvals;
CREATE TRIGGER approvals_operations_activity_trigger
AFTER INSERT OR UPDATE ON public.customer_approvals
FOR EACH ROW EXECUTE FUNCTION public.capture_operations_activity();

NOTIFY pgrst, 'reload schema';
