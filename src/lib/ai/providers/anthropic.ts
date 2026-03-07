import type { AIProvider } from '@/lib/ai/adapter';
import { anthropicMessages } from '@/lib/ai/anthropic';

export const anthropicProvider: AIProvider = {
  generate: async (prompt: string) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

    const { text } = await anthropicMessages({
      apiKey,
      model,
      maxTokens: 900,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    return { text };
  },
};
