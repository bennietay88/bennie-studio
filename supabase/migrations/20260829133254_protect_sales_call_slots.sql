-- The public API exposes fixed, non-overlapping 30-minute slots. Enforce the
-- final availability decision in Postgres so simultaneous requests cannot
-- reserve the same active slot.
CREATE UNIQUE INDEX IF NOT EXISTS sales_call_bookings_active_start_unique
  ON public.sales_call_bookings (start_at)
  WHERE status = 'booked';
