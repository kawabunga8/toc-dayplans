import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

// Admin endpoint: fetch rubric rows for a standard + grade.
// GET /api/admin/learning-standards/rubric?learning_standard_id=...&grade=10
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });

  const u = new URL(req.url);
  const learningStandardId = (u.searchParams.get('learning_standard_id') ?? '').trim();
  const grade = Number(u.searchParams.get('grade'));

  if (!learningStandardId) return NextResponse.json({ error: 'Missing learning_standard_id' }, { status: 400 });
  if (![9, 10, 11, 12].includes(grade)) return NextResponse.json({ error: 'Missing/invalid grade' }, { status: 400 });

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

  const { data, error } = await supabase
    .from('learning_standard_rubrics')
    .select('id,learning_standard_id,grade,level,original_text,edited_text')
    .eq('learning_standard_id', learningStandardId)
    .eq('grade', grade);

  if (error) {
    const msg = String((error as any)?.message ?? '');
    const code = String((error as any)?.code ?? '');
    const isMissingTable = code === '42P01' || /Could not find the table/i.test(msg) || /schema cache/i.test(msg);
    if (isMissingTable) return NextResponse.json({ rows: [], missingTable: true });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ rows: data ?? [], missingTable: false });
}
