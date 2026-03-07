import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type PatchBody = {
  id: string;
  grade_level?: number | null;
};

async function getAuthedDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    return { error: NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 }) } as const;
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
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) } as const;
  }

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  }

  const usingServiceRole = !!service;
  const db = usingServiceRole ? createClient(url, service, { auth: { persistSession: false } }) : supabase;
  return { db, usingServiceRole } as const;
}

export async function GET() {
  const authed = await getAuthedDb();
  if ('error' in authed) return authed.error;

  const { db, usingServiceRole } = authed;
  console.log('[api/admin/classes] usingServiceRole=', usingServiceRole);

  const { data, error } = await db
    .from('classes')
    .select('id,block_label,name,room,sort_order,grade_level')
    .not('block_label', 'is', null)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) {
    console.log('[api/admin/classes] query error', {
      message: error.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    });
    return NextResponse.json(
      {
        step: 'select_classes',
        error: error.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        usingServiceRole,
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ rows: data ?? [], usingServiceRole });
}

export async function PATCH(req: Request) {
  const authed = await getAuthedDb();
  if ('error' in authed) return authed.error;

  const { db } = authed;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = String(body?.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const grade = body.grade_level;
  if (!(grade === null || typeof grade === 'number' || typeof grade === 'undefined')) {
    return NextResponse.json({ error: 'grade_level must be number|null' }, { status: 400 });
  }

  const patch: any = {};
  if (typeof grade !== 'undefined') patch.grade_level = grade;

  const { error } = await db.from('classes').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
