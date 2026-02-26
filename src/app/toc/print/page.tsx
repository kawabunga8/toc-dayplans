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

  // Sort plans in the order of the day's rotation (so Print All matches the day schedule)
  let rotationOrder: string[] = [];
  try {
    const friType = (dayPlans.find((p) => p.friday_type)?.friday_type ?? null) as string | null;
    const { data: rot, error: rotErr } = await supabase.rpc('get_rotation_for_date', { plan_date: date, friday_type: friType });
    if (!rotErr && Array.isArray(rot)) {
      rotationOrder = rot
        .map((r: any) => String(r?.block_label ?? r?.label ?? r?.block ?? '').trim())
        .filter(Boolean);
    }
  } catch {
    // ignore and fall back to unsorted
  }

  const orderIndex = new Map<string, number>();
  rotationOrder.forEach((b, i) => orderIndex.set(b.toUpperCase(), i));

  const sortedDayPlans = dayPlans.slice().sort((a, b) => {
    const ai = orderIndex.get(String(a.slot ?? '').toUpperCase());
    const bi = orderIndex.get(String(b.slot ?? '').toUpperCase());
    if (ai == null && bi == null) return String(a.slot ?? '').localeCompare(String(b.slot ?? ''));
    if (ai == null) return 1;
    if (bi == null) return -1;
    return ai - bi;
  });

  const detail: any[] = [];
  for (const p of sortedDayPlans) {
    const { data, error } = await supabase.rpc('get_public_day_plan_by_id', { plan_id: p.id });
    if (!error && data) detail.push(data);
  }

  return <TocPrintClient date={date} detail={detail as any} />;
}
