-- Use truthful, useful outreach for service businesses with no reviewable website.
-- Delivery dynamically switches Day 3 to a personalized design or authenticated audit when available.
-- This migration only edits the existing permissioned sequence; it does not activate it.
UPDATE public.outreach_sequence_steps AS step
SET
  subject_template = CASE step.step_order
    WHEN 1 THEN 'A quick website question for {{business_name}}'
    WHEN 2 THEN 'Following up on my earlier email — {{business_name}}'
    WHEN 3 THEN 'An easy way to get started online — {{business_name}}'
    WHEN 4 THEN 'Closing the loop on {{business_name}}'
  END,
  body_template = CASE step.step_order
    WHEN 1 THEN E'Hi {{first_name}},\n\nI\'m Bennie from Bennie Studio. We build and manage websites for service businesses, from the initial setup to ongoing updates.\n\nIf making it easier for customers to discover your services and get in touch is something you are considering, would a relevant example be useful?\n\nBennie\nBennie Studio'
    WHEN 2 THEN E'Hi {{first_name}},\n\nJust following up on my earlier email about Bennie Studio.\n\nWe build and manage websites for service businesses, making it easier for potential customers to learn about their services and get in touch.\n\nIf you are curious about our work, you can view our portfolio here:\n\nhttps://app.bennietay.com/portfolio\n\nWould you be open to a quick conversation about whether a website could be useful for {{business_name}}?\n\nBennie\nBennie Studio'
    WHEN 3 THEN E'Hi {{first_name}},\n\nOne more thought in case my earlier email was relevant. A simple business website can give customers one place to understand your services and get in touch.\n\nBennie Studio can handle both the initial setup and ongoing updates.\n\nWould a short outline of the options and the setup and monthly management costs be useful for {{business_name}}?\n\nBennie\nBennie Studio'
    WHEN 4 THEN E'Hi {{first_name}},\n\nJust a final check-in about the website possibility I mentioned. I understand this may not be a priority right now.\n\nI will close the loop here and will not send further follow-ups. You are welcome to get in touch if the timing changes.\n\nBennie\nBennie Studio'
  END
FROM public.outreach_sequences AS seq
WHERE step.sequence_id = seq.id
  AND seq.name = 'Permissioned website review'
  AND step.step_order BETWEEN 1 AND 4;
UPDATE public.outreach_sequences
SET settings = COALESCE(settings,'{}'::jsonb)
    || '{"followUpTemplateVersion":"portfolio_fallback_v2","followUpPolicy":"prospect_3_5_7_v1"}'::jsonb
WHERE name = 'Permissioned website review';
