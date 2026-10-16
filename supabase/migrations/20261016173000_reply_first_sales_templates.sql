-- Refresh prospect-facing outreach sequence copy for reply and qualification intent.
-- Does not enrol contacts, send mail, or modify queued/sent messages.
-- Existing permissions, suppression, delivery and stop-on-reply logic remain unchanged.
DO $migration$
DECLARE modified_count integer;
BEGIN
  WITH replacements(sequence_name, step_order, subject_template, body_template, requires_approval) AS (
    VALUES
  ('Cold website review', 1, 'A question about {{business_name}}''s website', 'Hi {{first_name}},

I noticed {{observation}} on {{business_name}}''s website.

It may be worth making the next enquiry action easier to find. I help service businesses improve that path and handle their ongoing website updates.

Is making it easier for visitors to enquire a priority for your team right now?

Best,
Bennie
Bennie Studio

If you''d rather not hear from me again, reply stop.', true),
  ('Cold website review', 2, 'Following up on {{business_name}}''s website', 'Hi {{first_name}},

I wrote about {{observation}} at {{business_name}}.

There is one practical page change I''d start with before considering anything bigger.

Would you like the short example, or should I close this out for now?

Best,
Bennie
Bennie Studio

If you''d rather not hear from me again, reply stop.', false),
  ('Inbound review follow-up', 1, 'Your website review — one quick question', 'Hi {{first_name}},

Thanks for requesting a website review for {{business_name}}. I''ll focus on how visitors understand the service and reach the right enquiry step.

Which service or type of enquiry would you most like the website to bring in? A one-line reply will help me make the review more useful.

Best,
Bennie
Bennie Studio', true),
  ('Preview follow-up', 1, 'The next step for {{business_name}}''s website', 'Hi {{first_name}},

Before we refine a website direction for {{business_name}}, I want to make sure it supports the right outcome.

Which customer action matters most to you: requesting a quote, booking an appointment, or contacting you directly? Your answer will help us scope the page properly.

Best,
Bennie
Bennie Studio', true),
  ('Proposal follow-up', 1, 'Next step on {{business_name}}''s website proposal', 'Hi {{first_name}},

Following up on the website proposal for {{business_name}}. My aim is to make sure the scope, launch timing and ongoing management are clear before you decide.

Does the proposed scope fit what you need, or is there one part you''d like me to revise?

Best,
Bennie
Bennie Studio', true),
  ('Past prospect reactivation', 1, 'Is the website still a priority for {{business_name}}?', 'Hi {{first_name}},

We previously discussed {{business_name}}''s website, including {{observation}}.

If this is back on your agenda, I can revisit the most useful first change rather than start with a full redesign pitch.

Is this a priority again, or would you prefer I close the loop?

Best,
Bennie
Bennie Studio

If you''d rather not hear from me again, reply stop.', true),
  ('Customer referral request', 1, 'A quick introduction question', 'Hi {{first_name}},

Thank you for working with Bennie Studio on {{business_name}}''s website.

If another service business you know is struggling to turn website visits into enquiries, I''d be happy to offer them a short, practical review without pressure.

Does anyone come to mind who might welcome an introduction?

Best,
Bennie
Bennie Studio', true)
  ),
  changed AS (
    UPDATE public.outreach_sequence_steps AS step
    SET subject_template = r.subject_template,
        body_template = r.body_template,
        requires_approval = r.requires_approval
    FROM public.outreach_sequences AS sequence,
         replacements AS r
    WHERE step.sequence_id = sequence.id
      AND sequence.name = r.sequence_name
      AND step.step_order = r.step_order
    RETURNING step.id
  )
  SELECT count(*) INTO modified_count FROM changed;
  IF modified_count <> 7 THEN
    RAISE EXCEPTION 'Expected 7 existing sales sequence steps, updated %', modified_count;
  END IF;
END
$migration$;
