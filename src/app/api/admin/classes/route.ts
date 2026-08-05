import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type PatchBody = {
  id: string;
  grade_level?: number | null;
  link_course_id?: string;    // add a course link
  unlink_course_id?: string;  // remove a course link
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

export async function GET(req: Request) {
  const authed = await getAuthedDb();
  if ('error' in authed) return authed.error;

  const { db, usingServiceRole } = authed;

  const schoolYear = new URL(req.url).searchParams.get('school_year');

  let query = db
    .from('classes')
    .select('id,block_label,name,room,sort_order,grade_level,active_quarters,school_year')
    .not('block_label', 'is', null)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });
  if (schoolYear) query = query.eq('school_year', schoolYear);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { step: 'select_classes', error: error.message, usingServiceRole },
      { status: 400 }
    );
  }

  // Fetch all course links for these classes
  const classIds = (data ?? []).map((r: any) => r.id);
  const { data: linkRows } = classIds.length
    ? await db.from('class_course_links').select('class_id,course_id').in('class_id', classIds)
    : { data: [] };

  const courseIdsByClass: Record<string, string[]> = {};
  for (const row of (linkRows ?? []) as Array<{ class_id: string; course_id: string }>) {
    (courseIdsByClass[row.class_id] ??= []).push(row.course_id);
  }

  const rows = (data ?? []).map((r: any) => ({ ...r, course_ids: courseIdsByClass[r.id] ?? [] }));
  return NextResponse.json({ rows, usingServiceRole });
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

  // Handle course link add/remove
  if (body.link_course_id) {
    const { error } = await db
      .from('class_course_links')
      .insert({ class_id: id, course_id: body.link_course_id });
    if (error && error.code !== '23505') // ignore duplicate
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.unlink_course_id) {
    const { error } = await db
      .from('class_course_links')
      .delete()
      .eq('class_id', id)
      .eq('course_id', body.unlink_course_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Handle grade_level update
  const grade = body.grade_level;
  if (!(grade === null || typeof grade === 'number' || typeof grade === 'undefined')) {
    return NextResponse.json({ error: 'grade_level must be number|null' }, { status: 400 });
  }

  const patch: any = {};
  if (typeof grade !== 'undefined') patch.grade_level = grade;

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { error } = await db.from('classes').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
