/**
 * AI Model Constants and Configuration
 * Provides centralized management for Gemini model versions and use-case optimization.
 */

export type AIUseCase = "synthesis" | "seo" | "chatbot" | "blog" | "marketing" | "copy";
export type AIProvider = "deepseek" | "openai" | "google";

export interface AIModelOption {
  id: string;
  provider: AIProvider;
  name: string;
  description: string;
  tier: "standard" | "premium";
  creditCost: number;
  recommendedFor: AIUseCase[];
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: "gemini-1.5-flash",
    provider: "google",
    name: "Neural Flash",
    description: "Ultra-fast, efficient model for website drafts and standard copy.",
    tier: "standard",
    creditCost: 1,
    recommendedFor: ["synthesis", "blog", "marketing"],
  },
  {
    id: "gemini-1.5-pro",
    provider: "google",
    name: "Neural Pro",
    description: "Advanced intelligence for agency-grade copy and complex reasoning.",
    tier: "premium",
    creditCost: 5,
    recommendedFor: ["synthesis", "seo", "copy"],
  },
  {
    id: "deepseek-chat",
    provider: "deepseek",
    name: "Standard AI",
    description: "Efficient AI for everyday business tasks and content generation.",
    tier: "standard",
    creditCost: 1,
    recommendedFor: ["chatbot", "blog", "marketing"],
  },
  {
    id: "gpt-4o",
    provider: "openai",
    name: "Premium AI",
    description: "Advanced AI for agency-grade copy and complex reasoning.",
    tier: "premium",
    creditCost: 5,
    recommendedFor: ["synthesis", "seo", "copy"],
  }
];

export const DEFAULT_MODEL_CONFIG: Record<AIUseCase, string> = {
  synthesis: "gemini-1.5-flash",
  seo: "gemini-1.5-pro",
  chatbot: "gemini-1.5-flash",
  blog: "gemini-1.5-flash",
  marketing: "gemini-1.5-flash",
  copy: "gemini-1.5-pro",
};

export const USE_CASE_LABELS: Record<AIUseCase, string> = {
  synthesis: "Launch My Website",
  seo: "Agency-Grade Rewrite",
  chatbot: "AI Assistant",
  blog: "Content Engine",
  marketing: "Campaign Generator",
  copy: "Conversion Review",
};
