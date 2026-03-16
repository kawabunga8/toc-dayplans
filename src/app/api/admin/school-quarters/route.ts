import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import postgres from 'postgres';

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

function getSql() {
  return postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL env var is not set' }, { status: 500 });
  }
  let sql;
  try {
    sql = getSql();
    const rows = await sql`
      SELECT id, label,
        TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
      FROM school_quarters
      ORDER BY id
    `;
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  } finally {
    await sql?.end();
  }
}

export async function PATCH(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const quarters: Array<{ id: number; label: string; start_date: string; end_date: string }> = await req.json();

  const sql = getSql();
  try {
    for (const q of quarters) {
      await sql`
        UPDATE school_quarters
        SET label = ${q.label}, start_date = ${q.start_date}::date, end_date = ${q.end_date}::date
        WHERE id = ${q.id}
      `;
    }
    return NextResponse.json({ ok: true });
  } finally {
    await sql.end();
  }
}
