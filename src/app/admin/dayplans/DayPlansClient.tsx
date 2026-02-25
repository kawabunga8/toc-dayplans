'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
// supabase client calls are done via server routes on this page (to avoid RLS issues)
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
  const [selectedFridayType, setSelectedFridayType] = useState<'' | 'day1' | 'day2'>('');

  // per-row loading state
  const [openingClassId, setOpeningClassId] = useState<string | null>(null);

  useEffect(() => {
    void loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadClasses() {
    try {
      const res = await fetch('/api/admin/classes');
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to load classes');
      setClasses((j?.rows ?? []) as ClassRow[]);
    } catch (e) {
      // No error UI on this page by design.
      console.error('Failed to load classes', e);
      setClasses([]);
    }
  }

  const isSelectedFriday = useMemo(() => isFridayLocal(selectedDate), [selectedDate]);

  useEffect(() => {
    // reset Friday type when date changes
    setSelectedFridayType('');
  }, [selectedDate]);

  const classesForDay = useMemo(() => {
    const wanted = scheduleBlockLabelsForDate(selectedDate, selectedFridayType);
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
  }, [classes, selectedDate, selectedFridayType]);

  async function openOrCreatePlanForClass(c: ClassRow) {
    const clickTs = new Date().toISOString();
    const slot = String(c.block_label ?? '').trim();
    const fridayType = isSelectedFriday ? (selectedFridayType as 'day1' | 'day2') : null;

    console.groupCollapsed(`[Dayplans/Open] ${clickTs} block=${slot || '∅'} classId=${c.id}`);
    console.log({ selectedDate, isSelectedFriday, selectedFridayType, fridayType, slot, class: c });
    console.log('query intent', {
      plan_date: selectedDate,
      slot,
      friday_type: isSelectedFriday ? fridayType : null,
      trashed_at: 'prefer null; else restore',
    });

    try {
      if (!c.block_label) {
        console.warn('No block_label on class row; abort');
        return;
      }
      if (isDemo) {
        console.warn('Demo mode; abort');
        return;
      }
      if (isSelectedFriday && !selectedFridayType) {
        console.warn('Friday selected but no Friday Type chosen; abort');
        return;
      }

      setOpeningClassId(c.id);

      // Use a server route to do the open/create/restore work.
      // This avoids client-side RLS/permission edge cases that otherwise look like a no-op.
      const res = await fetch('/api/admin/dayplans/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          slot,
          friday_type: isSelectedFriday ? fridayType : null,
          title: `${c.name} (Block ${slot})`,
        }),
      });
      const j = await res.json();
      console.log('open endpoint result', res.status, j);
      if (!res.ok) throw new Error(j?.error ?? 'Open failed');

      const url = `/admin/dayplans/${j.id}?auto=1`;
      console.log('NAVIGATE', url, j.action);
      router.push(url);
    } catch (e: any) {
      // No error UI on this page by design.
      console.error('Open/Create failed', {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
        raw: e,
      });
    } finally {
      setOpeningClassId(null);
      console.groupEnd();
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
            <label style={{ display: 'grid', gap: 6, maxWidth: 240 }}>
              <span style={styles.label}>Friday Type</span>
              <select
                value={selectedFridayType}
                onChange={(e) => setSelectedFridayType(e.target.value as any)}
                style={styles.input}
                disabled={openingClassId !== null}
              >
                <option value="">Select…</option>
                <option value="day1">Day 1</option>
                <option value="day2">Day 2</option>
              </select>
              <span style={styles.mutedSmall}>Required on Fridays.</span>
            </label>
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
                          disabled={
                            isDemo ||
                            openingClassId !== null ||
                            (isSelectedFriday && !selectedFridayType) // require explicit Friday type
                          }
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

function scheduleBlockLabelsForDate(planDate: string, friType: '' | 'day1' | 'day2'): string[] {
  const dow = weekdayLocal(planDate);
  if (dow === 5) {
    if (friType === 'day2') return ['E', 'F', 'G', 'H'];
    return ['A', 'B', 'C', 'D'];
  }
  if (dow === 1) return ['A', 'B', 'C', 'D'];
  if (dow === 2) return ['E', 'F', 'G', 'H'];
  if (dow === 3) return ['C', 'D', 'A', 'B'];
  return ['E', 'F', 'G', 'H'];
}
