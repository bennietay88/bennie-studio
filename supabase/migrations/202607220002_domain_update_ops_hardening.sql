-- Domain publishing rules, update-request reliability, and important action audit logs.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS custom_domain_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain_permission_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_grace_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_businesses_custom_domain_active_lookup
  ON public.businesses ((lower(custom_domain)), status, subscription_status, custom_domain_status, ssl_status)
  WHERE custom_domain IS NOT NULL AND custom_domain_suspended = false;

CREATE INDEX IF NOT EXISTS idx_websites_business_published
  ON public.websites (business_id, updated_at DESC)
  WHERE status = 'published';

ALTER TABLE public.monthly_update_requests
  ADD COLUMN IF NOT EXISTS client_request_id text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_response text,
  ADD COLUMN IF NOT EXISTS completion_details text,
  ADD COLUMN IF NOT EXISTS declined_reason text,
  ADD COLUMN IF NOT EXISTS support_notified_at timestamptz;

UPDATE public.monthly_update_requests
SET status = CASE
  WHEN status = 'new' THEN 'submitted'
  WHEN status = 'changes_requested' THEN 'waiting_for_customer'
  ELSE status
END
WHERE status IN ('new', 'changes_requested');

ALTER TABLE public.monthly_update_requests
  DROP CONSTRAINT IF EXISTS monthly_update_requests_status_check;

ALTER TABLE public.monthly_update_requests
  ADD CONSTRAINT monthly_update_requests_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'acknowledged',
    'in_progress',
    'waiting_for_customer',
    'completed',
    'declined',
    'cancelled'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_update_requests_client_request
  ON public.monthly_update_requests (business_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_update_requests_business_period_status
  ON public.monthly_update_requests (business_id, allowance_period, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_update_requests_assigned_status
  ON public.monthly_update_requests (assigned_to, status, updated_at DESC)
  WHERE assigned_to IS NOT NULL;

CREATE OR REPLACE FUNCTION public.audit_important_business_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    action := 'plan.changed';
  ELSIF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
    IF NEW.subscription_status = 'active' THEN
      action := 'subscription.activated';
    ELSIF NEW.subscription_status IN ('canceled', 'cancelled', 'inactive') THEN
      action := 'subscription.cancelled';
    ELSE
      action := 'subscription.status_changed';
    END IF;
  ELSIF NEW.custom_domain IS DISTINCT FROM OLD.custom_domain THEN
    action := 'domain.changed';
  ELSIF NEW.stripe_secret_key IS DISTINCT FROM OLD.stripe_secret_key
    OR NEW.stripe_webhook_secret IS DISTINCT FROM OLD.stripe_webhook_secret THEN
    action := 'secret.changed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_action_audit_logs (action_type, target_type, target_id, target_label, metadata)
  VALUES (
    action,
    'business',
    NEW.id::text,
    NEW.name,
    jsonb_build_object(
      'oldPlan', OLD.plan,
      'newPlan', NEW.plan,
      'oldSubscriptionStatus', OLD.subscription_status,
      'newSubscriptionStatus', NEW.subscription_status,
      'oldDomain', OLD.custom_domain,
      'newDomain', NEW.custom_domain
    )
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_important_business_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_business_changes() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_important_website_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action text;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' THEN
    action := 'website.published';
  ELSIF OLD.status = 'published' AND NEW.status <> 'published' THEN
    action := 'website.unpublished';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_action_audit_logs (action_type, target_type, target_id, target_label, metadata)
  VALUES (
    action,
    'website',
    NEW.id::text,
    COALESCE(NEW.slug, NEW.id::text),
    jsonb_build_object('businessId', NEW.business_id, 'oldStatus', OLD.status, 'newStatus', NEW.status)
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_important_website_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_website_changes() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_important_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.admin_action_audit_logs (action_type, target_type, target_id, target_label, metadata)
    VALUES (
      'user.role_changed',
      'profile',
      NEW.id::text,
      NEW.email,
      jsonb_build_object('oldRole', OLD.role, 'newRole', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_important_profile_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_important_profile_changes() FROM anon, authenticated;

DROP TRIGGER IF EXISTS audit_important_business_changes_trigger ON public.businesses;
CREATE TRIGGER audit_important_business_changes_trigger
  AFTER UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.audit_important_business_changes();

DROP TRIGGER IF EXISTS audit_important_website_changes_trigger ON public.websites;
CREATE TRIGGER audit_important_website_changes_trigger
  AFTER UPDATE ON public.websites
  FOR EACH ROW EXECUTE FUNCTION public.audit_important_website_changes();

DROP TRIGGER IF EXISTS audit_important_profile_changes_trigger ON public.profiles;
CREATE TRIGGER audit_important_profile_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_important_profile_changes();

NOTIFY pgrst, 'reload schema';
