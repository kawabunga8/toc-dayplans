'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import TocBlockPlanInlineEditor from './[id]/TocBlockPlanInlineEditor';

type Status = 'loading' | 'idle' | 'saving' | 'error';

type ClassRow = { id: string; block_label: string | null; name: string; room: string | null; sort_order: number | null };

type Draft = {
  planDate: string;
  fridayType: '' | 'day1' | 'day2';
  title: string;
  notes: string;
  createdPlanId?: string;
  createdBlockId?: string;
};

export default function DayPlansClient() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  async function loadClasses() {
    setError(null);
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
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load classes');
    }
  }

  useEffect(() => {
    void (async () => {
      setStatus('loading');
      await loadClasses();
      setStatus('idle');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function createPlanForClass(klass: ClassRow) {
    if (!klass.block_label) return;

    setStatus('saving');
    setError(null);

    try {
      const d = getDraft(klass.id, klass.name);
      if (!d.planDate) throw new Error('Date is required');
      if (isFridayLocal(d.planDate) && !d.fridayType) throw new Error('Friday Type is required');
      if (!d.title.trim()) throw new Error('Title is required');

      const supabase = getSupabaseClient();

      // 1) Create day plan (this is what gets published to the TOC calendar later)
      const { data: planData, error: planErr } = await supabase
        .from('day_plans')
        .insert({
          plan_date: d.planDate,
          slot: String(klass.block_label).trim(),
          friday_type: isFridayLocal(d.planDate) ? (d.fridayType as 'day1' | 'day2') : null,
          title: d.title.trim(),
          notes: d.notes.trim() ? d.notes.trim() : null,
          // visibility left as default (private) — Publishing page controls this.
        })
        .select('id')
        .single();
      if (planErr) throw planErr;

      // 2) Create a single schedule block for this class.
      // This gives us a place to attach the per-instance TOC sections that can be edited without changing the template.
      const { start, end } = await inferClassMeetingTime(supabase, d.planDate, String(klass.block_label).trim(), d.fridayType);

      const { data: blockData, error: blockErr } = await supabase
        .from('day_plan_blocks')
        .insert({
          day_plan_id: (planData as any).id,
          start_time: start,
          end_time: end,
          room: klass.room ?? '—',
          class_name: klass.name,
          details: null,
          class_id: klass.id,
        })
        .select('id')
        .single();
      if (blockErr) throw blockErr;

      setDraft(klass.id, {
        ...d,
        createdPlanId: (planData as any).id,
        createdBlockId: (blockData as any).id,
      });

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeCreateError(e));
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Dayplans</h1>
      <p style={styles.muted}>All classes, with “Create plan” + full TOC sections (saved as per-plan overrides; templates remain unchanged).</p>

      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <div>
            <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Classes</div>
            <div style={styles.mutedSmall}>Click “Create plan” to expand. The TOC plan editor appears after the plan is created.</div>
          </div>
          <button onClick={loadClasses} disabled={status === 'loading' || status === 'saving'} style={styles.secondaryBtn}>
            Refresh
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {status !== 'loading' && classes.length === 0 ? (
          <div style={{ opacity: 0.85, marginTop: 12 }}>No classes found. (Seed the <code>classes</code> table.)</div>
        ) : null}

        {classes.length > 0 && (
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
                          onClick={() => setOpenClassId((prev) => (prev === c.id ? null : c.id))}
                          style={open ? styles.secondaryBtn : styles.primaryBtn}
                          disabled={status === 'saving'}
                        >
                          {open ? 'Close' : 'Create plan'}
                        </button>

                        {open && (
                          <div style={styles.cardInner}>
                            <div style={styles.subSectionHeader}>Create dayplan</div>

                            <div style={styles.inlineGrid}>
                              <label style={styles.field}>
                                <span style={styles.label}>Date</span>
                                <input
                                  type="date"
                                  value={d.planDate}
                                  onChange={(e) => setDraft(c.id, { ...d, planDate: e.target.value, fridayType: '' })}
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
                                <input value={d.title} onChange={(e) => setDraft(c.id, { ...d, title: e.target.value })} style={styles.input} />
                              </label>

                              <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                                <span style={styles.label}>Notes (optional)</span>
                                <textarea value={d.notes} onChange={(e) => setDraft(c.id, { ...d, notes: e.target.value })} rows={3} style={styles.textarea} />
                              </label>

                              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                {d.createdPlanId && d.createdBlockId ? (
                                  <>
                                    <Link href={`/admin/dayplans/${d.createdPlanId}`} style={styles.secondaryLink}>
                                      Open plan
                                    </Link>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => createPlanForClass(c)}
                                    disabled={status === 'saving' || (isFri && !d.fridayType)}
                                    style={styles.primaryBtn}
                                  >
                                    {status === 'saving' ? 'Creating…' : 'Create'}
                                  </button>
                                )}
                              </div>

                              {d.createdBlockId ? (
                                <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
                                  <TocBlockPlanInlineEditor dayPlanBlockId={d.createdBlockId} classId={c.id} />
                                </div>
                              ) : null}
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
        )}
      </section>
    </main>
  );
}

function humanizeCreateError(e: any): string {
  const code = e?.code as string | undefined;
  const message = (e?.message as string | undefined) ?? '';
  const details = (e?.details as string | undefined) ?? '';

  if (code === '23505' || /duplicate key value/i.test(message)) {
    return 'A plan already exists for that Date + Block (and Friday Type, if Friday). Pick a different date, or open the existing plan.';
  }
  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied by Supabase security policy. Make sure you are signed in as staff.';
  }
  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'Database schema is missing required tables. Run the latest supabase/schema.sql in Supabase.';
  }

  return (message || 'Failed to create dayplan.') + (details ? ` (${details})` : '');
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

function scheduleMapping(planDate: string, friType: '' | 'day1' | 'day2') {
  const dow = weekdayLocal(planDate);

  const monThuTimes: Record<string, { start: string; end: string }> = {
    P1: { start: '08:30', end: '09:40' },
    P2: { start: '09:45', end: '10:55' },
    Flex: { start: '11:00', end: '11:50' },
    Lunch: { start: '11:50', end: '12:35' },
    P5: { start: '12:40', end: '13:50' },
    P6: { start: '13:55', end: '15:05' },
  };

  const friTimes: Record<string, { start: string; end: string }> = {
    P1: { start: '09:10', end: '10:10' },
    P2: { start: '10:15', end: '11:15' },
    Chapel: { start: '11:20', end: '12:10' },
    Lunch: { start: '12:10', end: '13:00' },
    P5: { start: '13:00', end: '14:00' },
    P6: { start: '14:05', end: '15:05' },
  };

  if (dow === 5) {
    const day1 = { P1: 'A', P2: 'B', P5: 'C', P6: 'D' };
    const day2 = { P1: 'E', P2: 'F', P5: 'G', P6: 'H' };
    const map = friType === 'day2' ? day2 : day1;

    return [
      { slot: 'P1', block_label: map.P1, fallbackStart: friTimes.P1.start, fallbackEnd: friTimes.P1.end },
      { slot: 'P2', block_label: map.P2, fallbackStart: friTimes.P2.start, fallbackEnd: friTimes.P2.end },
      { slot: 'Chapel', block_label: 'CHAPEL', fallbackStart: friTimes.Chapel.start, fallbackEnd: friTimes.Chapel.end },
      { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: friTimes.Lunch.start, fallbackEnd: friTimes.Lunch.end },
      { slot: 'P5', block_label: map.P5, fallbackStart: friTimes.P5.start, fallbackEnd: friTimes.P5.end },
      { slot: 'P6', block_label: map.P6, fallbackStart: friTimes.P6.start, fallbackEnd: friTimes.P6.end },
    ];
  }

  if (dow === 1) {
    return [
      { slot: 'P1', block_label: 'A', fallbackStart: monThuTimes.P1.start, fallbackEnd: monThuTimes.P1.end },
      { slot: 'P2', block_label: 'B', fallbackStart: monThuTimes.P2.start, fallbackEnd: monThuTimes.P2.end },
      { slot: 'Flex', block_label: 'CLE', fallbackStart: monThuTimes.Flex.start, fallbackEnd: monThuTimes.Flex.end },
      { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: monThuTimes.Lunch.start, fallbackEnd: monThuTimes.Lunch.end },
      { slot: 'P5', block_label: 'C', fallbackStart: monThuTimes.P5.start, fallbackEnd: monThuTimes.P5.end },
      { slot: 'P6', block_label: 'D', fallbackStart: monThuTimes.P6.start, fallbackEnd: monThuTimes.P6.end },
    ];
  }

  if (dow === 2) {
    return [
      { slot: 'P1', block_label: 'E', fallbackStart: monThuTimes.P1.start, fallbackEnd: monThuTimes.P1.end },
      { slot: 'P2', block_label: 'F', fallbackStart: monThuTimes.P2.start, fallbackEnd: monThuTimes.P2.end },
      { slot: 'Flex', block_label: 'FLEX', fallbackStart: monThuTimes.Flex.start, fallbackEnd: monThuTimes.Flex.end },
      { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: monThuTimes.Lunch.start, fallbackEnd: monThuTimes.Lunch.end },
      { slot: 'P5', block_label: 'G', fallbackStart: monThuTimes.P5.start, fallbackEnd: monThuTimes.P5.end },
      { slot: 'P6', block_label: 'H', fallbackStart: monThuTimes.P6.start, fallbackEnd: monThuTimes.P6.end },
    ];
  }

  if (dow === 3) {
    return [
      { slot: 'P1', block_label: 'C', fallbackStart: monThuTimes.P1.start, fallbackEnd: monThuTimes.P1.end },
      { slot: 'P2', block_label: 'D', fallbackStart: monThuTimes.P2.start, fallbackEnd: monThuTimes.P2.end },
      { slot: 'Flex', block_label: 'FLEX', fallbackStart: monThuTimes.Flex.start, fallbackEnd: monThuTimes.Flex.end },
      { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: monThuTimes.Lunch.start, fallbackEnd: monThuTimes.Lunch.end },
      { slot: 'P5', block_label: 'A', fallbackStart: monThuTimes.P5.start, fallbackEnd: monThuTimes.P5.end },
      { slot: 'P6', block_label: 'B', fallbackStart: monThuTimes.P6.start, fallbackEnd: monThuTimes.P6.end },
    ];
  }

  // Thu
  return [
    { slot: 'P1', block_label: 'E', fallbackStart: monThuTimes.P1.start, fallbackEnd: monThuTimes.P1.end },
    { slot: 'P2', block_label: 'F', fallbackStart: monThuTimes.P2.start, fallbackEnd: monThuTimes.P2.end },
    { slot: 'Flex', block_label: 'CLE', fallbackStart: monThuTimes.Flex.start, fallbackEnd: monThuTimes.Flex.end },
    { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: monThuTimes.Lunch.start, fallbackEnd: monThuTimes.Lunch.end },
    { slot: 'P5', block_label: 'G', fallbackStart: monThuTimes.P5.start, fallbackEnd: monThuTimes.P5.end },
    { slot: 'P6', block_label: 'H', fallbackStart: monThuTimes.P6.start, fallbackEnd: monThuTimes.P6.end },
  ];
}

async function inferClassMeetingTime(
  supabase: ReturnType<typeof getSupabaseClient>,
  planDate: string,
  blockLabel: string,
  fridayType: '' | 'day1' | 'day2'
): Promise<{ start: string; end: string }> {
  const mapping = scheduleMapping(planDate, fridayType);
  const hit = mapping.find((m) => String(m.block_label).toUpperCase() === String(blockLabel).toUpperCase());
  if (!hit) {
    return { start: '08:30', end: '09:40' };
  }

  const templateKey: 'mon_thu' | 'fri' = isFridayLocal(planDate) ? 'fri' : 'mon_thu';

  const { data, error } = await supabase
    .from('block_time_defaults')
    .select('start_time,end_time')
    .eq('template_key', templateKey)
    .eq('slot', hit.slot)
    .lte('effective_from', planDate)
    .or(`effective_to.is.null,effective_to.gt.${planDate}`)
    .order('start_time', { ascending: true })
    .limit(1);

  if (!error && (data?.length ?? 0) > 0) {
    const r: any = data![0];
    return { start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) };
  }

  return { start: String(hit.fallbackStart).slice(0, 5), end: String(hit.fallbackEnd).slice(0, 5) };
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
  page: { padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  mutedSmall: { opacity: 0.85, fontSize: 12 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  rowBetween: { display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
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
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  textarea: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit' },
  primaryBtn: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900, whiteSpace: 'nowrap' },
  secondaryBtn: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, whiteSpace: 'nowrap' },
  secondaryLink: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.white, color: RCS.deepNavy, textDecoration: 'none', fontWeight: 900 },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },

  cardInner: {
    marginTop: 10,
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    padding: 12,
    background: RCS.lightBlue,
    textAlign: 'left',
  },
  subSectionHeader: {
    color: RCS.deepNavy,
    fontWeight: 900,
    borderLeft: `6px solid ${RCS.gold}`,
    paddingLeft: 10,
    marginBottom: 10,
  },
  inlineGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  field: { display: 'grid', gap: 6 },
};
