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

export type InternalContentBrief = z.infer<typeof InternalContentBriefSchema>;
export type InternalContentDraft = z.infer<typeof InternalContentDraftSchema>;

export const INTERNAL_CONTENT_SYSTEM_PROMPT = `You are Bennie Studio's internal content drafting assistant. Produce a concise first draft for a real service business. Use only the supplied verified facts. Never invent reviews, awards, certifications, years in business, staff, locations, customer counts, rankings, guarantees, or performance results. If a useful claim is not verified, put it in claimsToVerify and do not state it as fact. Output JSON only with headline, subheadline, body, cta, seoTitle, seoDescription, claimsToVerify.`;

export function buildInternalContentPrompt(brief: InternalContentBrief) {
  return JSON.stringify({ task: "draft service-business homepage copy", brief }, null, 2);
}

export function parseInternalContentDraft(value: unknown): InternalContentDraft {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  return InternalContentDraftSchema.parse(raw);
}
