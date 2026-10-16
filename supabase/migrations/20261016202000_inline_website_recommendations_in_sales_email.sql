-- Email-first value: give the verified observation and a concrete fix in the email.
-- Recipient audit and preview URLs remain internal unless someone explicitly requests them.
WITH replacements(sequence_name, step_order, subject_template, body_template) AS (
  VALUES
('Cold website review',1,'One website improvement for {{business_name}}','Hi {{first_name}},

I noticed {{observation}} on {{business_name}}''s website.

One change I''d make: {{recommendation}}. It would help visitors find a clearer route to enquire.

Bennie Studio builds and manages service websites. Would a rough scope and price to implement that change be useful?

Bennie
Bennie Studio'),
('Cold website review',2,'Following up on {{business_name}}''s website','Hi {{first_name}},

Following up on {{business_name}}''s website. The issue I noted was {{observation}}.

My recommended first fix is {{recommendation}}. That is the change I''d prioritise before a broader redesign.

Is this something you''d consider improving now?

Bennie
Bennie Studio'),
('Inbound review follow-up',1,'A practical website improvement for {{business_name}}','Hi {{first_name}},

Thanks for your website-review request. I noticed {{observation}}.

Here is where I''d start: {{recommendation}}. It''s a practical change aimed at making the visitor''s next step clearer.

Would you like a scope and price for Bennie Studio to handle the improvements and ongoing site management?

Bennie
Bennie Studio'),
('Preview follow-up',1,'The first change I''d make to {{business_name}}''s website','Hi {{first_name}},

For {{business_name}}, I noticed {{observation}}.

My recommended first improvement is {{recommendation}}. I''d build the customer enquiry path around that change, then maintain the site as your services evolve.

Would a short call to confirm scope and price be useful?

Bennie
Bennie Studio'),
('Proposal follow-up',1,'Ready to proceed with {{business_name}}?','Hi {{first_name}},

Following up on the managed website proposal for {{business_name}}.

The key improvement we discussed was {{recommendation}}. Bennie Studio can take care of the agreed build, hosting and ongoing updates.

Does the scope work for you to proceed, or is one item holding up the decision?

Bennie
Bennie Studio'),
('Past prospect reactivation',1,'Website priorities for {{business_name}}','Hi {{first_name}},

When we last looked at {{business_name}}, we noted {{observation}}.

My practical first fix would be {{recommendation}}. Bennie Studio could implement it and take over ongoing website upkeep.

Is this worth revisiting this quarter?

Bennie
Bennie Studio'),
('Customer referral request',1,'One website improvement your network might need','Hi {{first_name}},

Thank you for working with Bennie Studio on {{business_name}}.

One useful website improvement for service businesses is to put a clear quote or booking action beside the services customers are evaluating. That''s the kind of site we build and manage.

Do you know another owner who might find this useful?

Bennie
Bennie Studio')
)
UPDATE public.outreach_sequence_steps step
SET subject_template = replacements.subject_template,
    body_template = replacements.body_template
FROM public.outreach_sequences sequence, replacements
WHERE step.sequence_id = sequence.id
  AND sequence.name = replacements.sequence_name
  AND step.step_order = replacements.step_order;
