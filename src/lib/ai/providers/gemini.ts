import type { AIProvider } from '@/lib/ai/adapter';
import { GoogleGenAI } from '@google/genai';

// NOTE: This module is server-only. Do not import it into client components.

export const geminiProvider: AIProvider = {
  generate: async (prompt: string) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    const ai = new GoogleGenAI({ apiKey });

    try {
      const response: any = await ai.models.generateContent({
        model,
        // SDK accepts string or structured contents depending on version.
        // We keep it as plain text prompt.
        contents: prompt as any,
      });

      const text = String((response as any)?.text ?? '').trim();
      if (!text) throw new Error('Gemini returned empty response');
      return { text };
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      // Basic 429 handling
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        throw new Error('Rate limited by Gemini. Please retry in a moment.');
      }
      throw e;
    }
  },
};
