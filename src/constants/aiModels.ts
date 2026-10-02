/**
 * AI Model Constants and Configuration
 * Provides centralized management for the supported OpenAI and DeepSeek models.
 */

export type AIUseCase = "synthesis" | "seo" | "chatbot" | "blog" | "marketing" | "copy";
export type AIProvider = "deepseek" | "openai";

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
    id: "deepseek-chat",
    provider: "deepseek",
    name: "DeepSeek Chat",
    description: "Cost-efficient model for everyday website drafts and editing.",
    tier: "standard",
    creditCost: 1,
    recommendedFor: ["synthesis", "blog", "marketing", "chatbot"],
  },
  {
    id: "deepseek-reasoner",
    provider: "deepseek",
    name: "DeepSeek Reasoner",
    description: "Stronger reasoning for SEO and complex content decisions.",
    tier: "premium",
    creditCost: 5,
    recommendedFor: ["seo", "copy"],
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    name: "ChatGPT Mini",
    description: "Reliable low-cost OpenAI model for polished customer-facing copy.",
    tier: "standard",
    creditCost: 2,
    recommendedFor: ["synthesis", "blog", "marketing", "chatbot"],
  },
  {
    id: "gpt-4o",
    provider: "openai",
    name: "ChatGPT 4o",
    description: "Premium OpenAI model for high-stakes copy and complex reasoning.",
    tier: "premium",
    creditCost: 5,
    recommendedFor: ["seo", "copy"],
  }
];

export const DEFAULT_MODEL_CONFIG: Record<AIUseCase, string> = {
  synthesis: "deepseek-chat",
  seo: "deepseek-reasoner",
  chatbot: "deepseek-chat",
  blog: "deepseek-chat",
  marketing: "deepseek-chat",
  copy: "gpt-4o-mini",
};

export const USE_CASE_LABELS: Record<AIUseCase, string> = {
  synthesis: "Launch My Website",
  seo: "Agency-Grade Rewrite",
  chatbot: "AI Assistant",
  blog: "Content Engine",
  marketing: "Campaign Copy",
  copy: "Conversion Review",
};
