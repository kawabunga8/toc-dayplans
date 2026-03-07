import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

function toDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mondayOfWeek(date: Date) {
  const day = date.getDay(); // 0=Sun
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });
  }

  const u = new URL(req.url);
  const dateStr = u.searchParams.get('date');
  const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();

  const monday = mondayOfWeek(date);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const mondayStr = toDateString(monday);
  const fridayStr = toDateString(friday);

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

  const { data: plans, error } = await supabase
    .from('day_plans')
    .select(
      `id, plan_date, slot, title, friday_type, trashed_at,
       day_plan_blocks(id, start_time, end_time, room, class_name, class_id)`
    )
    .gte('plan_date', mondayStr)
    .lte('plan_date', fridayStr)
    .is('trashed_at', null)
    .order('plan_date', { ascending: true })
    .order('slot', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const grouped = (plans || []).reduce((acc: any, plan: any) => {
    const d = plan.plan_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(plan);
    return acc;
  }, {} as Record<string, any[]>);

  return NextResponse.json({ week: { start: mondayStr, end: fridayStr }, plans: grouped });
}
