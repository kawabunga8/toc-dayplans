import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import TocClient from './TocClient';
import { nextSchoolDayDate } from '@/lib/appRules/dates';

export const dynamic = 'force-dynamic';

function mondayOfWeek(d: Date) {
  // Monday as start. JS getDay: Sun=0..Sat=6
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}


export default async function TocPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const week = sp.week;
  const viewParam = (sp.view ?? '').toString();

  let weekStart: string;
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    weekStart = week;
  } else {
    const base = nextSchoolDayDate(new Date());
    // Use local YYYY-MM-DD to avoid UTC date drift.
    const { yyyyMmDdLocal } = await import('@/lib/appRules/dates');
    weekStart = yyyyMmDdLocal(mondayOfWeek(base));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) notFound();

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Use service role server-side to avoid brittle "published" heuristics in SQL functions.
  // (/toc should show any visibility=link plans in the week, even if no toc_block_plans exist yet.)
  const supabase = createClient(url, service || anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const weekEnd = (() => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 4);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  })();

  const [{ data: plansDataDirect, error: plansErrDirect }, { data: classesData, error: classesErr }] = await Promise.all([
    supabase
      .from('day_plans')
      .select('id,plan_date,slot,title,notes,share_expires_at,visibility')
      // Rule A: any non-trashed plan shows on /toc (visibility ignored)
      .is('trashed_at', null)
      .gte('plan_date', weekStart)
      .lte('plan_date', weekEnd)
      .order('plan_date', { ascending: true })
      .order('slot', { ascending: true }),
    supabase.rpc('get_public_classes'),
  ]);

  // Fallback: if RLS blocks direct select (common when SUPABASE_SERVICE_ROLE_KEY isn't set),
  // fall back to the public RPC.
  // NOTE: the public RPC currently uses visibility='link' and may not match Rule A.
  // For Rule A to work without the service key, update the DB function accordingly.
  let plansData: any = plansDataDirect;
  let plansErr: any = plansErrDirect;
  if (plansErrDirect) {
    const { data, error } = await createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }).rpc('get_public_plans_for_week', { week_start: weekStart });
    plansData = data;
    plansErr = error;
  }

  if (plansErr || classesErr) {
    notFound();
  }

  const initialView = viewParam === 'calendar' ? 'calendar' : 'today';

  return (
    <TocClient
      weekStart={weekStart}
      plans={(plansData ?? []) as any}
      classes={(classesData ?? []) as any}
      initialView={initialView}
    />
  );
}

