import { createClient } from '@supabase/supabase-js';

// Returns which Friday types (day1/day2) have published plans for a given date.
// Public endpoint (used by /toc) — uses service role when present.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Missing/invalid date (YYYY-MM-DD required).' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from('day_plans')
    .select('id,friday_type')
    .eq('visibility', 'link')
    .eq('plan_date', date)
    .in('friday_type', ['day1', 'day2']);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const hasDay1 = (data ?? []).some((r: any) => r.friday_type === 'day1');
  const hasDay2 = (data ?? []).some((r: any) => r.friday_type === 'day2');

  return Response.json({ date, hasDay1, hasDay2 });
}
