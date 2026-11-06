-- Consolidated permissioned prospect follow-ups: intro + day 3 / day 8 / day 15.
-- Keep the sequence paused; activation is a separate sales-ops decision.
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS audit_report_url text,
  ADD COLUMN IF NOT EXISTS design_preview_url text,
  ADD COLUMN IF NOT EXISTS outreach_exhausted_at timestamptz;

-- Previously the generic preview_url also held website-audit links.
UPDATE public.prospects
SET audit_report_url = preview_url
WHERE audit_report_url IS NULL
  AND preview_url LIKE 'https://app.bennietay.com/website-audit?%'
  AND preview_url LIKE '%report=%'
  AND preview_url LIKE '%key=%';

CREATE INDEX IF NOT EXISTS prospects_outreach_exhausted_at_idx
  ON public.prospects(outreach_exhausted_at)
  WHERE outreach_exhausted_at IS NOT NULL;

UPDATE public.outreach_sequences
SET requires_first_step_approval = true,
    settings = COALESCE(settings,'{}'::jsonb) || '{"followUpPolicy":"prospect_3_5_7_v1","maxFollowUps":3,"offsetDays":[3,8,15],"archiveOnNoReply":true}'::jsonb
WHERE name = 'Permissioned website review';

WITH seq AS (
  SELECT id FROM public.outreach_sequences WHERE name = 'Permissioned website review'
)
INSERT INTO public.outreach_sequence_steps
  (sequence_id, step_order, channel, delay_hours, subject_template, body_template, requires_approval)
SELECT seq.id, v.step_order, 'email', v.delay_hours, v.subject_template, v.body_template, v.requires_approval
FROM seq
CROSS JOIN (VALUES
 (1,0,'A quick introduction from Bennie Studio',
  E'Hi {{first_name}},\n\nI came across {{business_name}} and noticed {{observation}}.\n\nI help service businesses improve and manage their websites. Would a short website improvement idea be useful?\n\nBennie\nBennie Studio',true),
 (2,72,'A website improvement concept for {{business_name}}',
  E'Hi {{first_name}},\n\nI prepared a short website improvement concept for {{business_name}}.\n\nBennie\nBennie Studio',false),
 (3,120,'One improvement worth prioritising for {{business_name}}',
  E'Hi {{first_name}},\n\nOne improvement I would prioritise for {{business_name}} is {{recommendation}}.\n\nBennie Studio can handle the implementation and ongoing website management. Would a rough scope and price be useful?\n\nBennie\nBennie Studio',false),
 (4,168,'Closing the loop on {{business_name}}',
  E'Hi {{first_name}},\n\nOne final note about the website improvements I shared. I understand this might not be a priority now, so I will close the loop here.\n\nIf the timing changes, you are always welcome to reach out.\n\nBennie\nBennie Studio',false)
) v(step_order,delay_hours,subject_template,body_template,requires_approval)
ON CONFLICT (sequence_id, step_order) DO UPDATE SET
  channel = EXCLUDED.channel, delay_hours = EXCLUDED.delay_hours,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  requires_approval = EXCLUDED.requires_approval;
