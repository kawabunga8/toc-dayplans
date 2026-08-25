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
  const debug = (sp as any).debug === '1' || (sp as any).debug === 'true';

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

  // Service role server-side so this query can see drafts as well as published
  // plans. A TOC is told that a draft exists but never shown its content
  // (ADR-0003), so draft rows are stripped of id, title and notes below, before
  // they are handed to the client.
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

  const [{ data: rawPlans, error: plansErrDirect }, { data: classesData, error: classesErr }] = await Promise.all([
    supabase
      .from('day_plans')
      .select('id,plan_date,slot,title,notes,share_expires_at,visibility,published_at')
      // Trashed plans are invisible to a TOC. Drafts are not: they appear as
      // "a plan is coming", carrying no content. See ADR-0001 and ADR-0003.
      .is('trashed_at', null)
      .gte('plan_date', weekStart)
      .lte('plan_date', weekEnd)
      .order('plan_date', { ascending: true })
      .order('slot', { ascending: true }),
    supabase.rpc('get_public_classes'),
  ]);

  type DayPlanRow = {
    id: string;
    plan_date: string;
    slot: string;
    title: string | null;
    notes: string | null;
    share_expires_at: string | null;
    visibility: string;
    published_at: string | null;
  };

  // A published plan travels intact. A draft travels as existence only: no id,
  // because there is nothing a TOC may open, and no title or notes, because a
  // draft's content is the staff's alone until they publish it.
  const toSummary = (p: DayPlanRow) =>
    p.visibility === 'link'
      ? {
          id: p.id as string,
          plan_date: p.plan_date as string,
          slot: p.slot as string,
          title: (p.title ?? '') as string,
          notes: (p.notes ?? null) as string | null,
          share_expires_at: (p.share_expires_at ?? null) as string | null,
          published_at: (p.published_at ?? null) as string | null,
          state: 'published' as const,
        }
      : {
          id: null,
          plan_date: p.plan_date as string,
          slot: p.slot as string,
          title: '',
          notes: null,
          share_expires_at: null,
          published_at: null,
          state: 'draft' as const,
        };

  let plansData: unknown = ((rawPlans ?? []) as DayPlanRow[]).map(toSummary);
  let plansErr: { message?: string } | null = plansErrDirect;

  // Fallback when SUPABASE_SERVICE_ROLE_KEY is absent and RLS blocks the direct
  // select. The public function is publish-gated, so this path returns published
  // plans only: without the service key, drafts are invisible rather than
  // wrongly listed. The week view is degraded here, never leakier.
  if (plansErrDirect) {
    const { data, error } = await createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }).rpc('get_public_plans_for_week', { week_start: weekStart });
    plansData = ((data ?? []) as Array<Record<string, unknown>>).map((p) => ({
      ...p,
      state: 'published' as const,
    }));
    plansErr = error;
  }

  if (plansErr || classesErr) {
    throw new Error(plansErr?.message ?? classesErr?.message ?? 'Failed to load plans');
  }

  const initialView = viewParam === 'calendar' ? 'calendar' : 'today';

  return (
    <TocClient
      weekStart={weekStart}
      plans={(plansData ?? []) as any}
      classes={(classesData ?? []) as any}
      initialView={initialView}
      debug={debug}
    />
  );
}

