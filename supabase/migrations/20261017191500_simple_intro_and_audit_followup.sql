-- Keep cold outreach conversational: the introduction and website review are separate emails.
UPDATE public.outreach_sequence_steps AS step
SET subject_template = 'A quick introduction from Bennie Studio',
    body_template = E'Hi {{first_name}},\n\nI''m Bennie from Bennie Studio. We build and manage websites for service businesses.\n\nI came across {{business_name}} and would be glad to share a short website review. Would that be useful?\n\nBennie\nBennie Studio',
    requires_approval = true
FROM public.outreach_sequences AS sequence
WHERE step.sequence_id = sequence.id
  AND sequence.name = 'Cold website review'
  AND step.step_order = 1;

UPDATE public.outreach_sequence_steps AS step
SET delay_hours = 72,
    subject_template = 'The website review for {{business_name}}',
    body_template = E'Hi {{first_name}},\n\nFollowing up with the short website review I prepared for {{business_name}}:\n\n{{review_url}}\n\nIt includes the findings and practical next steps. If you would like to discuss any of them, just reply.\n\nBennie\nBennie Studio',
    requires_approval = false
FROM public.outreach_sequences AS sequence
WHERE step.sequence_id = sequence.id
  AND sequence.name = 'Cold website review'
  AND step.step_order = 2;
