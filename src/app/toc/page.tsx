import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import TocClient from './TocClient';

export const dynamic = 'force-dynamic';

function mondayOfWeek(d: Date) {
  // Monday as start. JS getDay: Sun=0..Sat=6
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}

export default async function TocPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const week = sp.week;

  let weekStart: string;
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    weekStart = week;
  } else {
    weekStart = mondayOfWeek(new Date()).toISOString().slice(0, 10);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) notFound();

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('get_public_plans_for_week', { week_start: weekStart });
  if (error) {
    notFound();
  }

  return <TocClient weekStart={weekStart} plans={(data ?? []) as any} />;
}
