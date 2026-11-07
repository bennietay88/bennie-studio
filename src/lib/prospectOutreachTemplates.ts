/**
 * Bennie Studio's editable sales email catalog.
 * Safe substitution: plain-text values only; marketing consent, cadence, reply stop,
 * and verified review-asset selection are enforced by the delivery engine.
 */
export const PORTFOLIO_URL = "https://app.bennietay.com/portfolio";

export type ProspectEmailTemplateKey =
  | "intro"
  | "day3_design"
  | "day3_audit"
  | "day3_portfolio_existing"
  | "day3_portfolio_no_site"
  | "day8_existing"
  | "day8_no_site"
  | "day15_existing"
  | "day15_no_site";

export type ProspectEmailTemplate = { subject: string; body: string };
export type ProspectEmailOverrides = Partial<Record<ProspectEmailTemplateKey, ProspectEmailTemplate>>;
export type ProspectEmailContext = {
  first_name: string;
  business_name: string;
  asset_url?: string;
  portfolio_url?: string;
};

type TemplateDefinition = {
  id: ProspectEmailTemplateKey;
  label: string;
  stage: string;
  description: string;
  requiredToken?: "asset_url" | "portfolio_url";
  defaultTemplate: ProspectEmailTemplate;
};

const body = (...paragraphs: string[]) => paragraphs.join("\n\n");

export const PROSPECT_EMAIL_TEMPLATE_DEFINITIONS: readonly TemplateDefinition[] = [
  {
    id: "intro", stage: "Day 0", label: "Initial introduction",
    description: "Used for the permissioned sequence and as the default first email in the prospect composer.",
    defaultTemplate: {
      subject: "A website question for {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "I'm Bennie from Bennie Studio. We build and manage websites for service businesses, from the initial setup to ongoing updates.",
        "If you're considering making it easier for customers to learn about your services and get in touch, I can share a relevant example and explain the setup and monthly costs.",
        "Would that be useful?",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day3_design", stage: "Day 3", label: "Personalized design preview",
    description: "Only selected when a checked, prospect-specific redesign has been saved.",
    requiredToken: "asset_url",
    defaultTemplate: {
      subject: "I put together a website concept for {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "Just following up on my earlier email. I put together a homepage concept for {{business_name}}, showing a possible direction for clearer service messaging and easier enquiries.",
        "You can view the concept here:",
        "{{asset_url}}",
        "It's a no-obligation starting point. Would you be open to a short conversation about it?",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day3_audit", stage: "Day 3", label: "Verified website review",
    description: "Only selected when a verified, access-controlled review URL exists.",
    requiredToken: "asset_url",
    defaultTemplate: {
      subject: "A website review for {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "Just following up on my earlier email. I prepared a short website review for {{business_name}}, including findings and practical recommendations.",
        "You can read it here:",
        "{{asset_url}}",
        "Would you be open to a short conversation about the improvements?",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day3_portfolio_existing", stage: "Day 3", label: "Existing site · portfolio fallback",
    description: "Used when a website exists but there is no verified redesign or review.",
    requiredToken: "portfolio_url",
    defaultTemplate: {
      subject: "Following up on my earlier email — {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "Just following up on my earlier email about Bennie Studio.",
        "We build and manage websites for service businesses, making it easier for potential customers to learn about their services and get in touch.",
        "If you're curious about our work, you can view our portfolio here:",
        "{{portfolio_url}}",
        "Would you be open to a quick conversation about whether your current website could work harder for {{business_name}}?",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day3_portfolio_no_site", stage: "Day 3", label: "No website · portfolio follow-up",
    description: "No audit claims; references the introduction and invites a conversation.",
    requiredToken: "portfolio_url",
    defaultTemplate: {
      subject: "Following up on my earlier email — {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "Just following up on my earlier email about Bennie Studio.",
        "We build and manage websites for service businesses, making it easier for potential customers to learn about their services and get in touch.",
        "If you're curious about our work, you can view our portfolio here:",
        "{{portfolio_url}}",
        "Would you be open to a quick conversation about whether a website could be useful for {{business_name}}?",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day8_existing", stage: "Day 8", label: "Existing site · managed improvement",
    description: "Explain improving and maintaining an existing business website.",
    defaultTemplate: {
      subject: "A practical next step for {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "I wanted to share one practical thought following my previous note. A business website can do more than introduce services: it can make the next step clear when someone is ready to enquire.",
        "Bennie Studio can help improve the website and take care of ongoing updates, without your team having to manage the technical side.",
        "Would it be helpful if I outlined a possible scope and the setup and monthly management costs for {{business_name}}?",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day8_no_site", stage: "Day 8", label: "No website · new website opportunity",
    description: "Talk about a new website and managed setup without assuming an existing website.",
    defaultTemplate: {
      subject: "An easy way to get started online — {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "One more thought in case my earlier email was relevant. A simple business website could give customers one place to understand your services, see where you operate and get in touch.",
        "With Bennie Studio, we can handle both the initial setup and ongoing updates, so there's no need to manage the technical work yourself.",
        "Would a short outline of the options and the setup and monthly management costs be useful for {{business_name}}?",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day15_existing", stage: "Day 15", label: "Existing site · final check-in",
    description: "Final message after the prior unanswered follow-ups.",
    defaultTemplate: {
      subject: "Closing the loop on {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "Just a final check-in about the website improvements I mentioned. I understand this might not be a priority right now.",
        "I'll close the loop here and won't send further follow-ups. If the timing changes, you're welcome to get in touch.",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day15_no_site", stage: "Day 15", label: "No website · final check-in",
    description: "Final message without suggesting a website audit took place.",
    defaultTemplate: {
      subject: "Closing the loop on {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "Just a final check-in about the website possibility I mentioned. I understand this might not be a priority right now.",
        "I'll close the loop here and won't send further follow-ups. If the timing changes, you're welcome to get in touch.",
        "Bennie\nBennie Studio",
      ),
    },
  },
];

export const PROSPECT_TEMPLATE_KEYS = PROSPECT_EMAIL_TEMPLATE_DEFINITIONS.map((row) => row.id);
const PLACEHOLDERS = new Set(["first_name", "business_name", "asset_url", "portfolio_url"]);

export function validateProspectEmailTemplate(key: ProspectEmailTemplateKey, template: ProspectEmailTemplate): string | null {
  const definition = PROSPECT_EMAIL_TEMPLATE_DEFINITIONS.find((item) => item.id === key);
  if (!definition) return "Unknown template";
  if (!template?.subject?.trim() || template.subject.length > 160) return "Subject must contain 1–160 characters.";
  if (!template?.body?.trim() || template.body.length > 8000) return "Message must contain 1–8,000 characters.";
  if (/\r/.test(template.subject) || /[\n]/.test(template.subject)) return "Subject must be a single line.";
  for (const text of [template.subject, template.body]) {
    for (const match of text.matchAll(/\{\{([^{}]+)\}\}/g)) {
      if (!PLACEHOLDERS.has(match[1].trim())) return "Unsupported variable: " + match[1].trim();
    }
    if (/{{|}}/.test(text.replace(/\{\{(?:first_name|business_name|asset_url|portfolio_url)\}\}/g, ""))) {
      return "Check incomplete or malformed template variables.";
    }
  }
  if (definition.requiredToken && !template.body.includes("{{" + definition.requiredToken + "}}")) {
    return "This template must include {{" + definition.requiredToken + "}}.";
  }
  return null;
}

export function renderProspectEmailTemplate(
  key: ProspectEmailTemplateKey,
  context: ProspectEmailContext,
  overrides: ProspectEmailOverrides = {},
): { subject: string; body_text: string } {
  const definition = PROSPECT_EMAIL_TEMPLATE_DEFINITIONS.find((item) => item.id === key);
  if (!definition) throw new Error("UNKNOWN_PROSPECT_TEMPLATE");
  const proposed = overrides?.[key];
  const template = proposed && !validateProspectEmailTemplate(key, proposed) ? proposed : definition.defaultTemplate;
  const values: Record<string, string> = {
    first_name: context.first_name,
    business_name: context.business_name,
    asset_url: context.asset_url || "",
    portfolio_url: context.portfolio_url || PORTFOLIO_URL,
  };
  const substitute = (text: string) => text.replace(/\{\{\s*(first_name|business_name|asset_url|portfolio_url)\s*\}\}/g,
    (_match, token: string) => values[token] || "");
  return { subject: substitute(template.subject), body_text: substitute(template.body) };
}

export function getEditableProspectTemplate(key: ProspectEmailTemplateKey, overrides: ProspectEmailOverrides = {}) {
  const definition = PROSPECT_EMAIL_TEMPLATE_DEFINITIONS.find((item) => item.id === key);
  if (!definition) throw new Error("UNKNOWN_PROSPECT_TEMPLATE");
  const edited = overrides?.[key];
  return edited && !validateProspectEmailTemplate(key, edited) ? edited : definition.defaultTemplate;
}
