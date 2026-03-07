import type { AIProvider } from '@/lib/ai/adapter';
import { GoogleGenAI } from '@google/genai';

// NOTE: This module is server-only. Do not import it into client components.

export const geminiProvider: AIProvider = {
  generate: async (prompt: string) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    const ai = new GoogleGenAI({ apiKey });

    const isRateLimit = (err: any) => {
      const msg = String(err?.message ?? err ?? '');
      const lower = msg.toLowerCase();
      return (
        msg.includes('429') ||
        lower.includes('rate limit') ||
        lower.includes('rate-limited') ||
        lower.includes('resource_exhausted')
      );
    };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const runOnce = async () => {
      const response: any = await ai.models.generateContent({
        model,
        // SDK accepts string or structured contents depending on version.
        // We keep it as plain text prompt.
        contents: prompt as any,
      });

      const text = String((response as any)?.text ?? '').trim();
      if (!text) throw new Error('Gemini returned empty response');
      return { text };
    };

    try {
      return await runOnce();
    } catch (e: any) {
      if (isRateLimit(e)) {
        // Auto-retry once with a small backoff.
        await sleep(1500);
        try {
          return await runOnce();
        } catch (e2: any) {
          if (isRateLimit(e2)) {
            throw new Error('Rate limited by Gemini. Please retry in a moment.');
          }
          throw e2;
        }
      }
      throw e;
    }
  },
};
