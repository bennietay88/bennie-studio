import { z } from "zod";

export const InternalContentBriefSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  industry: z.string().trim().min(1).max(120),
  market: z.string().trim().max(80).optional().default("Malaysia"),
  services: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  differentiators: z.array(z.string().trim().min(1).max(240)).max(12).default([]),
  verifiedFacts: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  tone: z.string().trim().max(80).optional().default("clear and professional"),
});

export const InternalContentDraftSchema = z.object({
  headline: z.string().trim().max(180),
  subheadline: z.string().trim().max(320),
  body: z.string().trim().max(4000),
  cta: z.string().trim().max(80),
  seoTitle: z.string().trim().max(160),
  seoDescription: z.string().trim().max(320),
  claimsToVerify: z.array(z.string().trim().max(300)).max(30),
});

export const HumaniseContentDraftSchema = z.object({
  headline: z.string().trim().max(180),
  body: z.string().trim().max(4000),
  cta: z.string().trim().max(80),
  edits: z.array(z.string().trim().max(240)).max(30),
  claimsToVerify: z.array(z.string().trim().max(300)).max(30),
});

export type InternalContentBrief = z.infer<typeof InternalContentBriefSchema>;
export type InternalContentDraft = z.infer<typeof InternalContentDraftSchema>;
export type HumaniseContentDraft = z.infer<typeof HumaniseContentDraftSchema>;

export const INTERNAL_CONTENT_SYSTEM_PROMPT = `You are Bennie Studio's internal content drafting assistant. Produce a concise first draft for a real service business. Use only the supplied verified facts. Never invent reviews, awards, certifications, years in business, staff, locations, customer counts, rankings, guarantees, or performance results. If a useful claim is not verified, put it in claimsToVerify and do not state it as fact. Output JSON only with headline, subheadline, body, cta, seoTitle, seoDescription, claimsToVerify.`;

export const HUMANISE_CONTENT_SYSTEM_PROMPT = `You are Bennie Studio's internal copy editor. Rewrite the supplied draft so it sounds natural, specific and professional for the stated industry. Remove clichés, vague adjectives, inflated claims, repetitive structure and AI fingerprints. Preserve verified facts and meaning. Never invent proof, pricing, awards, locations, reviews or outcomes. Return JSON only with headline, body, cta, edits, claimsToVerify. This is a DRAFT for human review and must never be published automatically.`;

export function buildInternalContentPrompt(brief: InternalContentBrief) {
  return JSON.stringify({ task: "draft service-business homepage copy", brief }, null, 2);
}

export function parseInternalContentDraft(value: unknown): InternalContentDraft {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  return InternalContentDraftSchema.parse(raw);
}

export function buildHumaniseContentPrompt(input: {
  businessName: string;
  industry: string;
  verifiedFacts: string[];
  headline?: string;
  body?: string;
  cta?: string;
}) {
  return JSON.stringify({ task: "humanise website copy", input }, null, 2);
}

export function parseHumaniseContentDraft(value: unknown): HumaniseContentDraft {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  return HumaniseContentDraftSchema.parse(raw);
}
