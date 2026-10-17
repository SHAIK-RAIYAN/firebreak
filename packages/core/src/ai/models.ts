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

export function defaultModelFor(provider: ProviderId): string {
  const prov = PROVIDERS[provider];
  if (!prov) return "";
  const def = prov.models.find((m: any) => m.default) || prov.models[0];
  return def.id;
}

export function modelFor(provider: ProviderId, apiKey: string, modelId?: string) {
  const targetModel = modelId || defaultModelFor(provider);
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(targetModel);
    case "openai":
      return createOpenAI({ apiKey })(targetModel);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(targetModel);
    case "xai":
      return createXai({ apiKey })(targetModel);
    default:
      throw new Error(`Unsupported AI provider: ${String(provider)}`);
  }
}
