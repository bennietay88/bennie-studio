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
  specific_observation?: string;
};

type TemplateDefinition = {
  id: ProspectEmailTemplateKey;
  label: string;
  stage: string;
  description: string;
  requiredTokens?: readonly ("asset_url" | "portfolio_url" | "specific_observation")[];
  defaultTemplate: ProspectEmailTemplate;
};

const body = (...paragraphs: string[]) => paragraphs.join("\n\n");

export const PROSPECT_EMAIL_TEMPLATE_DEFINITIONS: readonly TemplateDefinition[] = [
  {
    id: "intro", stage: "Day 0", label: "Initial introduction",
    description: "Used for the permissioned sequence and as the default first email in the prospect composer. A verified observation is included when one has been recorded.",
    defaultTemplate: {
      subject: "One practical website idea for {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "{{specific_observation}}",
        "Would one practical suggestion for making it easier for customers to enquire be useful? Reply “yes” and I’ll send it. No call needed.",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day3_design", stage: "Day 3", label: "Personalized design preview",
    description: "Only selected when a checked, prospect-specific redesign has been saved.",
    requiredTokens: ["asset_url"],
    defaultTemplate: {
      subject: "I put together a website concept for {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "I made a first-pass homepage concept for {{business_name}} to show one possible direction for clearer services and easier enquiries. It’s a concept for discussion, not a live site.",
        "View your concept:",
        "{{asset_url}}",
        "What would you change first? Reply with one thing and I’ll take a look.",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day3_audit", stage: "Day 3", label: "Verified website review",
    description: "Only selected when a verified, access-controlled review URL exists.",
    requiredTokens: ["asset_url", "specific_observation"],
    defaultTemplate: {
      subject: "One website improvement for {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "I reviewed the website and one opportunity stood out: {{specific_observation}}",
        "I put the short review and a few practical recommendations here:",
        "{{asset_url}}",
        "If you want, reply “first step” and I’ll send the one change I’d prioritize. No call needed.",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day3_portfolio_existing", stage: "Day 3", label: "Existing site · portfolio fallback",
    description: "Used when a website exists but there is no verified redesign or review.",
    requiredTokens: ["portfolio_url"],
    defaultTemplate: {
      subject: "Following up on my earlier email — {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "Just following up on my earlier email about Bennie Studio.",
        "We build and manage websites for service businesses, making it easier for potential customers to learn about their services and get in touch.",
        "If you're curious about our work, you can view our portfolio here:",
        "{{portfolio_url}}",
        "Is making the website easier to enquire through a priority this year? Reply “yes” or “not now” and I’ll take it from there.",
        "Bennie\nBennie Studio",
      ),
    },
  },
  {
    id: "day3_portfolio_no_site", stage: "Day 3", label: "No website · portfolio follow-up",
    description: "No audit claims; references the introduction and invites a conversation.",
    requiredTokens: ["portfolio_url"],
    defaultTemplate: {
      subject: "Following up on my earlier email — {{business_name}}",
      body: body(
        "Hi {{first_name}},",
        "Just following up on my earlier email about Bennie Studio.",
        "We build and manage websites for service businesses, making it easier for potential customers to learn about their services and get in touch.",
        "If you're curious about our work, you can view our portfolio here:",
        "{{portfolio_url}}",
        "Is getting a website on your list this year? Reply “yes” or “not now” and I’ll send a short outline if it is.",
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
        "Are you looking at website improvements this year? A quick “yes” or “not now” is enough; if yes, I’ll send the scope, setup fee and monthly costs for {{business_name}}.",
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
        "Are you planning to get a website this year? A quick “yes” or “not now” is enough; if yes, I’ll send the scope, setup fee and monthly costs for {{business_name}}.",
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
const PLACEHOLDERS = new Set(["first_name", "business_name", "asset_url", "portfolio_url", "specific_observation"]);

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
    if (/{{|}}/.test(text.replace(/\{\{(?:first_name|business_name|asset_url|portfolio_url|specific_observation)\}\}/g, ""))) {
      return "Check incomplete or malformed template variables.";
    }
  }
  for (const token of definition.requiredTokens || []) {
    if (!template.body.includes("{{" + token + "}}")) return "This template must include {{" + token + "}}.";
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
    specific_observation: context.specific_observation || "",
  };
  const substitute = (text: string) => text.replace(/\{\{\s*(first_name|business_name|asset_url|portfolio_url|specific_observation)\s*\}\}/g,
    (_match, token: string) => values[token] || "").split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).join("\n\n");
  return { subject: substitute(template.subject), body_text: substitute(template.body) };
}

export function getEditableProspectTemplate(key: ProspectEmailTemplateKey, overrides: ProspectEmailOverrides = {}) {
  const definition = PROSPECT_EMAIL_TEMPLATE_DEFINITIONS.find((item) => item.id === key);
  if (!definition) throw new Error("UNKNOWN_PROSPECT_TEMPLATE");
  const edited = overrides?.[key];
  return edited && !validateProspectEmailTemplate(key, edited) ? edited : definition.defaultTemplate;
}
