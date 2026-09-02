import { anthropicProvider } from './anthropic';

export const providers = {
  anthropic: anthropicProvider,
} as const;

export type ProviderKey = keyof typeof providers;
