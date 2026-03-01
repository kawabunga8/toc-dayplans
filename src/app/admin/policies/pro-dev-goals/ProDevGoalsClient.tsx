'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type GoalRow = {
  id: string;
  goal_id: string;
  goal_description: string;
  research_focus: string | null;
  action_taken: string | null;
  evidence_date: string | null;
  reflection_notes: string | null;
  sort_order: number | null;
};

type Status = 'loading' | 'idle' | 'error';

const RCS = {
  deepNavy: '#1F4E79',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  paleGold: '#FDF3DC',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
} as const;

export default function ProDevGoalsClient() {
  const { isDemo } = useDemo();

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const full = await supabase
        .from('professional_development_goals')
        .select('id,goal_id,goal_description,research_focus,action_taken,evidence_date,reflection_notes,sort_order')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('goal_id', { ascending: true });

      if (full.error) throw full.error;
      setRows((full.data ?? []) as any);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load goals');
      setRows([]);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    const hit = (s: any) => String(s ?? '').toLowerCase().includes(needle);
    return rows.filter((r) => hit(r.goal_id) || hit(r.goal_description) || hit(r.research_focus) || hit(r.action_taken) || hit(r.evidence_date) || hit(r.reflection_notes));
  }, [rows, q]);

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Professional Development Goals</h1>
      <p style={styles.muted}>Imported from CSV (replace-only). Browse + search.</p>

      <div style={{ marginTop: -8, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="/admin/policies" style={styles.secondaryBtn}>
          ← Back to Policies
        </a>
        <a href="/admin/policies/pro-dev-goals/import" style={styles.secondaryBtn}>
          Import CSV (replace)…
        </a>
      </div>

      {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Browse</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 6, minWidth: 260, flex: 1 }}>
            <div style={styles.label}>Search</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} style={styles.input} placeholder="Search goals…" />
          </label>

          <button type="button" style={styles.secondaryBtn} onClick={() => void load()} disabled={isDemo || status === 'loading'}>
            Reload
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>{filtered.length} goals</div>

        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          {filtered.map((r) => (
            <div key={r.id} style={styles.goalCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900, color: RCS.deepNavy }}>{r.goal_id}</div>
                {r.evidence_date ? <div style={styles.pill}>Evidence: {r.evidence_date}</div> : null}
              </div>

              <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.goal_description}</div>

              {(r.research_focus || r.action_taken || r.reflection_notes) ? (
                <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                  {r.research_focus ? (
                    <div>
                      <div style={styles.smallLabel}>Research Focus</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{r.research_focus}</div>
                    </div>
                  ) : null}

                  {r.action_taken ? (
                    <div>
                      <div style={styles.smallLabel}>Action Taken</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{r.action_taken}</div>
                    </div>
                  ) : null}

                  {r.reflection_notes ? (
                    <div>
                      <div style={styles.smallLabel}>Reflection Notes</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{r.reflection_notes}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}

          {status !== 'loading' && filtered.length === 0 ? <div style={{ opacity: 0.85 }}>No goals found.</div> : null}
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },

  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },

  label: { color: RCS.deepNavy, fontWeight: 900, fontSize: 12, marginBottom: 6 },
  smallLabel: { color: RCS.deepNavy, fontSize: 11, fontWeight: 900, opacity: 0.85, marginBottom: 2 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },

  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },

  goalCard: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightBlue },
  pill: { padding: '4px 10px', borderRadius: 999, border: `1px solid ${RCS.gold}`, background: RCS.paleGold, color: RCS.deepNavy, fontWeight: 900, fontSize: 12 },

  errorBox: { marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
};
