import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import TocPrintClient from './TocPrintClient';

export const dynamic = 'force-dynamic';

function mondayOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}

export default async function TocPrintPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const date = sp.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) notFound();

  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

  const monday = mondayOfWeek(new Date(date + 'T00:00:00Z')).toISOString().slice(0, 10);
  const { data: weekData, error: weekErr } = await supabase.rpc('get_public_plans_for_week', { week_start: monday });
  if (weekErr) notFound();

  const weekPlans = (weekData ?? []) as any[];
  const dayPlans = weekPlans.filter((p) => p.plan_date === date);

  const detail: any[] = [];
  for (const p of dayPlans) {
    const { data, error } = await supabase.rpc('get_public_day_plan_by_id', { plan_id: p.id });
    if (!error && data) detail.push(data);
  }

  return <TocPrintClient date={date} detail={detail as any} />;
}
