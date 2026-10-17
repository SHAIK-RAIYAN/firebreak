import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";

export const PROVIDERS = {
  anthropic: {
    label: "Anthropic",
    models: [
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", default: true },
      { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", cheap: true },
    ],
  },
  openai: {
    label: "OpenAI",
    models: [
      { id: "gpt-6.1-sol", label: "GPT-6.1 Sol", default: true },
      { id: "gpt-6-astra", label: "GPT-6 Astra" },
      { id: "gpt-6-luna", label: "GPT-6 Luna", cheap: true },
    ],
  },
  google: {
    label: "Google",
    models: [
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", default: true },
      { id: "gemini-4-argon", label: "Gemini 4 Argon" },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", cheap: true },
    ],
  },
  xai: {
    label: "xAI",
    models: [
      { id: "grok-4.7", label: "Grok 4.7", default: true },
      { id: "grok-4.3", label: "Grok 4.3", cheap: true },
    ],
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export function modelFor(provider: ProviderId, apiKey: string, modelId: string) {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "xai":
      return createXai({ apiKey })(modelId);
    default:
      throw new Error(`Unsupported AI provider: ${String(provider)}`);
  }
}
