import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';

export const providers = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
} as const;

export type ProviderKey = keyof typeof providers;
