'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Row = {
  id: string;
  plan_date: string;
  slot?: string | null;
  title: string;
  share_expires_at: string | null;
  visibility: 'private' | 'link';
};

type Status = 'loading' | 'idle' | 'working' | 'error';

export default function PublishingClient() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Row[]>([]);

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Back-compat: older DBs may not have day_plans.slot yet.
      let { data, error } = await supabase
        .from('day_plans')
        .select('id,plan_date,slot,title,share_expires_at,visibility')
        .eq('visibility', 'link')
        .is('trashed_at', null)
        .order('plan_date', { ascending: false })
        .order('slot', { ascending: true });

      if (error && /day_plans\.slot does not exist|column .*slot.* does not exist/i.test(String((error as any)?.message ?? ''))) {
        // Retry without slot
        const retry = await supabase
          .from('day_plans')
          .select('id,plan_date,title,share_expires_at,visibility')
          .eq('visibility', 'link')
          .is('trashed_at', null)
          .order('plan_date', { ascending: false });
        data = retry.data as any;
        error = retry.error as any;
      }

      if (error) throw error;
      setItems((data ?? []) as Row[]);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load published plans');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const origin = useMemo(() => (typeof window === 'undefined' ? '' : window.location.origin), []);

  async function copyLink(planId: string) {
    setStatus('working');
    setError(null);

    try {
      const url = `${origin}/p/${planId}`;
      await navigator.clipboard.writeText(url);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to copy link');
    }
  }

  async function revoke(planId: string) {
    const ok = window.confirm('Revoke this public link?');
    if (!ok) return;

    setStatus('working');
    setError(null);

    try {
      const res = await fetch(`/api/admin/dayplans/${planId}/revoke`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to revoke');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to revoke');
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Publishing</h1>
      <p style={styles.muted}>All day plans currently published as TOC links (visibility = link).</p>

      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <div style={styles.sectionTitle}>Published day plans</div>
          <button onClick={load} disabled={status === 'loading' || status === 'working'} style={styles.secondaryBtn}>
            Refresh
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {status !== 'loading' && items.length === 0 && <div style={{ opacity: 0.85, marginTop: 12 }}>No published plans.</div>}

        {items.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Block</th>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Expires</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => (
                  <tr key={p.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.tdLabel}>{p.plan_date}</td>
                    <td style={styles.td}>{p.slot ?? '—'}</td>
                    <td style={styles.td}>{p.title}</td>
                    <td style={styles.td}>{p.share_expires_at ?? '—'}</td>
                    <td style={styles.tdRight}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => copyLink(p.id)}
                          disabled={status === 'loading' || status === 'working'}
                          style={styles.secondaryBtn}
                        >
                          Copy link
                        </button>
                        <button
                          onClick={() => revoke(p.id)}
                          disabled={status === 'loading' || status === 'working'}
                          style={styles.dangerBtn}
                        >
                          Revoke
                        </button>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, textAlign: 'right' }}>
                        Public links are plan-id based. Publishing/expiry is the access gate.
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  rowBetween: { display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  sectionTitle: { fontWeight: 900, color: RCS.deepNavy },
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
  tdRight: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, verticalAlign: 'top' },
  tdLabel: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, color: RCS.midBlue, fontWeight: 800 },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
  },
  dangerBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #991b1b',
    background: '#FEE2E2',
    color: '#7F1D1D',
    cursor: 'pointer',
    fontWeight: 900,
  },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D' },
};
