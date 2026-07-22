-- Cover foreign keys introduced by the lead generation automation engine.

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_lead_id
  ON public.lead_follow_up_events(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_events_profile_id
  ON public.lead_follow_up_events(profile_id)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_request_campaigns_profile_id
  ON public.review_request_campaigns(profile_id)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_website_id
  ON public.monthly_growth_reports(website_id)
  WHERE website_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_growth_reports_profile_id
  ON public.monthly_growth_reports(profile_id)
  WHERE profile_id IS NOT NULL;
