import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { schoolYearForDate } from '@/lib/appRules/dates';

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


export async function GET(req: Request) {
  const supabase = await getSupabase();
  // Quarters are per school year; without this filter every year's rows come back
  // and quarter detection picks whichever sorts first.
  const year = new URL(req.url).searchParams.get('school_year') || schoolYearForDate();
  const { data, error } = await supabase
    .from('school_quarters')
    .select('*')
    .eq('school_year', year)
    .order('label', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// There is no write path here on purpose. school_quarters belongs to Course Hub,
// which is where quarter dates are set for the whole suite; this app reads them.
// A PATCH handler used to live here and no caller in this app ever used it - the
// three callers of this route all GET.
