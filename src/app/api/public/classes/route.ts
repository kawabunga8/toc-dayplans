import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Which course sits in each block depends on the date: block H is ICT 9 in Q1,
// ICT 9 again in Q2, then Band 9 for Q3/Q4. The TOC lets you page through dates
// client-side, so the class list has to be refetched per date the same way the
// rotation and block times already are.
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });
  }

  const u = new URL(req.url);
  const date = u.searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 });
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('get_public_classes', { plan_date: date });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ classes: data ?? [] });
}
