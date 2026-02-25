'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type Status = 'idle' | 'loading' | 'saving' | 'error';

type ClassRow = { id: string; block_label: string | null; name: string; room: string | null; sort_order: number | null };

export default function DayPlansClient() {
  const { isDemo } = useDemo();
  const router = useRouter();

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [classes, setClasses] = useState<ClassRow[]>([]);

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedFridayType, setSelectedFridayType] = useState<'' | 'day1' | 'day2'>('');

  // ephemeral cache for this screen/date
  const [planIdByClassId, setPlanIdByClassId] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the chosen date changes, reset per-class plan ids
  useEffect(() => {
    setPlanIdByClassId({});
    setError(null);
  }, [selectedDate, selectedFridayType]);

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
    } catch {
      // ignore; dayplans can still function without class seed
    }
  }

  const isSelectedFriday = useMemo(() => isFridayLocal(selectedDate), [selectedDate]);

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
    if (!c.block_label) return;

    setStatus('saving');
    setError(null);

    try {
      if (!selectedDate) throw new Error('Date is required');
      if (isSelectedFriday && !selectedFridayType) throw new Error('Friday Type is required');

      const supabase = getSupabaseClient();

      const slot = String(c.block_label).trim();
      const fridayType = isSelectedFriday ? (selectedFridayType as 'day1' | 'day2') : null;

      // 1) Find existing, non-trashed
      // IMPORTANT: if it's not Friday, we ignore friday_type entirely (legacy data may have it set).
      let q = supabase.from('day_plans').select('id,friday_type').eq('plan_date', selectedDate).eq('slot', slot);
      if (isSelectedFriday) {
        if (!fridayType) throw new Error('Friday Type is required');
        q = q.eq('friday_type', fridayType);
      }
      q = q.is('trashed_at', null);

      const { data: rows, error: findErr } = await q.order('friday_type', { ascending: true, nullsFirst: true }).limit(1);
      if (findErr) throw findErr;

      const existing = (rows?.[0] as any) ?? null;
      if (existing?.id) {
        setPlanIdByClassId((prev) => ({ ...prev, [c.id]: existing.id }));
        setStatus('idle');
        router.push(`/admin/dayplans/${existing.id}?auto=1`);
        return;
      }

      // 2) Create
      const title = `${c.name} (Block ${slot})`;
      const payload = {
        plan_date: selectedDate,
        slot,
        friday_type: fridayType,
        title,
        notes: null,
      };

      const { data: created, error: insErr } = await supabase.from('day_plans').insert(payload).select('id').single();
      if (insErr) throw insErr;

      setPlanIdByClassId((prev) => ({ ...prev, [c.id]: (created as any).id }));
      setStatus('idle');
      router.push(`/admin/dayplans/${(created as any).id}?auto=1`);
    } catch (e: any) {
      setStatus('idle');
      console.error(e);
      window.alert(humanizeCreateError(e));
    }
  }

  async function generateScheduleForDay() {
    setStatus('saving');
    setError(null);

    try {
      if (!selectedDate) throw new Error('Date is required');
      if (isSelectedFriday && !selectedFridayType) throw new Error('Friday Type is required');

      const supabase = getSupabaseClient();

      let created = 0;
      let already = 0;

      for (const c of classesForDay) {
        if (!c.block_label) continue;

        const slot = String(c.block_label).trim();
        const fridayType = isSelectedFriday ? (selectedFridayType as 'day1' | 'day2') : null;

        // Check existing non-trashed
        // IMPORTANT: if it's not Friday, we ignore friday_type entirely (legacy data may have it set).
        let q = supabase.from('day_plans').select('id,friday_type').eq('plan_date', selectedDate).eq('slot', slot);
        if (isSelectedFriday) {
          if (!fridayType) throw new Error('Friday Type is required');
          q = q.eq('friday_type', fridayType);
        }
        q = q.is('trashed_at', null);

        const { data: rows, error: findErr } = await q.order('friday_type', { ascending: true, nullsFirst: true }).limit(1);
        if (findErr) throw findErr;
        const existing = (rows?.[0] as any) ?? null;

        if (existing?.id) {
          setPlanIdByClassId((prev) => ({ ...prev, [c.id]: existing.id }));
          already++;
          continue;
        }

        const title = `${c.name} (Block ${slot})`;
        const payload = {
          plan_date: selectedDate,
          slot,
          friday_type: fridayType,
          title,
          notes: null,
        };

        const { data: createdRow, error: insErr } = await supabase.from('day_plans').insert(payload).select('id').single();
        if (insErr) throw insErr;

        setPlanIdByClassId((prev) => ({ ...prev, [c.id]: (createdRow as any).id }));
        created++;
      }

      setStatus('idle');
      // no banner/no toast; keep this screen quiet
      console.log(`Generated schedule for ${selectedDate}: created ${created}, already existed ${already}.`);
    } catch (e: any) {
      setStatus('idle');
      console.error(e);
      window.alert(humanizeCreateError(e));
    }
  }

  const canShowClasses = !isSelectedFriday || !!selectedFridayType;

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Dayplans</h1>
      <p style={styles.muted}>Choose a date (and Friday Type if Friday), then open each block to plan.</p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Dayplans</div>

        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6, maxWidth: 320 }}>
            <span style={styles.label}>Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedFridayType('');
              }}
              style={styles.input}
            />
          </label>

          {isSelectedFriday ? (
            <label style={{ display: 'grid', gap: 6, maxWidth: 240 }}>
              <span style={styles.label}>Friday Type</span>
              <select value={selectedFridayType} onChange={(e) => setSelectedFridayType(e.target.value as any)} style={styles.input}>
                <option value="">Select…</option>
                <option value="day1">Day 1</option>
                <option value="day2">Day 2</option>
              </select>
            </label>
          ) : null}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={generateScheduleForDay}
              disabled={isDemo || status === 'loading' || status === 'saving' || !selectedDate || (isSelectedFriday && !selectedFridayType)}
              style={styles.secondaryBtn}
            >
              {status === 'saving' ? 'Generating…' : 'Generate schedule'}
            </button>
            <div style={styles.mutedSmall}>
              Creates empty plans for all blocks on the selected day (so you can quickly open/edit each one).
            </div>
          </div>
        </div>

        {/* No error banner on this screen; Open/Create logic should handle all cases. */}
        {/* banners removed */}

        <div style={{ ...styles.rowBetween, marginTop: 12 }}>
          <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Classes</div>
        </div>

        {!canShowClasses ? (
          <div style={{ opacity: 0.85, marginTop: 12 }}>Choose Day 1 or Day 2 to show the correct Friday blocks.</div>
        ) : classesForDay.length > 0 ? (
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
                  const planId = planIdByClassId[c.id];
                  return (
                    <tr key={c.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdLabel}>{c.block_label ?? '—'}</td>
                      <td style={styles.td}>{c.name}</td>
                      <td style={styles.td}>{c.room || '—'}</td>
                      <td style={styles.tdRight}>
                        <button onClick={() => (planId ? router.push(`/admin/dayplans/${planId}?auto=1`) : openOrCreatePlanForClass(c))} style={styles.primaryBtn} disabled={isDemo || status === 'saving'}>
                          Open
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
  secondaryBtn: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, whiteSpace: 'nowrap' },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
  infoBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#E0F2FE', border: '1px solid #075985', color: '#0c4a6e', whiteSpace: 'pre-wrap' },
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

function humanizeCreateError(e: any): string {
  const code = e?.code as string | undefined;
  const message = (e?.message as string | undefined) ?? '';
  const details = (e?.details as string | undefined) ?? '';

  if (code === '23505' || /duplicate key value/i.test(message)) {
    return 'A plan already exists for that Date + Block (and Friday Type, if Friday).';
  }

  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied by Supabase security policy. Make sure you are signed in as staff.';
  }

  const extra = details ? ` (${details})` : '';
  return (message || 'Failed.') + extra;
}

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
