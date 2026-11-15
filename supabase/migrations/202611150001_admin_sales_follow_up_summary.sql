-- A single server-side definition for overdue sales follow-ups. Linked open tasks
-- take precedence over the entity's follow-up date so each lead/prospect counts once.
CREATE OR REPLACE FUNCTION public.admin_sales_follow_up_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
WITH due_tasks AS (
  SELECT id, lead_id, prospect_id
  FROM public.sales_tasks
  WHERE status = 'open'
    AND due_at IS NOT NULL
    AND due_at <= now()
),
due_entities AS (
  SELECT
    CASE
      WHEN lead_id IS NOT NULL THEN 'lead:' || lead_id::text
      WHEN prospect_id IS NOT NULL THEN 'prospect:' || prospect_id::text
      ELSE 'task:' || id::text
    END AS entity_key
  FROM due_tasks
  UNION
  SELECT 'lead:' || l.id::text
  FROM public.leads l
  WHERE l.next_follow_up_at IS NOT NULL
    AND l.next_follow_up_at <= now()
    AND coalesce(l.status, '') NOT IN ('won', 'lost', 'closed', 'spam', 'converted')
    AND NOT EXISTS (
      SELECT 1 FROM public.sales_tasks t
      WHERE t.lead_id = l.id AND t.status = 'open'
    )
  UNION
  SELECT 'prospect:' || p.id::text
  FROM public.prospects p
  WHERE p.next_follow_up_at IS NOT NULL
    AND p.next_follow_up_at <= now()
    AND coalesce(p.outreach_status, '') NOT IN ('won', 'lost')
    AND NOT EXISTS (
      SELECT 1 FROM public.sales_tasks t
      WHERE t.prospect_id = p.id AND t.status = 'open'
    )
)
SELECT jsonb_build_object(
  'overdueFollowUps', (SELECT count(*) FROM due_entities),
  'overdueOpenTasks', (SELECT count(*) FROM due_tasks),
  'overdueLeads', (
    SELECT count(*) FROM public.leads l
    WHERE l.next_follow_up_at IS NOT NULL
      AND l.next_follow_up_at <= now()
      AND coalesce(l.status, '') NOT IN ('won', 'lost', 'closed', 'spam', 'converted')
  ),
  'overdueProspects', (
    SELECT count(*) FROM public.prospects p
    WHERE p.next_follow_up_at IS NOT NULL
      AND p.next_follow_up_at <= now()
      AND coalesce(p.outreach_status, '') NOT IN ('won', 'lost')
  ),
  'generatedAt', now()
);
$$;

REVOKE ALL ON FUNCTION public.admin_sales_follow_up_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sales_follow_up_summary() TO service_role;
