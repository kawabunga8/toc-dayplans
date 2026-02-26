'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type TemplateKey = 'mon_thu' | 'fri' | 'rotation';

type BlockTimeRow = {
  id: string;
  template_key: TemplateKey;
  effective_from: string; // YYYY-MM-DD
  effective_to: string | null;
  slot: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
};

type Status = 'loading' | 'idle' | 'saving' | 'error';

const DEFAULT_SLOTS_MON_THU = ['P1', 'P2', 'Flex', 'Lunch', 'P5', 'P6'];
const DEFAULT_SLOTS_FRI = ['P1', 'P2', 'Chapel', 'Lunch', 'P5', 'P6'];

export default function BlockTimesClient() {
  const { isDemo } = useDemo();
  const [template, setTemplate] = useState<TemplateKey>('mon_thu');

  // Block-time editor state (edit Mon–Thu + Friday side-by-side)
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  const [monThuRows, setMonThuRows] = useState<Array<{ slot: string; start_time: string; end_time: string }>>([]);
  const [friRows, setFriRows] = useState<Array<{ slot: string; start_time: string; end_time: string }>>([]);

  // Rotation editor state (edit all days at once)
  const [rotStatus, setRotStatus] = useState<Status>('idle');
  const [rotError, setRotError] = useState<string | null>(null);
  const [rotEffectiveFrom, setRotEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  type RotationKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri_day1' | 'fri_day2';

  const [rotSets, setRotSets] = useState<Record<RotationKey, string[]>>({
    mon: ['A', 'B', 'CLE', 'Lunch', 'C', 'D'],
    tue: ['E', 'F', 'Flex', 'Lunch', 'G', 'H'],
    wed: ['C', 'D', 'Flex', 'Lunch', 'A', 'B'],
    thu: ['G', 'H', 'CLE', 'Lunch', 'E', 'F'],
    fri_day1: ['A', 'B', 'Chapel', 'Lunch', 'C', 'D'],
    fri_day2: ['E', 'F', 'Chapel', 'Lunch', 'G', 'H'],
  });

  useEffect(() => {
    // enforce 6 rows for each set
    setRotSets((prev) => ({
      mon: normalize6(prev.mon),
      tue: normalize6(prev.tue),
      wed: normalize6(prev.wed),
      thu: normalize6(prev.thu),
      fri_day1: normalize6(prev.fri_day1),
      fri_day2: normalize6(prev.fri_day2),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (moved) block time draft rows are now split into monThuRows + friRows

  const title = useMemo(() => {
    if (template === 'rotation') return 'Block Rotation';
    return 'Block Times';
  }, [template]);

  async function loadCurrent() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().slice(0, 10);

      const [monRes, friRes] = await Promise.all([
        supabase
          .from('block_time_defaults')
          .select('*')
          .eq('template_key', 'mon_thu')
          .lte('effective_from', today)
          .or(`effective_to.is.null,effective_to.gt.${today}`)
          .order('start_time', { ascending: true }),
        supabase
          .from('block_time_defaults')
          .select('*')
          .eq('template_key', 'fri')
          .lte('effective_from', today)
          .or(`effective_to.is.null,effective_to.gt.${today}`)
          .order('start_time', { ascending: true }),
      ]);

      if (monRes.error) throw monRes.error;
      if (friRes.error) throw friRes.error;

      const monData = (monRes.data ?? []) as BlockTimeRow[];
      const friData = (friRes.data ?? []) as BlockTimeRow[];

      if (monData.length === 0) {
        setMonThuRows(
          DEFAULT_SLOTS_MON_THU.map((slot) => {
            const t = defaultTimes('mon_thu' as any, slot);
            return { slot, start_time: t.start, end_time: t.end };
          })
        );
      } else {
        // normalize to our slots order
        const bySlot = new Map(monData.map((r) => [r.slot, r]));
        setMonThuRows(
          DEFAULT_SLOTS_MON_THU.map((slot) => {
            const r = bySlot.get(slot);
            return { slot, start_time: (r?.start_time as any) ?? '08:30', end_time: (r?.end_time as any) ?? '09:40' };
          })
        );
      }

      if (friData.length === 0) {
        setFriRows(
          DEFAULT_SLOTS_FRI.map((slot) => {
            const t = defaultTimes('fri' as any, slot);
            return { slot, start_time: t.start, end_time: t.end };
          })
        );
      } else {
        const bySlot = new Map(friData.map((r) => [r.slot, r]));
        setFriRows(
          DEFAULT_SLOTS_FRI.map((slot) => {
            const r = bySlot.get(slot);
            return { slot, start_time: (r?.start_time as any) ?? '09:10', end_time: (r?.end_time as any) ?? '10:10' };
          })
        );
      }

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  useEffect(() => {
    if (template === 'rotation') return;
    void loadCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  async function loadCurrentRotationAll() {
    setRotStatus('loading');
    setRotError(null);

    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().slice(0, 10);

      const configs: Array<{ key: keyof typeof rotSets; day: 1 | 2 | 3 | 4 | 5; ft: 'day1' | 'day2' | null }> = [
        { key: 'mon', day: 1, ft: null },
        { key: 'tue', day: 2, ft: null },
        { key: 'wed', day: 3, ft: null },
        { key: 'thu', day: 4, ft: null },
        { key: 'fri_day1', day: 5, ft: 'day1' },
        { key: 'fri_day2', day: 5, ft: 'day2' },
      ];

      const results = await Promise.all(
        configs.map(async (c) => {
          let q = supabase
            .from('rotation_defaults')
            .select('*')
            .eq('day_of_week', c.day)
            .lte('effective_from', today)
            .or(`effective_to.is.null,effective_to.gt.${today}`)
            .order('effective_from', { ascending: false })
            .order('slot_order', { ascending: true });

          if (c.ft) q = q.eq('friday_type', c.ft);
          else q = q.is('friday_type', null);

          const { data, error } = await q;
          if (error) throw error;

          const rows = (data ?? []) as any[];
          if (!rows.length) return { key: c.key, blocks: null as string[] | null };

          const eff = rows[0]!.effective_from as string;
          const group = rows.filter((r) => r.effective_from === eff);
          return { key: c.key, blocks: group.map((r) => String(r.block_label)) };
        })
      );

      setRotSets((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.blocks && r.blocks.length) (next as any)[r.key] = r.blocks;
        }
        return next;
      });

      setRotStatus('idle');
    } catch (e: any) {
      setRotStatus('error');
      setRotError(humanizeError(e));
    }
  }

  useEffect(() => {
    if (template !== 'rotation') return;
    void loadCurrentRotationAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  async function saveNewRotationAll() {
    setRotStatus('saving');
    setRotError(null);

    try {
      const supabase = getSupabaseClient();
      const eff = rotEffectiveFrom;
      if (!eff) throw new Error('Effective date is required');

      const configs: Array<{ day: 1 | 2 | 3 | 4 | 5; ft: 'day1' | 'day2' | null; blocks: string[] }> = [
        { day: 1, ft: null, blocks: rotSets.mon },
        { day: 2, ft: null, blocks: rotSets.tue },
        { day: 3, ft: null, blocks: rotSets.wed },
        { day: 4, ft: null, blocks: rotSets.thu },
        { day: 5, ft: 'day1', blocks: rotSets.fri_day1 },
        { day: 5, ft: 'day2', blocks: rotSets.fri_day2 },
      ];

      // close existing active rows at eff date
      for (const c of configs) {
        let closeQ = supabase
          .from('rotation_defaults')
          .update({ effective_to: eff })
          .eq('day_of_week', c.day)
          .is('effective_to', null)
          .lt('effective_from', eff);
        if (c.ft) closeQ = closeQ.eq('friday_type', c.ft);
        else closeQ = closeQ.is('friday_type', null);

        const { error: closeErr } = await closeQ;
        if (closeErr) throw closeErr;
      }

      // validate
      for (const c of configs) {
        const b6 = normalize6(c.blocks ?? []).map((b) => String(b).trim());
        if (b6.some((b) => !b)) {
          throw new Error('Rotation must have 6 non-empty rows for every day.');
        }
      }

      const payload = configs.flatMap((c) =>
        normalize6(c.blocks ?? [])
          .map((b) => String(b).trim())
          .map((block, idx) => ({
            day_of_week: c.day,
            friday_type: c.ft,
            slot_order: idx + 1,
            block_label: block,
            effective_from: eff,
            effective_to: null,
          }))
      );

      const { error: insErr } = await supabase.from('rotation_defaults').insert(payload);
      if (insErr) throw insErr;

      setRotStatus('idle');
    } catch (e: any) {
      setRotStatus('error');
      setRotError(humanizeError(e));
    }
  }


  function updateMonThuRow(i: number, patch: Partial<(typeof monThuRows)[number]>) {
    setMonThuRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function updateFriRow(i: number, patch: Partial<(typeof friRows)[number]>) {
    setFriRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function saveNewEffectiveSet() {
    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const eff = effectiveFrom;
      if (!eff) throw new Error('Effective date is required');

      // close existing active rows at eff date for BOTH templates
      for (const tk of ['mon_thu', 'fri'] as const) {
        const { error: closeErr } = await supabase
          .from('block_time_defaults')
          .update({ effective_to: eff })
          .eq('template_key', tk)
          .is('effective_to', null)
          .lt('effective_from', eff);
        if (closeErr) throw closeErr;
      }

      const monPayload = (monThuRows.length ? monThuRows : DEFAULT_SLOTS_MON_THU.map((slot) => {
        const t = defaultTimes('mon_thu' as any, slot);
        return { slot, start_time: t.start, end_time: t.end };
      })).map((r) => ({
        template_key: 'mon_thu',
        effective_from: eff,
        effective_to: null,
        slot: r.slot,
        start_time: r.start_time,
        end_time: r.end_time,
      }));

      const friPayload = (friRows.length ? friRows : DEFAULT_SLOTS_FRI.map((slot) => {
        const t = defaultTimes('fri' as any, slot);
        return { slot, start_time: t.start, end_time: t.end };
      })).map((r) => ({
        template_key: 'fri',
        effective_from: eff,
        effective_to: null,
        slot: r.slot,
        start_time: r.start_time,
        end_time: r.end_time,
      }));

      const { error: insErr } = await supabase.from('block_time_defaults').insert([...monPayload, ...friPayload]);
      if (insErr) throw insErr;

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>{title}</h1>
      <p style={styles.muted}>Set default block times. These defaults are versioned by effective date.</p>

      <div style={styles.tabs}>
        <button onClick={() => setTemplate('mon_thu')} style={template === 'mon_thu' ? styles.tabActive : styles.tab}>
          Block Times
        </button>
        <button onClick={() => setTemplate('rotation')} style={template === 'rotation' ? styles.tabActive : styles.tab}>
          Block Rotation
        </button>
      </div>

      <section style={styles.card}>
        {template === 'rotation' ? (
          <>
            <div style={styles.rowBetween}>
              <div>
                <div style={styles.sectionTitle}>Block rotation defaults</div>
                <div style={styles.mutedSmall}>Define the ordered blocks for each weekday (and Friday Day 1/Day 2). Effective-dated like block times.</div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <div style={styles.label}>Effective from</div>
                  <input type="date" value={rotEffectiveFrom} onChange={(e) => setRotEffectiveFrom(e.target.value)} style={styles.input} />
                </label>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <datalist id="rotation-labels">
                {['A','B','C','D','E','F','G','H','CLE','Flex','Chapel','Lunch'].map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(100px, 120px))', gap: 12, alignItems: 'start', justifyContent: 'space-between' }}>

                  <RotationColumn title="Mon" blocks={rotSets.mon} onChange={(b) => setRotSets((p) => ({ ...p, mon: b }))} disabled={isDemo || rotStatus === 'saving' || rotStatus === 'loading'} />
                  <RotationColumn title="Tue" blocks={rotSets.tue} onChange={(b) => setRotSets((p) => ({ ...p, tue: b }))} disabled={isDemo || rotStatus === 'saving' || rotStatus === 'loading'} />
                  <RotationColumn title="Wed" blocks={rotSets.wed} onChange={(b) => setRotSets((p) => ({ ...p, wed: b }))} disabled={isDemo || rotStatus === 'saving' || rotStatus === 'loading'} />
                  <RotationColumn title="Thu" blocks={rotSets.thu} onChange={(b) => setRotSets((p) => ({ ...p, thu: b }))} disabled={isDemo || rotStatus === 'saving' || rotStatus === 'loading'} />
                  <RotationColumn title="Fri D1" blocks={rotSets.fri_day1} onChange={(b) => setRotSets((p) => ({ ...p, fri_day1: b }))} disabled={isDemo || rotStatus === 'saving' || rotStatus === 'loading'} />
                <RotationColumn title="Fri D2" blocks={rotSets.fri_day2} onChange={(b) => setRotSets((p) => ({ ...p, fri_day2: b }))} disabled={isDemo || rotStatus === 'saving' || rotStatus === 'loading'} />
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={saveNewRotationAll}
                  style={styles.primaryBtn}
                  disabled={isDemo || rotStatus === 'saving' || rotStatus === 'loading'}
                >
                  {rotStatus === 'saving' ? 'Saving…' : 'Save everything'}
                </button>

                <button
                  type="button"
                  onClick={loadCurrentRotationAll}
                  style={styles.secondaryBtn}
                  disabled={rotStatus === 'saving' || rotStatus === 'loading'}
                >
                  Reload current defaults
                </button>
              </div>

              {rotError && (
                <div style={styles.errorBox}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Couldn’t save</div>
                  <div>{rotError}</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={styles.rowBetween}>
              <div>
                <div style={styles.sectionTitle}>New default set</div>
                <div style={styles.mutedSmall}>
                  Choose the date these times become the new defaults. We’ll keep history by closing the previous defaults.
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={styles.label}>Effective from</div>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Slot</th>
                <th style={styles.th}>Mon–Thu Start</th>
                <th style={styles.th}>Mon–Thu End</th>
                <th style={styles.th}>Fri Start</th>
                <th style={styles.th}>Fri End</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_SLOTS_MON_THU.map((slot, i) => {
                const mon = monThuRows[i] ?? { slot, start_time: '', end_time: '' };
                const friSlot = slot === 'Flex' ? 'Chapel' : slot;
                const friIndex = DEFAULT_SLOTS_FRI.indexOf(friSlot);
                const fri = friIndex >= 0 ? (friRows[friIndex] ?? { slot: friSlot, start_time: '', end_time: '' }) : { slot: friSlot, start_time: '', end_time: '' };

                return (
                  <tr key={`${slot}-${i}`}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 900, color: RCS.midBlue }}>{slot}</div>
                      {slot === 'Flex' ? <div style={{ fontSize: 12, opacity: 0.8 }}>Friday uses Chapel</div> : null}
                    </td>
                    <td style={styles.td}>
                      <input type="time" value={mon.start_time} onChange={(e) => updateMonThuRow(i, { start_time: e.target.value })} style={styles.input} />
                    </td>
                    <td style={styles.td}>
                      <input type="time" value={mon.end_time} onChange={(e) => updateMonThuRow(i, { end_time: e.target.value })} style={styles.input} />
                    </td>
                    <td style={styles.td}>
                      <input type="time" value={fri.start_time} onChange={(e) => (friIndex >= 0 ? updateFriRow(friIndex, { start_time: e.target.value }) : null)} style={styles.input} />
                    </td>
                    <td style={styles.td}>
                      <input type="time" value={fri.end_time} onChange={(e) => (friIndex >= 0 ? updateFriRow(friIndex, { end_time: e.target.value }) : null)} style={styles.input} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={saveNewEffectiveSet} disabled={isDemo || status === 'saving' || status === 'loading'} style={styles.primaryBtn}>
            {status === 'saving' ? 'Saving…' : 'Save as new defaults'}
          </button>
          <button onClick={loadCurrent} disabled={status === 'saving' || status === 'loading'} style={styles.secondaryBtn}>
            Reload current defaults
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Couldn’t save</div>
            <div>{error}</div>
          </div>
        )}
          </>
        )}
      </section>
    </main>
  );
}

function defaultTimes(template: TemplateKey, slot: string): { start: string; end: string } {
  // RCS fixed time slots. Block letters rotate; these are the time periods.
  if (template === 'fri') {
    switch (slot) {
      case 'P1':
        return { start: '09:10', end: '10:10' };
      case 'P2':
        return { start: '10:15', end: '11:15' };
      case 'Chapel':
        return { start: '11:20', end: '12:10' };
      case 'Lunch':
        return { start: '12:10', end: '13:00' };
      case 'P5':
        return { start: '13:00', end: '14:00' };
      case 'P6':
        return { start: '14:05', end: '15:05' };
      default:
        return { start: '09:10', end: '10:10' };
    }
  }

  // mon_thu
  switch (slot) {
    case 'P1':
      return { start: '08:30', end: '09:40' };
    case 'P2':
      return { start: '09:45', end: '10:55' };
    case 'Flex':
      return { start: '11:00', end: '11:50' };
    case 'Lunch':
      return { start: '11:50', end: '12:35' };
    case 'P5':
      return { start: '12:40', end: '13:50' };
    case 'P6':
      return { start: '13:55', end: '15:05' };
    default:
      return { start: '08:30', end: '09:40' };
  }
}

function normalize6(arr: string[]): string[] {
  const out = arr.slice(0, 6);
  while (out.length < 6) out.push('');
  return out;
}

function RotationColumn({
  title,
  blocks,
  onChange,
  disabled,
}: {
  title: string;
  blocks: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  const b6 = normalize6(blocks);

  return (
    <div style={{ border: '1px solid #1F4E79', borderRadius: 12, padding: 12, background: '#FFFFFF' }}>
      <div style={{ fontWeight: 900, color: '#1F4E79', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {b6.map((b, i) => (
          <div key={i} style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#2E75B6' }}>Row {i + 1}</div>
            <input
              value={b}
              list="rotation-labels"
              onChange={(e) => {
                const next = b6.map((x, idx) => (idx === i ? e.target.value : x));
                onChange(next);
              }}
              style={{ padding: '6px 8px', borderRadius: 10, border: '1px solid #1F4E79', background: '#FFFFFF', color: '#1A1A1A', width: '100%', boxSizing: 'border-box', fontSize: 12 }}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function humanizeError(e: any): string {
  const code = e?.code as string | undefined;
  const message = (e?.message as string | undefined) ?? '';

  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'Database is missing the block_time_defaults table. Run the migration SQL I provide for block times.';
  }
  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied. Make sure you are logged in as an admin and your user is in staff_profiles.';
  }
  if (code === '23505' || /duplicate key value/i.test(message)) {
    return 'Defaults already exist for this template and effective date. Choose a different effective date.';
  }

  return message || 'Unknown error.';
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
  mutedSmall: { opacity: 0.8, fontSize: 12 },
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  tabs: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tab: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
  },
  tabActive: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
  },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  rowBetween: { display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  sectionTitle: { fontWeight: 900, color: RCS.deepNavy },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
    color: RCS.textDark,
    minWidth: 160,
  },
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
  td: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}` },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
  },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D' },
};
