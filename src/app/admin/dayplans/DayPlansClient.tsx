'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// supabase client calls are done via server routes on this page (to avoid RLS issues)
import { useDemo } from '@/app/admin/DemoContext';
import { asFridayType, buildDayplanDetailHref, isYyyyMmDd } from '@/lib/appRules/navigation';
import { nextSchoolDayIso } from '@/lib/appRules/dates';

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
  const searchParams = useSearchParams();

  const today = useMemo(() => {
    // Default should be the NEXT school day (skip weekends).
    return nextSchoolDayIso(new Date());
  }, []);

  const [classes, setClasses] = useState<ClassRow[]>([]);

  // Read initial state from URL so Back from a dayplan returns you to the same working date.
  const initialDate = useMemo(() => {
    const d = searchParams.get('date');
    return isYyyyMmDd(d) ? d : today;
  }, [searchParams, today]);

  const initialFridayType = useMemo(() => asFridayType(searchParams.get('friday_type')), [searchParams]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedFridayType, setSelectedFridayType] = useState<'' | 'day1' | 'day2'>(initialFridayType);

  const [rotationBlocks, setRotationBlocks] = useState<string[]>([]);

  // per-row loading state
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  useEffect(() => {
    void loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRotationBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedFridayType]);

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

  async function loadRotationBlocks() {
    try {
      const isFri = isFridayLocal(selectedDate);
      if (isFri && !selectedFridayType) {
        setRotationBlocks([]);
        return;
      }

      const qs = new URLSearchParams({ date: selectedDate });
      if (isFri && selectedFridayType) qs.set('friday_type', selectedFridayType);

      const res = await fetch(`/api/public/rotation?${qs.toString()}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to load rotation');

      const blocksRaw = j?.blocks ?? [];
      const blocks: string[] = Array.isArray(blocksRaw)
        ? blocksRaw
            .map((x: any) => (typeof x === 'string' ? x : x?.block_label ?? x?.label ?? x?.block ?? ''))
            .map((s: any) => String(s).trim())
            .filter(Boolean)
        : [];

      setRotationBlocks(blocks);
    } catch (e) {
      console.error('Failed to load rotation blocks', e);
      setRotationBlocks([]);
    }
  }

  const isSelectedFriday = useMemo(() => isFridayLocal(selectedDate), [selectedDate]);

  useEffect(() => {
    // When switching away from Friday, clear the Friday type.
    // When switching between Fridays, keep the selected type (so Back navigation preserves Day 1/Day 2).
    if (!isFridayLocal(selectedDate)) {
      setSelectedFridayType('');
    }
  }, [selectedDate]);

  useEffect(() => {
    // Keep URL in sync so refresh/back navigation preserves the working date.
    const qs = new URLSearchParams();
    qs.set('date', selectedDate);
    if (isFridayLocal(selectedDate) && selectedFridayType) qs.set('friday_type', selectedFridayType);

    // Use replace (not push) to avoid polluting browser history while clicking around.
    router.replace(`/admin/dayplans?${qs.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedFridayType]);

  const slotsForDay = useMemo(() => {
    // Prefer DB-driven rotation (includes CLE/Flex/Chapel/Lunch), fallback to legacy hardcoded schedule.
    if (rotationBlocks.length > 0) return rotationBlocks;
    return scheduleBlockLabelsForDate(selectedDate, selectedFridayType);
  }, [rotationBlocks, selectedDate, selectedFridayType]);

  const classByBlock = useMemo(() => {
    const m = new Map<string, ClassRow>();
    for (const c of classes) {
      const bl = String(c.block_label ?? '').trim();
      if (bl) m.set(bl.toUpperCase(), c);
    }
    return m;
  }, [classes]);

  async function openOrCreatePlanForSlot(slotRaw: string, classRow?: ClassRow | null) {
    const clickTs = new Date().toISOString();
    const slot = String(slotRaw ?? '').trim();
    const fridayType = isSelectedFriday ? (selectedFridayType as 'day1' | 'day2') : null;

    console.groupCollapsed(`[Dayplans/Open] ${clickTs} block=${slot || '∅'}`);
    console.log({ selectedDate, isSelectedFriday, selectedFridayType, fridayType, slot, class: classRow ?? null });

    try {
      if (!slot) return;
      if (isDemo) return;
      if (isSelectedFriday && !selectedFridayType) return;

      setOpeningKey(slot);

      const res = await fetch('/api/admin/dayplans/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          slot,
          friday_type: isSelectedFriday ? fridayType : null,
          title: classRow?.name ? `${classRow.name} (Block ${slot})` : `Block ${slot}`,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Open failed');

      router.push(
        buildDayplanDetailHref({
          id: j.id,
          auto: true,
          date: selectedDate,
          fridayType: isSelectedFriday ? fridayType : null,
        })
      );
    } catch (e: any) {
      console.error('Open/Create failed', e);
    } finally {
      setOpeningKey(null);
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
              disabled={openingKey !== null}
            />
          </label>

          {isSelectedFriday ? (
            <label style={{ display: 'grid', gap: 6, maxWidth: 240 }}>
              <span style={styles.label}>Friday Type</span>
              <select
                value={selectedFridayType}
                onChange={(e) => setSelectedFridayType(e.target.value as any)}
                style={styles.input}
                disabled={openingKey !== null}
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

        {slotsForDay.length > 0 ? (
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
                {slotsForDay.map((slot, i) => {
                  const c = classByBlock.get(String(slot).toUpperCase()) ?? null;
                  const busy = openingKey === slot;
                  return (
                    <tr key={`${slot}-${i}`} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdLabel}>{slot}</td>
                      <td style={styles.td}>{c?.name ?? '—'}</td>
                      <td style={styles.td}>{c?.room || '—'}</td>
                      <td style={styles.tdRight}>
                        <button
                          onClick={() => void openOrCreatePlanForSlot(slot, c)}
                          style={styles.primaryBtn}
                          disabled={
                            isDemo ||
                            openingKey !== null ||
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
        ) : isSelectedFriday && !selectedFridayType ? (
          <div style={{ opacity: 0.85, marginTop: 12 }}>Select Friday Type to load blocks.</div>
        ) : (
          <div style={{ opacity: 0.85, marginTop: 12 }}>No blocks found for this day.</div>
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
