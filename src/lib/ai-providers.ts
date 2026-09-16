
import axios from "axios";
import OpenAI from "openai";

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
