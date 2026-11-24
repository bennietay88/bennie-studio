
import axios from "axios";


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
 *
 * Bennie Studio uses the Responses API for new OpenAI generation work.
 * Public free previews deliberately do not call this provider; they are
 * deterministic so the marginal AI cost stays at $0.
 */
export async function callOpenAI(
  apiKey: string,
  request: AIRequest,
  model: string = "gpt-5.6-luna"
): Promise<AIResponse> {
  // Load the SDK only for AI generation, not unrelated API requests.
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: apiKey.trim() });

  const response = await openai.responses.create({
    model,
    instructions: request.systemMessage || "You are a helpful AI assistant.",
    input: request.prompt,
    max_output_tokens: request.maxTokens || 4096,
    temperature: request.temperature ?? 0.2,
    store: false,
    reasoning: model.startsWith("gpt-5") ? { effort: "none" } : undefined,
    text: request.isJson ? { format: { type: "json_object" } } : undefined,
  });

  return {
    text: response.output_text || "",
    usage: {
      promptTokens: response.usage?.input_tokens || 0,
      completionTokens: response.usage?.output_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    },
  };
}
