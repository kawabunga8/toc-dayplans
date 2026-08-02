import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (all: Array<{ name: string; value: string; options?: any }>) => { for (const c of all) cookieStore.set(c); },
    },
  });
}

function currentSchoolYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const startYear = now.getMonth() + 1 >= 7 ? y : y - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

export async function GET(req: Request) {
  const supabase = await getSupabase();
  // Quarters are per school year; without this filter every year's rows come back
  // and quarter detection picks whichever sorts first.
  const year = new URL(req.url).searchParams.get('school_year') || currentSchoolYear();
  const { data, error } = await supabase
    .from('school_quarters')
    .select('*')
    .eq('school_year', year)
    .order('label', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const quarters: Array<{ id: number; label: string; start_date: string; end_date: string }> = await req.json();

  for (const q of quarters) {
    const { error } = await supabase
      .from('school_quarters')
      .update({ label: q.label, start_date: q.start_date, end_date: q.end_date })
      .eq('id', q.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
