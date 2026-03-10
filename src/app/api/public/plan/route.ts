import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });
  }

  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

  // Prefer live computed payload (matches /dayplan immediately).
  // Fall back to materialized payload for older DBs.
  const r1 = await supabase.rpc('get_public_day_plan_live', { plan_id: id });
  const { data, error } = (!r1.error && r1.data)
    ? ({ data: r1.data, error: null } as any)
    : (await supabase.rpc('get_public_day_plan_from_toc', { plan_id: id }) as any);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Not found' },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }

  return NextResponse.json(
    { plan: data },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
