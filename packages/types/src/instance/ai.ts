export type TInstanceAIConfigurationKeys = "LLM_API_KEY" | "LLM_MODEL" | "LLM_PROVIDER";

export type TLLMProvider = "openai" | "gemini" | "anthropic";

export const LLM_PROVIDERS: Record<TLLMProvider, { name: string; models: string[]; defaultModel: string }> = {
  openai: {
    name: "OpenAI",
    models: ["gpt-3.5-turbo", "gpt-4o-mini", "gpt-4o", "o1-mini", "o1-preview"],
    defaultModel: "gpt-4o-mini",
  },
  gemini: {
    name: "Google Gemini",
    models: ["gemini-pro", "gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-pro-vision"],
    defaultModel: "gemini-1.5-flash-latest",
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
