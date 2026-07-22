-- Safe additive migration for enquiry/conversion tracking performance.

CREATE INDEX IF NOT EXISTS idx_tracking_events_business_created
  ON tracking_events(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_events_business_type_created
  ON tracking_events(business_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_views_business_created
  ON page_views(business_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
