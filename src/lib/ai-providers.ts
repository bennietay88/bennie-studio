
import axios from "axios";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Interface for AI request
 */
export interface AIRequest {
  prompt: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  isJson?: boolean;
}

/**
 * Interface for AI Response
 */
export interface AIResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Gemini Provider (Google)
 */
export async function callGemini(
  apiKey: string,
  request: AIRequest,
  modelName: string = "gemini-1.5-flash"
): Promise<AIResponse> {
  // Ensure we use a clean key
  const cleanKey = apiKey.trim();
  
  const isPlaceholder = (k: string) => {
    const pk = k.toUpperCase();
    return pk === "" || 
           pk.includes("YOUR_") || 
           pk.includes("PLACEHOLDER") || 
           pk === "UNDEFINED" || 
           pk === "NULL" ||
           pk.startsWith("MY_") ||
           pk.startsWith("GEMINI_") ||
           pk.includes("TODO") ||
           pk === "MY_GEMINI_API_KEY" ||
           k.length < 10; // Real keys are >35, loosened to 10 for proxies
  };

  if (isPlaceholder(cleanKey)) {
    console.error(`[Gemini Error] Invalid/Placeholder Key detection. Length: ${cleanKey.length}`);
    throw new Error(`INVALID_GEMINI_KEY: The Gemini API key provided (${cleanKey.length} chars) appears to be a placeholder or is too short. Please provide a valid AIza... key from the Platform Settings or your .env file.`);
  }

  const genAI = new GoogleGenerativeAI(cleanKey);
  
  // Normalize model names - fallback standard models if experimental/unsupported names are passed
  let normalizedModel = modelName;
  if (normalizedModel.includes("gemini-3")) {
    normalizedModel = normalizedModel.includes("pro") ? "gemini-1.5-pro" : "gemini-1.5-flash";
  }
  
  // Fix model name if it doesn't have the prefix
  const fullModelName = normalizedModel.includes("/") ? normalizedModel : `models/${normalizedModel}`;
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: fullModelName,
      systemInstruction: request.systemMessage,
    });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      generationConfig: {
        temperature: request.temperature || 0.2,
        maxOutputTokens: request.maxTokens || 4096,
        responseMimeType: request.isJson ? "application/json" : "text/plain",
      },
    });

    const response = result.response;
    const text = response.text() || "";

    return {
      text: text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    };
  } catch (error: any) {
    const keyPrefix = cleanKey.substring(0, 4);
    console.error(`[Gemini Error] Model: ${fullModelName}, Key Length: ${cleanKey.length}, Prefix: ${keyPrefix}...`);
    if (error.message?.includes("API key not valid")) {
      throw new Error(`INVALID_GEMINI_KEY: The Gemini API key provided (len: ${cleanKey.length}, starts with: ${keyPrefix}...) is invalid or does not have access to model ${fullModelName}.`);
    }
    throw error;
  }
}

/**
 * DeepSeek Provider
 */
export async function callDeepSeek(
  apiKey: string,
  request: AIRequest,
  model: string = "deepseek-chat"
): Promise<AIResponse> {
  const messages = [];
  if (request.systemMessage) {
    messages.push({ role: "system", content: request.systemMessage });
  }
  messages.push({ role: "user", content: request.prompt });

  const response = await axios.post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model,
      messages,
      temperature: request.temperature || 0.2,
      max_tokens: request.maxTokens || 4096,
      response_format: request.isJson ? { type: "json_object" } : { type: "text" },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  return {
    text: response.data.choices[0].message.content,
    usage: {
      promptTokens: response.data.usage?.prompt_tokens || 0,
      completionTokens: response.data.usage?.completion_tokens || 0,
      totalTokens: response.data.usage?.total_tokens || 0,
    },
  };
}

/**
 * OpenAI Provider
 */
export async function callOpenAI(
  apiKey: string,
  request: AIRequest,
  model: string = "gpt-4o"
): Promise<AIResponse> {
  const openai = new OpenAI({ apiKey: apiKey.trim() });

  const messages: any[] = [];
  if (request.systemMessage) {
    messages.push({ role: "system", content: request.systemMessage });
  }
  messages.push({ role: "user", content: request.prompt });

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature: request.temperature || 0.2,
    max_tokens: request.maxTokens || 4096,
    response_format: request.isJson ? { type: "json_object" } : { type: "text" },
  });

  return {
    text: response.choices[0].message.content || "",
    usage: {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}
