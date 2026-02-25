import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });
  }

  const u = new URL(req.url);
  const date = u.searchParams.get('date');
  const slot = u.searchParams.get('slot');

  if (!date) {
    return NextResponse.json({ error: 'Missing date (YYYY-MM-DD)' }, { status: 400 });
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

  // Staff auth
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let q = supabase
    .from('day_plans')
    .select('id,plan_date,slot,friday_type,title,trashed_at,visibility,share_expires_at,created_at,updated_at')
    .eq('plan_date', date)
    .order('slot', { ascending: true })
    .order('created_at', { ascending: true });

  if (slot) q = q.eq('slot', slot);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ date, slot: slot ?? null, rows: data ?? [] });
}
