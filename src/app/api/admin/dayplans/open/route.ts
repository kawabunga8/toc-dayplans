import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as null | {
    date?: string;
    slot?: string;
    friday_type?: 'day1' | 'day2' | null;
    title?: string | null;
  };

  const date = body?.date;
  const slot = (body?.slot ?? '').trim();
  const fridayType = (body?.friday_type ?? null) as 'day1' | 'day2' | null;
  const title = (body?.title ?? null) as string | null;

  if (!date || !slot) {
    return NextResponse.json({ error: 'Missing date/slot' }, { status: 400 });
  }

  // Auth via cookie-bound anon client
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

  // Use service role for the actual open/create/restore operation when available.
  // This avoids RLS edge cases (e.g., restore/update blocked) that cause silent no-op in the UI.
  const usingServiceRole = !!service;
  const adminDb = usingServiceRole ? createClient(url, service, { auth: { persistSession: false } }) : supabase;
  console.log('[api/admin/dayplans/open] usingServiceRole=', usingServiceRole);

  const base = adminDb.from('day_plans');

  // 1) Existing non-trashed
  {
    let q = base.select('id').eq('plan_date', date).eq('slot', slot).is('trashed_at', null);
    // If friday_type is provided, match it; otherwise ignore.
    if (fridayType) q = q.eq('friday_type', fridayType);

    const { data, error } = await q.limit(1);
    if (error) return NextResponse.json({ error: error.message, usingServiceRole }, { status: 400 });
    const row = (data?.[0] as any) ?? null;
    if (row?.id) return NextResponse.json({ id: row.id, action: 'opened', usingServiceRole });
  }

  // 2) Existing trashed: restore
  {
    let q = base.select('id').eq('plan_date', date).eq('slot', slot).not('trashed_at', 'is', null);
    if (fridayType) q = q.eq('friday_type', fridayType);

    const { data, error } = await q.limit(1);
    if (error) return NextResponse.json({ error: error.message, usingServiceRole }, { status: 400 });
    const row = (data?.[0] as any) ?? null;
    if (row?.id) {
      const { error: updErr } = await adminDb
        .from('day_plans')
        .update({ trashed_at: null, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (updErr) return NextResponse.json({ error: updErr.message, usingServiceRole }, { status: 400 });
      return NextResponse.json({ id: row.id, action: 'restored', usingServiceRole });
    }
  }

  // 3) Create
  const payload: any = {
    plan_date: date,
    slot,
    friday_type: fridayType,
    title: title ?? `Block ${slot}`,
    notes: null,
  };

  const { data: created, error: insErr } = await adminDb.from('day_plans').insert(payload).select('id').single();
  if (insErr) return NextResponse.json({ error: insErr.message, usingServiceRole }, { status: 400 });

  return NextResponse.json({ id: (created as any).id, action: 'created', usingServiceRole });
}
