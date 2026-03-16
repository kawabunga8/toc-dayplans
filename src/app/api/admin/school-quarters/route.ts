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

export async function GET() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('get_school_quarters');
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

  const { error } = await supabase.rpc('upsert_school_quarters', { quarters_json: quarters });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
