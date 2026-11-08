-- Add an opt-in, draft-only monthly reporting workflow. This migration is
-- additive: existing manually-created reports keep their source_kind='manual'
-- and are never overwritten by the scheduled generator.

ALTER TABLE public.monthly_growth_reports
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS source_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS evidence_provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS report_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notification_status text NOT NULL DEFAULT 'not_sent';

DO $$ BEGIN
  ALTER TABLE public.monthly_growth_reports
    ADD CONSTRAINT monthly_growth_reports_source_kind_check
    CHECK (source_kind IN ('manual', 'scheduled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customers may read only published reports for their own business and may
-- create manual drafts. Scheduled report review and publication stay service
-- role/super-admin operations so snapshots cannot be rewritten by customers.
DROP POLICY IF EXISTS "Business users manage own monthly growth reports"
  ON public.monthly_growth_reports;
DROP POLICY IF EXISTS "Customers read published monthly growth reports"
  ON public.monthly_growth_reports;
DROP POLICY IF EXISTS "Customers create manual monthly growth report drafts"
  ON public.monthly_growth_reports;
DROP POLICY IF EXISTS "Super admins manage monthly growth reports"
  ON public.monthly_growth_reports;

CREATE POLICY "Customers read published monthly growth reports"
  ON public.monthly_growth_reports FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (
      private.is_super_admin()
      OR business_id IN (
        SELECT p.business_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Customers create manual monthly growth report drafts"
  ON public.monthly_growth_reports FOR INSERT TO authenticated
  WITH CHECK (
    status = 'draft'
    AND source_kind = 'manual'
    AND business_id IN (
      SELECT p.business_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Super admins manage monthly growth reports"
  ON public.monthly_growth_reports FOR ALL TO authenticated
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

DO $$ BEGIN
  ALTER TABLE public.monthly_growth_reports
    ADD CONSTRAINT monthly_growth_reports_notification_status_check
    CHECK (notification_status IN ('not_sent', 'dashboard_only', 'queued', 'sent', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.monthly_growth_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.monthly_growth_reports(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  report_snapshot jsonb NOT NULL,
  evidence_provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, version)
);

ALTER TABLE public.monthly_growth_report_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_growth_report_versions FROM anon, authenticated;
GRANT SELECT, INSERT ON public.monthly_growth_report_versions TO service_role;

CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_source_period
  ON public.monthly_growth_reports(source_kind, report_month, status);

CREATE OR REPLACE FUNCTION public.create_monthly_growth_report_draft(p_report jsonb)
RETURNS TABLE (report_id uuid, created boolean, report_version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
  v_version integer := 1;
BEGIN
  INSERT INTO public.monthly_growth_reports (
    business_id, website_id, report_month, status, source_kind,
    source_period_start, source_period_end, lead_count, hot_lead_count,
    review_count, local_seo_page_count, summary, recommendations,
    payload, evidence_provenance, report_version, notification_status
  ) VALUES (
    (p_report->>'business_id')::uuid,
    NULLIF(p_report->>'website_id', '')::uuid,
    p_report->>'report_month',
    'draft', 'scheduled',
    (p_report->>'source_period_start')::timestamptz,
    (p_report->>'source_period_end')::timestamptz,
    COALESCE((p_report->>'lead_count')::integer, 0),
    COALESCE((p_report->>'hot_lead_count')::integer, 0),
    COALESCE((p_report->>'review_count')::integer, 0),
    COALESCE((p_report->>'local_seo_page_count')::integer, 0),
    p_report->>'summary',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_report->'recommendations', '[]'::jsonb))),
    COALESCE(p_report->'payload', '{}'::jsonb),
    COALESCE(p_report->'evidence_provenance', '{}'::jsonb),
    v_version,
    'not_sent'
  ) ON CONFLICT (business_id, report_month) DO NOTHING
  RETURNING id INTO v_report_id;

  IF v_report_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, false, NULL::integer;
    RETURN;
  END IF;

  INSERT INTO public.monthly_growth_report_versions (report_id, version, report_snapshot, evidence_provenance)
  VALUES (v_report_id, v_version, p_report, COALESCE(p_report->'evidence_provenance', '{}'::jsonb));

  RETURN QUERY SELECT v_report_id, true, v_version;
END;
$$;

REVOKE ALL ON FUNCTION public.create_monthly_growth_report_draft(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_monthly_growth_report_draft(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.publish_monthly_growth_report(p_report_id uuid, p_reviewer uuid)
RETURNS SETOF public.monthly_growth_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.monthly_growth_reports%ROWTYPE;
BEGIN
  UPDATE public.monthly_growth_reports
  SET status = 'published',
      reviewed_at = now(),
      reviewed_by = p_reviewer,
      notification_status = 'dashboard_only',
      report_version = report_version + 1,
      published_at = now()
  WHERE id = p_report_id AND status = 'draft' AND source_kind = 'scheduled'
  RETURNING * INTO v_report;

  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.monthly_growth_report_versions (report_id, version, report_snapshot, evidence_provenance)
  VALUES (v_report.id, v_report.report_version, to_jsonb(v_report), v_report.evidence_provenance);

  RETURN NEXT v_report;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_monthly_growth_report(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_monthly_growth_report(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_monthly_growth_report_source_data(
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE (
  business_id uuid,
  website_id uuid,
  page_views integer,
  view_sessions integer,
  enquiries integer,
  whatsapp_clicks integer,
  call_clicks integer,
  bookings integer,
  top_enquiry_page text,
  most_used_enquiry_path text,
  completed_work jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible AS (
    SELECT DISTINCT ON (b.id) b.id AS business_id, w.id AS website_id
    FROM public.businesses b
    JOIN public.websites w ON w.business_id = b.id AND w.status = 'published'
    WHERE b.status = 'active'
    ORDER BY b.id, w.is_primary DESC NULLS LAST, w.created_at DESC, w.id
  )
  SELECT e.business_id,
    e.website_id,
    COALESCE(pv.views, 0)::integer,
    COALESCE(pv.sessions, 0)::integer,
    COALESCE(te.enquiries, 0)::integer,
    COALESCE(te.whatsapp_clicks, 0)::integer,
    COALESCE(te.call_clicks, 0)::integer,
    COALESCE(te.bookings, 0)::integer,
    te.top_enquiry_page,
    te.most_used_enquiry_path,
    COALESCE(work.completed_work, '[]'::jsonb)
  FROM eligible e
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS views,
      count(DISTINCT COALESCE(session_id, visitor_id::text, id::text))::integer AS sessions
    FROM public.page_views p
    WHERE p.created_at >= p_from AND p.created_at < p_to
      AND (p.website_id = e.website_id OR (p.website_id IS NULL AND p.business_id = e.business_id))
      AND COALESCE(p.user_agent, '') !~* '(bot|crawler|spider|headless|preview)'
  ) pv ON true
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (WHERE event_type = 'lead_form_submit')::integer AS enquiries,
      count(*) FILTER (WHERE event_type = 'whatsapp_click')::integer AS whatsapp_clicks,
      count(*) FILTER (WHERE event_type = 'call_click')::integer AS call_clicks,
      count(*) FILTER (WHERE event_type = 'appointment_booked')::integer AS bookings,
      (SELECT source_page FROM public.tracking_events te2
        WHERE te2.business_id = e.business_id AND te2.created_at >= p_from AND te2.created_at < p_to
          AND te2.event_type IN ('lead_form_submit', 'appointment_requested', 'appointment_booked')
          AND NULLIF(te2.source_page, '') IS NOT NULL
        GROUP BY source_page ORDER BY count(*) DESC, source_page LIMIT 1) AS top_enquiry_page,
      (SELECT event_type FROM public.tracking_events te3
        WHERE te3.business_id = e.business_id AND te3.created_at >= p_from AND te3.created_at < p_to
          AND te3.event_type IN ('lead_form_submit', 'appointment_requested', 'appointment_booked', 'whatsapp_click', 'call_click', 'email_click', 'booking_click', 'quote_button_click')
        GROUP BY event_type ORDER BY count(*) DESC, event_type LIMIT 1) AS most_used_enquiry_path
    FROM public.tracking_events te1
    WHERE te1.business_id = e.business_id AND te1.created_at >= p_from AND te1.created_at < p_to
  ) te ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'title', COALESCE(NULLIF(title, ''), 'Website update completed'),
      'details', NULLIF(completion_details, ''),
      'completedAt', completed_at
    ) ORDER BY completed_at, id) AS completed_work
    FROM public.monthly_update_requests r
    WHERE r.business_id = e.business_id AND r.status = 'completed'
      AND r.completed_at >= p_from AND r.completed_at < p_to
  ) work ON true
  ORDER BY e.business_id;
$$;

REVOKE ALL ON FUNCTION public.get_monthly_growth_report_source_data(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_growth_report_source_data(timestamptz, timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';
