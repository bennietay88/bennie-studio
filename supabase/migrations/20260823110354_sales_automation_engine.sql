-- Approval-first revenue operations. This is additive so legacy lead and proposal
-- records continue to work while new automation data is introduced.

CREATE TABLE IF NOT EXISTS public.outreach_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  audience_type text NOT NULL CHECK (audience_type IN ('cold','inbound','audit','preview','proposal','reactivation','referral')),
  market text,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','whatsapp','manual')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  requires_first_step_approval boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outreach_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.outreach_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL CHECK (step_order > 0),
  delay_hours integer NOT NULL DEFAULT 0 CHECK (delay_hours >= 0),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','whatsapp','manual')),
  subject_template text,
  body_template text NOT NULL,
  requires_approval boolean NOT NULL DEFAULT false,
  stop_on_reply boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.outreach_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.outreach_sequences(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','completed','stopped')),
  current_step integer NOT NULL DEFAULT 0,
  next_run_at timestamptz,
  stop_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((prospect_id IS NOT NULL AND lead_id IS NULL) OR (prospect_id IS NULL AND lead_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.sales_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.outreach_enrollments(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound','inbound')),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','whatsapp','manual')),
  recipient text,
  subject text,
  body_text text NOT NULL,
  body_html text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','queued','sending','sent','delivered','opened','clicked','replied','bounced','complained','suppressed','failed','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  reply_to_message_id uuid REFERENCES public.sales_messages(id) ON DELETE SET NULL,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  classification text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  idempotency_key text NOT NULL DEFAULT gen_random_uuid()::text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  channel text NOT NULL DEFAULT 'email',
  reason text NOT NULL CHECK (reason IN ('opt_out','bounced','complained','manual','legal')),
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sales_suppressions_email_unique ON public.sales_suppressions(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sales_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_type text NOT NULL DEFAULT 'follow_up',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','dismissed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  due_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_call_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_name text NOT NULL,
  market text,
  industry text,
  website_url text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','completed','no_show','cancelled','rescheduled')),
  goals text,
  notes text,
  outcome text,
  next_action text,
  confirmation_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  event_type text NOT NULL DEFAULT 'stage_changed',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('viewed','accepted','declined','checkout_clicked','checkout_started','paid','expired')),
  session_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_email text;

CREATE INDEX IF NOT EXISTS outreach_enrollments_due_idx ON public.outreach_enrollments(status, next_run_at);
CREATE INDEX IF NOT EXISTS sales_messages_due_idx ON public.sales_messages(status, scheduled_at);
CREATE INDEX IF NOT EXISTS sales_messages_provider_idx ON public.sales_messages(provider_message_id);
CREATE INDEX IF NOT EXISTS sales_tasks_due_idx ON public.sales_tasks(status, due_at);
CREATE INDEX IF NOT EXISTS sales_call_bookings_start_idx ON public.sales_call_bookings(status, start_at);
CREATE INDEX IF NOT EXISTS proposal_events_proposal_idx ON public.proposal_events(proposal_id, created_at DESC);

ALTER TABLE public.outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_call_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['outreach_sequences','outreach_sequence_steps','outreach_enrollments','sales_messages','sales_suppressions','sales_tasks','sales_call_bookings','deal_stage_events','proposal_events']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Sales team manages %s" ON public.%I', table_name, table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', table_name);
    EXECUTE format('CREATE POLICY "Sales team reads %s" ON public.%I FOR SELECT TO authenticated USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN (''staff'',''platform_staff'')))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Sales team creates %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN (''staff'',''platform_staff'')))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Sales team updates %s" ON public.%I FOR UPDATE TO authenticated USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN (''staff'',''platform_staff''))) WITH CHECK (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN (''staff'',''platform_staff'')))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Sales team deletes %s" ON public.%I FOR DELETE TO authenticated USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN (''staff'',''platform_staff'')))', table_name, table_name);
  END LOOP;
END $$;

INSERT INTO public.outreach_sequences (name, audience_type, status, requires_first_step_approval, settings) VALUES
  ('Cold website review', 'cold', 'draft', true, '{"purpose":"Earn permission to share a specific website observation"}'::jsonb),
  ('Inbound review follow-up', 'audit', 'draft', true, '{"purpose":"Help review leads take the next useful step"}'::jsonb),
  ('Preview follow-up', 'preview', 'draft', true, '{"purpose":"Turn preview interest into a prepared consultation"}'::jsonb),
  ('Proposal follow-up', 'proposal', 'draft', true, '{"purpose":"Answer questions and make the decision path clear"}'::jsonb),
  ('Past prospect reactivation', 'reactivation', 'draft', true, '{"purpose":"Reopen a relevant conversation without pressure"}'::jsonb),
  ('Customer referral request', 'referral', 'draft', true, '{"purpose":"Ask satisfied customers for a relevant introduction"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.outreach_sequence_steps (sequence_id, step_order, delay_hours, subject_template, body_template, requires_approval)
SELECT id, 1, 0, 'A quick website observation for {{business_name}}', E'Hi {{first_name}},\n\nI noticed one specific opportunity on {{business_name}}\u2019s website: {{observation}}. It may make the next enquiry step less obvious than it needs to be.\n\nWould it be useful if I sent a short, no-obligation review showing what I would change?\n\nBennie', true
FROM public.outreach_sequences WHERE name = 'Cold website review'
ON CONFLICT (sequence_id, step_order) DO NOTHING;

INSERT INTO public.outreach_sequence_steps (sequence_id, step_order, delay_hours, subject_template, body_template, requires_approval)
SELECT id, 2, 72, 'Re: website observation for {{business_name}}', E'Hi {{first_name}},\n\nJust following up in case the website review would be useful. I can keep it practical: what I found, why it matters, and the first change I would make.\n\nIf now is not a priority, just say so and I will close the loop.\n\nBennie', false
FROM public.outreach_sequences WHERE name = 'Cold website review'
ON CONFLICT (sequence_id, step_order) DO NOTHING;

INSERT INTO public.outreach_sequence_steps (sequence_id, step_order, delay_hours, subject_template, body_template, requires_approval)
SELECT id, 1, 0, 'Your Bennie Studio website review', E'Hi {{first_name}},\n\nThanks for requesting a review for {{business_name}}. I have your details and will focus on the enquiry journey, what creates friction, and what I would change first.\n\nIf there is one service you most want the website to sell, reply and tell me which one.\n\nBennie', true FROM public.outreach_sequences WHERE name = 'Inbound review follow-up'
ON CONFLICT (sequence_id, step_order) DO NOTHING;

INSERT INTO public.outreach_sequence_steps (sequence_id, step_order, delay_hours, subject_template, body_template, requires_approval)
SELECT id, 1, 0, 'Your website direction for {{business_name}}', E'Hi {{first_name}},\n\nYour preview direction is ready to discuss. It is built around this finding: {{observation}}.\n\nIf the direction fits, the useful next step is a short call to confirm scope, timing, and the enquiry path you want customers to use.\n\nBennie', true FROM public.outreach_sequences WHERE name = 'Preview follow-up'
ON CONFLICT (sequence_id, step_order) DO NOTHING;

INSERT INTO public.outreach_sequence_steps (sequence_id, step_order, delay_hours, subject_template, body_template, requires_approval)
SELECT id, 1, 24, 'Questions about the {{business_name}} proposal?', E'Hi {{first_name}},\n\nI wanted to make sure the proposal is clear. If you have a question about scope, timing, setup, or the monthly service, reply directly and I will answer it personally.\n\nBennie', true FROM public.outreach_sequences WHERE name = 'Proposal follow-up'
ON CONFLICT (sequence_id, step_order) DO NOTHING;

INSERT INTO public.outreach_sequence_steps (sequence_id, step_order, delay_hours, subject_template, body_template, requires_approval)
SELECT id, 1, 0, 'Is the website still a priority for {{business_name}}?', E'Hi {{first_name}},\n\nWe spoke previously about improving {{business_name}}\u2019s website. I am checking whether that is still a priority.\n\nThe most relevant opportunity I have recorded is: {{observation}}. If the timing is better now, I can update the recommendation. If not, I will close the loop.\n\nBennie', true FROM public.outreach_sequences WHERE name = 'Past prospect reactivation'
ON CONFLICT (sequence_id, step_order) DO NOTHING;

INSERT INTO public.outreach_sequence_steps (sequence_id, step_order, delay_hours, subject_template, body_template, requires_approval)
SELECT id, 1, 0, 'A quick introduction request', E'Hi {{first_name}},\n\nI am glad to be supporting {{business_name}}. If you know another service business whose website makes enquiries harder than it should, I would appreciate an introduction.\n\nI will offer a practical review first and will not pressure them.\n\nThank you,\nBennie', true FROM public.outreach_sequences WHERE name = 'Customer referral request'
ON CONFLICT (sequence_id, step_order) DO NOTHING;

NOTIFY pgrst, 'reload schema';
