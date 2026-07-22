-- Lead generation automation engine.
-- Additive migration for CRM scoring, follow-up activity, review campaigns, and monthly reports.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS automation_score integer,
  ADD COLUMN IF NOT EXISTS automation_temperature text,
  ADD COLUMN IF NOT EXISTS automation_next_action text,
  ADD COLUMN IF NOT EXISTS last_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_automation_temperature_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_automation_temperature_check
  CHECK (automation_temperature IS NULL OR automation_temperature IN ('Cold', 'Warm', 'Hot'));

CREATE TABLE IF NOT EXISTS public.lead_follow_up_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  event_type text NOT NULL DEFAULT 'manual_follow_up',
  script text,
  status text NOT NULL DEFAULT 'queued',
  scheduled_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_follow_up_events
  DROP CONSTRAINT IF EXISTS lead_follow_up_events_channel_check;

ALTER TABLE public.lead_follow_up_events
  ADD CONSTRAINT lead_follow_up_events_channel_check
  CHECK (channel IN ('whatsapp', 'email', 'phone', 'sms', 'manual'));

ALTER TABLE public.lead_follow_up_events
  DROP CONSTRAINT IF EXISTS lead_follow_up_events_status_check;

ALTER TABLE public.lead_follow_up_events
  ADD CONSTRAINT lead_follow_up_events_status_check
  CHECK (status IN ('queued', 'sent', 'completed', 'skipped', 'failed'));

CREATE TABLE IF NOT EXISTS public.review_request_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  google_review_url text,
  message_template text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  target_segment text NOT NULL DEFAULT 'completed_customers',
  sent_count integer NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_request_campaigns
  DROP CONSTRAINT IF EXISTS review_request_campaigns_status_check;

ALTER TABLE public.review_request_campaigns
  ADD CONSTRAINT review_request_campaigns_status_check
  CHECK (status IN ('draft', 'active', 'paused', 'completed'));

CREATE TABLE IF NOT EXISTS public.monthly_growth_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  website_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  report_month text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  lead_count integer NOT NULL DEFAULT 0,
  hot_lead_count integer NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  local_seo_page_count integer NOT NULL DEFAULT 0,
  summary text,
  recommendations text[] NOT NULL DEFAULT '{}',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (business_id, report_month)
);

ALTER TABLE public.monthly_growth_reports
  DROP CONSTRAINT IF EXISTS monthly_growth_reports_status_check;

ALTER TABLE public.monthly_growth_reports
  ADD CONSTRAINT monthly_growth_reports_status_check
  CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_leads_business_automation
  ON public.leads(business_id, automation_temperature, next_follow_up_at);

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_business_lead
  ON public.lead_follow_up_events(business_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_scheduled
  ON public.lead_follow_up_events(scheduled_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_review_request_campaigns_business
  ON public.review_request_campaigns(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_business_month
  ON public.monthly_growth_reports(business_id, report_month DESC);

ALTER TABLE public.lead_follow_up_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_request_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_growth_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business users manage own lead follow up events" ON public.lead_follow_up_events;
CREATE POLICY "Business users manage own lead follow up events" ON public.lead_follow_up_events
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Business users manage own review request campaigns" ON public.review_request_campaigns;
CREATE POLICY "Business users manage own review request campaigns" ON public.review_request_campaigns
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Business users manage own monthly growth reports" ON public.monthly_growth_reports;
CREATE POLICY "Business users manage own monthly growth reports" ON public.monthly_growth_reports
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    is_super_admin()
    OR business_id IN (SELECT business_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_follow_up_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_request_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_growth_reports TO authenticated;

DROP TRIGGER IF EXISTS update_lead_follow_up_events_updated_at ON public.lead_follow_up_events;
CREATE TRIGGER update_lead_follow_up_events_updated_at
  BEFORE UPDATE ON public.lead_follow_up_events
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_request_campaigns_updated_at ON public.review_request_campaigns;
CREATE TRIGGER update_review_request_campaigns_updated_at
  BEFORE UPDATE ON public.review_request_campaigns
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_growth_reports_updated_at ON public.monthly_growth_reports;
CREATE TRIGGER update_monthly_growth_reports_updated_at
  BEFORE UPDATE ON public.monthly_growth_reports
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
