'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type ClassRow = {
  id: string;
  block_label: string | null;
  name: string;
  room: string | null;
  sort_order: number | null;
};

export default function DayPlansClient() {
  const { isDemo } = useDemo();
  const router = useRouter();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);

  // per-row loading state
  const [openingClassId, setOpeningClassId] = useState<string | null>(null);

  useEffect(() => {
    void loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadClasses() {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('classes')
        .select('id,block_label,name,room,sort_order')
        .not('block_label', 'is', null)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setClasses((data ?? []) as ClassRow[]);
    } catch (e) {
      // No error UI on this page by design.
      console.error('Failed to load classes', e);
      setClasses([]);
    }
  }

  const isSelectedFriday = useMemo(() => isFridayLocal(selectedDate), [selectedDate]);

  const classesForDay = useMemo(() => {
    // This screen intentionally has no Friday-type selector.
    // On Fridays we default to the Day 1 block set.
    const wanted = scheduleBlockLabelsForDate(selectedDate);
    const index = new Map<string, number>();
    wanted.forEach((b, i) => index.set(b.toUpperCase(), i));

    const filtered = classes
      .filter((c) => {
        const bl = (c.block_label ?? '').toUpperCase();
        return index.has(bl);
      })
      .slice();

    filtered.sort((a, b) => {
      const ai = index.get(String(a.block_label).toUpperCase()) ?? 999;
      const bi = index.get(String(b.block_label).toUpperCase()) ?? 999;
      return ai - bi;
    });

    return filtered;
  }, [classes, selectedDate]);

  async function openOrCreatePlanForClass(c: ClassRow) {
    if (!c.block_label) return;
    if (isDemo) return;

    setOpeningClassId(c.id);

    try {
      const supabase = getSupabaseClient();

      const slot = String(c.block_label).trim();

      // Check if plan exists for date + block (ignore friday_type entirely; this page has no Friday-type notion)
      // 1) Prefer non-trashed
      {
        const { data: rows, error: findErr } = await supabase
          .from('day_plans')
          .select('id')
          .eq('plan_date', selectedDate)
          .eq('slot', slot)
          .is('trashed_at', null)
          .limit(1);

        if (findErr) throw findErr;

        const existing = (rows?.[0] as any) ?? null;
        if (existing?.id) {
          router.push(`/admin/dayplans/${existing.id}?auto=1`);
          return;
        }
      }

      // 2) If a matching plan exists but is trashed, restore it and open it
      {
        const { data: rows, error: findErr } = await supabase
          .from('day_plans')
          .select('id')
          .eq('plan_date', selectedDate)
          .eq('slot', slot)
          .not('trashed_at', 'is', null)
          .limit(1);

        if (findErr) throw findErr;

        const trashed = (rows?.[0] as any) ?? null;
        if (trashed?.id) {
          const { error: restoreErr } = await supabase
            .from('day_plans')
            .update({ trashed_at: null, updated_at: new Date().toISOString() })
            .eq('id', trashed.id);
          if (restoreErr) throw restoreErr;

          router.push(`/admin/dayplans/${trashed.id}?auto=1`);
          return;
        }
      }

      // Create, then navigate
      const title = `${c.name} (Block ${slot})`;
      const payload = {
        plan_date: selectedDate,
        slot,
        friday_type: null,
        title,
        notes: null,
      };

      const { data: created, error: insErr } = await supabase.from('day_plans').insert(payload).select('id').single();
      if (insErr) throw insErr;

      router.push(`/admin/dayplans/${(created as any).id}?auto=1`);
    } catch (e) {
      // No error UI on this page by design.
      console.error('Open/Create failed', e);
    } finally {
      setOpeningClassId(null);
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Dayplans</h1>
      <p style={styles.muted}>Choose a date, then open each block to plan.</p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Dayplans</div>

        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6, maxWidth: 320 }}>
            <span style={styles.label}>Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.input}
              disabled={openingClassId !== null}
            />
          </label>

          {isSelectedFriday ? (
            <div style={styles.mutedSmall}>
              Friday detected — this screen defaults to the Day 1 block set.
            </div>
          ) : null}
        </div>

        <div style={{ ...styles.rowBetween, marginTop: 12 }}>
          <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Classes</div>
        </div>

        {classesForDay.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Block</th>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Room</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {classesForDay.map((c, i) => {
                  const busy = openingClassId === c.id;
                  return (
                    <tr key={c.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdLabel}>{c.block_label ?? '—'}</td>
                      <td style={styles.td}>{c.name}</td>
                      <td style={styles.td}>{c.room || '—'}</td>
                      <td style={styles.tdRight}>
                        <button
                          onClick={() => void openOrCreatePlanForClass(c)}
                          style={styles.primaryBtn}
                          disabled={isDemo || openingClassId !== null}
                        >
                          {busy ? 'Opening…' : 'Open'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ opacity: 0.85, marginTop: 12 }}>No classes found for this day.</div>
        )}
      </section>
    </main>
  );
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  mutedSmall: { opacity: 0.85, fontSize: 12 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  rowBetween: { display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  primaryBtn: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900, whiteSpace: 'nowrap' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 6 },
  th: {
    textAlign: 'left',
    padding: 10,
    background: RCS.deepNavy,
    color: RCS.white,
    borderBottom: `3px solid ${RCS.gold}`,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  trEven: { background: RCS.white },
  trOdd: { background: RCS.lightGray },
  td: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, verticalAlign: 'top' },
  tdRight: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, textAlign: 'right', verticalAlign: 'top' },
  tdLabel: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, color: RCS.midBlue, fontWeight: 800, width: 70 },
};

function isFridayLocal(yyyyMmDd: string): boolean {
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getDay() === 5;
}

function weekdayLocal(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return dt.getDay();
}

function scheduleBlockLabelsForDate(planDate: string): string[] {
  const dow = weekdayLocal(planDate);
  // Friday defaults to Day 1 blocks here (no selector on this page)
  if (dow === 5) return ['A', 'B', 'C', 'D'];
  if (dow === 1) return ['A', 'B', 'C', 'D'];
  if (dow === 2) return ['E', 'F', 'G', 'H'];
  if (dow === 3) return ['C', 'D', 'A', 'B'];
  return ['E', 'F', 'G', 'H'];
}
