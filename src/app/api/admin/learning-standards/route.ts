import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

// Admin endpoint: list learning standards (catalog) filtered by subject.
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });

  const u = new URL(req.url);
  const subject = (u.searchParams.get('subject') ?? '').trim();
  const schoolYear = (u.searchParams.get('school_year') ?? '').trim();
  if (!schoolYear) return NextResponse.json({ error: 'Missing school_year' }, { status: 400 });

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

  // current_learning_standards() resolves version/supersession; do the school_year
  // filtering there instead of re-implementing it against the raw table here.
  const { data, error } = await supabase.rpc('current_learning_standards', { p_school_year: schoolYear });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let rows = (data ?? []) as Array<{ subject: string; sort_order: number | null; standard_title: string }>;
  if (subject) rows = rows.filter((r) => r.subject === subject);
  rows = rows.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.standard_title.localeCompare(b.standard_title));

  return NextResponse.json({ rows });
}
