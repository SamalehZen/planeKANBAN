export type TInstanceAIConfigurationKeys = "LLM_API_KEY" | "LLM_MODEL" | "LLM_PROVIDER";

export type TLLMProvider = "mimo" | "openai" | "gemini" | "anthropic";

export const LLM_PROVIDERS: Record<TLLMProvider, { name: string; models: string[]; defaultModel: string; baseUrl?: string }> = {
  mimo: {
    name: "Xiaomi MiMo",
    models: ["mimo-v2-flash", "mimo-v2-pro", "mimo-v2-lite"],
    defaultModel: "mimo-v2-flash",
    baseUrl: "https://api.xiaomimimo.com/v1",
  },
  openai: {
    name: "OpenAI",
    models: ["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4o", "o1-mini", "o1-preview"],
    defaultModel: "gpt-4o-mini",
  },
  gemini: {
    name: "Google Gemini",
    models: ["gemini-3-flash-preview", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
    defaultModel: "gemini-3-flash-preview",
  },
  anthropic: {
    name: "Anthropic Claude",
    models: [
      "claude-3-5-sonnet-20240620",
      "claude-3-haiku-20240307",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
    ],
    defaultModel: "claude-3-5-sonnet-20240620",
  },
};
