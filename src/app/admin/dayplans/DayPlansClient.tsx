'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type Status = 'idle' | 'loading' | 'saving' | 'error';

type ClassRow = { id: string; block_label: string | null; name: string; room: string | null; sort_order: number | null };

type Draft = {
  planDate: string;
  fridayType: '' | 'day1' | 'day2';
  title: string;
  notes: string;
  createdPlanId?: string;
};

export default function DayPlansClient() {
  const { isDemo } = useDemo();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

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
    } catch {
      // ignore; dayplans can still function without class seed
    }
  }

  function getDraft(classId: string, klassName: string): Draft {
    return (
      drafts[classId] ?? {
        planDate: today,
        fridayType: '',
        title: klassName,
        notes: '',
      }
    );
  }

  function setDraft(classId: string, next: Draft) {
    setDrafts((prev) => ({ ...prev, [classId]: next }));
  }

  async function createDayPlanForClass(klass: ClassRow) {
    if (!klass.block_label) return;

    setStatus('saving');
    setError(null);

    try {
      const d = getDraft(klass.id, klass.name);
      if (!d.planDate) throw new Error('Date is required');
      if (isFridayLocal(d.planDate) && !d.fridayType) throw new Error('Friday Type is required');
      if (!d.title.trim()) throw new Error('Title is required');

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('day_plans')
        .insert({
          plan_date: d.planDate,
          slot: String(klass.block_label).trim(),
          friday_type: isFridayLocal(d.planDate) ? (d.fridayType as 'day1' | 'day2') : null,
          title: d.title.trim(),
          notes: d.notes.trim() ? d.notes.trim() : null,
        })
        .select('*')
        .single();

      if (error) throw error;

      setDraft(klass.id, { ...d, createdPlanId: (data as any).id });
      setStatus('idle');
      setOpenClassId(null);
      router.push(`/admin/dayplans/${(data as any).id}`);
    } catch (e: any) {
      setStatus('error');
      setError(humanizeCreateError(e));
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Dayplans</h1>
      <p style={styles.muted}>
        Create a dayplan for a date + block. Fridays require Day 1/Day 2.
      </p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Create a dayplan</div>
        <p style={styles.mutedSmall}>Choose a class, then click “Create plan” to open the inputs (pre-filled from that class).</p>

        <div style={styles.rowBetween}>
          <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Classes</div>
          <button onClick={loadClasses} disabled={status === 'loading' || status === 'saving'} style={styles.secondaryBtn}>
            Refresh classes
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {classes.length > 0 ? (
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
                {classes.map((c, i) => {
                  const open = openClassId === c.id;
                  const d = getDraft(c.id, c.name);
                  const isFri = isFridayLocal(d.planDate);

                  return (
                    <tr key={c.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdLabel}>{c.block_label ?? '—'}</td>
                      <td style={styles.td}>{c.name}</td>
                      <td style={styles.td}>{c.room || '—'}</td>
                      <td style={styles.tdRight}>
                        <button
                          onClick={() => {
                            if (d.createdPlanId) {
                              router.push(`/admin/dayplans/${d.createdPlanId}`);
                              return;
                            }
                            setOpenClassId((prev) => (prev === c.id ? null : c.id));
                          }}
                          style={open ? styles.secondaryBtn : styles.primaryBtn}
                          disabled={status === 'saving'}
                        >
                          {d.createdPlanId ? 'Open' : open ? 'Close' : 'Open'}
                        </button>

                        {open && (
                          <div style={styles.inlineForm}>
                            <label style={styles.field}>
                              <span style={styles.label}>Date</span>
                              <input
                                type="date"
                                value={d.planDate}
                                onChange={(e) =>
                                  setDraft(c.id, { ...d, planDate: e.target.value, fridayType: '' })
                                }
                                style={styles.input}
                              />
                            </label>

                            {isFri && (
                              <label style={styles.field}>
                                <span style={styles.label}>Friday Type</span>
                                <select
                                  value={d.fridayType}
                                  onChange={(e) => setDraft(c.id, { ...d, fridayType: e.target.value as any })}
                                  style={styles.input}
                                >
                                  <option value="">Select…</option>
                                  <option value="day1">Day 1</option>
                                  <option value="day2">Day 2</option>
                                </select>
                              </label>
                            )}

                            <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                              <span style={styles.label}>Title</span>
                              <input
                                value={d.title}
                                onChange={(e) => setDraft(c.id, { ...d, title: e.target.value })}
                                style={styles.input}
                              />
                            </label>

                            <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                              <span style={styles.label}>Notes (optional)</span>
                              <textarea
                                value={d.notes}
                                onChange={(e) => setDraft(c.id, { ...d, notes: e.target.value })}
                                rows={3}
                                style={styles.textarea}
                              />
                            </label>

                            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => createDayPlanForClass(c)}
                                disabled={isDemo || status === 'saving' || (isFri && !d.fridayType)}
                                style={styles.primaryBtn}
                              >
                                {status === 'saving' ? 'Creating…' : 'Create'}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ opacity: 0.85, marginTop: 12 }}>No classes found. (Seed the <code>classes</code> table.)</div>
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
  mutedSmall: { opacity: 0.85, fontSize: 12, marginTop: 0, marginBottom: 12 },
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
  textarea: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit' },
  primaryBtn: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900, whiteSpace: 'nowrap' },
  secondaryBtn: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, whiteSpace: 'nowrap' },
  secondaryLink: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, textDecoration: 'none', cursor: 'pointer', fontWeight: 900 },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
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
  inlineForm: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.lightBlue,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    textAlign: 'left',
  },
  field: { display: 'grid', gap: 6 },
  itemEven: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.white },
  itemOdd: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightGray },
};

const SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Flex Block', 'Career Life', 'Chapel', 'Lunch'];

function humanizeCreateError(e: any): string {
  // supabase-js / PostgREST errors often look like:
  // { code, message, details, hint }
  const code = e?.code as string | undefined;
  const message = (e?.message as string | undefined) ?? '';
  const details = (e?.details as string | undefined) ?? '';

  // Common DB uniqueness violation
  if (code === '23505' || /duplicate key value/i.test(message)) {
    return 'A plan already exists for that Date + Block (and Friday Type, if Friday). Pick a different block/date, or open the existing plan.';
  }

  // Missing column / schema mismatch
  if (code === '42703' || /column .* does not exist/i.test(message)) {
    return 'Database schema is out of date (missing columns). Run the latest schema/migration SQL in Supabase, then refresh.';
  }

  // RLS / permissions
  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied by Supabase security policy. Make sure you are signed in as an admin and your user is in staff_profiles.';
  }

  // Invalid API key / env
  if (/Invalid API key/i.test(message)) {
    return 'Supabase API key is invalid. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local / Vercel env vars.';
  }

  // Fallback: keep it short but useful
  const extra = details ? ` (${details})` : '';
  return (message || 'Failed to create dayplan.') + extra;
}

function isFridayLocal(yyyyMmDd: string): boolean {
  // Date("YYYY-MM-DD") is treated as UTC; we want local weekday.
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getDay() === 5;
}

// legacy helpers removed; styles are centralized above.
