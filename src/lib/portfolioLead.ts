import { z } from "zod";

export const PORTFOLIO_LEAD_MAX_BODY_BYTES = 32 * 1024;

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const portfolioLeadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  industry: optionalText(150),
  message: z.string().trim().min(10).max(5000),
  source: z.literal("portfolio"),
  sourcePage: optionalText(500),
  consent: z.literal(true),
  consentGiven: z.literal(true),
  consentTimestamp: z.string().trim().datetime({ offset: true }),
  privacyPolicyVersion: z.string().trim().min(1).max(40),
  utmSource: optionalText(160),
  utmMedium: optionalText(160),
  utmCampaign: optionalText(160),
  utmContent: optionalText(160),
  utmTerm: optionalText(160),
  honeypot: z.string().trim().max(200).default(""),
}).strict();

export type PortfolioLeadInput = z.infer<typeof portfolioLeadSchema>;

function normalizeSingleLine(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMessage(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Validate, trim and normalize values before they enter the lead system. */
export function normalizePortfolioLead(input: unknown): PortfolioLeadInput {
  const parsed = portfolioLeadSchema.parse(input);
  const normalized = {
    ...parsed,
    name: normalizeSingleLine(parsed.name),
    email: normalizeSingleLine(parsed.email).toLowerCase(),
    industry: normalizeSingleLine(parsed.industry),
    message: normalizeMessage(parsed.message),
    sourcePage: normalizeSingleLine(parsed.sourcePage),
    privacyPolicyVersion: normalizeSingleLine(parsed.privacyPolicyVersion),
    utmSource: normalizeSingleLine(parsed.utmSource),
    utmMedium: normalizeSingleLine(parsed.utmMedium),
    utmCampaign: normalizeSingleLine(parsed.utmCampaign),
    utmContent: normalizeSingleLine(parsed.utmContent),
    utmTerm: normalizeSingleLine(parsed.utmTerm),
    honeypot: normalizeSingleLine(parsed.honeypot),
  };
  if (normalized.name.length < 2 || normalized.name.length > 100) throw new Error("Invalid name");
  if (normalized.message.length < 10 || normalized.message.length > 5000) throw new Error("Invalid message");
  if (normalized.industry.length > 150) throw new Error("Invalid industry");
  return normalized;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '\"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}
