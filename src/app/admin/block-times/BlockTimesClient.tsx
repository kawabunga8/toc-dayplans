'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type TemplateKey = 'mon_thu' | 'fri';

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
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  const [rows, setRows] = useState<Array<Omit<BlockTimeRow, 'id' | 'effective_to'>>>((() => {
    // editable draft rows to save as a new effective set
    const eff = new Date().toISOString().slice(0, 10);
    return DEFAULT_SLOTS_MON_THU.map((slot) => {
      const t = defaultTimes('mon_thu', slot);
      return {
        template_key: 'mon_thu' as TemplateKey,
        effective_from: eff,
        slot,
        start_time: t.start,
        end_time: t.end,
      };
    });
  })());

  const title = useMemo(() => (template === 'mon_thu' ? 'Mon–Thu Block Times' : 'Friday Block Times'), [template]);

  async function loadCurrent() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('block_time_defaults')
        .select('*')
        .eq('template_key', template)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gt.${today}`)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if ((data?.length ?? 0) === 0) {
        // no defaults yet: start with our real schedule draft
        const slots = template === 'mon_thu' ? DEFAULT_SLOTS_MON_THU : DEFAULT_SLOTS_FRI;
        setRows(
          slots.map((slot) => {
            const t = defaultTimes(template, slot);
            return {
              template_key: template,
              effective_from: effectiveFrom,
              slot,
              start_time: t.start,
              end_time: t.end,
            };
          })
        );
      } else {
        setRows(
          (data as BlockTimeRow[]).map((r) => ({
            template_key: r.template_key,
            effective_from: effectiveFrom,
            slot: r.slot,
            start_time: r.start_time,
            end_time: r.end_time,
          }))
        );
      }

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  useEffect(() => {
    void loadCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  function updateRow(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function saveNewEffectiveSet() {
    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const eff = effectiveFrom;
      if (!eff) throw new Error('Effective date is required');

      // close existing active rows at eff date
      // Set effective_to = eff for any rows where effective_to is null and effective_from < eff
      const { error: closeErr } = await supabase
        .from('block_time_defaults')
        .update({ effective_to: eff })
        .eq('template_key', template)
        .is('effective_to', null)
        .lt('effective_from', eff);
      if (closeErr) throw closeErr;

      // insert new rows
      const payload = rows.map((r) => ({
        template_key: template,
        effective_from: eff,
        effective_to: null,
        slot: r.slot,
        start_time: r.start_time,
        end_time: r.end_time,
      }));

      const { error: insErr } = await supabase.from('block_time_defaults').insert(payload);
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
        <button
          onClick={() => setTemplate('mon_thu')}
          style={template === 'mon_thu' ? styles.tabActive : styles.tab}
        >
          Mon–Thu
        </button>
        <button onClick={() => setTemplate('fri')} style={template === 'fri' ? styles.tabActive : styles.tab}>
          Friday
        </button>
      </div>

      <section style={styles.card}>
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
                <th style={styles.th}>Start</th>
                <th style={styles.th}>End</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.slot}-${i}`}>
                  <td style={styles.td}>
                    <input value={r.slot} onChange={(e) => updateRow(i, { slot: e.target.value })} style={styles.input} />
                  </td>
                  <td style={styles.td}>
                    <input
                      type="time"
                      value={r.start_time}
                      onChange={(e) => updateRow(i, { start_time: e.target.value })}
                      style={styles.input}
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      type="time"
                      value={r.end_time}
                      onChange={(e) => updateRow(i, { end_time: e.target.value })}
                      style={styles.input}
                    />
                  </td>
                </tr>
              ))}
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
