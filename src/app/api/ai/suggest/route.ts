import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { anthropicMessages, extractJsonObject } from '@/lib/ai/anthropic';

export const runtime = 'nodejs';

type SuggestReq = {
  section: 'note_to_toc_rewrite';
  input: {
    current_note_to_toc: string;
    class_name?: string | null;
    plan_date?: string | null;
    slot?: string | null;
    audience?: 'toc' | 'teacher';
  };
};

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (all: Array<{ name: string; value: string; options?: any }>) => {
        for (const c of all) cookieStore.set(c);
      },
    },
  });

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

  let body: SuggestReq;
  try {
    body = (await req.json()) as SuggestReq;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.section !== 'note_to_toc_rewrite') {
    return NextResponse.json({ error: 'Unsupported section' }, { status: 400 });
  }

  const current = String(body.input?.current_note_to_toc ?? '');
  if (!current.trim()) {
    return NextResponse.json({ error: 'current_note_to_toc is required' }, { status: 400 });
  }

  const className = String(body.input?.class_name ?? '').trim();
  const planDate = String(body.input?.plan_date ?? '').trim();
  const slot = String(body.input?.slot ?? '').trim();
  const audience = body.input?.audience ?? 'toc';

  const prompt = `Rewrite the following "Note to TOC" to be clearer and more actionable.

Audience: ${audience === 'toc' ? 'TOC (support staff)' : 'Teacher'}
Class: ${className || '—'}
Date: ${planDate || '—'}
Block: ${slot || '—'}

Rules:
- Keep it concise.
- Use short sentences.
- Preserve all concrete policies (phones/food/where to find work/etc.).
- No emojis.
- Output MUST be valid JSON only.

Return JSON with this exact shape:
{"note_to_toc": "..."}

INPUT NOTE:
${current}`;

  const { text } = await anthropicMessages({
    apiKey,
    model,
    maxTokens: 500,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const parsed = extractJsonObject(text);
  const note = String(parsed?.note_to_toc ?? '').trim();
  if (!note) {
    return NextResponse.json({ error: 'Model returned empty note_to_toc' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, suggestion: { note_to_toc: note } });
}
