-- Improve the reply prompt and align saved sequence copy with the current editor defaults.
-- This only changes copy; it does not activate or reschedule the sequence.
UPDATE public.outreach_sequence_steps AS step
SET
  subject_template = CASE step.step_order
    WHEN 1 THEN 'One practical website idea for {{business_name}}'
    WHEN 2 THEN 'A website direction for {{business_name}}'
    WHEN 3 THEN 'Is a website update on your list this year?'
    WHEN 4 THEN 'Closing the loop on {{business_name}}'
  END,
  body_template = CASE step.step_order
    WHEN 1 THEN E'Hi {{first_name}},\n\nI looked at your website and noticed: {{observation}}.\n\nWould one practical suggestion for making it easier for customers to enquire be useful? Reply “yes” and I’ll send it. No call needed.\n\nBennie\nBennie Studio'
    WHEN 2 THEN E'Hi {{first_name}},\n\nI made a first-pass homepage concept for {{business_name}} to show one possible direction for clearer services and easier enquiries. It’s a concept for discussion, not a live site.\n\nIf you had a chance to look, what would you change first? Reply with one thing and I’ll take a look.\n\nBennie\nBennie Studio'
    WHEN 3 THEN E'Hi {{first_name}},\n\nAre you looking at website improvements this year? A quick “yes” or “not now” is enough; if yes, I’ll send the scope, setup fee and monthly costs for {{business_name}}.\n\nBennie\nBennie Studio'
    WHEN 4 THEN E'Hi {{first_name}},\n\nJust a final check-in about the website improvements I mentioned. I understand this might not be a priority right now.\n\nI’ll close the loop here and won’t send further follow-ups. If the timing changes, you’re welcome to get in touch.\n\nBennie\nBennie Studio'
  END
FROM public.outreach_sequences AS seq
WHERE step.sequence_id = seq.id
  AND seq.name = 'Permissioned website review'
  AND step.step_order BETWEEN 1 AND 4;

UPDATE public.outreach_sequences
SET settings = COALESCE(settings, '{}'::jsonb)
    || '{"followUpTemplateVersion":"reply_first_v1"}'::jsonb
WHERE name = 'Permissioned website review';
