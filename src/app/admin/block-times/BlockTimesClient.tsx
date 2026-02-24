'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

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

const DEFAULT_SLOTS = ['A', 'B', 'Career Life', 'Chapel', 'Lunch', 'C', 'D', 'E', 'F', 'Flex Block', 'G', 'H'];

export default function BlockTimesClient() {
  const [template, setTemplate] = useState<TemplateKey>('mon_thu');
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));

  const [rows, setRows] = useState<Array<Omit<BlockTimeRow, 'id' | 'effective_to'>>>((() => {
    // editable draft rows to save as a new effective set
    return DEFAULT_SLOTS.map((slot) => ({
      template_key: 'mon_thu' as TemplateKey,
      effective_from: new Date().toISOString().slice(0, 10),
      slot,
      start_time: '08:30',
      end_time: '09:45',
    }));
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
        // no defaults yet: start with a blank-ish draft
        setRows(
          DEFAULT_SLOTS.map((slot) => ({
            template_key: template,
            effective_from: effectiveFrom,
            slot,
            start_time: '08:30',
            end_time: '09:45',
          }))
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
          <button onClick={saveNewEffectiveSet} disabled={status === 'saving' || status === 'loading'} style={styles.primaryBtn}>
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

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', color: '#e2e8f0' },
  h1: { margin: 0, color: 'white' },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  mutedSmall: { opacity: 0.8, fontSize: 12 },
  label: { opacity: 0.9, fontSize: 12 },
  tabs: { display: 'flex', gap: 8, marginBottom: 12 },
  tab: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #334155',
    background: 'transparent',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  tabActive: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #c9a84c',
    background: '#0b1f33',
    color: 'white',
    cursor: 'pointer',
  },
  card: { border: '1px solid #334155', borderRadius: 12, padding: 16, background: 'rgba(2,6,23,0.35)' },
  rowBetween: { display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  sectionTitle: { fontWeight: 800, color: 'white' },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #334155',
    background: 'rgba(2,6,23,0.5)',
    color: 'white',
    minWidth: 160,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: 10,
    borderBottom: '2px solid #c9a84c',
    color: 'white',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  td: { padding: 10, borderBottom: '1px solid #334155' },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: 0, background: '#2563eb', color: 'white', cursor: 'pointer' },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #94a3b8',
    background: 'transparent',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid #fecaca', background: '#7f1d1d', color: 'white' },
};
