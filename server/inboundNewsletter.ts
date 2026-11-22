import { createHash } from "node:crypto";

/**
 * Lifecycle messages for *inbound, explicitly consented* studio subscribers.
 * Cold prospects never enter this queue. The sales worker rechecks recipient
 * permission and suppression before every send.
 */
export const INBOUND_NEWSLETTER_MARKETS = ["MY", "SG", "GB", "US"] as const;
export type InboundNewsletterMarket = typeof INBOUND_NEWSLETTER_MARKETS[number];

export function isSupportedNewsletterMarket(input: unknown): input is InboundNewsletterMarket {
  return typeof input === "string" && INBOUND_NEWSLETTER_MARKETS.includes(input as InboundNewsletterMarket);
}

export const INBOUND_NEWSLETTER_CONSENT =
  "Yes, send me website improvement tips and occasional Bennie Studio offers. I can unsubscribe at any time.";

export function newsletterSourceId(email: string): string {
  const normalized = email.trim().toLowerCase();
  return "newsletter:" + createHash("sha256").update(normalized).digest("hex");
}

export function buildInboundNewsletterMessages(input: {
  email: string;
  leadId: string;
  sourcePage?: string;
  now?: Date;
}): Array<Record<string, unknown>> {
  const normalized = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("INVALID_NEWSLETTER_EMAIL");
  if (!/^[0-9a-f-]{36}$/i.test(input.leadId)) throw new Error("INVALID_NEWSLETTER_LEAD");
  const digest = createHash("sha256").update(normalized).digest("hex");
  const now = input.now || new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("INVALID_NEWSLETTER_DATE");
  const steps = [
    {
      days: 0,
      subject: "Your 7-point website conversion checklist | Bennie Studio",
      body: [
        "Thanks for subscribing to Bennie Studio website tips.",
        "",
        "Here is your 7-point checklist:",
        "1. Does your headline explain the main service in seconds?",
        "2. Can visitors tell who you serve and where?",
        "3. Is the main enquiry button easy to find on mobile?",
        "4. Are services, scope and next steps explained plainly?",
        "5. Is your real proof (reviews, work, credentials) easy to verify?",
        "6. Do forms work and ask only for essential information?",
        "7. Does every important page have a clear next step?",
        "",
        "Want to see a possible direction? Explore a free concept: https://app.bennietay.com/generate-preview",
        "This checklist is educational, not a promise of more leads or sales.",
      ].join("\n"),
    },
    {
      days: 3,
      subject: "Three small changes that make a business website clearer",
      body: [
        "Here are three practical improvements to try:",
        "",
        "Put the core service, customer and location above the fold.",
        "Make the main contact action visible without scrolling through several sections.",
        "Replace vague claims with genuine, verifiable details about your work.",
        "",
        "See how those ideas look in illustrative website examples: https://app.bennietay.com/case-studies",
        "The examples are studio design studies, not completed client commissions.",
      ].join("\n"),
    },
    {
      days: 7,
      subject: "What a managed business website actually includes",
      body: [
        "A website is easier to maintain when design and ongoing care are treated as one service.",
        "",
        "Bennie Studio's managed plans cover agreed website design/build, hosting, maintenance and the level of ongoing support specified in each plan.",
        "Different plans have different page limits, update allowances and commitment terms.",
        "",
        "Compare scope and verified pricing: https://app.bennietay.com/pricing",
        "There are no guaranteed traffic, ranking or revenue outcomes.",
      ].join("\n"),
    },
    {
      days: 12,
      subject: "A useful way to review your own homepage",
      body: [
        "Open your website on your phone and pretend you're visiting for the first time.",
        "Can you answer these questions in five seconds?",
        "",
        "What does this company do?",
        "Is it relevant to my needs?",
        "Why should I trust it?",
        "How do I make an enquiry?",
        "",
        "If any answer is unclear, that's a useful place to improve.",
        "Explore a free, illustrative design direction: https://app.bennietay.com/generate-preview",
      ].join("\n"),
    },
    {
      days: 18,
      subject: "Want a human review of your website direction?",
      body: [
        "If you are planning a new website, we can help you make the scope, delivery approach and ongoing costs clearer.",
        "",
        "Book a discussion with Bennie Studio: https://app.bennietay.com/book-demo",
        "Or compare the managed plans: https://app.bennietay.com/pricing",
        "",
        "No obligation, pressure or promises of specific commercial results.",
        "This is the last message in this introductory series.",
      ].join("\n"),
    },
  ];

  return steps.map((step, index) => ({
    id: (() => { const h = createHash("sha256").update(`bs-inbound-opt-in-v1:${digest}:${index + 1}`).digest("hex"); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; })(),
    lead_id: input.leadId,
    direction: "outbound",
    channel: "email",
    recipient: normalized,
    subject: step.subject,
    body_text: step.body,
    status: "queued",
    scheduled_at: new Date(now.getTime() + step.days * 86_400_000).toISOString(),
    idempotency_key: `bs-inbound-opt-in-v1:${digest}:${index + 1}`,
    provider_payload: {
      campaignId: "bs-inbound-opt-in-v1",
      source: "explicit_inbound_newsletter",
      sourcePage: input.sourcePage || "/",
      sequenceStep: index + 1,
      lastStep: steps.length,
    },
  }));
}
