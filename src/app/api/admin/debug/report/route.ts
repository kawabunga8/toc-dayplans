import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });

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
  if (!sessionData.session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const planId = String(body?.plan_id ?? '').trim();
  if (!planId) return NextResponse.json({ error: 'plan_id is required' }, { status: 400 });

  // Gather server-side facts too (avoids relying only on client state)
  const { data: planRow } = await supabase.from('day_plans').select('id,plan_date,slot,visibility,trashed_at').eq('id', planId).maybeSingle();

  const diagId = crypto.randomBytes(6).toString('hex');
  const payload = {
    diag_id: diagId,
    created_at: new Date().toISOString(),
    build: {
      vercel_git_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      vercel_git_commit_message: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
      vercel_url: process.env.VERCEL_URL ?? null,
      node_env: process.env.NODE_ENV ?? null,
    },
    client: {
      host: String(body?.host ?? ''),
      href: String(body?.href ?? ''),
      user_agent: String(req.headers.get('user-agent') ?? ''),
    },
    plan: planRow ?? { id: planId },
    tags: body?.tags ?? null,
    toc: body?.toc ?? null,
  };

  const { error: insErr } = await supabase.from('debug_events').insert({
    id: diagId,
    kind: 'dayplan_diagnostics',
    plan_id: planId,
    payload,
  } as any);

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, diagnostic_id: diagId });
}
