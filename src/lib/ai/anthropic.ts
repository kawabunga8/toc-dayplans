export type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function anthropicMessages(args: {
  apiKey: string;
  model: string;
  maxTokens: number;
  messages: AnthropicMessage[];
  temperature?: number;
}): Promise<{ text: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens,
      temperature: typeof args.temperature === 'number' ? args.temperature : 0.4,
      messages: args.messages,
    }),
  });

  const j: any = await res.json().catch(() => null);
  if (!res.ok) {
    // Surface rate-limit info nicely; callers can choose to show a retry hint.
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      const hint = retryAfter ? ` (retry after ${retryAfter}s)` : '';
      throw new Error(`Rate limited by Anthropic (429)${hint}. Please retry in a moment.`);
    }

    const msg = j?.error?.message || j?.message || `Anthropic error (${res.status})`;
    throw new Error(msg);
  }

  // Anthropic returns an array of content blocks (usually [{type:'text', text:'...'}])
  const text = Array.isArray(j?.content)
    ? j.content
        .map((c: any) => (c?.type === 'text' ? String(c?.text ?? '') : ''))
        .join('')
        .trim()
    : '';

  if (!text) throw new Error('Anthropic returned empty response');
  return { text };
}

export function extractJsonObject(text: string): any {
  const raw = String(text ?? '').trim();
  if (!raw) throw new Error('Failed to parse JSON from model output');

  // 1) Prefer exact JSON
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // 2) If wrapped in ```json ... ``` fences
  {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (m?.[1]) {
      const inner = m[1].trim();
      try {
        return JSON.parse(inner);
      } catch {
        // continue
      }
    }
  }

  // 3) Find the first balanced JSON object {...}
  {
    const start = raw.indexOf('{');
    if (start >= 0) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = start; i < raw.length; i++) {
        const ch = raw[i];
        if (inStr) {
          if (esc) {
            esc = false;
          } else if (ch === '\\') {
            esc = true;
          } else if (ch === '"') {
            inStr = false;
          }
          continue;
        }
        if (ch === '"') {
          inStr = true;
          continue;
        }
        if (ch === '{') depth++;
        if (ch === '}') {
          depth--;
          if (depth === 0) {
            const slice = raw.slice(start, i + 1);
            return JSON.parse(slice);
          }
        }
      }
    }
  }

  // 4) Last resort: old heuristic first '{'..last '}'
  {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = raw.slice(start, end + 1);
      return JSON.parse(slice);
    }
  }

  throw new Error('Failed to parse JSON from model output');
}
