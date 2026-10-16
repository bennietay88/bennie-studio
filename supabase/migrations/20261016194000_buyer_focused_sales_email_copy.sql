-- Buyer-focused prospect follow-up copy; keep delivery/consent controls and queued messages unchanged.
WITH updates(sequence_name, step_order, subject_template, body_template) AS (
  VALUES
    ('Cold website review', 1, 'Enquiries on {{business_name}}''s website', 'Hi {{first_name}},

I noticed {{observation}} on {{business_name}}''s website.

I''d make the enquiry action clearer and easier to reach on mobile. Bennie Studio builds and manages service websites around quotes, bookings and customer enquiries.

Can I create a free homepage concept for {{business_name}} showing the approach?

Bennie
Bennie Studio'),
    ('Cold website review', 2, 'Homepage concept for {{business_name}}', 'Hi {{first_name}},

Following up on my note about {{business_name}}''s website.

Rather than send a generic website audit, I can put together a free homepage concept showing a clearer route from your services to an enquiry.

Should I prepare one for {{business_name}}?

Bennie
Bennie Studio'),
    ('Inbound review follow-up', 1, 'Your website review — next step', 'Hi {{first_name}},

Thanks for requesting a review for {{business_name}}.

I''ll look for the simplest change that makes it easier for visitors to request a quote, book or contact you. Bennie Studio can also build and manage the finished website.

Which service would you most like your website to bring enquiries for?

Bennie
Bennie Studio'),
    ('Preview follow-up', 1, 'Next step for {{business_name}}''s website', 'Hi {{first_name}},

Thanks for your interest in a website concept for {{business_name}}.

Bennie Studio can take it from a homepage concept to a fully managed website, including the build, hosting and agreed updates.

Would a 15-minute call help us confirm the scope and pricing?

Bennie
Bennie Studio'),
    ('Proposal follow-up', 1, 'Ready to proceed with {{business_name}}?', 'Hi {{first_name}},

Following up on the website proposal for {{business_name}}.

We can handle the agreed build and ongoing management, so your team can focus on customers instead of website upkeep.

Does the proposal work for you to proceed, or is one item holding things up?

Bennie
Bennie Studio'),
    ('Past prospect reactivation', 1, 'Website plans for {{business_name}}', 'Hi {{first_name}},

When we last looked at {{business_name}}, we noted {{observation}}.

If improving the site is back on your agenda, I can put together a fresh homepage concept focused on the customer enquiry path. Bennie Studio can manage the full build and upkeep.

Would you like to see that concept?

Bennie
Bennie Studio'),
    ('Customer referral request', 1, 'Know a business that needs a better website?', 'Hi {{first_name}},

Thank you for trusting Bennie Studio with {{business_name}}''s website.

We help service businesses get a professionally built, managed website with an easier way for customers to request quotes or appointments.

Do you know another business owner who might appreciate a free homepage concept?

Bennie
Bennie Studio')
)
UPDATE public.outreach_sequence_steps step
SET subject_template = updates.subject_template,
    body_template = updates.body_template
FROM public.outreach_sequences sequence, updates
WHERE step.sequence_id = sequence.id
  AND sequence.name = updates.sequence_name
  AND step.step_order = updates.step_order;
