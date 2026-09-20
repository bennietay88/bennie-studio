
import { supabase } from "./supabase";
import axios from "axios";
import { getCustomerSiteCapabilityPrompt } from "../constants/customerSiteCapabilities";

// TypeScript definitions moved from constants to ensure availability
export type AIUseCase = "copy" | "synthesis" | "seo" | "chat" | "ad_copy" | "rewrite_section" | "blog" | "image" | "marketing";

/**
 * Metadata for AI use cases
 */
export const USE_CASE_LABELS: Record<string, string> = {
  copy: "Marketing Copy",
  synthesis: "Website Synthesis",
  seo: "SEO Optimization",
  chat: "Support Chat",
  ad_copy: "Ad Copywriter",
  rewrite_section: "Neural Section Rewriter",
  blog: "Neural Blog Writer",
  image: "Visual Generation",
  marketing: "Strategy & Marketing"
};

/**
 * Attempts to cleanup AI response strings that might have markdown or garbage
 */
function cleanAIResponse(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  const jsonMatch = cleaned.match(/```json\s?([\s\S]*?)\s?```/) ||
                   cleaned.match(/```\s?([\s\S]*?)\s?```/);
  if (jsonMatch) cleaned = jsonMatch[1].trim();
  
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    const endIdx = Math.max(lastBrace, lastBracket);
    if (endIdx > startIdx) cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  return cleaned;
}

/**
 * Attempts to repair broken JSON from AI
 */
function repairJSON(text: string): string {
  let cleaned = cleanAIResponse(text);
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    // Basic repair for trailing commas
    cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
    // Close objects/arrays if truncated
    let stack = [];
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === "{") stack.push("}");
      else if (cleaned[i] === "[") stack.push("]");
      else if (cleaned[i] === "}" || cleaned[i] === "]") stack.pop();
    }
    while (stack.length > 0) cleaned += stack.pop();
    return cleaned;
  }
}

/**
 * Shared AI generation router that calls the backend credit-based route
 */
export async function askAI(
  useCase: AIUseCase,
  prompt: string,
  options: {
    businessId?: string;
    systemMessage?: string;
    responseSchema?: any;
    isJson?: boolean;
    maxRetries?: number;
    featureKey?: string;
  } = {},
) {
  const maxRetries = options.maxRetries ?? 2;
  let lastError: any = null;

  // Map useCase to feature_key if not provided
  const featureKey = options.featureKey || (useCase === "synthesis" ? "website_draft" : "rewrite_section");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("AUTH_REQUIRED");

      const response = await axios.post(
        "/api/ai/generate",
        {
          project_id: options.businessId,
          feature_key: featureKey,
          input: {
            prompt,
            systemMessage: options.systemMessage,
            isJson: options.isJson,
            // @ts-ignore - Extra context for fallback synthesis
            context: options.context
          }
        },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          timeout: 120000 
        }
      );

      const result = response.data.output;
      
      if (options.isJson && typeof result === "string") {
        try {
          return JSON.parse(repairJSON(result));
        } catch (e) {
          return JSON.parse(cleanAIResponse(result));
        }
      }

      return result;
    } catch (error: any) {
      lastError = error;
      const apiError = error.response?.data?.error || error.response?.data?.message || error.message;
      
      if (error.response?.status === 402) {
        throw new Error(apiError || "INSUFFICIENT_CREDITS");
      }
      
      // If we have a clear error from the server even if it's not 402, let's use it
      if (error.response?.data && (error.response.data.error || error.response.data.message)) {
        throw new Error(apiError);
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError || new Error("AI Synthesis failed");
}

/**
 * Improves a vague business description using AI.
 */
export async function improveBusinessDescription(
  input: string,
  businessName: string,
  industry: string,
  businessId?: string,
) {
  const prompt = `Improve this business description: "${input}" for "${businessName}" in ${industry}. Professional tone, benefits-focused, max 60 words.`;
  return await askAI("copy", prompt, { businessId });
}

export async function generateWebsiteContent(
  businessName: string,
  industry: string,
  location: string,
  tone: string,
  template: string = "modern",
  businessNature: string = "",
  businessId?: string,
  selectedSections: string[] = [],
  strategy: any = {},
) {
  const systemMessage = `You are an elite web architect and copywriter.
    Generate a high-conversion website structure and copy in JSON format.
    
    The JSON structure MUST follow this exact schema:
    {
      "pages": [
        {
          "title": "Home",
          "slug": "index",
          "sections": [
             {
               "type": "Hero", 
               "content": { 
                 "title": "Main compelling headline", 
                 "subtitle": "Clear value proposition", 
                 "cta": "Primary Action Text" 
               }
             },
             {
               "type": "Services",
               "content": {
                 "title": "What We Offer",
                 "items": [
                   { "title": "Service Name", "description": "Compelling benefit-driven description" }
                 ]
               }
             },
             {
               "type": "Proof",
               "content": {
                 "title": "Why Trust Us",
                 "stats": []
               }
             },
             {
               "type": "Features",
               "content": {
                 "title": "Our Approach",
                 "items": ["Feature 1", "Feature 2"]
               }
             },
             {
                "type": "CTA",
                "content": {
                  "title": "Final Call to Action",
                  "description": "Risk reversal or urgency",
                  "buttonText": "Start Today"
                }
             }
          ]
        }
      ],
      "seo": { 
        "title": "Optimized Brand Title", 
        "description": "Compelling meta description", 
        "keywords": ["keyword1", "keyword2"] 
      }
    }

    Notes:
    - types available: Hero, Services, Proof, Features, Benefits, CTA, FAQ, Testimonials, Contact, Appointment, Blog_List.
    - Proof supports variants: metrics, logo_wall, certification_strip, trust_strip, logo_marquee.
    - If the requested concept is a logo strip, partner strip, client-logo row, technology-logo row or trust bar, output type "Proof" with settings.variant "logo_marquee".
    - Never invent clients, brand relationships, certifications, awards, testimonials or performance metrics. For logo_marquee, include logos only when explicitly supplied by the business; otherwise leave logos empty.
    - Ensure EVERY section requested is present.
    - Return ONLY valid JSON. No markdown wrappers.

    ${getCustomerSiteCapabilityPrompt()}`;

  const prompt = `synthesize a master website for:
    Business: ${businessName}
    Industry: ${industry}
    Location: ${location || "Global"}
    Tone: ${tone || "Professional"}
    Style: ${template}
    Context: ${businessNature}
    Requested Section Sequence: ${selectedSections.length > 0 ? selectedSections.join(", ") : "Hero, Proof, Services, Benefits, Features, FAQ, CTA"}`;

  return await askAI("synthesis", prompt, {
    businessId,
    featureKey: "website_draft",
    systemMessage,
    isJson: true,
    maxRetries: 3,
    // @ts-ignore
    context: {
      businessName,
      industry,
      location,
      template
    }
  });
}

export async function generatePageContent(
  pageTitle: string,
  businessName: string,
  industry: string,
  location: string,
  tone: string,
  businessNature: string = "",
  businessId?: string,
) {
  const prompt = `Generate page content for "${pageTitle}" for ${businessName}. Industry: ${industry}, Tone: ${tone}`;
  return await askAI("synthesis", prompt, {
    businessId,
    featureKey: "website_draft",
    isJson: true
  });
}

export async function generateSectionContent(
  type: string,
  businessName: string,
  industry: string,
  location: string,
  tone: string,
  businessNature: string = "",
  businessId?: string,
  customPrompt?: string,
) {
  const prompt = `Generate a ${type} section for ${businessName}. ${customPrompt || ""}`;
  return await askAI("rewrite_section", prompt, {
    businessId,
    isJson: true
  });
}

export async function generateGeoContent(
  businessName: string,
  industry: string,
  location: string,
  businessNature: string,
  businessId?: string,
) {
  const prompt = `Generate SEO/GEO metadata for ${businessName}.`;
  return await askAI("seo", prompt, {
    businessId,
    featureKey: "seo_meta",
    isJson: true
  });
}

/**
 * Compatibility helper for marketing content
 */
export async function generateMarketingContent(
  type: string,
  context: any,
) {
  const businessId = context?.id || context?.businessId;
  if (type === "seo_audit") {
    const prompt = `Review the supplied website SEO context as a practical website growth consultant.

Return JSON with this exact structure:
{
  "summary": "Concise evidence-based summary",
  "criticalIssues": [
    {
      "category": "Search messaging | Content structure | Local relevance | Technical setup",
      "issue": "Observable finding title",
      "whatWeFound": "What is present or missing in the supplied context",
      "impact": "Why this may make search discovery or visitor clarity harder",
      "solution": "Specific recommended improvement",
      "priority": "high | medium | low",
      "fixType": "title | description | keywords | manual_review"
    }
  ],
  "nextRecommendation": "One clear next improvement"
}

Rules:
- Do not score, rate, grade, rank, or return percentages.
- Do not invent traffic, conversion rates, rankings, leads, revenue impact, competitors, or performance measurements.
- Do not claim the business is losing a percentage of leads.
- Treat missing context as unknown, not as failure.
- Use cautious evidence-oriented language such as "may make it harder", "could reduce clarity", "visitors may", and "this creates additional friction".
- Every finding must include what was found, why it matters, and a recommendation.

Website context: ${JSON.stringify(context)}`;
    return await askAI("seo", prompt, {
      businessId,
      featureKey: "rewrite_section",
      isJson: true,
      systemMessage: "You are a website growth consultant backed by software. Provide findings and actions, never arbitrary scores.",
    });
  }
  const prompt = `Task: ${type}. Context: ${JSON.stringify(context)}`;
  return await askAI("copy", prompt, { businessId });
}

/**
 * Compatibility helper for blog posts
 */
export async function generateBlogPost(
  context: any,
  businessId?: string,
) {
  const bId = businessId || context?.id || context?.businessId;
  const prompt = typeof context === "string" ? context : JSON.stringify(context);
  return await askAI("blog", prompt, { businessId: bId });
}

/**
 * Compatibility helper for chat responses
 */
export async function generateChatResponse(
  messageInput: any,
  context?: any,
  businessId?: string,
) {
  const bId = businessId || context?.businessId || context?.id;
  const prompt = typeof messageInput === "string" 
    ? `User said: ${messageInput}. Context: ${JSON.stringify(context)}`
    : `Conversation: ${JSON.stringify(messageInput)}. Context: ${JSON.stringify(context)}`;
  
  return await askAI("chat", prompt, { businessId: bId });
}

/**
 * Specifically improves a headline for conversion.
 */
export async function improveHeadline(
  headline: string,
  businessName: string,
  industry: string,
  businessId?: string,
) {
  const prompt = `Rewrite this headline for higher conversion: "${headline}". 
  Business: ${businessName} in ${industry}. 
  Keep it punchy, emotional, and benefit-driven. Max 10 words. 
  Return only the new headline text.`;
  return await askAI("copy", prompt, { businessId });
}

/**
 * Rewrites a subheadline to be more persuasive.
 */
export async function rewriteSubheadline(
  subheadline: string,
  businessName: string,
  industry: string,
  businessId?: string,
) {
  const prompt = `Rewrite this supporting text/subheadline to be more persuasive: "${subheadline}". 
  Business: ${businessName} in ${industry}. 
  Tone: Professional but compelling. Max 40 words. 
  Return only the new content text.`;
  return await askAI("copy", prompt, { businessId });
}

/**
 * Generates SEO metadata for a business.
 */
export async function generateSEOMetadata(
  businessName: string,
  industry: string,
  businessNature: string,
  businessId?: string,
) {
  const prompt = `Generate conversion-optimized SEO metadata for ${businessName} (${industry}). 
  Description context: ${businessNature}. 
  Return JSON: { "title": "SEO title", "description": "Meta description", "keywords": ["kw1", "kw2"] }`;
  return await askAI("seo", prompt, { businessId, isJson: true });
}

/**
 * Generates FAQs for a business.
 */
export async function generateFAQs(
  businessName: string,
  industry: string,
  services: string[],
  businessId?: string,
) {
  const prompt = `Generate 5 professional FAQ items with answers for ${businessName} in ${industry}. 
  Services: ${services.join(", ")}. 
  Return JSON array: [{"question": "...", "answer": "..."}]`;
  return await askAI("copy", prompt, { businessId, isJson: true });
}
