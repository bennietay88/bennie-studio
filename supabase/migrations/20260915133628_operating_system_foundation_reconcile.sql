-- Production reconciliation marker.
--
-- The operating-system foundation migration (20260915110000) was verified in
-- production and safely re-applied idempotently through the Supabase migration
-- runner on 2026-09-15. This follow-up version exists so repository migration
-- history matches the production migration ledger exactly.
--
-- No schema changes are required here.
select 1;
